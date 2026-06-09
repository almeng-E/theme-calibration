"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { createEditorViewerCandidateApplyPlan } = require("../../out/patch/editorViewerApplyService");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

const COMMENT_CANDIDATE_ID = "lowContrast-comment-editor.tokenColorCustomizations-comments";

test("createEditorViewerCandidateApplyPlan returns staleReport when currentReport no longer matches the viewer report", () => {
  const report = createCandidateRichReport();

  const result = createEditorViewerCandidateApplyPlan({
    report,
    currentReport: createCurrentThemeReport("Light+"),
    candidate: createCommentCandidate(report),
    existingSettings: createExistingSettings()
  });

  assert.deepEqual(result, {
    status: "staleReport"
  });
});

test("createEditorViewerCandidateApplyPlan returns ready with selected candidate and patch plan when reports match", () => {
  const report = createCandidateRichReport();
  const candidate = createCommentCandidate(report);

  const result = createEditorViewerCandidateApplyPlan({
    report,
    currentReport: createCurrentThemeReport("Default Dark+"),
    candidate,
    existingSettings: createExistingSettings(),
    now: new Date("2026-06-08T00:00:00.000Z")
  });

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidate, candidate);
  assert.equal(result.selectedCandidate.id, COMMENT_CANDIDATE_ID);
  assert.deepEqual(
    result.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#ce9178"
    }
  );
});

test("createEditorViewerCandidateApplyPlan skips the stale check when no currentReport is supplied", () => {
  const report = createCandidateRichReport();
  const candidate = createCommentCandidate(report);

  const result = createEditorViewerCandidateApplyPlan({
    report,
    candidate,
    existingSettings: createExistingSettings(),
    now: new Date("2026-06-08T00:00:00.000Z")
  });

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidate.id, COMMENT_CANDIDATE_ID);
});

function createCommentCandidate(report) {
  const candidates = createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);
  const candidate = candidates.find((entry) => entry.id === COMMENT_CANDIDATE_ID);

  assert.ok(candidate, `expected engine to produce candidate ${COMMENT_CANDIDATE_ID}`);

  return candidate;
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
