"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPatchPlan,
  buildRollbackPlan,
  createPatchRecipeFromCandidates,
  serializeCandidatePatch
} = require("../../out/adapter/vscode/settingsSerializer");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");
const { SAMPLE_PATCH_RECIPE } = require("../fixtures/patch.fixtures.js");

const COMMENT_CANDIDATE_ID = "lowContrast-comment-editor.tokenColorCustomizations-comments";
const STRING_CANDIDATE_ID = "lowContrast-string-editor.tokenColorCustomizations-strings";

test("buildPatchPlan preserves existing overrides while applying sample patch values", () => {
  const existingSettings = {
    "workbench.colorCustomizations": {
      "editor.background": "#111111",
      "editorError.foreground": "#ff0000"
    },
    "editor.tokenColorCustomizations": {
      comments: "#777777"
    },
    "editor.semanticTokenColorCustomizations": {
      enabled: true
    }
  };

  const plan = buildPatchPlan(existingSettings, SAMPLE_PATCH_RECIPE);

  assert.equal(plan.settingsUpdates.length, 3);
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["editorError.foreground"],
    SAMPLE_PATCH_RECIPE.settings["workbench.colorCustomizations"]["editorError.foreground"]
  );
  assert.deepEqual(
    plan.rollbackSnapshot.settings["workbench.colorCustomizations"],
    existingSettings["workbench.colorCustomizations"]
  );
});

test("buildRollbackPlan restores exactly the settings captured in the snapshot", () => {
  const snapshot = {
    createdAt: "2026-06-04T00:00:00.000Z",
    recipeId: "sample-hardcoded-contrast-v1",
    settings: {
      "workbench.colorCustomizations": {
        "editor.background": "#111111"
      },
      "editor.tokenColorCustomizations": {},
      "editor.semanticTokenColorCustomizations": {
        enabled: true
      }
    }
  };

  const plan = buildRollbackPlan(snapshot);

  assert.deepEqual(plan.settingsUpdates, [
    {
      section: "workbench",
      key: "colorCustomizations",
      value: { "editor.background": "#111111" }
    },
    {
      section: "editor",
      key: "tokenColorCustomizations",
      value: {}
    },
    {
      section: "editor",
      key: "semanticTokenColorCustomizations",
      value: { enabled: true }
    }
  ]);
});

test("buildPatchPlan preserves existing values inside a theme-specific customization bucket", () => {
  const existingSettings = {
    "workbench.colorCustomizations": {
      "[Default Dark+]": {
        "editor.background": "#111111"
      }
    },
    "editor.tokenColorCustomizations": {},
    "editor.semanticTokenColorCustomizations": {}
  };
  const recipe = createPatchRecipeFromCandidates(
    [
      {
        id: "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorError.foreground",
        riskType: "similarSignal",
        signals: ["error"],
        settingId: "workbench.colorCustomizations",
        settingKey: "editorError.foreground",
        currentSignals: { error: "#f44747" },
        suggestedColor: "#ff6b6b",
        reason: "error needs separation.",
        scope: "theme",
        confidence: 0.7
      }
    ],
    "Default Dark+"
  );

  const plan = buildPatchPlan(existingSettings, recipe);

  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editor.background"],
    "#111111"
  );
  assert.equal(
    plan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorError.foreground"],
    "#ff6b6b"
  );
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

// ============================================================
// serializeCandidatePatch — DTO → VS Code patch plan.
// This is the PRESERVED end-behavior guarantee that previously lived in
// candidateSaveSession.test.js (exact nextSettings, single combined rollback
// snapshot, color-override reflected). It uses the same engine fixtures.
// ============================================================

test("serializeCandidatePatch: one selected candidate -> exact nextSettings + rollback snapshot", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const comment = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID);

  const plan = serializeCandidatePatch(
    [comment],
    report.theme.configuredName,
    createExistingSettings(),
    new Date("2026-06-08T00:00:00.000Z")
  );

  assert.deepEqual(
    plan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#ce9178"
    }
  );
  assert.ok(plan.rollbackSnapshot, "expected a rollback snapshot");
  assert.ok(plan.rollbackSnapshot.settings, "expected rollback snapshot settings");
  assert.equal(plan.rollbackSnapshot.createdAt, "2026-06-08T00:00:00.000Z");
});

test("serializeCandidatePatch: TWO selected candidates -> both changes with exactly one combined rollback snapshot", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const comment = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID);
  const string = candidates.find((c) => c.id === STRING_CANDIDATE_ID);

  const plan = serializeCandidatePatch(
    [comment, string],
    report.theme.configuredName,
    createExistingSettings(),
    new Date("2026-06-08T00:00:00.000Z")
  );

  assert.deepEqual(
    plan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#b7f2a1"
    }
  );
  // exactly one combined rollback snapshot (single object, not an array)
  assert.ok(plan.rollbackSnapshot && !Array.isArray(plan.rollbackSnapshot));
  assert.ok(plan.rollbackSnapshot.settings);
});

test("serializeCandidatePatch: color override is reflected in nextSettings", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const comment = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID);
  // Effective candidate as the session would emit after a color override.
  const overridden = { ...comment, suggestedColor: "#abcdef" };

  const plan = serializeCandidatePatch(
    [overridden],
    report.theme.configuredName,
    createExistingSettings(),
    new Date("2026-06-08T00:00:00.000Z")
  );

  assert.equal(
    plan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#abcdef"
  );
});

test("serializeCandidatePatch: rollback snapshot reflects the existingSettings passed in", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const comment = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID);

  const overrideSettings = createExistingSettings();
  overrideSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments = "#abcdef";

  const withOverride = serializeCandidatePatch(
    [comment],
    report.theme.configuredName,
    overrideSettings,
    new Date("2026-06-08T00:00:00.000Z")
  );
  const withConstructorBaseline = serializeCandidatePatch(
    [comment],
    report.theme.configuredName,
    createExistingSettings(),
    new Date("2026-06-08T00:00:00.000Z")
  );

  assert.equal(
    withOverride.rollbackSnapshot.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#abcdef"
  );
  assert.equal(
    withConstructorBaseline.rollbackSnapshot.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#6a9955"
  );
});

test("serializeCandidatePatch is non-mutating w.r.t. the existingSettings argument", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const comment = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID);

  const existing = createExistingSettings();
  const snapshot = JSON.parse(JSON.stringify(existing));

  serializeCandidatePatch([comment], report.theme.configuredName, existing, new Date("2026-06-08T00:00:00.000Z"));

  assert.deepEqual(existing, snapshot);
});

function createCandidates(report) {
  return createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);
}

function createCandidateRichReport() {
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
      {
        type: "lowContrast",
        signal: "comment",
        contrastRatio: 2.1,
        threshold: 4.5,
        message: "comment has low contrast against the editor background."
      },
      {
        type: "lowContrast",
        signal: "string",
        contrastRatio: 2.3,
        threshold: 4.5,
        message: "string has low contrast against the editor background."
      },
      {
        type: "similarSignal",
        signals: ["error", "diffDeleted"],
        colorDistance: 8,
        message: "error and diffDeleted are visually close."
      }
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
    "editor.semanticTokenColorCustomizations": {
      enabled: true
    }
  };
}
