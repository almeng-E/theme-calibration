"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { POC_PATCH_RECIPE } = require("../out/themePatch");
const {
  createPreviewModel,
  renderPreviewHtml
} = require("../out/previewWebview");

test("createPreviewModel applies hardcoded patch colors to after signals only", () => {
  const report = createFakeReport("Sample Dark");

  const model = createPreviewModel(report, POC_PATCH_RECIPE);

  assert.equal(model.themeName, "Sample Dark");
  assert.equal(model.before.signals.error, "#f44747");
  assert.equal(model.after.signals.error, "#ff6b6b");
  assert.equal(model.before.signals.warning, "#cca700");
  assert.equal(model.after.signals.warning, "#ffd166");
  assert.equal(model.before.signals.comment, "#6a9955");
  assert.equal(model.after.signals.comment, "#6a9955");
  assert.equal(model.after.signals.diffAdded, "#4cc38a");
  assert.equal(model.after.signals.diffDeleted, "#ff6b6b");
  assert.equal(model.risks.length, 1);
});

test("createPreviewModel applies token color candidate patches to after comment signals", () => {
  const report = createFakeReport("Sample Dark");
  const recipe = {
    id: "patch-candidates-sample-dark",
    description: "Comment preview candidate.",
    settings: {
      "workbench.colorCustomizations": {},
      "editor.tokenColorCustomizations": {
        "[Sample Dark]": {
          comments: "#8fb8ff"
        }
      },
      "editor.semanticTokenColorCustomizations": {}
    }
  };
  const candidates = [createCommentCandidate()];

  const model = createPreviewModel(report, recipe, {
    candidates,
    selectedCandidateId: candidates[0].id
  });

  assert.equal(model.before.signals.comment, "#6a9955");
  assert.equal(model.after.signals.comment, "#8fb8ff");
  assert.equal(model.selectedCandidateId, candidates[0].id);
  assert.deepEqual(model.candidates, candidates);
});

test("createPreviewModel applies workbench candidate patches to after diffDeleted signals", () => {
  const report = createFakeReport("Sample Dark");
  const recipe = {
    id: "patch-candidates-sample-dark",
    description: "Deleted gutter preview candidate.",
    settings: {
      "workbench.colorCustomizations": {
        "[Sample Dark]": {
          "editorGutter.deletedBackground": "#ff6b6b"
        }
      },
      "editor.tokenColorCustomizations": {},
      "editor.semanticTokenColorCustomizations": {}
    }
  };

  const model = createPreviewModel(report, recipe);

  assert.equal(model.before.signals.diffDeleted, "#f44747");
  assert.equal(model.after.signals.diffDeleted, "#ff6b6b");
});

test("renderPreviewHtml renders before and after panes and escapes theme text", () => {
  const report = createFakeReport("Dark <script>alert(1)</script>");
  const model = createPreviewModel(report, POC_PATCH_RECIPE);

  const html = renderPreviewHtml(model);

  assert.match(html, /Before/);
  assert.match(html, /After/);
  assert.match(html, /preview-grid/);
  assert.match(html, /Dark &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("renderPreviewHtml renders candidate metadata, selected marker, and escapes candidate reason", () => {
  const report = createFakeReport("Sample Dark");
  const candidates = [createCommentCandidate()];
  const recipe = {
    id: "patch-candidates-sample-dark",
    description: "Comment preview candidate.",
    settings: {
      "workbench.colorCustomizations": {},
      "editor.tokenColorCustomizations": {
        "[Sample Dark]": {
          comments: "#8fb8ff"
        }
      },
      "editor.semanticTokenColorCustomizations": {}
    }
  };
  const model = createPreviewModel(report, recipe, {
    candidates,
    selectedCandidateId: candidates[0].id
  });

  const html = renderPreviewHtml(model);

  assert.match(html, /Candidate Preview Selection/);
  assert.match(html, /Selected/);
  assert.match(html, /comments/);
  assert.match(html, /theme/);
  assert.match(html, /0\.80/);
  assert.match(html, /&lt;script&gt;comment risk&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>comment risk<\/script>/);
});

function createCommentCandidate() {
  return {
    id: "lowContrast-comment-editor.tokenColorCustomizations-comments",
    riskType: "lowContrast",
    signals: ["comment"],
    settingId: "editor.tokenColorCustomizations",
    settingKey: "comments",
    currentSignals: {
      comment: "#222222"
    },
    suggestedColor: "#8fb8ff",
    reason: "<script>comment risk</script>",
    scope: "theme",
    confidence: 0.8
  };
}

function createFakeReport(themeName) {
  return {
    theme: {
      configuredName: themeName
    },
    signals: {
      background: { value: "#101010" },
      foreground: { value: "#eeeeee" },
      comment: { value: "#6a9955" },
      string: { value: "#ce9178" },
      keyword: { value: "#569cd6" },
      error: { value: "#f44747" },
      warning: { value: "#cca700" },
      diffAdded: { value: "#2ea043" },
      diffDeleted: { value: "#f44747" }
    },
    contrast: {
      comment: { ratio: 4.2 }
    },
    risks: [
      {
        type: "lowContrast",
        signal: "comment",
        message: "comment 색상이 editor background 대비 낮을 수 있습니다."
      }
    ]
  };
}
