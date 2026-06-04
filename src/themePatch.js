"use strict";

const ROLLBACK_STATE_KEY = "colorCalibration.pocHardcodedPatch.rollbackSnapshot";

const SETTINGS_ORDER = [
  "workbench.colorCustomizations",
  "editor.tokenColorCustomizations",
  "editor.semanticTokenColorCustomizations"
];

const POC_PATCH_RECIPE = {
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

function createThemeScopedPatchRecipe(themeName, baseRecipe = POC_PATCH_RECIPE) {
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

function createPatchPlan(existingSettings, patchRecipe = POC_PATCH_RECIPE, now = new Date()) {
  const nextSettings = {};
  const rollbackSettings = {};

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

function createRollbackPlan(rollbackSnapshot) {
  if (!rollbackSnapshot || !rollbackSnapshot.settings) {
    throw new Error("Rollback snapshot is missing.");
  }

  return {
    recipeId: rollbackSnapshot.recipeId,
    createdAt: rollbackSnapshot.createdAt,
    settingsUpdates: createSettingsUpdates(rollbackSnapshot.settings)
  };
}

function createSettingsUpdates(settingsById) {
  return SETTINGS_ORDER.map((settingId) => {
    const [section, ...keyParts] = settingId.split(".");

    return {
      section,
      key: keyParts.join("."),
      value: clonePlainSetting(settingsById[settingId])
    };
  });
}

function readPatchableSettings(vscode, target) {
  const settings = {};

  for (const settingId of SETTINGS_ORDER) {
    const [section, ...keyParts] = settingId.split(".");
    const key = keyParts.join(".");
    const config = vscode.workspace.getConfiguration(section);
    const inspected = config.inspect(key) || {};
    settings[settingId] = getInspectedValueForTarget(vscode, inspected, target);
  }

  return settings;
}

function getInspectedValueForTarget(vscode, inspected, target) {
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

async function applySettingsUpdates(vscode, settingsUpdates, target) {
  for (const update of settingsUpdates) {
    await vscode.workspace
      .getConfiguration(update.section)
      .update(update.key, update.value, target);
  }
}

function mergePlainObjects(base, override) {
  const baseClone = clonePlainSetting(base);
  const overrideClone = clonePlainSetting(override);

  for (const [key, value] of Object.entries(overrideClone)) {
    if (isPlainObject(baseClone[key]) && isPlainObject(value)) {
      baseClone[key] = mergePlainObjects(baseClone[key], value);
    } else {
      baseClone[key] = value;
    }
  }

  return baseClone;
}

function clonePlainSetting(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  POC_PATCH_RECIPE,
  ROLLBACK_STATE_KEY,
  SETTINGS_ORDER,
  applySettingsUpdates,
  createPatchPlan,
  createRollbackPlan,
  createThemeScopedPatchRecipe,
  readPatchableSettings
};
