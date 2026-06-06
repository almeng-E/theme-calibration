"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCandidatePatchApplyPlan
} = require("../../out/core/candidatePatchService");

test("createCandidatePatchApplyPlan applies selected candidates from the current theme report", () => {
  const plan = createCandidatePatchApplyPlan({
    report: createReport(),
    selectedCandidateIds: [
      "lowContrast-comment-editor.tokenColorCustomizations-comments",
      "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorGutter.deletedBackground"
    ],
    existingSettings: createExistingSettings(),
    now: new Date("2026-06-06T00:00:00.000Z")
  });

  assert.equal(plan.candidates.length, 3);
  assert.equal(plan.selectedCandidates.length, 2);
  assert.equal(plan.patchPlan.recipeId, "patch-candidates-default-dark");
  assert.equal(
    plan.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#8fb8ff"
  );
  assert.equal(
    plan.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].strings,
    "#ce9178"
  );
  assert.equal(
    plan.patchPlan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorGutter.deletedBackground"],
    "#ff6b6b"
  );
});

test("createCandidatePatchApplyPlan rejects reports with no candidates", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: { ...createReport(), risks: [] },
      selectedCandidateIds: ["missing"],
      existingSettings: createExistingSettings()
    }),
    /No patch candidates were generated/
  );
});

test("createCandidatePatchApplyPlan rejects empty selection", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: createReport(),
      selectedCandidateIds: [],
      existingSettings: createExistingSettings()
    }),
    /No patch candidates were selected/
  );
});

test("createCandidatePatchApplyPlan rejects unknown selected candidate ids", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: createReport(),
      selectedCandidateIds: ["missing"],
      existingSettings: createExistingSettings()
    }),
    /Selected patch candidates were not found: missing/
  );
});

function createReport() {
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
      { type: "lowContrast", signal: "comment", contrastRatio: 2.1, threshold: 4.5 },
      { type: "lowContrast", signal: "string", contrastRatio: 2.3, threshold: 4.5 },
      { type: "similarSignal", signals: ["error", "diffDeleted"], colorDistance: 8 }
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
    "editor.semanticTokenColorCustomizations": {}
  };
}
