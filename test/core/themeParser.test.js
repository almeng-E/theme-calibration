"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  collectInstalledThemes,
  parseJsonc,
  resolveRelativeThemePath,
  isMatchingThemeName
} = require("../../out/core/themeParser");
const {
  collectThemeSnapshot
} = require("../../out/adapter/vscode.adapter");

test("parseJsonc removes comments and trailing commas while preserving strings", () => {
  const parsed = parseJsonc(`{
    // line comment
    "name": "Slash // inside string",
    "colors": {
      "editor.background": "#111111",
    },
    "tokenColors": [
      { "scope": "comment", "settings": { "foreground": "#777777" } },
    ],
    /* block comment */
  }`);

  assert.equal(parsed.name, "Slash // inside string");
  assert.equal(parsed.colors["editor.background"], "#111111");
  assert.equal(parsed.tokenColors.length, 1);
});

test("resolveRelativeThemePath resolves include paths beside the source theme", () => {
  assert.equal(
    resolveRelativeThemePath("./themes/dark/main.json", "../base/base.json"),
    "themes/base/base.json"
  );
});

test("collectInstalledThemes reads contributed theme definitions and includes", async () => {
  const extensions = [
    {
      id: "sample.theme",
      isActive: false,
      extensionKind: ["ui"],
      packageJSON: {
        name: "sample-theme",
        displayName: "Sample Theme",
        publisher: "local",
        version: "1.0.0",
        contributes: {
          themes: [
            {
              id: "sample-dark",
              label: "Sample Dark",
              uiTheme: "vs-dark",
              path: "./themes/sample-dark.json"
            }
          ]
        }
      }
    }
  ];
  const files = {
    "sample.theme:themes/sample-dark.json": `{
      "name": "Sample Dark",
      "include": "./base.json",
      "colors": { "editor.foreground": "#eeeeee" },
      "semanticTokenColors": { "function": "#abcdef" }
    }`,
    "sample.theme:themes/base.json": `{
      "name": "Base",
      "colors": { "editor.background": "#101010" },
      "tokenColors": [{ "scope": "comment", "settings": { "foreground": "#777777" } }]
    }`
  };

  const themes = await collectInstalledThemes(extensions, {
    readThemeTextFile: async (extension, filePath) => files[`${extension.id}:${filePath}`]
  });

  assert.equal(themes.length, 1);
  assert.equal(themes[0].theme.label, "Sample Dark");
  assert.equal(themes[0].themeDefinition.status, "loaded");
  assert.equal(themes[0].themeDefinition.resolvedDefinition.colors["editor.background"], "#101010");
  assert.equal(themes[0].themeDefinition.resolvedDefinition.colors["editor.foreground"], "#eeeeee");
  assert.equal(themes[0].themeDefinition.resolvedDefinition.tokenColors.length, 1);
});

test("collectThemeSnapshot returns current settings and matches active configured theme", async () => {
  const fakeVscode = createFakeVscode();
  const probe = await collectThemeSnapshot(fakeVscode, {
    readThemeTextFile: async () => `{
      "name": "Sample Dark",
      "colors": { "editor.background": "#000000" }
    }`
  });

  assert.equal(probe.currentTheme.configuredName, "Sample Dark");
  assert.equal(probe.currentTheme.activeKind, "Dark");
  assert.equal(probe.currentTheme.matchedInstalledThemes.length, 1);
  assert.deepEqual(
    probe.currentTheme.settings["workbench.colorCustomizations"].effectiveValue,
    { "editor.background": "#000000" }
  );
});

test("isMatchingThemeName matches id or label case-insensitively", () => {
  assert.equal(isMatchingThemeName({ id: "sample-dark" }, "Sample-Dark"), true);
  assert.equal(isMatchingThemeName({ label: "Sample Dark" }, "sample dark"), true);
  assert.equal(isMatchingThemeName({ label: "Other" }, "sample dark"), false);
});

function createFakeVscode() {
  const values = {
    workbench: {
      colorTheme: "Sample Dark",
      colorCustomizations: { "editor.background": "#000000" }
    },
    editor: {
      tokenColorCustomizations: { comments: "#777777" },
      semanticTokenColorCustomizations: { enabled: true }
    }
  };

  return {
    version: "test-version",
    env: {
      appName: "VS Code Test",
      appHost: "desktop",
      uiKind: 1
    },
    UIKind: {
      Desktop: 1,
      Web: 2
    },
    ColorThemeKind: {
      Light: 1,
      Dark: 2,
      HighContrast: 3,
      HighContrastLight: 4
    },
    window: {
      activeColorTheme: {
        kind: 2
      }
    },
    workspace: {
      getConfiguration(section) {
        return {
          get(key) {
            return values[section][key];
          },
          inspect(key) {
            return {
              defaultValue: undefined,
              globalValue: values[section][key],
              workspaceValue: undefined,
              workspaceFolderValue: undefined
            };
          }
        };
      }
    },
    extensions: {
      all: [
        {
          id: "sample.theme",
          isActive: false,
          extensionKind: ["ui"],
          packageJSON: {
            name: "sample-theme",
            displayName: "Sample Theme",
            publisher: "local",
            version: "1.0.0",
            contributes: {
              themes: [
                {
                  id: "sample-dark",
                  label: "Sample Dark",
                  uiTheme: "vs-dark",
                  path: "./themes/sample-dark.json"
                }
              ]
            }
          }
        }
      ]
    }
  };
}
