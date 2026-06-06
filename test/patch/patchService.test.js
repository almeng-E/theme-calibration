"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPatchPlan,
  buildRollbackPlan,
  wrapRecipeForTheme
} = require("../../out/patch/patchService");
const { SAMPLE_PATCH_RECIPE } = require("../fixtures/patch.fixtures.js");

test("buildPatchPlan preserves existing overrides while applying sample patch values", () => {
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

  const plan = buildPatchPlan(existingSettings, SAMPLE_PATCH_RECIPE);

  assert.equal(plan.settingsUpdates.length, 3);
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editorError.foreground"],
    SAMPLE_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
  assert.deepEqual(
    plan.rollbackSnapshot.settings["workbench.colorCustomizations"],
    existingSettings["workbench.colorCustomizations"]
  );
});

test("buildRollbackPlan restores exactly the settings captured in the snapshot", () => {
  const snapshot = {
    createdAt: "2026-06-04T00:00:00.000Z",
    recipeId: "sample-hardcoded-contrast-v1",
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

  const plan = buildRollbackPlan(snapshot);

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

test("wrapRecipeForTheme scopes workbench colors to the configured theme", () => {
  const recipe = wrapRecipeForTheme("Default Dark+", SAMPLE_PATCH_RECIPE);

  assert.ok(recipe.settings["workbench.colorCustomizations"]["[Default Dark+]"]);
  assert.equal(
    recipe.settings["workbench.colorCustomizations"]["[Default Dark+]"]["editorError.foreground"],
    SAMPLE_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
});

test("buildPatchPlan preserves existing values inside a theme-specific customization bucket", () => {
  const existingSettings = {
    "workbench.colorCustomizations": {
      "[Default Dark+]": {
        "editor.background": "#111111"
      }
    },
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
  const recipe = wrapRecipeForTheme("Default Dark+", SAMPLE_PATCH_RECIPE);

  const plan = buildPatchPlan(existingSettings, recipe);

  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorError.foreground"],
    SAMPLE_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
});
