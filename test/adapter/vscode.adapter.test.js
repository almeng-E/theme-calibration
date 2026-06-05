"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readCurrentPatchableSettings } = require("../../out/adapter/vscode.adapter");

test("readCurrentPatchableSettings reads the selected target value instead of effective merged settings", () => {
  const fakeVscode = {
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2
    },
    workspace: {
      getConfiguration(section) {
        return {
          get(key) {
            return {
              source: "effective",
              section,
              key
            };
          },
          inspect(key) {
            return {
              globalValue: {
                source: "global",
                section,
                key
              },
              workspaceValue: {
                source: "workspace",
                section,
                key
              }
            };
          }
        };
      }
    }
  };

  const globalSettings = readCurrentPatchableSettings(fakeVscode, fakeVscode.ConfigurationTarget.Global);
  const workspaceSettings = readCurrentPatchableSettings(fakeVscode, fakeVscode.ConfigurationTarget.Workspace);

  assert.equal(globalSettings["workbench.colorCustomizations"].source, "global");
  assert.equal(workspaceSettings["workbench.colorCustomizations"].source, "workspace");
});
