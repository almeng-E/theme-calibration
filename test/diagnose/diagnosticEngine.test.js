"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

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
  }, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);

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
  }, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);

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
  }, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);

  assert.deepEqual(candidates, []);
});
