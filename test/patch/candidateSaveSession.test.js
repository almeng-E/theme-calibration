"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { CandidateSaveSession } = require("../../out/patch/candidateSaveSession");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

const COMMENT_CANDIDATE_ID = "lowContrast-comment-editor.tokenColorCustomizations-comments";
const STRING_CANDIDATE_ID = "lowContrast-string-editor.tokenColorCustomizations-strings";

// ============================================================
// computeApplyPlan now returns an editor-agnostic DTO:
//   { status: "ready"; selectedCandidates: CandidateDto[]; themeName? }
// The VS Code settings-shape end-behavior (nextSettings / rollbackSnapshot)
// is now guaranteed by serializeCandidatePatch in the serializer test.
// ============================================================

test("accept one candidate -> ready DTO carries that candidate (effective color) and themeName", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan();

  assert.equal(result.status, "ready");
  assert.equal(result.themeName, "Default Dark+");
  assert.equal(result.selectedCandidates.length, 1);
  assert.equal(result.selectedCandidates[0].id, COMMENT_CANDIDATE_ID);
  assert.equal(result.selectedCandidates[0].suggestedColor, "#8fb8ff");
});

test("accept TWO candidates -> ready DTO carries BOTH in original order with effective colors", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan();

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidates.length, 2);
  assert.deepEqual(result.selectedCandidates.map((c) => c.id), [COMMENT_CANDIDATE_ID, STRING_CANDIDATE_ID]);
  assert.equal(result.selectedCandidates.find((c) => c.id === COMMENT_CANDIDATE_ID).suggestedColor, "#8fb8ff");
  assert.equal(result.selectedCandidates.find((c) => c.id === STRING_CANDIDATE_ID).suggestedColor, "#b7f2a1");
});

test("accept then reject the same id -> that id is NOT applied (falls to noStagedCandidates if only one)", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.reject(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan();

  assert.equal(result.status, "noStagedCandidates");
});

test("accept then reject in a multi-set -> rejected id excluded, other still in DTO", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);
  session.reject(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan();

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidates.length, 1);
  assert.equal(result.selectedCandidates[0].id, COMMENT_CANDIDATE_ID);
});

test("no acceptances (fresh) -> noStagedCandidates and does NOT throw", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  let result;
  assert.doesNotThrow(() => {
    result = session.computeApplyPlan();
  });
  assert.equal(result.status, "noStagedCandidates");
});

test("only rejections -> noStagedCandidates and does NOT throw", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.reject(COMMENT_CANDIDATE_ID);
  session.reject(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan();
  assert.equal(result.status, "noStagedCandidates");
});

test("stale: computeApplyPlan with a differing currentReport -> staleReport even with accepted candidates", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);

  const result = session.computeApplyPlan({
    currentReport: createCurrentThemeReport("Light+")
  });

  assert.deepEqual(result, { status: "staleReport" });
});

test("accept with unknown candidate id -> throws a clear Error", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  assert.throws(() => session.accept("does-not-exist"), /unknown|not found|candidate/i);
});

test("reject with unknown candidate id -> throws a clear Error", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  assert.throws(() => session.reject("does-not-exist"), /unknown|not found|candidate/i);
});

test("computeApplyPlan is non-mutating: calling twice returns equivalent result and staging is unchanged", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(STRING_CANDIDATE_ID);

  const acceptedBefore = session.getAcceptedIds().slice().sort();

  const first = session.computeApplyPlan();
  const second = session.computeApplyPlan();

  assert.deepEqual(second, first);

  const acceptedAfter = session.getAcceptedIds().slice().sort();
  assert.deepEqual(acceptedAfter, acceptedBefore);
});

test("idempotent accept: accepting the same id twice applies it once", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.accept(COMMENT_CANDIDATE_ID);

  assert.equal(session.getAcceptedIds().length, 1);

  const result = session.computeApplyPlan();
  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidates.length, 1);
  assert.equal(result.selectedCandidates[0].id, COMMENT_CANDIDATE_ID);
});

test("getStatus reflects staged state and flips on accept/reject", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "pending");
  session.accept(COMMENT_CANDIDATE_ID);
  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "accepted");
  session.reject(COMMENT_CANDIDATE_ID);
  assert.equal(session.getStatus(COMMENT_CANDIDATE_ID), "rejected");
});

// ============================================================
// Phase 3a — registerCandidates
// ============================================================

test("registerCandidates: a previously-unknown candidate id becomes a valid accept target and reaches the DTO", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);
  const initialSubset = all.filter((c) => c.id === COMMENT_CANDIDATE_ID);
  const rest = all.filter((c) => c.id !== COMMENT_CANDIDATE_ID);

  const session = new CandidateSaveSession({
    report,
    candidates: initialSubset
  });

  session.registerCandidates(rest);
  session.accept(STRING_CANDIDATE_ID);

  const result = session.computeApplyPlan();

  assert.equal(result.status, "ready");
  const stringCandidate = result.selectedCandidates.find((c) => c.id === STRING_CANDIDATE_ID);
  assert.ok(stringCandidate, "expected the registered candidate to reach the DTO");
  assert.equal(stringCandidate.suggestedColor, "#b7f2a1");
});

test("accept on an unknown id throws BEFORE registering, succeeds AFTER registering", () => {
  const report = createCandidateRichReport();
  const all = createCandidates(report);
  const initialSubset = all.filter((c) => c.id === COMMENT_CANDIDATE_ID);
  const rest = all.filter((c) => c.id !== COMMENT_CANDIDATE_ID);

  const session = new CandidateSaveSession({
    report,
    candidates: initialSubset
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
    candidates: all
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
    candidates: initialSubset
  });

  session.registerCandidates(rest);

  // accept registered first, existing last — order must STILL be existing-first
  session.accept(STRING_CANDIDATE_ID);
  session.accept(COMMENT_CANDIDATE_ID);

  assert.deepEqual(session.getAcceptedIds(), [COMMENT_CANDIDATE_ID, STRING_CANDIDATE_ID]);
});

test("getAcceptedCandidates returns the accepted candidate OBJECTS in original ordering and is non-mutating", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const session = new CandidateSaveSession({
    report,
    candidates
  });

  // Nothing accepted yet.
  assert.deepEqual(session.getAcceptedCandidates(), []);

  session.accept(STRING_CANDIDATE_ID);
  session.accept(COMMENT_CANDIDATE_ID);

  const accepted = session.getAcceptedCandidates();
  // Returns full objects, not just ids, in original candidate ordering.
  assert.deepEqual(accepted.map((c) => c.id), [COMMENT_CANDIDATE_ID, STRING_CANDIDATE_ID]);
  assert.equal(accepted[0].suggestedColor, candidates.find((c) => c.id === COMMENT_CANDIDATE_ID).suggestedColor);

  // Rejecting removes it from the accepted set (non-mutating accessor).
  session.reject(COMMENT_CANDIDATE_ID);
  assert.deepEqual(session.getAcceptedCandidates().map((c) => c.id), [STRING_CANDIDATE_ID]);
});

test("computeApplyPlan honors staleReport over noStagedCandidates ordering and is non-mutating", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  // noStagedCandidates: nothing accepted
  assert.equal(session.computeApplyPlan().status, "noStagedCandidates");

  session.accept(COMMENT_CANDIDATE_ID);

  // staleReport beats a ready plan
  assert.deepEqual(
    session.computeApplyPlan({
      currentReport: createCurrentThemeReport("Light+")
    }),
    { status: "staleReport" }
  );

  // non-mutating: repeated calls keep staging stable
  const acceptedBefore = session.getAcceptedIds().slice();
  session.computeApplyPlan();
  assert.deepEqual(session.getAcceptedIds(), acceptedBefore);
});

// ============================================================
// Phase 4 — per-candidate color override (setColorOverride)
// ============================================================

const { renderAfterLayerHtml } = require("../../out/ui/afterLayer");

test("setColorOverride changes the effective color: computeApplyPlan + getAcceptedCandidates reflect the OVERRIDE", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.accept(COMMENT_CANDIDATE_ID);
  session.setColorOverride(COMMENT_CANDIDATE_ID, "#abcdef");

  const result = session.computeApplyPlan();

  assert.equal(result.status, "ready");
  const overriddenInPlan = result.selectedCandidates.find((c) => c.id === COMMENT_CANDIDATE_ID);
  assert.equal(overriddenInPlan.suggestedColor, "#abcdef");

  const accepted = session.getAcceptedCandidates();
  const overridden = accepted.find((c) => c.id === COMMENT_CANDIDATE_ID);
  assert.equal(overridden.suggestedColor, "#abcdef");
});

test("setColorOverride AUTO-ACCEPTS a pending candidate", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  assert.equal(session.getStatus(STRING_CANDIDATE_ID), "pending");
  session.setColorOverride(STRING_CANDIDATE_ID, "#123456");
  assert.equal(session.getStatus(STRING_CANDIDATE_ID), "accepted");

  const result = session.computeApplyPlan();
  assert.equal(result.status, "ready");
  assert.equal(
    result.selectedCandidates.find((c) => c.id === STRING_CANDIDATE_ID).suggestedColor,
    "#123456"
  );
});

test("setColorOverride throws on invalid hex and on unknown id", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  assert.throws(() => session.setColorOverride(COMMENT_CANDIDATE_ID, "not-a-color"), /hex|color/i);
  assert.throws(() => session.setColorOverride("does-not-exist", "#abcdef"), /unknown|not found|candidate/i);
});

test("reject after override -> excluded from DTO (override dormant); re-accept re-applies the override color", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.setColorOverride(COMMENT_CANDIDATE_ID, "#abcdef");
  session.reject(COMMENT_CANDIDATE_ID);

  const rejected = session.computeApplyPlan();
  assert.equal(rejected.status, "noStagedCandidates");
  // override is preserved while dormant
  assert.equal(session.getColorOverride(COMMENT_CANDIDATE_ID), "#abcdef");

  session.accept(COMMENT_CANDIDATE_ID);
  const reaccepted = session.computeApplyPlan();
  assert.equal(reaccepted.status, "ready");
  assert.equal(
    reaccepted.selectedCandidates.find((c) => c.id === COMMENT_CANDIDATE_ID).suggestedColor,
    "#abcdef"
  );
});

test("setColorOverride does NOT mutate the original candidate objects", () => {
  const report = createCandidateRichReport();
  const candidates = createCandidates(report);
  const originalColor = candidates.find((c) => c.id === COMMENT_CANDIDATE_ID).suggestedColor;

  const session = new CandidateSaveSession({
    report,
    candidates
  });

  session.setColorOverride(COMMENT_CANDIDATE_ID, "#abcdef");

  // the source array's candidate object is untouched
  assert.equal(candidates.find((c) => c.id === COMMENT_CANDIDATE_ID).suggestedColor, originalColor);
  assert.notEqual(originalColor, "#abcdef");
});

test("preview parity: renderAfterLayerHtml(report, getAcceptedCandidates()) reflects the override color", () => {
  const report = createCandidateRichReport();
  const session = new CandidateSaveSession({
    report,
    candidates: createCandidates(report)
  });

  session.setColorOverride(COMMENT_CANDIDATE_ID, "#abcdef");

  const html = renderAfterLayerHtml(report, session.getAcceptedCandidates());
  assert.match(html, /#abcdef/i);
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
