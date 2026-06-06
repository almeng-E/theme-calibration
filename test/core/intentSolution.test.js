const test = require("node:test");
const assert = require("node:assert/strict");
const { createIntentSolution } = require("../../out/core/intentSolution");

function createReport(risks) {
  return {
    theme: { configuredName: "Default Dark+" },
    signals: {
      background: { role: "background", value: "#1e1e1e", source: "editor.background" },
      comment: { role: "comment", value: "#3f3f3f", source: "token.comment" },
      string: { role: "string", value: "#ce9178", source: "token.string" },
      error: { role: "error", value: "#f14c4c", source: "editorError.foreground" },
      diffDeleted: { role: "diffDeleted", value: "#f15c5c", source: "editorGutter.deletedBackground" }
    },
    contrast: {},
    risks
  };
}

test("createIntentSolution returns candidates related to clicked signal", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "comment",
      contrastRatio: 2.1,
      threshold: 4.5,
      message: "comment has low contrast against the editor background."
    },
    {
      type: "similarSignal",
      signals: ["error", "diffDeleted"],
      colorDistance: 8,
      message: "error and diffDeleted are visually close."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "comment",
    targetId: "syntax-comment",
    sampleId: "syntax-sample",
    message: "Comment visibility needs review.",
    severity: "unspecified"
  });

  assert.equal(solution.status, "candidates");
  assert.equal(solution.intent.signal, "comment");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 1);
  assert.equal(solution.candidates[0].settingKey, "comments");
});

test("createIntentSolution includes similar-signal risks containing the clicked signal", () => {
  const report = createReport([
    {
      type: "similarSignal",
      signals: ["error", "diffDeleted"],
      colorDistance: 8,
      message: "error and diffDeleted are visually close."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "diffDeleted",
    targetId: "diff-deleted",
    severity: "unspecified"
  });

  assert.equal(solution.status, "candidates");
  assert.equal(solution.risks.length, 1);
  assert.deepEqual(solution.candidates[0].signals, ["error", "diffDeleted"]);
});

test("createIntentSolution reports no matching risk when the clicked signal is not risky", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "comment",
      contrastRatio: 2.1,
      threshold: 4.5,
      message: "comment has low contrast against the editor background."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "string",
    targetId: "syntax-string",
    severity: "unspecified"
  });

  assert.equal(solution.status, "noMatchingRisk");
  assert.equal(solution.risks.length, 0);
  assert.equal(solution.candidates.length, 0);
});

test("createIntentSolution reports no candidate when a matching risk has no conservative mapping", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "diffDeleted",
      contrastRatio: 2.2,
      threshold: 4.5,
      message: "diffDeleted has low contrast against the editor background."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "diffDeleted",
    targetId: "diff-deleted",
    severity: "unspecified"
  });

  assert.equal(solution.status, "noCandidate");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 0);
});
