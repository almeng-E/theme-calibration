"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createEditorViewerModel } = require("../../out/ui/editorViewModel");
const { renderEditorViewerHtml } = require("../../out/ui/editorViewHtml");

test("renderEditorViewerHtml renders samples and clickable regions", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /Current Theme Editor Viewer/);
  assert.match(html, /Python \(Syntax\)/);
  assert.match(html, /Diagnostics/);
  assert.match(html, /Diff/);
  assert.match(html, /data-region-id="py-comment"/);
  assert.match(html, /data-signal="comment"/);
  assert.match(html, /data-intent=/);
});

test("renderEditorViewerHtml escapes region text", () => {
  const model = createEditorViewerModel(createFakeReport("Sample Dark"));
  model.samples[0].lines[0].regions[0].text = "<script>alert(1)</script>";

  const html = renderEditorViewerHtml(model);

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("renderEditorViewerHtml serializes region intent safely", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /&quot;source&quot;:&quot;viewerClick&quot;/);
  assert.match(html, /&quot;targetId&quot;:&quot;py-comment&quot;/);
});

test("renderEditorViewerHtml includes solution panel placeholders", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /data-solution-panel/);
  assert.match(html, /data-solution-status/);
  assert.match(html, /data-solution-candidates/);
  assert.match(html, /Click a highlighted editor region to inspect improvement candidates./);
});

test("renderEditorViewerHtml listens for solution result messages", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /window\.addEventListener\("message"/);
  assert.match(html, /message\.type === "solutionResult"/);
  assert.match(html, /renderSolutionResult\(message\.solution\)/);
  assert.match(html, /candidate\.suggestedColor/);
});

test("renderEditorViewerHtml renders Accept/Reject button wiring for solution candidates", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /acceptBtn\.innerHTML = "✓ Accept"/);
  assert.match(html, /type: "applyCandidatePatch"/);
  assert.match(html, /candidateId: candidate\.id/);
});

test("renderEditorViewerHtml falls back unsafe css color values", () => {
  const model = createEditorViewerModel(createFakeReport("Sample Dark"));
  const firstSample = model.samples[0];
  const firstRegion = firstSample.lines[0].regions[0];

  firstSample.background = "#101010; background-image:url(javascript:alert(1))";
  firstSample.foreground = "rgb(255 255 255)";
  firstRegion.color = "red; border:999px solid red";
  firstRegion.backgroundColor = "url(javascript:alert(1))";

  const html = renderEditorViewerHtml(model);

  assert.doesNotMatch(html, /javascript:alert/);
  assert.doesNotMatch(html, /border:999px/);
  assert.doesNotMatch(html, /rgb\(255 255 255\)/);
  assert.match(html, /style="background:#ffffff; color:#ffffff;"/);
  assert.match(html, /style="color:#ffffff; background:#ffffff;"/);
});

test("renderEditorViewerHtml emits UTF-8 charset and English lang guard", () => {
  // charset=UTF-8 is the DURABLE guard: Korean/multilingual content must never break.
  // lang="en" is the DELIBERATE current state (project is preparing a global service in
  // English); locking it catches an accidental flip back to another locale.
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /<meta charset="UTF-8">/);
  assert.match(html, /<html lang="en">/);
});

test("renderEditorViewerHtml renders top bar tab buttons, one per sample", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  // tab-button / data-tab are the real anchors syncUI() queries to switch samples.
  assert.match(html, /class="tab-button active"/);
  assert.match(html, /data-tab="python-sample"/);
  assert.match(html, /data-tab="ts-sample"/);
  assert.match(html, /data-tab="html-sample"/);
  assert.match(html, /data-tab="diagnostic-sample"/);
  assert.match(html, /data-tab="diff-sample"/);
});

test("renderEditorViewerHtml emits the slider/split structure ids and classes", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  // These ids/classes are queried by id in the inline JS (getElementById / querySelector).
  // Locking them prevents a refactor from silently breaking the slider/split view.
  assert.match(html, /id="slider-container"/);
  assert.match(html, /id="layer-a"/);
  assert.match(html, /id="layer-b"/);
  assert.match(html, /id="slider-handle"/);
  assert.match(html, /class="slider-wrapper"/);
  // Per-sample anchors used by the JS to show/hide the active sample.
  assert.match(html, /data-sample-id="python-sample"/);
});

test("renderEditorViewerHtml renders Reject button wiring for solution candidates", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /rejectBtn\.innerHTML = "✗ Reject"/);
  assert.match(html, /type: "rejectCandidatePatch"/);
  assert.match(html, /candidateId: candidate\.id/);
});

test("renderEditorViewerHtml message listener handles updateAfterHtml into layer-B content", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /message\.type === "updateAfterHtml"/);
  assert.match(html, /document\.querySelector\("#layer-b \.editor-content"\)/);
  assert.match(html, /layerBContent\.innerHTML = message\.html/);
});

test("renderEditorViewerHtml emits CSP meta and script nonce only when a nonce is provided", () => {
  const withNonce = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "somenonce");
  assert.match(withNonce, /Content-Security-Policy/);
  assert.match(withNonce, /script-src 'nonce-somenonce'/);
  assert.match(withNonce, /<script nonce="somenonce">/);

  const withoutNonce = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));
  assert.doesNotMatch(withoutNonce, /Content-Security-Policy/);
  assert.doesNotMatch(withoutNonce, /nonce=/);
});

test("renderEditorViewerHtml seeds initialCandidates into the inline script", () => {
  const model = createEditorViewerModel(createFakeReport("Sample Dark"));
  model.initialCandidates = [
    {
      id: "cand-seed-1",
      settingKey: "editor.foreground",
      suggestedColor: "#abcdef",
      reason: "seed reason",
      signals: ["comment"]
    }
  ];

  const html = renderEditorViewerHtml(model);

  // initialCandidatesJson is injected verbatim; locking the initial render path.
  assert.match(html, /"id":"cand-seed-1"/);
  assert.match(html, /"suggestedColor":"#abcdef"/);
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
