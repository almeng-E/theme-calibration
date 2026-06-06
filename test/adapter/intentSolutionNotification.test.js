const test = require("node:test");
const assert = require("node:assert/strict");
const { createIntentSolutionNotification } = require("../../out/adapter/intentSolutionNotification");

test("createIntentSolutionNotification creates info message for available candidates", () => {
  const notification = createIntentSolutionNotification({
    intent: { source: "viewerClick", signal: "comment", targetId: "syntax-comment", severity: "unspecified" },
    status: "candidates",
    risks: [{ type: "lowContrast", signal: "comment" }],
    candidates: [
      {
        id: "candidate-1",
        riskType: "lowContrast",
        signals: ["comment"],
        settingId: "editor.tokenColorCustomizations",
        settingKey: "comments",
        currentSignals: { comment: "#333333" },
        suggestedColor: "#8fb8ff",
        reason: "comment has low contrast.",
        scope: "theme",
        confidence: 0.8
      }
    ]
  });

  assert.deepEqual(notification, {
    level: "info",
    message: "Solution candidates: 1 for comment."
  });
});

test("createIntentSolutionNotification creates info message when no risk matches", () => {
  const notification = createIntentSolutionNotification({
    intent: { source: "viewerClick", signal: "string", targetId: "syntax-string", severity: "unspecified" },
    status: "noMatchingRisk",
    risks: [],
    candidates: []
  });

  assert.deepEqual(notification, {
    level: "info",
    message: "No obvious visibility risk found for string in the current simple rules."
  });
});

test("createIntentSolutionNotification creates warning when risk has no candidate", () => {
  const notification = createIntentSolutionNotification({
    intent: { source: "viewerClick", signal: "diffDeleted", targetId: "diff-deleted", severity: "unspecified" },
    status: "noCandidate",
    risks: [{ type: "lowContrast", signal: "diffDeleted" }],
    candidates: []
  });

  assert.deepEqual(notification, {
    level: "warning",
    message: "Visibility risk found for diffDeleted, but no conservative candidate is available yet."
  });
});
