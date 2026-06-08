"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDefaultCandidateRuleUri,
  loadCandidateRulesFromUri
} = require("../../out/adapter/candidateRuleAdapter");
const { createCandidateRulesProvider } = require("../../out/adapter/candidateRuleProvider");

test("createDefaultCandidateRuleUri resolves the bundled default rule path", () => {
  const calls = [];
  const vscodeLike = {
    Uri: {
      joinPath(base, ...parts) {
        calls.push({ base, parts });
        return `${base}/${parts.join("/")}`;
      }
    }
  };

  const uri = createDefaultCandidateRuleUri(vscodeLike, "extension-root");

  assert.equal(uri, "extension-root/resources/rules/default-candidate-rules.json");
  assert.deepEqual(calls[0].parts, ["resources", "rules", "default-candidate-rules.json"]);
});

test("loadCandidateRulesFromUri reads and parses a valid rule bundle", async () => {
  const vscodeLike = {
    workspace: {
      fs: {
        async readFile(uri) {
          assert.equal(uri, "rules-uri");
          return Buffer.from(JSON.stringify({
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
          }), "utf8");
        }
      }
    }
  };

  const rules = await loadCandidateRulesFromUri(vscodeLike, "rules-uri");

  assert.equal(rules.length, 1);
  assert.equal(rules[0].settingKey, "comments");
});

test("loadCandidateRulesFromUri throws parser errors for invalid bundles", async () => {
  const vscodeLike = {
    workspace: {
      fs: {
        async readFile() {
          return Buffer.from(JSON.stringify({ version: 2, candidateMappings: [] }), "utf8");
        }
      }
    }
  };

  await assert.rejects(
    () => loadCandidateRulesFromUri(vscodeLike, "rules-uri"),
    /Invalid candidate rule bundle: .*version/
  );
});

test("createCandidateRulesProvider retries after a load failure", async () => {
  let attempts = 0;
  const provider = createCandidateRulesProvider(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("first load failed");
    }
    return [{ settingKey: "comments" }];
  });

  await assert.rejects(() => provider(), /first load failed/);

  const rules = await provider();

  assert.equal(attempts, 2);
  assert.deepEqual(rules, [{ settingKey: "comments" }]);
});
