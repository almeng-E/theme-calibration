# Current Theme Candidate Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 사용자의 실제 theme 분석 결과에서 생성한 candidate를 선택해 settings overlay에 적용하고 rollback할 수 있는 기능 루프를 만든다.

**Architecture:** Core는 candidate 선택과 patch plan 생성을 순수 함수로 처리한다. Extension Host는 현재 theme snapshot/report 수집, QuickPick 선택, settings write, rollback state 저장만 orchestration한다. 기존 hardcoded recipe는 테스트/예시로 남기고 실제 apply command는 candidate 기반으로 분리한다.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `node:test`.

---

## File Structure

- Create: `src/core/candidatePatchService.ts`
  - report, selected candidate ids, existing settings를 받아 candidate apply plan을 만든다.
- Create: `test/core/candidatePatchService.test.js`
  - 현재 theme 후보 생성, 일부 선택, 선택 후보만 적용, 후보 없음/선택 없음 error를 검증한다.
- Modify: `src/constants.ts`
  - candidate apply/rollback command id와 rollback state key를 추가한다.
- Modify: `package.json`
  - internal activation event에 candidate apply/rollback command를 추가한다.
- Modify: `test/manifest.test.js`
  - internal command activation을 검증한다.
- Modify: `src/extension.ts`
  - `colorCalibration.applyCandidatePatch`와 `colorCalibration.rollbackCandidatePatch`를 등록하고 현재 theme 기반 apply/rollback을 구현한다.
- Modify: `README.md`
  - 개발자용 내부 명령을 hardcoded 예시와 candidate 실제 흐름으로 분리한다.

---

## Task 1: Candidate Patch Service

**Files:**
- Create: `src/core/candidatePatchService.ts`
- Create: `test/core/candidatePatchService.test.js`

- [ ] **Step 1: Write failing tests**

Create `test/core/candidatePatchService.test.js`.

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCandidatePatchApplyPlan
} = require("../../out/core/candidatePatchService");

test("createCandidatePatchApplyPlan applies selected candidates from the current theme report", () => {
  const plan = createCandidatePatchApplyPlan({
    report: createReport(),
    selectedCandidateIds: [
      "lowContrast-comment-editor.tokenColorCustomizations-comments",
      "similarSignal-error-diffDeleted-workbench.colorCustomizations-editorGutter.deletedBackground"
    ],
    existingSettings: createExistingSettings(),
    now: new Date("2026-06-06T00:00:00.000Z")
  });

  assert.equal(plan.candidates.length, 3);
  assert.equal(plan.selectedCandidates.length, 2);
  assert.equal(plan.patchPlan.recipeId, "patch-candidates-default-dark");
  assert.equal(
    plan.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].comments,
    "#8fb8ff"
  );
  assert.equal(
    plan.patchPlan.nextSettings["editor.tokenColorCustomizations"]["[Default Dark+]"].strings,
    "#ce9178"
  );
  assert.equal(
    plan.patchPlan.nextSettings["workbench.colorCustomizations"]["[Default Dark+]"]["editorGutter.deletedBackground"],
    "#ff6b6b"
  );
});

test("createCandidatePatchApplyPlan rejects reports with no candidates", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: { ...createReport(), risks: [] },
      selectedCandidateIds: ["missing"],
      existingSettings: createExistingSettings()
    }),
    /No patch candidates were generated/
  );
});

test("createCandidatePatchApplyPlan rejects empty selection", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: createReport(),
      selectedCandidateIds: [],
      existingSettings: createExistingSettings()
    }),
    /No patch candidates were selected/
  );
});

test("createCandidatePatchApplyPlan rejects unknown selected candidate ids", () => {
  assert.throws(
    () => createCandidatePatchApplyPlan({
      report: createReport(),
      selectedCandidateIds: ["missing"],
      existingSettings: createExistingSettings()
    }),
    /Selected patch candidates were not found: missing/
  );
});

function createReport() {
  return {
    generatedAt: "2026-06-06T00:00:00.000Z",
    theme: {
      configuredName: "Default Dark+",
      definitionStatus: "loaded"
    },
    signals: {
      background: { value: "#1e1e1e", source: "colors.editor.background" },
      comment: { value: "#3f3f3f", source: "tokenColors.comment" },
      string: { value: "#4a4a4a", source: "tokenColors.string" },
      error: { value: "#f14c4c", source: "colors.editorError.foreground" },
      diffDeleted: { value: "#f15c5c", source: "colors.editorGutter.deletedBackground" }
    },
    contrast: {},
    risks: [
      { type: "lowContrast", signal: "comment", contrastRatio: 2.1, threshold: 4.5 },
      { type: "lowContrast", signal: "string", contrastRatio: 2.3, threshold: 4.5 },
      { type: "similarSignal", signals: ["error", "diffDeleted"], colorDistance: 8 }
    ]
  };
}

function createExistingSettings() {
  return {
    "workbench.colorCustomizations": {
      "[Default Dark+]": {
        "editor.background": "#1e1e1e",
        "editorGutter.deletedBackground": "#5a1d1d"
      }
    },
    "editor.tokenColorCustomizations": {
      "[Default Dark+]": {
        comments: "#6a9955",
        strings: "#ce9178"
      }
    },
    "editor.semanticTokenColorCustomizations": {}
  };
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/core/candidatePatchService'`.

- [ ] **Step 3: Implement service**

Create `src/core/candidatePatchService.ts`.

```typescript
import { buildPatchPlan } from "./patchEngine";
import { createPatchCandidates, createPatchRecipeFromCandidates } from "./patchGenerator";
import type { PatchCandidate, PatchExecutionPlan, ConfigurationSnapshot } from "./types/patch.types";
import type { ThemeAnalysisReport } from "./types/signal.types";

export interface CandidatePatchApplyPlanInput {
  report: ThemeAnalysisReport;
  selectedCandidateIds: readonly string[];
  existingSettings: ConfigurationSnapshot;
  now?: Date;
}

export interface CandidatePatchApplyPlan {
  candidates: PatchCandidate[];
  selectedCandidates: PatchCandidate[];
  patchPlan: PatchExecutionPlan;
}

export function createCandidatePatchApplyPlan(input: CandidatePatchApplyPlanInput): CandidatePatchApplyPlan {
  const candidates = createPatchCandidates(input.report);

  if (candidates.length === 0) {
    throw new Error("No patch candidates were generated for the current theme.");
  }

  if (input.selectedCandidateIds.length === 0) {
    throw new Error("No patch candidates were selected.");
  }

  const selectedCandidates = input.selectedCandidateIds.map((id) => candidates.find((candidate) => candidate.id === id));
  const missingCandidateIds = input.selectedCandidateIds.filter((_, index) => !selectedCandidates[index]);

  if (missingCandidateIds.length > 0) {
    throw new Error(`Selected patch candidates were not found: ${missingCandidateIds.join(", ")}`);
  }

  const recipe = createPatchRecipeFromCandidates(
    selectedCandidates as PatchCandidate[],
    input.report.theme.configuredName
  );

  return {
    candidates,
    selectedCandidates: selectedCandidates as PatchCandidate[],
    patchPlan: buildPatchPlan(input.existingSettings, recipe, input.now)
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/core/candidatePatchService.ts test/core/candidatePatchService.test.js
git commit -m ":sparkles: feat: candidate patch apply service 추가"
```

---

## Task 2: Extension Candidate Apply/Rollback Commands

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`
- Modify: `test/manifest.test.js`

- [ ] **Step 1: Add command ids and activation manifest**

Add command ids:

```typescript
applyCandidatePatch: "colorCalibration.applyCandidatePatch",
rollbackCandidatePatch: "colorCalibration.rollbackCandidatePatch"
```

Add rollback key:

```typescript
export const CANDIDATE_ROLLBACK_STATE_KEY = "colorCalibration.candidatePatch.rollbackSnapshot";
```

Add activation events for both commands in `package.json`.

- [ ] **Step 2: Update manifest test**

In `test/manifest.test.js`, assert activation events include:

```javascript
assert.ok(activationEvents.has("onCommand:colorCalibration.applyCandidatePatch"));
assert.ok(activationEvents.has("onCommand:colorCalibration.rollbackCandidatePatch"));
```

- [ ] **Step 3: Wire extension commands**

In `src/extension.ts`:

- import `CANDIDATE_ROLLBACK_STATE_KEY`
- import `createCandidatePatchApplyPlan`
- register:

```typescript
registerCommand(output, COMMAND_IDS.applyCandidatePatch, "Candidate patch apply", (out) => handleApplyCandidatePatch(out, context)),
registerCommand(output, COMMAND_IDS.rollbackCandidatePatch, "Candidate patch rollback", (out) => handleRollbackCandidatePatch(out, context))
```

Implement `handleApplyCandidatePatch`:

```typescript
async function handleApplyCandidatePatch(output: vscode.OutputChannel, context: vscode.ExtensionContext): Promise<void> {
  const target = vscode.ConfigurationTarget.Global;
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const existingSettings = readCurrentPatchableSettings(vscode, target);
  const candidates = createPatchCandidates(report);

  if (candidates.length === 0) {
    output.appendLine("Candidate patch apply skipped: no-candidates.");
    vscode.window.showWarningMessage("No patch candidates were generated for the current theme.");
    return;
  }

  const selectedItems = await vscode.window.showQuickPick(
    candidates.map(toCandidateQuickPickItem),
    {
      canPickMany: true,
      title: "Color Calibration: Apply Candidate Patch",
      placeHolder: "Select one or more candidates to apply to the current theme."
    }
  );

  if (!selectedItems || selectedItems.length === 0) {
    output.appendLine("Candidate patch apply cancelled.");
    return;
  }

  const applyPlan = createCandidatePatchApplyPlan({
    report,
    selectedCandidateIds: selectedItems.map((item) => item.candidate.id),
    existingSettings
  });

  await writeSettingsToVscode(vscode, applyPlan.patchPlan.settingsUpdates, target);
  await context.globalState.update(CANDIDATE_ROLLBACK_STATE_KEY, applyPlan.patchPlan.rollbackSnapshot);

  output.appendLine(JSON.stringify({
    themeName: report.theme.configuredName,
    selectedCandidateIds: applyPlan.selectedCandidates.map((candidate) => candidate.id),
    settingsUpdates: applyPlan.patchPlan.settingsUpdates,
    rollbackStateKey: CANDIDATE_ROLLBACK_STATE_KEY
  }, null, 2));
  vscode.window.showInformationMessage(`Applied ${applyPlan.selectedCandidates.length} candidate patch(es).`);
}
```

Implement `handleRollbackCandidatePatch` like existing rollback but using `CANDIDATE_ROLLBACK_STATE_KEY`.

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/constants.ts src/extension.ts package.json test/manifest.test.js
git commit -m ":sparkles: feat: current theme candidate patch 명령 추가"
```

---

## Task 3: README Internal Command Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Update developer command list:

- Add `colorCalibration.applyCandidatePatch`
- Add `colorCalibration.rollbackCandidatePatch`
- Keep `colorCalibration.applyHardcodedPatch` and `colorCalibration.rollbackHardcodedPatch` as legacy/example commands if they remain registered.
- Replace “아직 candidate 기반 apply ... 연결되지 않았습니다” with a more precise statement:
  - candidate 기반 apply/rollback command exists for internal verification,
  - public UI flow still does not expose final apply controls.

- [ ] **Step 2: Preserve UTF-8 BOM**

Save `README.md` as UTF-8 with BOM.

- [ ] **Step 3: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m ":memo: docs: candidate apply 내부 명령 안내 추가"
```

---

## Review Gates

After each task:

1. Implementation subagent reports DONE with RED/GREEN evidence and commit hash.
2. Spec compliance reviewer checks only whether the task matches this plan.
3. Code quality reviewer checks SRP, security, maintainability, and feature completeness.
4. If either reviewer finds issues, the same implementation owner fixes them and the same review gate runs again.
5. Completed subagents are closed immediately after their result is processed.

Final verification:

```powershell
git diff --check
& 'C:\nvm4w\nodejs\npm.cmd' test
git status --short --branch
```
