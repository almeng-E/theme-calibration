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

test("package manifest keeps internal commands activatable for development use", () => {
  const activationEvents = new Set(manifest.activationEvents);

  assert.ok(activationEvents.has("onCommand:colorCalibration.printThemeProbe"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.printThemeSignalReport"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.printPatchCandidates"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openBeforeAfterPreview"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openCandidatePreview"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.applyHardcodedPatch"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.rollbackHardcodedPatch"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openEditorViewer"));
});
