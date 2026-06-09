"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createThemeReport
} = require("../../out/diagnose/diagnosticService");
const {
  calculateContrastRatio,
  parseHexColor
} = require("../../out/utils/colorUtils");

test("parseHexColor supports rgb, rrggbb, and rrggbbaa hex values", () => {
  assert.deepEqual(parseHexColor("#abc"), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(parseHexColor("#112233"), { r: 17, g: 34, b: 51, a: 1 });
  assert.deepEqual(parseHexColor("#11223380"), { r: 17, g: 34, b: 51, a: 0.5 });
});

test("calculateContrastRatio returns WCAG-style contrast ratio", () => {
  assert.equal(calculateContrastRatio("#000000", "#ffffff"), 21);
  assert.equal(calculateContrastRatio("#777777", "#777777"), 1);
});

test("createThemeReport assembles a report from editor-agnostic meta and colors", () => {
  const report = createThemeReport({
    configuredName: "Sample Dark",
    activeKind: "Dark",
    id: "sample-dark",
    label: "Sample Dark",
    extensionId: "sample.theme",
    definitionStatus: "loaded",
    colors: {
      background: { value: "#101010", source: "colors.editor.background" },
      comment: { value: "#222222", source: "tokenColors.comment" },
      error: { value: "#f44747", source: "colors.editorError.foreground" },
      diffDeleted: { value: "#f44747", source: "colors.editorGutter.deletedBackground" }
    }
  });

  assert.equal(report.theme.configuredName, "Sample Dark");
  assert.equal(report.theme.id, "sample-dark");
  assert.equal(report.theme.extensionId, "sample.theme");
  assert.equal(report.theme.definitionStatus, "loaded");
  assert.equal(report.signals.comment.value, "#222222");
  assert.ok(report.contrast.comment.ratio < 2);
  assert.ok(report.risks.some((risk) => risk.type === "lowContrast" && risk.signal === "comment"));
  assert.ok(report.risks.some((risk) => risk.type === "similarSignal" && risk.signals.includes("error") && risk.signals.includes("diffDeleted")));
});

test("createThemeReport returns the missing-definition report when colors are absent", () => {
  const report = createThemeReport({
    configuredName: "Missing Theme",
    definitionStatus: "missing"
  });

  assert.equal(report.theme.configuredName, "Missing Theme");
  assert.equal(report.theme.definitionStatus, "missing");
  assert.deepEqual(report.signals, {});
  assert.deepEqual(report.contrast, {});
  assert.equal(report.risks[0].type, "missingThemeDefinition");
});
