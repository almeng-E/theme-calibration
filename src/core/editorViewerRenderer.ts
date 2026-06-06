import type {
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample
} from "./types/editorViewer.types";

export function renderEditorViewerHtml(model: EditorViewerModel): string {
  const samples = model.samples.map(renderSample).join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Current Theme Editor Viewer</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #111318;
      color: #f2f4f8;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 20px;
    }
    .subtitle {
      margin: 0 0 18px;
      color: #9aa4b2;
    }
    .viewer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .sample {
      border: 1px solid #343b48;
      border-radius: 6px;
      overflow: hidden;
      background: #1b1f27;
    }
    .sample h2 {
      margin: 0;
      padding: 10px 12px;
      border-bottom: 1px solid #343b48;
      font-size: 13px;
    }
    .editor {
      margin: 0;
      padding: 12px;
      font: 13px/1.55 Consolas, "Courier New", monospace;
      white-space: pre-wrap;
    }
    .line {
      display: block;
      min-height: 20px;
    }
    .region {
      border: 0;
      padding: 1px 2px;
      border-radius: 3px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .region:focus {
      outline: 1px solid #ffffff;
      outline-offset: 1px;
    }
  </style>
</head>
<body>
  <h1>Current Theme Editor Viewer</h1>
  <p class="subtitle">Current theme: ${escapeHtml(model.themeName)}</p>
  <section class="viewer-grid">${samples}</section>
</body>
</html>`;
}

function renderSample(sample: EditorViewerSample): string {
  return `<article class="sample">
    <h2>${escapeHtml(sample.title)}</h2>
    <pre class="editor" style="background:${cssColor(sample.background)}; color:${cssColor(sample.foreground)};">${sample.lines.map(renderLine).join("")}</pre>
  </article>`;
}

function renderLine(line: EditorViewerLine): string {
  return `<span class="line">${line.regions.map(renderRegion).join("")}</span>`;
}

function renderRegion(region: EditorViewerRegion): string {
  const backgroundStyle = region.backgroundColor ? ` background:${cssColor(region.backgroundColor)};` : "";
  const intent = escapeHtml(JSON.stringify(region.intent));

  return `<button class="region" type="button" data-region-id="${escapeHtml(region.id)}" data-signal="${escapeHtml(region.signal)}" data-intent="${intent}" style="color:${cssColor(region.color)};${backgroundStyle}">${escapeHtml(region.text)}</button>`;
}

function cssColor(value: string | undefined): string {
  const fallbackColor = "#ffffff";
  const color = value || fallbackColor;

  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
    return color;
  }

  return fallbackColor;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
