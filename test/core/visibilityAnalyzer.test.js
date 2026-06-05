"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeVisibility,
  calculateSignalContrasts,
  createVisibilityRisks
} = require("../../out/core/visibilityAnalyzer");

test("calculateSignalContrasts calculates contrast for signals against editor background", () => {
  const contrast = calculateSignalContrasts({
    background: { value: "#101010" },
    comment: { value: "#222222" },
    foreground: { value: "#eeeeee" }
  });

  assert.ok(contrast.comment.ratio < 2);
  assert.ok(contrast.foreground.ratio > 10);
});

test("createVisibilityRisks creates low contrast risks with configurable threshold", () => {
  const risks = createVisibilityRisks(
    {
      background: { value: "#101010" },
      comment: { value: "#777777" }
    },
    {
      comment: { ratio: 4.1 }
    },
    {
      textContrastThreshold: 4.5
    }
  );

  assert.equal(risks.length, 1);
  assert.equal(risks[0].type, "lowContrast");
  assert.equal(risks[0].signal, "comment");
  assert.equal(risks[0].threshold, 4.5);
});

test("createVisibilityRisks creates similar signal risks with configurable pairs and distance", () => {
  const risks = createVisibilityRisks(
    {
      error: { value: "#f44747" },
      diffDeleted: { value: "#f44747" }
    },
    {},
    {
      similarSignalDistanceThreshold: 1,
      similarSignalPairs: [["error", "diffDeleted"]]
    }
  );

  assert.equal(risks.length, 1);
  assert.equal(risks[0].type, "similarSignal");
  assert.deepEqual(risks[0].signals, ["error", "diffDeleted"]);
  assert.equal(risks[0].colorDistance, 0);
});

test("analyzeVisibility returns noObviousRisk when simple rules find nothing", () => {
  const result = analyzeVisibility({
    background: { value: "#000000" },
    foreground: { value: "#ffffff" }
  });

  assert.ok(result.contrast.foreground.ratio > 20);
  assert.equal(result.risks.length, 1);
  assert.equal(result.risks[0].type, "noObviousRisk");
});
