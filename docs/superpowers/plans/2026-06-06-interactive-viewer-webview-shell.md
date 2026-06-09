# 인터랙티브 viewer Webview shell 구현 계획

> **에이전트 작업자 안내:** 이 계획은 작업 단위로 실행하세요. 가능하면 `superpowers:subagent-driven-development`를 사용하고, 그렇지 않으면 `superpowers:executing-plans`를 사용하세요. 체크박스(`- [ ]`)는 진행 상태 추적용입니다.

**목표:** 현재 theme 기반 `EditorViewerModel`을 실제 VS Code Webview command로 열 수 있는 얇은 shell을 추가한다.

**아키텍처:** UI 디자인을 확정하지 않는다. Core에는 `renderEditorViewerHtml(model)`만 추가해 model을 정적 HTML로 바꾸고, extension adapter는 현재 theme report를 만든 뒤 viewer model과 HTML renderer를 연결한다. 이번 단계에서는 Webview script, click message handler, candidate 생성, apply/rollback을 구현하지 않는다.

**기술 스택:** TypeScript, VS Code Extension API Webview, Node.js `node:test`.

---

## 파일 구조

- 생성: `src/core/editorViewerRenderer.ts`
  - `EditorViewerModel`을 정적 HTML로 렌더링한다.
  - clickable region은 `button`과 `data-region-id`, `data-signal`, `data-intent`를 포함한다.
- 생성: `test/core/editorViewerRenderer.test.js`
  - HTML escaping, sample/region 렌더링, intent payload 포함을 검증한다.
- 수정: `src/constants.ts`
  - `openEditorViewer` command id를 추가한다.
- 수정: `package.json`
  - activation event와 contributes command를 추가한다.
- 수정: `src/extension.ts`
  - 현재 theme report → editor viewer model → Webview HTML 흐름을 연결한다.

## Task 1: Renderer RED 테스트

**Files:**

- Create: `test/core/editorViewerRenderer.test.js`

- [ ] **Step 1: Write the failing test**

`test/core/editorViewerRenderer.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createEditorViewerModel } = require("../../out/core/editorViewerModel");
const {
  renderEditorViewerHtml,
} = require("../../out/core/editorViewerRenderer");

test("renderEditorViewerHtml renders samples and clickable regions", () => {
  const html = renderEditorViewerHtml(
    createEditorViewerModel(createFakeReport("Sample Dark")),
  );

  assert.match(html, /Current Theme Editor Viewer/);
  assert.match(html, /Sample Dark/);
  assert.match(html, /Syntax Signals/);
  assert.match(html, /Diagnostics/);
  assert.match(html, /Diff/);
  assert.match(html, /data-region-id="syntax-comment"/);
  assert.match(html, /data-signal="comment"/);
  assert.match(html, /data-intent=/);
});

test("renderEditorViewerHtml escapes theme and region text", () => {
  const html = renderEditorViewerHtml(
    createEditorViewerModel(createFakeReport("Dark <script>alert(1)</script>")),
  );

  assert.match(html, /Dark &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("renderEditorViewerHtml serializes region intent safely", () => {
  const html = renderEditorViewerHtml(
    createEditorViewerModel(createFakeReport("Sample Dark")),
  );

  assert.match(html, /&quot;source&quot;:&quot;viewerClick&quot;/);
  assert.match(html, /&quot;targetId&quot;:&quot;syntax-comment&quot;/);
});

function createFakeReport(themeName) {
  return {
    theme: {
      configuredName: themeName,
    },
    signals: {
      background: { value: "#101010" },
      foreground: { value: "#eeeeee" },
      comment: { value: "#222222" },
      string: { value: "#ce9178" },
      keyword: { value: "#569cd6" },
      error: { value: "#f44747" },
      warning: { value: "#ffd166" },
      diffAdded: { value: "#4cc38a" },
      diffDeleted: { value: "#f44747" },
    },
    risks: [],
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: FAIL with `Cannot find module '../../out/core/editorViewerRenderer'`.

## Task 2: Renderer GREEN 구현

**Files:**

- Create: `src/core/editorViewerRenderer.ts`

- [ ] **Step 1: Create renderer**

`src/core/editorViewerRenderer.ts`를 만든다.

```typescript
import type {
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample,
} from "./types/editorViewer.types";

export function renderEditorViewerHtml(model: EditorViewerModel): string {
  const samples = model.samples.map(renderSample).join("");

  return `<!doctype html>
<html lang="en">
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
  const backgroundStyle = region.backgroundColor
    ? ` background:${cssColor(region.backgroundColor)};`
    : "";
  const intent = escapeHtml(JSON.stringify(region.intent));

  return `<button class="region" type="button" data-region-id="${escapeHtml(region.id)}" data-signal="${escapeHtml(region.signal)}" data-intent="${intent}" style="color:${cssColor(region.color)};${backgroundStyle}">${escapeHtml(region.text)}</button>`;
}

function cssColor(value: string | undefined): string {
  return escapeHtml(value || "#ffffff");
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: renderer tests pass.

## Task 3: Extension command wiring

**Files:**

- Modify: `src/constants.ts`
- Modify: `package.json`
- Modify: `src/extension.ts`

- [ ] **Step 1: Add command id and manifest entry**

`src/constants.ts`의 `COMMAND_IDS`에 추가한다.

```typescript
openEditorViewer: "colorCalibration.openEditorViewer",
```

`package.json`의 `activationEvents`와 `contributes.commands`에 추가한다.

```json
"onCommand:colorCalibration.openEditorViewer"
```

```json
{
  "command": "colorCalibration.openEditorViewer",
  "title": "Color Calibration: Open Editor Viewer"
}
```

- [ ] **Step 2: Wire extension handler**

`src/extension.ts`에 `createEditorViewerModel`과 `renderEditorViewerHtml`을 import한다.

```typescript
import { createEditorViewerModel } from "./core/editorViewerModel";
import { renderEditorViewerHtml } from "./core/editorViewerRenderer";
```

`activate` command 목록에 추가한다.

```typescript
registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", handleOpenEditorViewer),
```

handler를 추가한다.

```typescript
async function handleOpenEditorViewer(
  output: vscode.OutputChannel,
): Promise<void> {
  const probe = await collectThemeSnapshot(vscode, {
    includeThemeDefinitions: true,
  });
  const report = createThemeSignalReport(probe);
  const viewerModel = createEditorViewerModel(report);

  openHtmlPanel(
    "colorCalibrationEditorViewer",
    "Color Calibration Editor Viewer",
    renderEditorViewerHtml(viewerModel),
  );

  output.appendLine(
    JSON.stringify(
      {
        themeName: viewerModel.themeName,
        samples: viewerModel.samples.length,
        regions: viewerModel.samples.reduce(
          (count, sample) =>
            count +
            sample.lines.reduce(
              (lineCount, line) => lineCount + line.regions.length,
              0,
            ),
          0,
        ),
      },
      null,
      2,
    ),
  );
  console.log("[Color Calibration] Editor viewer", viewerModel);
  vscode.window.showInformationMessage(
    `Editor viewer opened for ${viewerModel.themeName}.`,
  );
}
```

기존 `openPreviewPanel` 아래에 HTML string을 직접 받는 helper를 추가하고, `openPreviewPanel`은 이 helper를 재사용한다.

```typescript
function openPreviewPanel(
  viewType: string,
  title: string,
  previewModel: ReturnType<typeof createPreviewModel>,
): void {
  openHtmlPanel(viewType, title, renderPreviewHtml(previewModel));
}

function openHtmlPanel(viewType: string, title: string, html: string): void {
  const panel = vscode.window.createWebviewPanel(
    viewType,
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = html;
}
```

- [ ] **Step 3: Run full test**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: all tests pass.

## Self Review

- 이번 phase는 Webview shell만 추가한다.
- click handler와 Webview script는 추가하지 않는다.
- clickable region metadata는 HTML에 포함하되, solution 생성은 다음 phase로 남긴다.
- 기존 preview/candidate/apply/rollback 동작은 바꾸지 않는다.
