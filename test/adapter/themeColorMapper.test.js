"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createThemeSignalReport
} = require("../../out/adapter/vscode/themeColorMapper");

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

test("createThemeSignalReport uses effective colors from saved customizations (overriding base)", () => {
  const probe = createFakeProbe();
  probe.currentTheme.settings = {
    "workbench.colorCustomizations": {
      effectiveValue: { "[Sample Dark]": { "editorError.foreground": "#ff6b6b" } }
    },
    "editor.tokenColorCustomizations": {
      effectiveValue: { "[Sample Dark]": { comments: "#ff0505" } }
    }
  };

  const report = createThemeSignalReport(probe);

  // effective overrides base
  assert.equal(report.signals.comment.value, "#ff0505");
  assert.equal(report.signals.comment.source, "tokenColorCustomizations.comments");
  assert.equal(report.signals.error.value, "#ff6b6b");
  assert.equal(report.signals.error.source, "colorCustomizations.editorError.foreground");
  // untouched roles keep base
  assert.equal(report.signals.string.value, "#ce9178");
  assert.equal(report.signals.background.value, "#101010");
  // risks computed on effective signals: comment is now bright, no longer low-contrast vs base
  assert.ok(!report.risks.some((risk) => risk.type === "lowContrast" && risk.signal === "comment"));
});

test("createThemeSignalReport applies theme-scoped customizations over global ones", () => {
  const probe = createFakeProbe();
  probe.currentTheme.settings = {
    "workbench.colorCustomizations": {
      effectiveValue: {
        "editorError.foreground": "#aaaaaa",
        "[Sample Dark]": { "editorError.foreground": "#bbbbbb" }
      }
    },
    "editor.tokenColorCustomizations": {
      effectiveValue: {
        comments: "#cccccc",
        "[Sample Dark]": { comments: "#dddddd" }
      }
    }
  };

  const report = createThemeSignalReport(probe);

  assert.equal(report.signals.error.value, "#bbbbbb");
  assert.equal(report.signals.comment.value, "#dddddd");
});

test("createThemeSignalReport applies global (unscoped) customizations when no theme-scoped entry", () => {
  const probe = createFakeProbe();
  probe.currentTheme.settings = {
    "workbench.colorCustomizations": {
      effectiveValue: { "editorError.foreground": "#aaaaaa" }
    },
    "editor.tokenColorCustomizations": {
      effectiveValue: { comments: "#cccccc" }
    }
  };

  const report = createThemeSignalReport(probe);

  assert.equal(report.signals.error.value, "#aaaaaa");
  assert.equal(report.signals.comment.value, "#cccccc");
});

test("createThemeSignalReport maps token named keys comments/strings/keywords to roles", () => {
  const probe = createFakeProbe();
  probe.currentTheme.settings = {
    "editor.tokenColorCustomizations": {
      effectiveValue: {
        "[Sample Dark]": {
          comments: "#111aaa",
          strings: "#222bbb",
          keywords: "#333ccc"
        }
      }
    }
  };

  const report = createThemeSignalReport(probe);

  assert.equal(report.signals.comment.value, "#111aaa");
  assert.equal(report.signals.string.value, "#222bbb");
  assert.equal(report.signals.keyword.value, "#333ccc");
  assert.equal(report.signals.string.source, "tokenColorCustomizations.strings");
  assert.equal(report.signals.keyword.source, "tokenColorCustomizations.keywords");
});

test("createThemeSignalReport falls back to base when customizations are malformed", () => {
  for (const malformed of [undefined, { error: "boom" }, "not-an-object", 42, ["x"]]) {
    const probe = createFakeProbe();
    probe.currentTheme.settings = {
      "workbench.colorCustomizations": { effectiveValue: malformed },
      "editor.tokenColorCustomizations": { effectiveValue: malformed }
    };

    const report = createThemeSignalReport(probe);

    // base values intact, no throw
    assert.equal(report.signals.error.value, "#f44747");
    assert.equal(report.signals.comment.value, "#222222");
  }
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
