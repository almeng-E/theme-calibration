import { SETTINGS_ORDER } from "../constants";
import type {
  ConfigurationSnapshot,
  PatchExecutionPlan,
  PatchRecipe,
  RollbackExecutionPlan,
  RollbackSnapshot,
  SettingDictionary
} from "../types/patch.types";
import { isPlainObject, clonePlainSetting, createEmptySettingsSnapshot } from "../utils/objectUtils";
import { serializeSettingsUpdates } from "../serializer/vscode.serializer";
import type { ThemeAnalysisReport } from "../types/signal.types";
import type { PatchCandidate } from "../types/patch.types";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "../diagnose/diagnosticEngine";

// No hardcoded patch recipes should be in core.

export function buildPatchPlan(
  existingSettings: ConfigurationSnapshot,
  patchRecipe: PatchRecipe,
  now = new Date()
): PatchExecutionPlan {
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

export function buildRollbackPlan(rollbackSnapshot: RollbackSnapshot | undefined): RollbackExecutionPlan {
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
  baseRecipe: PatchRecipe
): PatchRecipe {
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

function mergePlainObjects(base: SettingDictionary, override: SettingDictionary): SettingDictionary {
  const baseClone = clonePlainSetting(base);
  const overrideClone = clonePlainSetting(override);

  for (const [key, value] of Object.entries(overrideClone)) {
    if (isPlainObject(baseClone[key]) && isPlainObject(value)) {
      baseClone[key] = mergePlainObjects(baseClone[key] as SettingDictionary, value);
    } else {
      baseClone[key] = value;
    }
  }

  return baseClone;
}

export interface CandidatePatchApplyPlanInput {
  report: ThemeAnalysisReport;
  candidates: readonly PatchCandidate[];
  selectedCandidateIds: readonly string[];
  existingSettings: ConfigurationSnapshot;
  now?: Date;
}

export interface CandidatePatchApplyPlan {
  candidates: readonly PatchCandidate[];
  selectedCandidates: readonly PatchCandidate[];
  patchPlan: PatchExecutionPlan;
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
    .filter((c): c is PatchCandidate => c !== undefined);

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
