"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPatchCandidates,
  createPatchRecipeFromCandidates
} = require("../../out/core/patchGenerator");

test("createPatchCandidates creates a token color candidate for a low contrast comment risk", () => {
  const candidates = createPatchCandidates({
    signals: {
      background: { value: "#101010" },
      comment: { value: "#222222", source: "tokenColors.comment" }
    },
    risks: [
      {
        type: "lowContrast",
        signal: "comment",
        contrastRatio: 1.12,
        threshold: 4.5
      }
    ]
  });

  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0], {
    id: "lowContrast-comment-editor.tokenColorCustomizations-comments",
    riskType: "lowContrast",
    signals: ["comment"],
    settingId: "editor.tokenColorCustomizations",
    settingKey: "comments",
    currentSignals: {
      comment: "#222222"
    },
    suggestedColor: "#8fb8ff",
    reason: "comment has low contrast against the editor background.",
    scope: "theme",
    confidence: 0.8
  });
});

test("createPatchCandidates creates a deletion gutter candidate for similar error and diffDeleted signals", () => {
  const candidates = createPatchCandidates({
    signals: {
      error: { value: "#f44747" },
      diffDeleted: { value: "#f44747" }
    },
    risks: [
      {
        type: "similarSignal",
        signals: ["error", "diffDeleted"],
        colorDistance: 0
      }
    ]
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].settingId, "workbench.colorCustomizations");
  assert.equal(candidates[0].settingKey, "editorGutter.deletedBackground");
  assert.equal(candidates[0].suggestedColor, "#ff6b6b");
  assert.deepEqual(candidates[0].signals, ["error", "diffDeleted"]);
});

test("createPatchCandidates skips risks that do not have conservative patch mappings", () => {
  const candidates = createPatchCandidates({
    signals: {},
    risks: [
      { type: "missingThemeDefinition" },
      { type: "noObviousRisk" }
    ]
  });

  assert.deepEqual(candidates, []);
});

test("createPatchRecipeFromCandidates groups candidates into theme-scoped settings", () => {
  const candidates = [
    {
      id: "lowContrast-comment-editor.tokenColorCustomizations-comments",
      riskType: "lowContrast",
      signals: ["comment"],
      settingId: "editor.tokenColorCustomizations",
      settingKey: "comments",
      currentSignals: {
        comment: "#222222"
      },
      suggestedColor: "#8fb8ff",
      reason: "comment has low contrast against the editor background.",
      scope: "theme",
      confidence: 0.8
    },
    {
      id: "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorGutter.deletedBackground",
      riskType: "similarSignal",
      signals: ["error", "diffDeleted"],
      settingId: "workbench.colorCustomizations",
      settingKey: "editorGutter.deletedBackground",
      currentSignals: {
        error: "#f44747",
        diffDeleted: "#f44747"
      },
      suggestedColor: "#ff6b6b",
      reason: "error and diffDeleted are visually close.",
      scope: "theme",
      confidence: 0.7
    }
  ];

  const recipe = createPatchRecipeFromCandidates(candidates, "Sample Dark");

  assert.equal(recipe.id, "patch-candidates-sample-dark");
  assert.equal(
    recipe.settings["editor.tokenColorCustomizations"]["[Sample Dark]"].comments,
    "#8fb8ff"
  );
  assert.equal(
    recipe.settings["workbench.colorCustomizations"]["[Sample Dark]"]["editorGutter.deletedBackground"],
    "#ff6b6b"
  );
  assert.deepEqual(recipe.settings["editor.semanticTokenColorCustomizations"], {});
});
