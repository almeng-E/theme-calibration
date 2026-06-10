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
import { isPlainObject, clonePlainSetting } from "../../utils/objectUtils";

// ============================================================
// Settings-shape factory (VS Code-specific)
// ============================================================

/**
 * 3가지 VS Code 설정 키에 대해 빈 SettingDictionary를 가진 초기 스냅샷을 생성한다.
 * VS Code 설정 모양 전용 헬퍼이므로 어댑터 계층에 위치한다.
 */
export function createEmptySettingsSnapshot(): VscodeSettingsSnapshot {
  return {
    "workbench.colorCustomizations": {},
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
}

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
// DTO → VS Code patch plan (outbound entry point)
// ============================================================

/**
 * 코어가 산출한 DTO(선택된 후보 + 테마명)를 VS Code 패치 플랜으로 직렬화한다.
 * patch 코어는 더 이상 VS Code 모양을 알 필요가 없고, 오케스트레이터(extension.ts)가
 * 이 진입점을 호출해 port→core→port 흐름을 완성한다.
 *
 * `createPatchRecipeFromCandidates`(레시피) → `buildPatchPlan`(플랜)을 합성한다.
 */
export function serializeCandidatePatch(
  selectedCandidates: readonly CandidateDto[],
  themeName: string | undefined,
  existingSettings: VscodeSettingsSnapshot,
  now?: Date
): VscodePatchPlan {
  const patchRecipe = createPatchRecipeFromCandidates(selectedCandidates, themeName);
  return buildPatchPlan(existingSettings, patchRecipe, now);
}
