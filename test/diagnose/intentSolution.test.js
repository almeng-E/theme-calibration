"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createIntentSolution } = require("../../out/diagnose/intentSolution");

test("createIntentSolution returns only candidates related to the clicked lowContrast signal", () => {
  const solution = createIntentSolution(
    {
      signals: {
        comment: { value: "#333333" },
        string: { value: "#ce9178" },
        background: { value: "#101010" }
      },
      risks: [
        { type: "lowContrast", signal: "comment", message: "comment is hard to read." },
        { type: "lowContrast", signal: "string", message: "string is hard to read." }
      ]
    },
    {
      source: "viewerClick",
      signal: "comment",
      sampleId: "syntax-sample",
      targetId: "syntax-comment",
      severity: "unspecified",
      message: "Comment visibility needs review."
    },
    [
      {
        type: "lowContrast",
        signals: ["comment"],
        settingId: "editor.tokenColorCustomizations",
        settingKey: "comments",
        suggestedColor: "#8fb8ff",
        confidence: 0.8
      },
      {
        type: "lowContrast",
        signals: ["string"],
        settingId: "editor.tokenColorCustomizations",
        settingKey: "strings",
        suggestedColor: "#ffd700",
        confidence: 0.7
      }
    ]
  );

  assert.equal(solution.status, "candidates");
  assert.deepEqual(solution.risks, [{ type: "lowContrast", signal: "comment", message: "comment is hard to read." }]);
  assert.equal(solution.candidates.length, 1);
  assert.equal(solution.candidates[0].settingKey, "comments");
  assert.deepEqual(solution.candidates[0].signals, ["comment"]);
});

test("createIntentSolution matches similarSignal risks when the clicked signal is included", () => {
  const solution = createIntentSolution(
    {
      signals: {
        error: { value: "#f44747" },
        diffDeleted: { value: "#f44747" },
        background: { value: "#101010" }
      },
      risks: [
        {
          type: "similarSignal",
          signals: ["error", "diffDeleted"],
          message: "error and diffDeleted are visually too similar."
        }
      ]
    },
    {
      source: "viewerClick",
      signal: "diffDeleted",
      sampleId: "diff-sample",
      targetId: "diff-deleted",
      severity: "unspecified",
      message: "Deleted Diff visibility needs review."
    },
    [
      {
        type: "similarSignal",
        signals: ["error", "diffDeleted"],
        settingId: "workbench.colorCustomizations",
        settingKey: "editorGutter.deletedBackground",
        suggestedColor: "#ff6b6b",
        confidence: 0.9
      }
    ]
  );

  assert.equal(solution.status, "candidates");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 1);
  assert.equal(solution.candidates[0].settingKey, "editorGutter.deletedBackground");
});

test("createIntentSolution returns noMatchingRisk when the clicked signal has no related risk", () => {
  const solution = createIntentSolution(
    {
      signals: {
        keyword: { value: "#569cd6" },
        background: { value: "#101010" }
      },
      risks: [{ type: "lowContrast", signal: "comment" }]
    },
    {
      source: "viewerClick",
      signal: "keyword",
      sampleId: "syntax-sample",
      targetId: "syntax-keyword",
      severity: "unspecified",
      message: "Keyword visibility needs review."
    },
    []
  );

  assert.equal(solution.status, "noMatchingRisk");
  assert.deepEqual(solution.risks, []);
  assert.deepEqual(solution.candidates, []);
});

test("createIntentSolution returns noCandidate when a related risk exists but no mapping rule applies", () => {
  const solution = createIntentSolution(
    {
      signals: {
        diffDeleted: { value: "#f44747" },
        background: { value: "#101010" }
      },
      risks: [{ type: "lowContrast", signal: "diffDeleted" }]
    },
    {
      source: "viewerClick",
      signal: "diffDeleted",
      sampleId: "diff-sample",
      targetId: "diff-deleted",
      severity: "unspecified",
      message: "Deleted Diff visibility needs review."
    },
    []
  );

  assert.equal(solution.status, "noCandidate");
  assert.deepEqual(solution.risks, [{ type: "lowContrast", signal: "diffDeleted" }]);
  assert.deepEqual(solution.candidates, []);
});
