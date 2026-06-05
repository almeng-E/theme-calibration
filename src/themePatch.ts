import { ROLLBACK_STATE_KEY, SETTINGS_ORDER } from "./constants";
import type {
  PatchPlan,
  PatchRecipe,
  PatchableSettings,
  PlainSetting,
  RollbackPlan,
  RollbackSnapshot,
  SettingId,
  SettingsUpdate,
  VscodeSettingsApi
} from "./types";

export { ROLLBACK_STATE_KEY, SETTINGS_ORDER };

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

export function createThemeScopedPatchRecipe(
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

export function createPatchPlan(
  existingSettings: PatchableSettings,
  patchRecipe: PatchRecipe = POC_PATCH_RECIPE,
  now = new Date()
): PatchPlan {
  const nextSettings = createEmptyPatchableSettings();
  const rollbackSettings = createEmptyPatchableSettings();

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
    settingsUpdates: createSettingsUpdates(nextSettings)
  };
}

export function createRollbackPlan(rollbackSnapshot: RollbackSnapshot | undefined): RollbackPlan {
  if (!rollbackSnapshot || !rollbackSnapshot.settings) {
    throw new Error("Rollback snapshot is missing.");
  }

  return {
    recipeId: rollbackSnapshot.recipeId,
    createdAt: rollbackSnapshot.createdAt,
    settingsUpdates: createSettingsUpdates(rollbackSnapshot.settings)
  };
}

export function createSettingsUpdates(settingsById: PatchableSettings): SettingsUpdate[] {
  return SETTINGS_ORDER.map((settingId) => {
    const [section, ...keyParts] = settingId.split(".");

    return {
      section,
      key: keyParts.join("."),
      value: clonePlainSetting(settingsById[settingId])
    };
  });
}

export function readPatchableSettings(vscode: VscodeSettingsApi, target: unknown): PatchableSettings {
  const settings = createEmptyPatchableSettings();

  for (const settingId of SETTINGS_ORDER) {
    const [section, ...keyParts] = settingId.split(".");
    const key = keyParts.join(".");
    const config = vscode.workspace.getConfiguration(section);
    const inspected = config.inspect(key) || {};
    settings[settingId] = getInspectedValueForTarget(vscode, inspected, target);
  }

  return settings;
}

export async function applySettingsUpdates(
  vscode: VscodeSettingsApi,
  settingsUpdates: SettingsUpdate[],
  target: unknown
): Promise<void> {
  for (const update of settingsUpdates) {
    const config = vscode.workspace.getConfiguration(update.section);
    if (!config.update) {
      throw new Error(`Configuration update API is unavailable for ${update.section}.${update.key}.`);
    }
    await config.update(update.key, update.value, target);
  }
}

function getInspectedValueForTarget(
  vscode: VscodeSettingsApi,
  inspected: { globalValue?: unknown; workspaceValue?: unknown; workspaceFolderValue?: unknown },
  target: unknown
): PlainSetting {
  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.Global) {
    return clonePlainSetting(inspected.globalValue);
  }

  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.Workspace) {
    return clonePlainSetting(inspected.workspaceValue);
  }

  if (vscode.ConfigurationTarget && target === vscode.ConfigurationTarget.WorkspaceFolder) {
    return clonePlainSetting(inspected.workspaceFolderValue);
  }

  return clonePlainSetting(inspected.globalValue);
}

function mergePlainObjects(base: PlainSetting, override: PlainSetting): PlainSetting {
  const baseClone = clonePlainSetting(base);
  const overrideClone = clonePlainSetting(override);

  for (const [key, value] of Object.entries(overrideClone)) {
    if (isPlainObject(baseClone[key]) && isPlainObject(value)) {
      baseClone[key] = mergePlainObjects(baseClone[key] as PlainSetting, value);
    } else {
      baseClone[key] = value;
    }
  }

  return baseClone;
}

function clonePlainSetting(value: unknown): PlainSetting {
  if (!isPlainObject(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as PlainSetting;
}

function createEmptyPatchableSettings(): PatchableSettings {
  return {
    "workbench.colorCustomizations": {},
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
}

function isPlainObject(value: unknown): value is PlainSetting {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
