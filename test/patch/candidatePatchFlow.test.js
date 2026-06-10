"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const {
  createPatchRecipeFromCandidates,
  createCandidatePatchApplyPlan,
  buildRollbackPlan,
  buildPatchPlan
} = require("../../out/adapter/vscode/settingsSerializer");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

test("candidate patch flow generates proposals, applies selected candidates, and rolls back", () => {
  const report = createCandidateRichReport();
  const candidates = createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);

  assert.deepEqual(
    candidates.map((candidate) => candidate.id),
    [
      "lowContrast-comment-editor.tokenColorCustomizations-comments",
      "lowContrast-string-editor.tokenColorCustomizations-strings",
      "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorGutter.deletedBackground"
    ]
  );

  const selectedCandidateIds = [
    "lowContrast-comment-editor.tokenColorCustomizations-comments",
    "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorGutter.deletedBackground"
  ];
  const selectedCandidates = candidates.filter((candidate) => selectedCandidateIds.includes(candidate.id));
  const recipe = createPatchRecipeFromCandidates(selectedCandidates, "Default Dark+");

  assert.equal(
    recipe.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#8fb8ff"
  );
  assert.equal(
    recipe.settings["workbench.colorCustomizations"]["[Default Dark+]"]["editorGutter.deletedBackground"],
    "#ff6b6b"
  );
  assert.equal(
    recipe.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].strings,
    undefined
  );

  const existingSettings = createExistingSettings();
  const patchPlan = buildPatchPlan(existingSettings, recipe, new Date("2026-06-06T00:00:00.000Z"));

  assert.equal(patchPlan.recipeId, "patch-candidates-default-dark");
  assert.equal(
    patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#8fb8ff"
  );
  assert.equal(
    patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].strings,
    "#ce9178"
  );
  assert.equal(
    patchPlan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editor.background"],
    "#1e1e1e"
  );
  assert.equal(
    patchPlan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorGutter.deletedBackground"],
    "#ff6b6b"
  );
  assert.deepEqual(patchPlan.rollbackSnapshot.settings, existingSettings);

  const appliedSettings = materializeSettingsUpdates(patchPlan.settingsUpdates);
  assert.deepEqual(appliedSettings, patchPlan.nextSettings);

  const rollbackPlan = buildRollbackPlan(patchPlan.rollbackSnapshot);
  const rolledBackSettings = materializeSettingsUpdates(rollbackPlan.settingsUpdates);

  assert.equal(rollbackPlan.recipeId, "patch-candidates-default-dark");
  assert.deepEqual(rolledBackSettings, existingSettings);
});

test("createCandidatePatchApplyPlan integrates successfully using externally provided candidates", () => {
  const report = createCandidateRichReport();
  const candidates = createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);
  const existingSettings = createExistingSettings();

  const applyPlan = createCandidatePatchApplyPlan({
    report,
    candidates,
    selectedCandidateIds: [
      "lowContrast-comment-editor.tokenColorCustomizations-comments"
    ],
    existingSettings,
    now: new Date("2026-06-06T00:00:00.000Z")
  });

  assert.equal(applyPlan.selectedCandidates.length, 1);
  assert.equal(applyPlan.patchPlan.recipeId, "patch-candidates-default-dark");
  assert.equal(
    applyPlan.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#8fb8ff"
  );
});

function createCandidateRichReport() {
  return {
    generatedAt: "2026-06-06T00:00:00.000Z",
    theme: {
      configuredName: "Default Dark+",
      definitionStatus: "loaded"
    },
    signals: {
      background: { value: "#1e1e1e", source: "colors.editor.background" },
      comment: { value: "#3f3f3f", source: "tokenColors.comment" },
      string: { value: "#4a4a4a", source: "tokenColors.string" },
      error: { value: "#f14c4c", source: "colors.editorError.foreground" },
      diffDeleted: { value: "#f15c5c", source: "colors.editorGutter.deletedBackground" }
    },
    contrast: {},
    risks: [
      {
        type: "lowContrast",
        signal: "comment",
        contrastRatio: 2.1,
        threshold: 4.5,
        message: "comment has low contrast against the editor background."
      },
      {
        type: "lowContrast",
        signal: "string",
        contrastRatio: 2.3,
        threshold: 4.5,
        message: "string has low contrast against the editor background."
      },
      {
        type: "similarSignal",
        signals: ["error", "diffDeleted"],
        colorDistance: 8,
        message: "error and diffDeleted are visually close."
      }
    ]
  };
}

function createExistingSettings() {
  return {
    "workbench.colorCustomizations": {
      "[Default Dark+]": {
        "editor.background": "#1e1e1e",
        "editorGutter.deletedBackground": "#5a1d1d"
      }
    },
    "editor.tokenColorCustomizations": {
      "[Default Dark+]": {
        comments: "#6a9955",
        strings: "#ce9178"
      }
    },
    "editor.semanticTokenColorCustomizations": {
      enabled: true
    }
  };
}

function materializeSettingsUpdates(settingsUpdates) {
  const settings = {};

  for (const update of settingsUpdates) {
    settings[[update.section, update.key].join(".")] = update.value;
  }

  return settings;
}
