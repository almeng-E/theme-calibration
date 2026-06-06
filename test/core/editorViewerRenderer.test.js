"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createEditorViewerModel } = require("../../out/core/editorViewerModel");
const { renderEditorViewerHtml } = require("../../out/core/editorViewerRenderer");

test("renderEditorViewerHtml renders samples and clickable regions", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /Current Theme Editor Viewer/);
  assert.match(html, /Sample Dark/);
  assert.match(html, /Syntax Signals/);
  assert.match(html, /Diagnostics/);
  assert.match(html, /Diff/);
  assert.match(html, /data-region-id="syntax-comment"/);
  assert.match(html, /data-signal="comment"/);
  assert.match(html, /data-intent=/);
});

test("renderEditorViewerHtml escapes theme and region text", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Dark <script>alert(1)</script>")));

  assert.match(html, /Dark &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("renderEditorViewerHtml serializes region intent safely", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")));

  assert.match(html, /&quot;source&quot;:&quot;viewerClick&quot;/);
  assert.match(html, /&quot;targetId&quot;:&quot;syntax-comment&quot;/);
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
