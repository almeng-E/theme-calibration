"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { overlayCandidateColors } = require("../../out/ui/themeColorOverlay");

// overlayCandidateColors(base, candidates) is a PURE helper:
// returns a NEW map = { ...base } with, for each candidate, for each role in
// candidate.signals, result[role] = candidate.suggestedColor.

function createBase() {
  return {
    background: "#101010",
    foreground: "#eeeeee",
    comment: "#222222",
    string: "#ce9178",
    keyword: "#569cd6",
    error: "#f44747",
    warning: "#ffd166",
    diffAdded: "#4cc38a",
    diffDeleted: "#f44747"
  };
}

test("overlayCandidateColors with no candidates returns a copy equal to base", () => {
  const base = createBase();
  const result = overlayCandidateColors(base, []);

  assert.deepEqual(result, base);
  assert.notEqual(result, base, "must return a NEW map, not the same reference");
});

test("overlayCandidateColors overrides targeted roles and leaves others untouched", () => {
  const base = createBase();
  const candidate = {
    id: "cand-1",
    signals: ["comment"],
    suggestedColor: "#abcdef"
  };

  const result = overlayCandidateColors(base, [candidate]);

  assert.equal(result.comment, "#abcdef", "comment role overridden");
  assert.equal(result.keyword, base.keyword, "non-targeted role untouched");
  assert.equal(result.string, base.string, "non-targeted role untouched");
});

test("overlayCandidateColors does not mutate the original base map", () => {
  const base = createBase();
  const candidate = {
    id: "cand-1",
    signals: ["comment", "keyword"],
    suggestedColor: "#abcdef"
  };

  overlayCandidateColors(base, [candidate]);

  assert.equal(base.comment, "#222222", "base.comment must remain unchanged");
  assert.equal(base.keyword, "#569cd6", "base.keyword must remain unchanged");
});

test("overlayCandidateColors applies multiple candidates and multi-role candidates", () => {
  const base = createBase();
  const candidates = [
    { id: "c1", signals: ["comment"], suggestedColor: "#abcdef" },
    { id: "c2", signals: ["keyword", "string"], suggestedColor: "#123456" }
  ];

  const result = overlayCandidateColors(base, candidates);

  assert.equal(result.comment, "#abcdef");
  assert.equal(result.keyword, "#123456");
  assert.equal(result.string, "#123456");
  assert.equal(result.error, base.error, "untouched role unchanged");
});

test("overlayCandidateColors later candidate wins on overlapping role", () => {
  const base = createBase();
  const candidates = [
    { id: "c1", signals: ["comment"], suggestedColor: "#aaaaaa" },
    { id: "c2", signals: ["comment"], suggestedColor: "#bbbbbb" }
  ];

  const result = overlayCandidateColors(base, candidates);

  assert.equal(result.comment, "#bbbbbb", "last candidate wins");
});
