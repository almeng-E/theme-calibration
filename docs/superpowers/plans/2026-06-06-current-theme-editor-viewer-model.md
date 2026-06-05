# 현재 테마 편집기 viewer 모델 구현 계획

> **에이전트 작업자 안내:** 이 계획은 작업 단위로 실행하세요. 가능하면 `superpowers:subagent-driven-development`를 사용하고, 그렇지 않으면 `superpowers:executing-plans`를 사용하세요. 체크박스(`- [ ]`)는 진행 상태 추적용입니다.

**목표:** 현재 사용자의 theme signal을 기반으로, 나중에 Webview UI가 소비할 수 있는 편집기형 viewer model과 클릭 가능한 region 데이터를 만든다.

**아키텍처:** 이번 단계에서는 실제 Webview UI, CSS, 클릭 handler를 구현하지 않는다. `editorViewerModel`은 `ThemeAnalysisReport`를 받아 현재 theme와 유사한 syntax/diagnostic/diff sample model을 만든다. 각 clickable region은 Phase 1의 `CalibrationIntentInput`을 포함하므로 다음 단계에서 UI message를 core intent로 연결할 수 있다.

**기술 스택:** TypeScript, Node.js `node:test`, VS Code Extension API는 직접 사용하지 않음.

---

## 파일 구조

- 생성: `src/core/types/editorViewer.types.ts`
  - viewer model, sample, line, clickable region 타입을 정의한다.
- 생성: `src/core/editorViewerModel.ts`
  - 현재 theme signal을 정규화하고 editor-like sample model을 만든다.
- 생성: `test/core/editorViewerModel.test.js`
  - viewer model 생성, region intent, fallback signal 동작을 검증한다.
- 생성: `docs/superpowers/plans/2026-06-06-current-theme-editor-viewer-model.md`
  - Phase 3 계획을 기록한다.

## Task 1: Editor viewer model RED 테스트

**Files:**
- Create: `test/core/editorViewerModel.test.js`

- [ ] **Step 1: Write the failing test**

`test/core/editorViewerModel.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createEditorViewerModel,
  findEditorViewerRegion
} = require("../../out/core/editorViewerModel");

test("createEditorViewerModel creates editor-like samples from current theme signals", () => {
  const model = createEditorViewerModel(createFakeReport());

  assert.equal(model.themeName, "Sample Dark");
  assert.equal(model.signals.background, "#101010");
  assert.equal(model.signals.comment, "#222222");
  assert.equal(model.samples.length, 3);
  assert.deepEqual(model.samples.map((sample) => sample.kind), ["syntax", "diagnostic", "diff"]);
  assert.equal(model.risks.length, 1);
});

test("createEditorViewerModel exposes stable clickable intent for syntax regions", () => {
  const model = createEditorViewerModel(createFakeReport());
  const region = findEditorViewerRegion(model, "syntax-comment");

  assert.ok(region);
  assert.equal(region.signal, "comment");
  assert.equal(region.color, "#222222");
  assert.deepEqual(region.intent, {
    source: "viewerClick",
    signal: "comment",
    sampleId: "syntax-sample",
    targetId: "syntax-comment",
    severity: "unspecified",
    message: "Comment visibility needs review."
  });
});

test("createEditorViewerModel exposes diagnostic and diff regions", () => {
  const model = createEditorViewerModel(createFakeReport());

  assert.equal(findEditorViewerRegion(model, "diagnostic-error").signal, "error");
  assert.equal(findEditorViewerRegion(model, "diagnostic-warning").signal, "warning");
  assert.equal(findEditorViewerRegion(model, "diff-deleted").signal, "diffDeleted");
});

test("createEditorViewerModel falls back missing signals to editor defaults", () => {
  const model = createEditorViewerModel({
    theme: {
      configuredName: "Sparse Theme"
    },
    signals: {},
    risks: []
  });

  assert.equal(model.themeName, "Sparse Theme");
  assert.equal(model.signals.background, "#1e1e1e");
  assert.equal(findEditorViewerRegion(model, "syntax-keyword").color, "#569cd6");
});

function createFakeReport() {
  return {
    theme: {
      configuredName: "Sample Dark"
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
      diffDeleted: { value: "#f44747" }
    },
    risks: [
      {
        type: "lowContrast",
        signal: "comment"
      }
    ]
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: FAIL with `Cannot find module '../../out/core/editorViewerModel'`.

## Task 2: Editor viewer 타입과 모델 구현

**Files:**
- Create: `src/core/types/editorViewer.types.ts`
- Create: `src/core/editorViewerModel.ts`

- [ ] **Step 1: Create viewer types**

`src/core/types/editorViewer.types.ts`를 만든다.

```typescript
import type { CalibrationIntentInput } from "./calibration.types";
import type { ColorHexMap, ColorSignalRole, VisibilityRisk } from "./signal.types";

export type EditorViewerSampleKind = "syntax" | "diagnostic" | "diff";

export interface EditorViewerRegion {
  id: string;
  label: string;
  signal: ColorSignalRole;
  text: string;
  color: string;
  backgroundColor?: string;
  intent: CalibrationIntentInput;
}

export interface EditorViewerLine {
  id: string;
  regions: EditorViewerRegion[];
}

export interface EditorViewerSample {
  id: string;
  title: string;
  kind: EditorViewerSampleKind;
  background: string;
  foreground: string;
  lines: EditorViewerLine[];
}

export interface EditorViewerModel {
  themeName: string;
  signals: ColorHexMap;
  risks: VisibilityRisk[];
  samples: EditorViewerSample[];
}
```

- [ ] **Step 2: Create model builder**

`src/core/editorViewerModel.ts`를 만든다.

```typescript
import type {
  ColorHexMap,
  ColorSignalRole,
  ThemeAnalysisReport
} from "./types/signal.types";
import type {
  EditorViewerLine,
  EditorViewerModel,
  EditorViewerRegion,
  EditorViewerSample,
  EditorViewerSampleKind
} from "./types/editorViewer.types";

const SIGNAL_DEFAULTS: ColorHexMap = {
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

export function createEditorViewerModel(
  report: Partial<ThemeAnalysisReport> | undefined
): EditorViewerModel {
  const signals = normalizeReportSignals(report?.signals);

  return {
    themeName: report?.theme?.configuredName || "Unknown Theme",
    signals,
    risks: Array.isArray(report?.risks) ? report.risks : [],
    samples: [
      createSyntaxSample(signals),
      createDiagnosticSample(signals),
      createDiffSample(signals)
    ]
  };
}

export function findEditorViewerRegion(
  model: EditorViewerModel,
  regionId: string
): EditorViewerRegion | undefined {
  for (const sample of model.samples) {
    for (const line of sample.lines) {
      const region = line.regions.find((item) => item.id === regionId);
      if (region) {
        return region;
      }
    }
  }

  return undefined;
}

function createSyntaxSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("syntax-sample", "Syntax Signals", "syntax", signals, [
    createLine("syntax-line-1", [
      createRegion("syntax-sample", "syntax-keyword", "Keyword", "function", "keyword", signals.keyword),
      createRegion("syntax-sample", "syntax-foreground", "Foreground", " calibrateTheme(signal) {", "foreground", signals.foreground)
    ]),
    createLine("syntax-line-2", [
      createRegion("syntax-sample", "syntax-comment", "Comment", "// keep the theme, improve the signal", "comment", signals.comment)
    ]),
    createLine("syntax-line-3", [
      createRegion("syntax-sample", "syntax-keyword-const", "Keyword", "const", "keyword", signals.keyword),
      createRegion("syntax-sample", "syntax-foreground-message", "Foreground", " message = ", "foreground", signals.foreground),
      createRegion("syntax-sample", "syntax-string", "String", "\"visibility matters\"", "string", signals.string)
    ])
  ]);
}

function createDiagnosticSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diagnostic-sample", "Diagnostics", "diagnostic", signals, [
    createLine("diagnostic-line-1", [
      createRegion("diagnostic-sample", "diagnostic-warning", "Warning", "warning: keyword signal may be hard to separate", "warning", signals.warning, withAlphaFallback(signals.warning, "20"))
    ]),
    createLine("diagnostic-line-2", [
      createRegion("diagnostic-sample", "diagnostic-error", "Error", "error: deletion and diagnostic colors overlap", "error", signals.error, withAlphaFallback(signals.error, "20"))
    ])
  ]);
}

function createDiffSample(signals: ColorHexMap): EditorViewerSample {
  return createSample("diff-sample", "Diff", "diff", signals, [
    createLine("diff-line-1", [
      createRegion("diff-sample", "diff-added", "Added Diff", "+ added code path is visible", "diffAdded", signals.diffAdded, withAlphaFallback(signals.diffAdded, "22"))
    ]),
    createLine("diff-line-2", [
      createRegion("diff-sample", "diff-deleted", "Deleted Diff", "- deleted code path is visible", "diffDeleted", signals.diffDeleted, withAlphaFallback(signals.diffDeleted, "22"))
    ])
  ]);
}

function createSample(
  id: string,
  title: string,
  kind: EditorViewerSampleKind,
  signals: ColorHexMap,
  lines: EditorViewerLine[]
): EditorViewerSample {
  return {
    id,
    title,
    kind,
    background: signals.background,
    foreground: signals.foreground,
    lines
  };
}

function createLine(id: string, regions: EditorViewerRegion[]): EditorViewerLine {
  return { id, regions };
}

function createRegion(
  sampleId: string,
  id: string,
  label: string,
  text: string,
  signal: ColorSignalRole,
  color: string,
  backgroundColor?: string
): EditorViewerRegion {
  return {
    id,
    label,
    signal,
    text,
    color,
    ...(backgroundColor ? { backgroundColor } : {}),
    intent: {
      source: "viewerClick",
      signal,
      sampleId,
      targetId: id,
      severity: "unspecified",
      message: `${label} visibility needs review.`
    }
  };
}

function normalizeReportSignals(signals: ThemeAnalysisReport["signals"] | undefined): ColorHexMap {
  const normalized = { ...SIGNAL_DEFAULTS };

  for (const name of Object.keys(SIGNAL_DEFAULTS) as Array<keyof ColorHexMap>) {
    const signal = signals?.[name];
    if (signal?.value) {
      normalized[name] = signal.value;
    }
  }

  return normalized;
}

function withAlphaFallback(hex: string, alpha: string): string {
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return `${hex}${alpha}`;
  }

  return hex;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: all tests pass.

## Self Review

- 이번 phase는 UI/Webview/CSS를 확정하지 않는다.
- 현재 사용자의 theme signal을 기준으로 viewer model을 만든다.
- clickable region은 `CalibrationIntentInput`을 포함한다.
- 가시성 판단, candidate 생성, apply/rollback은 변경하지 않는다.
