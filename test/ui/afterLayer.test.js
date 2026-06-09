"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { renderAfterLayerHtml } = require("../../out/ui/afterLayer");

// renderAfterLayerHtml(report, acceptedCandidates) is a PURE helper:
// it overlays the accepted candidates' suggestedColor onto the report's
// normalized signals and returns the layer-B samples HTML (no I/O).

test("renderAfterLayerHtml with no accepted candidates reflects the base signals", () => {
  const report = createFakeReport("Sample Dark");
  const html = renderAfterLayerHtml(report, []);

  // The comment signal base color (#222222) must appear; no candidate color.
  assert.match(html, /#222222/);
  assert.doesNotMatch(html, /#abcdef/);
});

test("renderAfterLayerHtml with one accepted candidate reflects its suggestedColor", () => {
  const report = createFakeReport("Sample Dark");
  const candidate = {
    id: "cand-1",
    settingKey: "comment",
    suggestedColor: "#abcdef",
    reason: "improve comment contrast",
    signals: ["comment"]
  };

  const html = renderAfterLayerHtml(report, [candidate]);

  // The accepted candidate's color overlays the comment signal.
  assert.match(html, /#abcdef/);
  // The base comment color is gone (overlaid).
  assert.doesNotMatch(html, /#222222/);
});

test("renderAfterLayerHtml with two accepted candidates reflects both colors", () => {
  const report = createFakeReport("Sample Dark");
  const candidates = [
    {
      id: "cand-1",
      settingKey: "comment",
      suggestedColor: "#abcdef",
      reason: "comment",
      signals: ["comment"]
    },
    {
      id: "cand-2",
      settingKey: "keyword",
      suggestedColor: "#123456",
      reason: "keyword",
      signals: ["keyword"]
    }
  ];

  const html = renderAfterLayerHtml(report, candidates);

  assert.match(html, /#abcdef/);
  assert.match(html, /#123456/);
});

function createFakeReport(themeName) {
  return {
    theme: {
      configuredName: themeName
    },
    signals: {
      background: { value: "#101010" },
      foreground: { value: "#eeeeee" },
      comment: { value: "#222222" },
      string: { value: "#ce9178" },
      keyword: { value: "#569cd6" },
      error: { value: "#f44747" },
      warning: { value: "#ffd166" },
      diffAdded: { value: "#4cc38a" },
      diffDeleted: { value: "#f44747" }
    },
    risks: []
  };
}
