import type {
  PreviewModelDto,
  PreviewPaneDto
} from "../types/preview.types";
import type {
  CandidateDto,
  PatchRecipeDto,
  SettingDictionary
} from "../types/patch.types";
import type {
  ThemeColorHexMap,
  RiskDto,
  ThemeReportDto
} from "../types/signal.types";
import { isPlainObject } from "../utils/objectUtils";
import { normalizeReportSignals } from "../adapter/vscodeDefaults";
import { escapeHtml, cssColor, withAlphaFallback } from "../ui/htmlUtils";

// ============================================================
// 1. Constants & Types
// ============================================================



export interface PreviewModelOptions {
  candidates?: CandidateDto[];
  selectedCandidateId?: string;
}

// ============================================================
// 2. Model Generation
// ============================================================

export function createPreviewModel(
  report: Partial<ThemeReportDto> | undefined,
  patchRecipe: PatchRecipeDto,
  options: PreviewModelOptions = {}
): PreviewModelDto {
  const beforeSignals = normalizeReportSignals(report?.signals);
  const afterSignals = {
    ...beforeSignals,
    ...extractPatchSignals(patchRecipe)
  };

  return {
    themeName: report?.theme?.configuredName || "Unknown Theme",
    before: {
      title: "Before",
      signals: beforeSignals
    },
    after: {
      title: "After",
      signals: afterSignals
    },
    risks: Array.isArray(report?.risks) ? report.risks : [],
    candidates: options.candidates?.slice(),
    selectedCandidateId: options.selectedCandidateId
  };
}



export function extractPatchSignals(patchRecipe: PatchRecipeDto): Partial<ThemeColorHexMap> {
  const workbenchCustomizations = findScopedSettings(patchRecipe.settings["workbench.colorCustomizations"]);
  const tokenCustomizations = findScopedSettings(patchRecipe.settings["editor.tokenColorCustomizations"]);

  return removeEmptyValues({
    comment: asColorString(tokenCustomizations.comments),
    string: asColorString(tokenCustomizations.strings),
    keyword: asColorString(tokenCustomizations.keywords),
    error: asColorString(workbenchCustomizations["editorError.foreground"]),
    warning: asColorString(workbenchCustomizations["editorWarning.foreground"]),
    diffAdded: asColorString(workbenchCustomizations["editorGutter.addedBackground"]),
    diffDeleted: asColorString(workbenchCustomizations["editorGutter.deletedBackground"])
  });
}

function findScopedSettings(setting: SettingDictionary | undefined): Record<string, unknown> {
  if (!isPlainObject(setting)) {
    return {};
  }

  const themeBucketKey = Object.keys(setting).find((key) => /^\[.+\]$/.test(key));
  const themeBucket = themeBucketKey ? setting[themeBucketKey] : undefined;
  return isPlainObject(themeBucket) ? themeBucket : setting;
}

// ============================================================
// 3. HTML Rendering
// ============================================================

export function renderPreviewHtml(model: PreviewModelDto): string {
  const safeThemeName = escapeHtml(model.themeName);
  const riskItems = model.risks.length > 0
    ? model.risks.map((risk) => `<li>${escapeHtml(formatRisk(risk))}</li>`).join("")
    : "<li>No risk is available in the current preview model.</li>";
  const candidateSection = model.candidates?.length ? renderCandidateSection(model) : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Calibration Preview</title>
  <style>
    :root {
      --page-bg: var(--vscode-editor-background, #111318);
      --panel-bg: var(--vscode-sideBar-background, #1b1f27);
      --border: var(--vscode-widget-border, #343b48);
      --muted: var(--vscode-descriptionForeground, #9aa4b2);
      --text: var(--vscode-editor-foreground, #f2f4f8);
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
    .candidate-panel,
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

    .candidate-panel,
    .risk-panel {
      margin-top: 16px;
      padding: 14px;
    }

    .candidate-panel h2,
    .risk-panel h2 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .candidate-list,
    .risk-panel ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
    }

    .candidate-list li + li {
      margin-top: 10px;
    }

    .candidate-selected {
      color: var(--text);
    }

    .apply-btn {
      display: inline-block;
      margin-top: 12px;
      padding: 6px 14px;
      background: var(--vscode-button-background, #2f81f7);
      color: var(--vscode-button-foreground, #ffffff);
      border: 0;
      border-radius: 4px;
      font: inherit;
      font-weight: 650;
      vertical-align: middle;
      cursor: pointer;
    }

    .apply-btn:focus {
      outline: 1px solid var(--focus-outline);
    }

    .candidate-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--vscode-button-background, #2f81f7);
      color: var(--vscode-button-foreground, #ffffff);
      font-size: 11px;
      font-weight: 650;
      vertical-align: middle;
    }

    .candidate-meta {
      margin-top: 4px;
      font-size: 12px;
    }

    .candidate-reason {
      margin-top: 4px;
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
  <p class="subtitle">Current theme: ${safeThemeName}</p>

  <section class="preview-grid">
    ${renderPane(model.before)}
    ${renderPane(model.after)}
  </section>

  ${candidateSection}

  <section class="risk-panel">
    <h2>Report Risks</h2>
    <ul>${riskItems}</ul>
  </section>
</body>
</html>`;
}

function renderPane(pane: PreviewPaneDto): string {
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

function renderCandidateSection(model: PreviewModelDto): string {
  const items = (model.candidates || []).map((candidate) => {
    const isSelected = candidate.id === model.selectedCandidateId;
    const selectedBadge = isSelected ? '<span class="candidate-badge">Selected</span>' : "";
    const itemClass = isSelected ? "candidate-selected" : "";

    return `<li class="${itemClass}">
      <strong>${escapeHtml(candidate.settingKey)}</strong>${selectedBadge}
      <div class="candidate-meta">scope: ${escapeHtml(candidate.scope)} | risk: ${escapeHtml(candidate.riskType)} | confidence: ${escapeHtml(candidate.confidence.toFixed(2))}</div>
      <div class="candidate-reason">${escapeHtml(candidate.reason)}</div>
    </li>`;
  }).join("");

  return `<section class="candidate-panel">
    <h2>Candidate Preview Selection</h2>
    <ul class="candidate-list">${items}</ul>
  </section>`;
}

// ============================================================
// 4. Formatting Utilities
// ============================================================

function removeEmptyValues(value: Partial<ThemeColorHexMap>): Partial<ThemeColorHexMap> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => Boolean(item))
  ) as Partial<ThemeColorHexMap>;
}

function formatRisk(risk: RiskDto): string {
  if (risk.message) {
    return risk.message;
  }

  if (risk.type && risk.signal) {
    return `${risk.type}: ${risk.signal}`;
  }

  return risk.type || "unknown risk";
}

function asColorString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
