"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createPatchCandidates } = require("../../out/diagnose/diagnosticEngine");
const { createEditorViewerCandidateApplyPlan } = require("../../out/patch/editorViewerApplyService");
const { LOW_CONTRAST_MAPPINGS, SIMILAR_SIGNAL_MAPPINGS } = require("../fixtures/diagnostic.fixtures.js");

test("createEditorViewerCandidateApplyPlan returns noActiveSolution when no active candidate solution exists", () => {
  const result = createEditorViewerCandidateApplyPlan({
    report: createCandidateRichReport(),
    latestSolution: undefined,
    candidateId: "lowContrast-comment-editor.tokenColorCustomizations-comments",
    existingSettings: createExistingSettings()
  });

  assert.deepEqual(result, {
    status: "noActiveSolution"
  });
});

test("createEditorViewerCandidateApplyPlan returns invalidCandidateId for empty candidate id", () => {
  const result = createEditorViewerCandidateApplyPlan({
    report: createCandidateRichReport(),
    latestSolution: createActiveSolution(),
    candidateId: "",
    existingSettings: createExistingSettings()
  });

  assert.deepEqual(result, {
    status: "invalidCandidateId"
  });
});

test("createEditorViewerCandidateApplyPlan returns candidateUnavailable for stale candidate id", () => {
  const result = createEditorViewerCandidateApplyPlan({
    report: createCandidateRichReport(),
    latestSolution: createActiveSolution(),
    candidateId: "missing-candidate",
    existingSettings: createExistingSettings()
  });

  assert.deepEqual(result, {
    status: "candidateUnavailable"
  });
});

test("createEditorViewerCandidateApplyPlan returns staleReport when viewer theme no longer matches current theme", () => {
  const result = createEditorViewerCandidateApplyPlan({
    report: createCandidateRichReport(),
    currentReport: createCurrentThemeReport("Light+"),
    latestSolution: createActiveSolution(),
    candidateId: "lowContrast-comment-editor.tokenColorCustomizations-comments",
    existingSettings: createExistingSettings()
  });

  assert.deepEqual(result, {
    status: "staleReport"
  });
});

test("createEditorViewerCandidateApplyPlan returns ready with selected candidate and patch plan", () => {
  const result = createEditorViewerCandidateApplyPlan({
    report: createCandidateRichReport(),
    currentReport: createCurrentThemeReport("Default Dark+"),
    latestSolution: createActiveSolution(),
    candidateId: "lowContrast-comment-editor.tokenColorCustomizations-comments",
    existingSettings: createExistingSettings(),
    now: new Date("2026-06-08T00:00:00.000Z")
  });

  assert.equal(result.status, "ready");
  assert.equal(result.selectedCandidate.id, "lowContrast-comment-editor.tokenColorCustomizations-comments");
  assert.deepEqual(
    result.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"],
    {
      comments: "#8fb8ff",
      strings: "#ce9178"
    }
  );
});

function createActiveSolution() {
  const report = createCandidateRichReport();
  const candidates = createPatchCandidates(report, [...LOW_CONTRAST_MAPPINGS, ...SIMILAR_SIGNAL_MAPPINGS]);

  return {
    intent: {
      source: "viewerClick",
      signal: "comment",
      sampleId: "syntax-sample",
      targetId: "syntax-comment",
      severity: "unspecified",
      message: "comment"
    },
    status: "candidates",
    risks: report.risks.filter((risk) => risk.type === "lowContrast" && risk.signal === "comment"),
    candidates
  };
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
