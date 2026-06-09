"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { CandidateSaveSession } = require("../../out/patch/candidateSaveSession");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

const COMMENT_CANDIDATE_ID = "lowContrast-comment-editor.tokenColorCustomizations-comments";
const STRING_CANDIDATE_ID = "lowContrast-string-editor.tokenColorCustomizations-strings";

test("accept one candidate -> computeApplyPlan returns ready with nextSettings including that change and a rollbackSnapshot", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#ce9178"
    }
  );
  assert.ok(result.patchPlan.rollbackSnapshot, "expected a rollback snapshot");
  assert.ok(result.patchPlan.rollbackSnapshot.settings, "expected rollback snapshot settings");
});

test("accept TWO candidates -> batch plan includes BOTH changes with exactly one combined rollbackSnapshot", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#b7f2a1"
    }
  );
  assert.equal(result.selectedCandidates.length, 2);
  // exactly one combined rollback snapshot (single object, not an array)
  assert.ok(result.patchPlan.rollbackSnapshot && !Array.isArray(result.patchPlan.rollbackSnapshot));
  assert.ok(result.patchPlan.rollbackSnapshot.settings);
});

test("accept then reject the same id -> that id is NOT applied (falls to noStagedCandidates if only one)", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.reject(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.equal(result.status, "noStagedCandidates");
});

test("accept then reject in a multi-set -> rejected id excluded, other still applied", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);
  session.reject(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidates.length, 1);
  assert.equal(result.selectedCandidates[0].id, COMMENT_CANDIDATE_ID);
});

test("no acceptances (fresh) -> noStagedCandidates and does NOT throw", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  let result;
  assert.doesNotThrow(() => {
    result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });
  });
  assert.equal(result.status, "noStagedCandidates");
});

test("only rejections -> noStagedCandidates and does NOT throw", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.reject(COMMENT_CANDIDATE_ID);
  session.reject(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });
  assert.equal(result.status, "noStagedCandidates");
});

test("stale: computeApplyPlan with a differing currentReport -> staleReport even with accepted candidates", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan({
    currentReport: createCurrentThemeReport("Light+"),
    now: new Date("2026-06-08T00:00:00.000Z")
  });

  assert.deepEqual(result, { status: "staleReport" });
});

test("accept with unknown candidate id -> throws a clear Error", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  assert.throws(() => session.accept("does-not-exist"), /unknown|not found|candidate/i);
});

test("reject with unknown candidate id -> throws a clear Error", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  assert.throws(() => session.reject("does-not-exist"), /unknown|not found|candidate/i);
});

test("computeApplyPlan is non-mutating: calling twice returns equivalent result and staging is unchanged", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);

  const acceptedBefore = session.getAcceptedIds().slice().sort();

  const first = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });
  const second = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.deepEqual(second, first);

  const acceptedAfter = session.getAcceptedIds().slice().sort();
  assert.deepEqual(acceptedAfter, acceptedBefore);
});

test("idempotent accept: accepting the same id twice applies it once", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(COMMENT_CANDIDATE_ID);

  assert.equal(session.getAcceptedIds().length, 1);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });
  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidates.length, 1);
  assert.equal(result.selectedCandidates[0].id, COMMENT_CANDIDATE_ID);
});

test("getStatus reflects staged state and flips on accept/reject", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "pending");
  session.accept(COMMENT_CANDIDATE_ID);
  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "accepted");
  session.reject(COMMENT_CANDIDATE_ID);
  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "rejected");
});

// ============================================================
// Phase 3a — registerCandidates + computeApplyPlan existingSettings override
// ============================================================

test("registerCandidates: a previously-unknown candidate id becomes a valid accept target and reaches the plan", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);
  const initialSubset = all.filter((c) => c.id === COMMENT_CANDIDATE_ID);
  const rest = all.filter((c) => c.id !== COMMENT_CANDIDATE_ID);

  const session = new CandidateSaveSession({
    report,
    candidates: initialSubset,
    existingSettings: createExistingSettings()
  });

  session.registerCandidates(rest);
  session.accept(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan({ now: new Date("2026-06-08T00:00:00.000Z") });

  assert.equal(result.status, "ready");
  assert.equal(
    result.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].strings,
    "#b7f2a1"
  );
});

test("accept on an unknown id throws BEFORE registering, succeeds AFTER registering", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);
  const initialSubset = all.filter((c) => c.id === COMMENT_CANDIDATE_ID);
  const rest = all.filter((c) => c.id !== COMMENT_CANDIDATE_ID);

  const session = new CandidateSaveSession({
    report,
    candidates: initialSubset,
    existingSettings: createExistingSettings()
  });

  assert.throws(() => session.accept(STRING_CANDIDATE_ID), /unknown|not found|candidate/i);

  session.registerCandidates(rest);
  assert.doesNotThrow(() => session.accept(STRING_CANDIDATE_ID));
  assert.equal(session.getStatus(STRING_CANDIDATE_ID), "accepted");
});

test("registerCandidates dedups by id and does NOT disturb existing staged decisions", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);

  const session = new CandidateSaveSession({
    report,
    candidates: all,
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);
  const acceptedBefore = session.getAcceptedIds().slice();

  // register a set that re-includes the already-known COMMENT id
  session.registerCandidates(all);

  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "accepted");
  assert.deepEqual(session.getAcceptedIds(), acceptedBefore);
});

test("registerCandidates: getAcceptedIds returns existing-first then registration-order", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);
  const initialSubset = all.filter((c) => c.id === COMMENT_CANDIDATE_ID);
  const rest = all.filter((c) => c.id !== COMMENT_CANDIDATE_ID);

  const session = new CandidateSaveSession({
    report,
    candidates: initialSubset,
    existingSettings: createExistingSettings()
  });

  session.registerCandidates(rest);

  // accept registered first, existing last — order must STILL be existing-first
  session.accept(STRING_CANDIDATE_ID);
  session.accept(COMMENT_CANDIDATE_ID);

  assert.deepEqual(session.getAcceptedIds(), [COMMENT_CANDIDATE_ID, STRING_CANDIDATE_ID]);
});

test("computeApplyPlan existingSettings override: rollback/merge reflect the override, omitting falls back to constructor", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  session.accept(COMMENT_CANDIDATE_ID);

  const overrideSettings = createExistingSettings();
  overrideSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments = "#abcdef";

  const withOverride = session.computeApplyPlan({
    now: new Date("2026-06-08T00:00:00.000Z"),
    existingSettings: overrideSettings
  });
  const withoutOverride = session.computeApplyPlan({
    now: new Date("2026-06-08T00:00:00.000Z")
  });

  assert.equal(withOverride.status, "ready");
  assert.equal(withoutOverride.status, "ready");

  // rollback snapshot reflects the LIVE/override existing color, not the constructor snapshot
  assert.equal(
    withOverride.patchPlan.rollbackSnapshot.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#abcdef"
  );
  assert.equal(
    withoutOverride.patchPlan.rollbackSnapshot.settings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#6a9955"
  );
  assert.notDeepEqual(
    withOverride.patchPlan.rollbackSnapshot.settings,
    withoutOverride.patchPlan.rollbackSnapshot.settings
  );
});

test("computeApplyPlan existingSettings override is non-mutating and honors staleReport/noStagedCandidates ordering", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report),
    existingSettings: createExistingSettings()
  });

  const overrideSettings = createExistingSettings();

  // noStagedCandidates: override present but nothing accepted
  assert.equal(
    session.computeApplyPlan({ existingSettings: overrideSettings }).status,
    "noStagedCandidates"
  );

  session.accept(COMMENT_CANDIDATE_ID);

  // staleReport beats override-based plan
  assert.deepEqual(
    session.computeApplyPlan({
      existingSettings: overrideSettings,
      currentReport: createCurrentThemeReport("Light+"),
      now: new Date("2026-06-08T00:00:00.000Z")
    }),
    { status: "staleReport" }
  );

  // non-mutating: the override object is not mutated by plan computation
  const overrideSnapshot = JSON.parse(JSON.stringify(overrideSettings));
  session.computeApplyPlan({
    existingSettings: overrideSettings,
    now: new Date("2026-06-08T00:00:00.000Z")
  });
  assert.deepEqual(overrideSettings, overrideSnapshot);
});

function createCandidates(report) {
  const candidates = createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);
  assert.ok(
    candidates.find((c) => c.id === COMMENT_CANDIDATE_ID),
    `expected engine to produce candidate ${COMMENT_CANDIDATE_ID}`
  );
  assert.ok(
    candidates.find((c) => c.id === STRING_CANDIDATE_ID),
    `expected engine to produce candidate ${STRING_CANDIDATE_ID}`
  );
  return candidates;
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

function createCurrentThemeReport(themeName) {
  return {
    ...createCandidateRichReport(),
    generatedAt: "2026-06-08T00:00:00.000Z",
    theme: {
      ...createCandidateRichReport().theme,
      configuredName: themeName
    }
  };
}
