import { SETTINGS_ORDER } from "../constants";
import type {
  ConfigurationSnapshot,
  ConfigurationUpdate,
  PatchExecutionPlan,
  PatchRecipe,
  RollbackExecutionPlan,
  RollbackSnapshot,
  SettingDictionary
} from "./types/patch.types";
import { isPlainObject, clonePlainSetting, createEmptySettingsSnapshot } from "./objectUtils";

// ============================================================
// 1. Constants
// ============================================================

export const POC_PATCH_RECIPE: PatchRecipe = {
  id: "poc-hardcoded-contrast-v1",
  description: "Hardcoded conservative contrast patch for settings overlay and rollback PoC.",
  settings: {
    "workbench.colorCustomizations": {
      "editorError.foreground": "#ff6b6b",
      "editorWarning.foreground": "#ffd166",
      "editorGutter.addedBackground": "#4cc38a",
      "editorGutter.deletedBackground": "#ff6b6b",
      "diffEditor.insertedTextBackground": "#4cc38a26",
      "diffEditor.removedTextBackground": "#ff6b6b26"
    },
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  }
};

// ============================================================
// 2. High-level Builders
// ============================================================

export function buildPatchPlan(
  existingSettings: ConfigurationSnapshot,
  patchRecipe: PatchRecipe = POC_PATCH_RECIPE,
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
    settingsUpdates: toSettingWriteOps(nextSettings)
  };
}

export function buildRollbackPlan(rollbackSnapshot: RollbackSnapshot | undefined): RollbackExecutionPlan {
  if (!rollbackSnapshot || !rollbackSnapshot.settings) {
    throw new Error("Rollback snapshot is missing.");
  }

  return {
    recipeId: rollbackSnapshot.recipeId,
    createdAt: rollbackSnapshot.createdAt,
    settingsUpdates: toSettingWriteOps(rollbackSnapshot.settings)
  };
}

// ============================================================
// 3. Recipe Helpers
// ============================================================

export function wrapRecipeForTheme(
  themeName: string | undefined,
  baseRecipe: PatchRecipe = POC_PATCH_RECIPE
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

// ============================================================
// 4. Transformation Utilities
// ============================================================

export function toSettingWriteOps(settingsById: ConfigurationSnapshot): ConfigurationUpdate[] {
  return SETTINGS_ORDER.map((settingId) => {
    const [section, ...keyParts] = settingId.split(".");

    return {
      section,
      key: keyParts.join("."),
      value: clonePlainSetting(settingsById[settingId])
    };
  });
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
