"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  POC_PATCH_RECIPE,
  createPatchPlan,
  createRollbackPlan,
  createThemeScopedPatchRecipe,
  readPatchableSettings
} = require("../src/themePatch");

test("createPatchPlan preserves existing overrides while applying PoC patch values", () => {
  const existingSettings = {
    "workbench.colorCustomizations": {
      "editor.background": "#111111",
      "editorError.foreground": "#ff0000"
    },
    "editor.tokenColorCustomizations": {
      comments: "#777777"
    },
    "editor.semanticTokenColorCustomizations": {
      enabled: true
    }
  };

  const plan = createPatchPlan(existingSettings, POC_PATCH_RECIPE);

  assert.equal(plan.settingsUpdates.length, 3);
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editorError.foreground"],
    POC_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
  assert.deepEqual(
    plan.rollbackSnapshot.settings["workbench.colorCustomizations"],
    existingSettings["workbench.colorCustomizations"]
  );
});

test("createRollbackPlan restores exactly the settings captured in the snapshot", () => {
  const snapshot = {
    createdAt: "2026-06-04T00:00:00.000Z",
    recipeId: "poc-hardcoded-contrast-v1",
    settings: {
      "workbench.colorCustomizations": {
        "editor.background": "#111111"
      },
      "editor.tokenColorCustomizations": {},
      "editor.semanticTokenColorCustomizations": {
        enabled: true
      }
    }
  };

  const plan = createRollbackPlan(snapshot);

  assert.deepEqual(plan.settingsUpdates, [
    {
      section: "workbench",
      key: "colorCustomizations",
      value: { "editor.background": "#111111" }
    },
    {
      section: "editor",
      key: "tokenColorCustomizations",
      value: {}
    },
    {
      section: "editor",
      key: "semanticTokenColorCustomizations",
      value: { enabled: true }
    }
  ]);
});

test("createThemeScopedPatchRecipe scopes workbench colors to the configured theme", () => {
  const recipe = createThemeScopedPatchRecipe("Default Dark+");

  assert.ok(recipe.settings["workbench.colorCustomizations"]["[Default Dark+]"]);
  assert.equal(
    recipe.settings["workbench.colorCustomizations"]["[Default Dark+]"]["editorError.foreground"],
    POC_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
});

test("createPatchPlan preserves existing values inside a theme-specific customization bucket", () => {
  const existingSettings = {
    "workbench.colorCustomizations": {
      "[Default Dark+]": {
        "editor.background": "#111111"
      }
    },
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
  const recipe = createThemeScopedPatchRecipe("Default Dark+");

  const plan = createPatchPlan(existingSettings, recipe);

  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorError.foreground"],
    POC_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
});

test("readPatchableSettings reads the selected target value instead of effective merged settings", () => {
  const fakeVscode = {
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2
    },
    workspace: {
      getConfiguration(section) {
        return {
          get(key) {
            return {
              source: "effective",
              section,
              key
            };
          },
          inspect(key) {
            return {
              globalValue: {
                source: "global",
                section,
                key
              },
              workspaceValue: {
                source: "workspace",
                section,
                key
              }
            };
          }
        };
      }
    }
  };

  const globalSettings = readPatchableSettings(fakeVscode, fakeVscode.ConfigurationTarget.Global);
  const workspaceSettings = readPatchableSettings(fakeVscode, fakeVscode.ConfigurationTarget.Workspace);

  assert.equal(globalSettings["workbench.colorCustomizations"].source, "global");
  assert.equal(workspaceSettings["workbench.colorCustomizations"].source, "workspace");
});
