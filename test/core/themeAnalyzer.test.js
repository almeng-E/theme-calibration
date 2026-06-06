"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createThemeSignalReport
} = require("../../out/diagnose/diagnosticService");
const {
  calculateContrastRatio,
  parseHexColor
} = require("../../out/core/colorUtils");

test("parseHexColor supports rgb, rrggbb, and rrggbbaa hex values", () => {
  assert.deepEqual(parseHexColor("#abc"), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(parseHexColor("#112233"), { r: 17, g: 34, b: 51, a: 1 });
  assert.deepEqual(parseHexColor("#11223380"), { r: 17, g: 34, b: 51, a: 0.5 });
});

test("calculateContrastRatio returns WCAG-style contrast ratio", () => {
  assert.equal(calculateContrastRatio("#000000", "#ffffff"), 21);
  assert.equal(calculateContrastRatio("#777777", "#777777"), 1);
});

test("createThemeSignalReport extracts key theme signals and detects simple risks", () => {
  const probe = createFakeProbe();

  const report = createThemeSignalReport(probe);

  assert.equal(report.theme.configuredName, "Sample Dark");
  assert.equal(report.theme.definitionStatus, "loaded");
  assert.deepEqual(report.signals.background, {
    value: "#101010",
    source: "colors.editor.background"
  });
  assert.equal(report.signals.comment.value, "#222222");
  assert.equal(report.signals.string.value, "#ce9178");
  assert.equal(report.signals.keyword.value, "#569cd6");
  assert.equal(report.signals.error.value, "#f44747");
  assert.equal(report.signals.warning.value, "#ffd166");
  assert.equal(report.signals.diffAdded.value, "#4cc38a");
  assert.equal(report.signals.diffDeleted.value, "#f44747");
  assert.ok(report.contrast.comment.ratio < 2);
  assert.ok(report.risks.some((risk) => risk.type === "lowContrast" && risk.signal === "comment"));
  assert.ok(report.risks.some((risk) => risk.type === "similarSignal" && risk.signals.includes("error") && risk.signals.includes("diffDeleted")));
});

test("createThemeSignalReport reports missing current theme definition gracefully", () => {
  const report = createThemeSignalReport({
    currentTheme: {
      configuredName: "Missing Theme",
      matchedInstalledThemes: []
    }
  });

  assert.equal(report.theme.configuredName, "Missing Theme");
  assert.equal(report.theme.definitionStatus, "missing");
  assert.deepEqual(report.signals, {});
  assert.equal(report.risks[0].type, "missingThemeDefinition");
});

function createFakeProbe() {
  return {
    currentTheme: {
      configuredName: "Sample Dark",
      activeKind: "Dark",
      matchedInstalledThemes: [
        {
          extension: {
            id: "sample.theme"
          },
          theme: {
            id: "sample-dark",
            label: "Sample Dark"
          },
          themeDefinition: {
            status: "loaded",
            resolvedDefinition: {
              name: "Sample Dark",
              colors: {
                "editor.background": "#101010",
                "editor.foreground": "#eeeeee",
                "editorError.foreground": "#f44747",
                "editorWarning.foreground": "#ffd166",
                "editorGutter.addedBackground": "#4cc38a",
                "editorGutter.deletedBackground": "#f44747"
              },
              tokenColors: [
                {
                  scope: "comment",
                  settings: {
                    foreground: "#222222"
                  }
                },
                {
                  scope: ["string", "punctuation.definition.string"],
                  settings: {
                    foreground: "#ce9178"
                  }
                },
                {
                  scope: ["keyword.control", "keyword.operator"],
                  settings: {
                    foreground: "#569cd6"
                  }
                }
              ],
              semanticTokenColors: {
                function: "#dcdcaa"
              }
            }
          }
        }
      ]
    }
  };
}
