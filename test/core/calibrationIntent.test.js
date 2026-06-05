"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCalibrationIntent,
  normalizeCalibrationIntentPayload
} = require("../../out/core/calibrationIntent");

test("createCalibrationIntent creates a user reported intent for a clickable signal", () => {
  const intent = createCalibrationIntent({
    source: "viewerClick",
    signal: "comment",
    sampleId: "editor-main",
    targetId: "line-2-comment",
    message: "Comment is hard to separate from the background."
  });

  assert.equal(intent.source, "viewerClick");
  assert.equal(intent.signal, "comment");
  assert.equal(intent.sampleId, "editor-main");
  assert.equal(intent.targetId, "line-2-comment");
  assert.equal(intent.message, "Comment is hard to separate from the background.");
  assert.equal(intent.severity, "unspecified");
});

test("normalizeCalibrationIntentPayload trims optional text and defaults source and severity", () => {
  const intent = normalizeCalibrationIntentPayload({
    signal: "diffDeleted",
    sampleId: " diff-sample ",
    targetId: " deleted-line ",
    message: "  Deleted line looks like an error.  "
  });

  assert.equal(intent.source, "viewerClick");
  assert.equal(intent.signal, "diffDeleted");
  assert.equal(intent.sampleId, "diff-sample");
  assert.equal(intent.targetId, "deleted-line");
  assert.equal(intent.message, "Deleted line looks like an error.");
  assert.equal(intent.severity, "unspecified");
});

test("normalizeCalibrationIntentPayload rejects unknown signals", () => {
  assert.throws(
    () => normalizeCalibrationIntentPayload({ signal: "minimap", targetId: "x" }),
    /Unsupported calibration signal: minimap/
  );
});

test("normalizeCalibrationIntentPayload rejects missing target id", () => {
  assert.throws(
    () => normalizeCalibrationIntentPayload({ signal: "comment", targetId: " " }),
    /Calibration intent targetId is required/
  );
});
