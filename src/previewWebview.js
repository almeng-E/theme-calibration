"use strict";

const SIGNAL_DEFAULTS = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  comment: "#6a9955",
  string: "#ce9178",
  keyword: "#569cd6",
  error: "#f44747",
  warning: "#cca700",
  diffAdded: "#2ea043",
  diffDeleted: "#f44747"
};

function createPreviewModel(report, patchRecipe) {
  const beforeSignals = normalizeReportSignals(report && report.signals);
  const afterSignals = {
    ...beforeSignals,
    ...extractPatchSignals(patchRecipe)
  };

  return {
    themeName: (report && report.theme && report.theme.configuredName) || "Unknown Theme",
    before: {
      title: "Before",
      signals: beforeSignals
    },
    after: {
      title: "After",
      signals: afterSignals
    },
    risks: Array.isArray(report && report.risks) ? report.risks : []
  };
}

function renderPreviewHtml(model) {
  const safeThemeName = escapeHtml(model.themeName);
  const riskItems = model.risks.length > 0
    ? model.risks.map((risk) => `<li>${escapeHtml(formatRisk(risk))}</li>`).join("")
    : "<li>현재 preview 기준에서 표시할 risk가 없습니다.</li>";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Calibration Preview</title>
  <style>
    :root {
      color-scheme: dark;
      --page-bg: #111318;
      --panel-bg: #1b1f27;
      --border: #343b48;
      --muted: #9aa4b2;
      --text: #f2f4f8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 24px;
      background: var(--page-bg);
      color: var(--text);
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 650;
    }

    .subtitle {
      margin: 0 0 20px;
      color: var(--muted);
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .preview-pane,
    .risk-panel {
      border: 1px solid var(--border);
      background: var(--panel-bg);
      border-radius: 6px;
      overflow: hidden;
    }

    .pane-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      font-weight: 650;
    }

    .editor-sample {
      margin: 0;
      padding: 14px;
      min-height: 246px;
      font: 13px/1.55 Consolas, "Courier New", monospace;
      white-space: pre;
    }

    .line {
      display: block;
    }

    .diff-added,
    .diff-deleted,
    .diagnostic {
      display: block;
      margin-top: 8px;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .risk-panel {
      margin-top: 16px;
      padding: 14px;
    }

    .risk-panel h2 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .risk-panel ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
    }

    @media (max-width: 760px) {
      body {
        padding: 16px;
      }

      .preview-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <h1>Before/After Preview</h1>
  <p class="subtitle">현재 테마: ${safeThemeName}</p>

  <section class="preview-grid">
    ${renderPane(model.before)}
    ${renderPane(model.after)}
  </section>

  <section class="risk-panel">
    <h2>Report Risks</h2>
    <ul>${riskItems}</ul>
  </section>
</body>
</html>`;
}

function renderPane(pane) {
  const s = pane.signals;
  const addedBackground = withAlphaFallback(s.diffAdded, "22");
  const deletedBackground = withAlphaFallback(s.diffDeleted, "22");
  const warningBackground = withAlphaFallback(s.warning, "20");
  const errorBackground = withAlphaFallback(s.error, "20");

  return `<article class="preview-pane">
  <div class="pane-header">${escapeHtml(pane.title)}</div>
  <pre class="editor-sample" style="background:${cssColor(s.background)}; color:${cssColor(s.foreground)};"><span class="line"><span style="color:${cssColor(s.keyword)};">function</span> calibrateTheme(signal) {</span>
<span class="line">  <span style="color:${cssColor(s.comment)};">// keep the theme, improve the signal</span></span>
<span class="line">  <span style="color:${cssColor(s.keyword)};">const</span> message = <span style="color:${cssColor(s.string)};">"visibility matters"</span>;</span>
<span class="line">  <span style="color:${cssColor(s.keyword)};">return</span> message;</span>
<span class="line">}</span>
<span class="diagnostic" style="color:${cssColor(s.warning)}; background:${warningBackground};">warning: keyword signal may be hard to separate</span>
<span class="diagnostic" style="color:${cssColor(s.error)}; background:${errorBackground};">error: deletion and diagnostic colors overlap</span>
<span class="diff-added" style="color:${cssColor(s.diffAdded)}; background:${addedBackground};">+ added code path is visible</span>
<span class="diff-deleted" style="color:${cssColor(s.diffDeleted)}; background:${deletedBackground};">- deleted code path is visible</span></pre>
</article>`;
}

function normalizeReportSignals(signals) {
  const normalized = {};

  for (const [name, fallback] of Object.entries(SIGNAL_DEFAULTS)) {
    normalized[name] = signals && signals[name] && signals[name].value
      ? signals[name].value
      : fallback;
  }

  return normalized;
}

function extractPatchSignals(patchRecipe) {
  const customizations = patchRecipe &&
    patchRecipe.settings &&
    patchRecipe.settings["workbench.colorCustomizations"];

  if (!customizations) {
    return {};
  }

  const unscoped = findUnscopedColorCustomizations(customizations);

  return removeEmptyValues({
    error: unscoped["editorError.foreground"],
    warning: unscoped["editorWarning.foreground"],
    diffAdded: unscoped["editorGutter.addedBackground"],
    diffDeleted: unscoped["editorGutter.deletedBackground"]
  });
}

function findUnscopedColorCustomizations(customizations) {
  const themeBucketKey = Object.keys(customizations).find((key) => /^\[.+\]$/.test(key));
  return themeBucketKey ? customizations[themeBucketKey] : customizations;
}

function removeEmptyValues(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => Boolean(item))
  );
}

function withAlphaFallback(hex, alpha) {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return `${hex}${alpha}`;
  }

  return hex;
}

function cssColor(value) {
  return escapeHtml(value || "#ffffff");
}

function formatRisk(risk) {
  if (risk.message) {
    return risk.message;
  }

  if (risk.type && risk.signal) {
    return `${risk.type}: ${risk.signal}`;
  }

  return risk.type || "unknown risk";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  createPreviewModel,
  renderPreviewHtml
};
