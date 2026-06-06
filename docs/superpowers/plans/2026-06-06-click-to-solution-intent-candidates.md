# Click-to-Solution Intent Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor Viewer에서 사용자가 클릭한 영역의 `CalibrationIntent`를 검증하고, 현재 theme 분석 결과에서 해당 signal과 관련된 solution candidate를 생성한다.

**Architecture:** Webview는 계속 클릭 payload만 보내고, Extension Host는 payload 검증과 VS Code 알림만 담당한다. 새 core 모듈은 `CalibrationIntent`와 `ThemeAnalysisReport`를 입력받아 관련 risk와 candidate를 선택하는 순수 함수로 유지한다.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `node:test`, CommonJS compiled output under `out/`.

---

## File Structure

- Create: `src/core/intentSolution.ts`
  - 클릭/진단 intent를 theme report의 risk, patch candidate와 연결하는 순수 core 모듈이다.
- Create: `test/core/intentSolution.test.js`
  - intent signal에 맞는 candidate 필터링, 관련 risk 없음, 생성 가능한 candidate 없음을 검증한다.
- Modify: `src/extension.ts`
  - Webview `regionClick` message를 `normalizeCalibrationIntentPayload`로 검증하고, `createIntentSolution` 결과를 Output Channel과 VS Code notification에 표시한다.
- Create: `src/adapter/intentSolutionNotification.ts`
  - Extension Host가 표시할 알림 level/message를 순수 함수로 만든다.
- Create: `test/adapter/intentSolutionNotification.test.js`
  - solution status별 사용자-facing 알림 문구 선택을 검증한다.
- Modify: `README.md`
  - Editor Viewer 클릭이 현재는 solution candidate 생성까지 연결된다는 사용자 안내를 추가한다.

---

## Task 1: Intent Solution Core

**Files:**
- Create: `src/core/intentSolution.ts`
- Create: `test/core/intentSolution.test.js`

- [ ] **Step 1: Write failing tests**

`test/core/intentSolution.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const { createIntentSolution } = require("../../out/core/intentSolution");

function createReport(risks) {
  return {
    theme: { configuredName: "Default Dark+" },
    signals: {
      background: { role: "background", value: "#1e1e1e", source: "editor.background" },
      comment: { role: "comment", value: "#3f3f3f", source: "token.comment" },
      string: { role: "string", value: "#ce9178", source: "token.string" },
      error: { role: "error", value: "#f14c4c", source: "editorError.foreground" },
      diffDeleted: { role: "diffDeleted", value: "#f15c5c", source: "editorGutter.deletedBackground" }
    },
    contrast: {},
    risks
  };
}

test("createIntentSolution returns candidates related to clicked signal", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "comment",
      contrastRatio: 2.1,
      threshold: 4.5,
      message: "comment has low contrast against the editor background."
    },
    {
      type: "similarSignal",
      signals: ["error", "diffDeleted"],
      colorDistance: 8,
      message: "error and diffDeleted are visually close."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "comment",
    targetId: "syntax-comment",
    sampleId: "syntax-sample",
    message: "Comment visibility needs review.",
    severity: "unspecified"
  });

  assert.equal(solution.status, "candidates");
  assert.equal(solution.intent.signal, "comment");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 1);
  assert.equal(solution.candidates[0].settingKey, "comments");
});

test("createIntentSolution includes similar-signal risks containing the clicked signal", () => {
  const report = createReport([
    {
      type: "similarSignal",
      signals: ["error", "diffDeleted"],
      colorDistance: 8,
      message: "error and diffDeleted are visually close."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "diffDeleted",
    targetId: "diff-deleted",
    severity: "unspecified"
  });

  assert.equal(solution.status, "candidates");
  assert.equal(solution.risks.length, 1);
  assert.deepEqual(solution.candidates[0].signals, ["error", "diffDeleted"]);
});

test("createIntentSolution reports no matching risk when the clicked signal is not risky", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "comment",
      contrastRatio: 2.1,
      threshold: 4.5,
      message: "comment has low contrast against the editor background."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "string",
    targetId: "syntax-string",
    severity: "unspecified"
  });

  assert.equal(solution.status, "noMatchingRisk");
  assert.equal(solution.risks.length, 0);
  assert.equal(solution.candidates.length, 0);
});

test("createIntentSolution reports no candidate when a matching risk has no conservative mapping", () => {
  const report = createReport([
    {
      type: "lowContrast",
      signal: "diffDeleted",
      contrastRatio: 2.2,
      threshold: 4.5,
      message: "diffDeleted has low contrast against the editor background."
    }
  ]);

  const solution = createIntentSolution(report, {
    source: "viewerClick",
    signal: "diffDeleted",
    targetId: "diff-deleted",
    severity: "unspecified"
  });

  assert.equal(solution.status, "noCandidate");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/core/intentSolution'`.

- [ ] **Step 3: Implement minimal core module**

Create `src/core/intentSolution.ts`.

```typescript
import { createPatchCandidates } from "./patchGenerator";
import type { CalibrationIntent } from "./types/calibration.types";
import type { PatchCandidate } from "./types/patch.types";
import type { ThemeAnalysisReport, VisibilityRisk } from "./types/signal.types";

export type IntentSolutionStatus = "candidates" | "noMatchingRisk" | "noCandidate";

export interface IntentSolution {
  intent: CalibrationIntent;
  status: IntentSolutionStatus;
  risks: VisibilityRisk[];
  candidates: PatchCandidate[];
}

export function createIntentSolution(
  report: ThemeAnalysisReport,
  intent: CalibrationIntent
): IntentSolution {
  const risks = report.risks.filter((risk) => isRiskRelatedToSignal(risk, intent.signal));

  if (risks.length === 0) {
    return {
      intent,
      status: "noMatchingRisk",
      risks,
      candidates: []
    };
  }

  const candidates = createPatchCandidates({
    signals: report.signals,
    risks
  });

  return {
    intent,
    status: candidates.length > 0 ? "candidates" : "noCandidate",
    risks,
    candidates
  };
}

function isRiskRelatedToSignal(risk: VisibilityRisk, signal: CalibrationIntent["signal"]): boolean {
  if (risk.type === "lowContrast") {
    return risk.signal === signal;
  }

  if (risk.type === "similarSignal") {
    return risk.signals?.includes(signal) ?? false;
  }

  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 45 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/core/intentSolution.ts test/core/intentSolution.test.js
git commit -m ":sparkles: feat: 클릭 intent solution 후보 생성 추가"
```

---

## Task 2: Extension Host Integration

**Files:**
- Create: `src/adapter/intentSolutionNotification.ts`
- Create: `test/adapter/intentSolutionNotification.test.js`
- Modify: `src/extension.ts`
- Test: `test/adapter/intentSolutionNotification.test.js` and existing `npm test`

- [ ] **Step 1: Write failing integration test through TypeScript compile**

VS Code API message handler를 단위 테스트로 억지 mock하지 않는다. 대신 알림 level/message 선택을 adapter 순수 함수로 분리하고 그 함수를 먼저 테스트한다.

Create `test/adapter/intentSolutionNotification.test.js`.

```javascript
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
```

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/adapter/intentSolutionNotification'`.

- [ ] **Step 2: Implement message handling**

Create `src/adapter/intentSolutionNotification.ts`.

```typescript
import type { IntentSolution } from "../core/intentSolution";

export type IntentSolutionNotificationLevel = "info" | "warning";

export interface IntentSolutionNotification {
  level: IntentSolutionNotificationLevel;
  message: string;
}

export function createIntentSolutionNotification(solution: IntentSolution): IntentSolutionNotification {
  if (solution.status === "candidates") {
    return {
      level: "info",
      message: `Solution candidates: ${solution.candidates.length} for ${solution.intent.signal}.`
    };
  }

  if (solution.status === "noMatchingRisk") {
    return {
      level: "info",
      message: `No obvious visibility risk found for ${solution.intent.signal} in the current simple rules.`
    };
  }

  return {
    level: "warning",
    message: `Visibility risk found for ${solution.intent.signal}, but no conservative candidate is available yet.`
  };
}
```

Then modify message handling in `src/extension.ts`.

Modify imports in `src/extension.ts`.

```typescript
import { normalizeCalibrationIntentPayload } from "./core/calibrationIntent";
import { createIntentSolution } from "./core/intentSolution";
import { createIntentSolutionNotification } from "./adapter/intentSolutionNotification";
```

Update `handleOpenEditorViewer` so it passes `report` to the panel helper.

```typescript
  openEditorViewerPanel(
    "colorCalibrationEditorViewer",
    "Color Calibration Editor Viewer",
    renderEditorViewerHtml(viewerModel, nonce),
    output,
    report
  );
```

Update `openEditorViewerPanel` signature and message handler.

```typescript
function openEditorViewerPanel(
  viewType: string,
  title: string,
  html: string,
  output: vscode.OutputChannel,
  report: ReturnType<typeof createThemeSignalReport>
): void {
  const panel = vscode.window.createWebviewPanel(
    viewType,
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = html;

  panel.webview.onDidReceiveMessage((message) => {
    if (message?.type !== "regionClick") {
      return;
    }

    try {
      const intent = normalizeCalibrationIntentPayload(message.intent);
      const solution = createIntentSolution(report, intent);
      const notification = createIntentSolutionNotification(solution);

      output.appendLine(`[Region Click] ${JSON.stringify({ intent, solution }, null, 2)}`);
      console.log("[Color Calibration] Region click solution", solution);

      if (notification.level === "info") {
        vscode.window.showInformationMessage(notification.message);
      } else {
        vscode.window.showWarningMessage(notification.message);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      output.appendLine(`[Region Click] invalid intent: ${errorMessage}`);
      vscode.window.showWarningMessage(`Invalid editor viewer click payload: ${errorMessage}`);
    }
  });
}
```

- [ ] **Step 3: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 45 tests.

- [ ] **Step 4: Commit**

```powershell
git add src/extension.ts
git commit -m ":sparkles: feat: editor viewer 클릭 solution 연결"
```

---

## Task 3: README Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update user command description**

Update the `Color Calibration: Open Editor Viewer` section so it says the viewer can now generate candidate solutions from clicked regions.

- [ ] **Step 2: Preserve UTF-8 Korean encoding**

After editing, save `README.md` with UTF-8 encoding. If PowerShell displays Korean text incorrectly, read/write with explicit UTF-8.

- [ ] **Step 3: Run verification**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 45 tests.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m ":memo: docs: 클릭 solution 흐름 안내 추가"
```

---

## Review Gates

After each task:

1. Implementation subagent reports DONE with tests and commit hash.
2. Spec compliance reviewer checks only whether the task matches this plan.
3. Code quality reviewer checks SRP, test value, maintainability, and whether UI/extension responsibilities stayed separated.
4. If either reviewer finds issues, the same implementation owner fixes them and the same review gate runs again.

Final verification:

```powershell
git diff --check
& 'C:\nvm4w\nodejs\npm.cmd' test
git status --short --branch
```
