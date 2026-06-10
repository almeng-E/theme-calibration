"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../package.json");

test("package manifest exposes only the public editor viewer command", () => {
  assert.deepEqual(
    manifest.contributes.commands.map((command) => command.command),
    ["colorCalibration.openEditorViewer"]
  );
  assert.deepEqual(
    manifest.contributes.commands.map((command) => command.title),
    ["Color Calibration: Open Editor Viewer"]
  );
});

test("package manifest activates only the editor viewer and rollback commands", () => {
  assert.deepEqual(
    [...manifest.activationEvents].sort(),
    [
      "onCommand:colorCalibration.openEditorViewer",
      "onCommand:colorCalibration.rollbackCandidatePatch"
    ].sort()
  );
});
