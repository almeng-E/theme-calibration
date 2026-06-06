import type {
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample
} from "./types/editorViewer.types";
import { escapeHtml, cssColor } from "./htmlUtils";

export function renderEditorViewerHtml(model: EditorViewerModel, nonce?: string): string {
  const samples = model.samples.map(renderSample).join("");
  const nonceAttr = nonce ? ` nonce="${escapeHtml(nonce)}"` : "";
  const cspMeta = nonce
    ? `\n  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${escapeHtml(nonce)}';">`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">${cspMeta}
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
  <script${nonceAttr}>
    (function () {
      var vscode = acquireVsCodeApi();
      document.addEventListener("click", function (event) {
        var target = event.target;
        while (target && target !== document.body) {
          if (target.classList && target.classList.contains("region")) {
            var intentData = target.getAttribute("data-intent");
            if (intentData) {
              try {
                vscode.postMessage({
                  type: "regionClick",
                  intent: JSON.parse(intentData)
                });
              } catch (e) {
                // ignore malformed intent data
              }
            }
            return;
          }
          target = target.parentElement;
        }
      });
    })();
  </script>
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

