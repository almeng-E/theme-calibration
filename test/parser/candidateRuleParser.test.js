"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCandidateRuleBundle } = require("../../out/adapter/vscode/ruleParser");
const {
  LOW_CONTRAST_MAPPINGS,
  SIMILAR_SIGNAL_MAPPINGS
} = require("../fixtures/diagnostic.fixtures.js");

test("parseCandidateRuleBundle accepts a valid versioned rule bundle", () => {
  const result = parseCandidateRuleBundle({
    version: 1,
    candidateMappings: [
      {
        type: "lowContrast",
        signals: ["comment"],
        settingId: "editor.tokenColorCustomizations",
        settingKey: "comments",
        suggestedColor: "#8fb8ff",
        confidence: 0.8
      }
    ]
  });

  assert.equal(result.status, "valid");
  assert.equal(result.rules.length, 1);
  assert.equal(result.rules[0].signals[0], "comment");
});

test("parseCandidateRuleBundle rejects invalid rule fields with precise errors", () => {
  const result = parseCandidateRuleBundle({
    version: 1,
    candidateMappings: [
      {
        type: "lowContrast",
        signals: ["notASignal"],
        settingId: "not.a.setting",
        settingKey: "",
        suggestedColor: "blue",
        confidence: 1.5
      }
    ]
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.rules, []);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.signals\[0\]/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.settingId/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.settingKey/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.suggestedColor/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.confidence/);
});

test("parseCandidateRuleBundle rejects unsupported bundle versions", () => {
  const result = parseCandidateRuleBundle({
    version: 2,
    candidateMappings: []
  });

  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /version/);
});

test("default candidate rule bundle matches the conservative diagnostic fixture mappings", () => {
  const bundlePath = path.join(__dirname, "../../resources/rules/default-candidate-rules.json");
  const raw = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
  const result = parseCandidateRuleBundle(raw);

  assert.equal(result.status, "valid");
  assert.deepEqual(result.rules, [
    ...LOW_CONTRAST_MAPPINGS,
    ...SIMILAR_SIGNAL_MAPPINGS
  ]);
});
