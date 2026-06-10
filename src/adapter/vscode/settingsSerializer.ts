import { SETTINGS_ORDER } from "../../constants";
import type {
  VscodeSettingsSnapshot,
  VscodeSettingUpdate,
  VscodePatchRecipe,
  VscodePatchPlan,
  VscodeRollbackSnapshot,
  VscodeRollbackPlan,
  VscodeSettingDictionary
} from "./types";
import type { CandidateDto } from "../../types/patch.types";
import type { ThemeReportDto } from "../../types/signal.types";
import { isPlainObject, clonePlainSetting, createEmptySettingsSnapshot } from "../../utils/objectUtils";

// ============================================================
// Settings serialization (VS Code settings-shape)
// ============================================================

export function serializeSettingsUpdates(settingsById: VscodeSettingsSnapshot): VscodeSettingUpdate[] {
  return SETTINGS_ORDER.map((settingId) => {
    const [section, ...keyParts] = settingId.split(".");
    return {
      section,
      key: keyParts.join("."),
      value: clonePlainSetting(settingsById[settingId])
    };
  });
}

// ============================================================
// Recipe building from candidates
// ============================================================

export function createPatchRecipeFromCandidates(
  candidates: readonly CandidateDto[],
  themeName?: string
): VscodePatchRecipe {
  const settings = createEmptySettingsSnapshot();

  for (const candidate of candidates) {
    const target = getSettingTarget(settings[candidate.settingId], themeName);
    target[candidate.settingKey] = candidate.suggestedColor;
  }

  return {
    id: `patch-candidates-${slugify(themeName || "global")}`,
    description: "Conservative patch recipe generated from theme signal risks.",
    settings
  };
}

function getSettingTarget(setting: VscodeSettingDictionary, themeName: string | undefined): VscodeSettingDictionary {
  if (!themeName) {
    return setting;
  }

  const themeKey = `[${themeName}]`;
  if (!isPlainObject(setting[themeKey])) {
    setting[themeKey] = {};
  }

  return setting[themeKey] as VscodeSettingDictionary;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "global";
}

// ============================================================
// Patch / rollback plan building
// ============================================================

export function buildPatchPlan(
  existingSettings: VscodeSettingsSnapshot,
  patchRecipe: VscodePatchRecipe,
  now = new Date()
): VscodePatchPlan {
  const nextSettings = createEmptySettingsSnapshot();
  const rollbackSettings = createEmptySettingsSnapshot();

  for (const settingId of SETTINGS_ORDER) {
    const existingValue = clonePlainSetting(existingSettings[settingId]);
    const patchValue = clonePlainSetting(patchRecipe.settings[settingId]);

    rollbackSettings[settingId] = existingValue;
    nextSettings[settingId] = mergePlainObjects(existingValue, patchValue);
  }

  return {
    recipeId: patchRecipe.id,
    nextSettings,
    rollbackSnapshot: {
      createdAt: now.toISOString(),
      recipeId: patchRecipe.id,
      settings: rollbackSettings
    },
    settingsUpdates: serializeSettingsUpdates(nextSettings)
  };
}

export function buildRollbackPlan(rollbackSnapshot: VscodeRollbackSnapshot | undefined): VscodeRollbackPlan {
  if (!rollbackSnapshot || !rollbackSnapshot.settings) {
    throw new Error("Rollback snapshot is missing.");
  }

  return {
    recipeId: rollbackSnapshot.recipeId,
    createdAt: rollbackSnapshot.createdAt,
    settingsUpdates: serializeSettingsUpdates(rollbackSnapshot.settings)
  };
}

export function wrapRecipeForTheme(
  themeName: string | undefined,
  baseRecipe: VscodePatchRecipe
): VscodePatchRecipe {
  if (!themeName) {
    return baseRecipe;
  }

  return {
    ...baseRecipe,
    settings: {
      ...baseRecipe.settings,
      "workbench.colorCustomizations": {
        [`[${themeName}]`]: clonePlainSetting(baseRecipe.settings["workbench.colorCustomizations"])
      }
    }
  };
}

function mergePlainObjects(base: VscodeSettingDictionary, override: VscodeSettingDictionary): VscodeSettingDictionary {
  const baseClone = clonePlainSetting(base);
  const overrideClone = clonePlainSetting(override);

  for (const [key, value] of Object.entries(overrideClone)) {
    if (isPlainObject(baseClone[key]) && isPlainObject(value)) {
      baseClone[key] = mergePlainObjects(baseClone[key] as VscodeSettingDictionary, value);
    } else {
      baseClone[key] = value;
    }
  }

  return baseClone;
}

// ============================================================
// Candidate patch apply plan
// ============================================================

export interface CandidatePatchApplyPlanInput {
  report: ThemeReportDto;
  candidates: readonly CandidateDto[];
  selectedCandidateIds: readonly string[];
  existingSettings: VscodeSettingsSnapshot;
  now?: Date;
}

export interface CandidatePatchApplyPlan {
  candidates: readonly CandidateDto[];
  selectedCandidates: readonly CandidateDto[];
  patchPlan: VscodePatchPlan;
}

export function createCandidatePatchApplyPlan(input: CandidatePatchApplyPlanInput): CandidatePatchApplyPlan {
  const candidates = input.candidates;

  if (candidates.length === 0) {
    throw new Error("No patch candidates were generated for the current theme.");
  }

  if (input.selectedCandidateIds.length === 0) {
    throw new Error("No patch candidates were selected.");
  }

  const selectedCandidates = input.selectedCandidateIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((c): c is CandidateDto => c !== undefined);

  if (selectedCandidates.length !== input.selectedCandidateIds.length) {
    throw new Error("Some selected candidates were not found.");
  }

  const patchRecipe = createPatchRecipeFromCandidates(selectedCandidates, input.report.theme.configuredName);
  const patchPlan = buildPatchPlan(input.existingSettings, patchRecipe, input.now);

  return {
    candidates,
    selectedCandidates,
    patchPlan
  };
}
