"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createEditorViewerModel,
  findEditorViewerRegion
} = require("../../out/ui/diagnosticViewModel");

test("createEditorViewerModel creates editor-like samples from current theme signals", () => {
  const model = createEditorViewerModel(createFakeReport());

  assert.equal(model.themeName, "Sample Dark");
  assert.equal(model.signals.background, "#101010");
  assert.equal(model.signals.comment, "#222222");
  assert.equal(model.samples.length, 3);
  assert.deepEqual(model.samples.map((sample) => sample.kind), ["syntax", "diagnostic", "diff"]);
  assert.equal(model.risks.length, 1);
});

test("createEditorViewerModel exposes stable clickable intent for syntax regions", () => {
  const model = createEditorViewerModel(createFakeReport());
  const region = findEditorViewerRegion(model, "syntax-comment");

  assert.ok(region);
  assert.equal(region.signal, "comment");
  assert.equal(region.color, "#222222");
  assert.deepEqual(region.intent, {
    source: "viewerClick",
    signal: "comment",
    sampleId: "syntax-sample",
    targetId: "syntax-comment",
    severity: "unspecified",
    message: "Comment visibility needs review."
  });
});

test("createEditorViewerModel exposes diagnostic and diff regions", () => {
  const model = createEditorViewerModel(createFakeReport());

  assert.equal(findEditorViewerRegion(model, "diagnostic-error").signal, "error");
  assert.equal(findEditorViewerRegion(model, "diagnostic-warning").signal, "warning");
  assert.equal(findEditorViewerRegion(model, "diff-deleted").signal, "diffDeleted");
});

test("createEditorViewerModel falls back missing signals to editor defaults", () => {
  const model = createEditorViewerModel({
    theme: {
      configuredName: "Sparse Theme"
    },
    signals: {},
    risks: []
  });

  assert.equal(model.themeName, "Sparse Theme");
  assert.equal(model.signals.background, "#1e1e1e");
  assert.equal(findEditorViewerRegion(model, "syntax-keyword").color, "#569cd6");
});

function createFakeReport() {
  return {
    theme: {
      configuredName: "Sample Dark"
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
    risks: [
      {
        type: "lowContrast",
        signal: "comment"
      }
    ]
  };
}
