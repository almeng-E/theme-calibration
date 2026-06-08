# Real Rules and Webview Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 테스트 fixture에만 있던 후보 룰을 실제 번들 룰 파일로 승격하고, Editor Viewer 클릭에서 실제 후보 확인과 단일 후보 적용까지 연결한다.

**Architecture:** `diagnose/`는 계속 순수 함수로 유지하고, 룰 JSON 검증은 순수 `parser/`가 담당한다. 번들 파일 읽기는 `adapter/` 또는 `extension.ts`의 wiring에서만 수행하며, Webview는 클릭/적용 intent만 Extension Host로 보내고 실제 설정 쓰기는 기존 `patch/`, `serializer/`, `adapter/` 흐름을 재사용한다.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `node:test`, CommonJS compiled output under `out/`, JSON bundled resources.

---

## File Structure

- Create: `resources/rules/default-candidate-rules.json`
  - 프로덕션 기본 후보 매핑 룰 번들이다. VS Code extension 루트에 포함되는 정적 리소스로 둔다.
- Create: `src/types/rule.types.ts`
  - `CandidateMappingRule`, `CandidateRuleBundle`, `CandidateRuleParseResult` 타입을 정의한다.
- Modify: `src/diagnose/diagnosticEngine.ts`
  - 로컬 `CandidateMappingRule` 인터페이스를 제거하고 `types/rule.types.ts`에서 가져온다.
- Create: `src/parser/candidateRuleParser.ts`
  - raw JSON 객체를 검증하고 `CandidateMappingRule[]`로 변환하는 순수 parser다.
- Create: `src/adapter/candidateRuleAdapter.ts`
  - VS Code `workspace.fs.readFile`로 번들 JSON을 읽고 parser에 넘긴다.
- Create: `src/diagnose/intentSolution.ts`
  - 클릭 intent, report, rules를 받아 관련 risk와 후보를 반환하는 순수 함수다.
- Modify: `src/types/editorViewer.types.ts`
  - `CalibrationIntent`, `IntentSolution`, Webview message 타입을 명시한다.
- Modify: `src/ui/diagnosticViewModel.ts`
  - `EditorViewerRegion.intent`가 `any`가 아니라 `CalibrationIntent`가 되도록 연결한다.
- Modify: `src/ui/diagnosticViewHtml.ts`
  - 후보 카드에 적용 버튼을 렌더링하고 `applyCandidatePatch` message를 보낸다.
- Modify: `src/ui/notificationFormatter.ts`
  - `IntentSolution` 타입을 사용하고 메시지 문구를 현재 룰 표현으로 정리한다.
- Modify: `src/extension.ts`
  - activate 시 기본 룰을 로드하고 모든 후보 생성/클릭/적용 흐름에 같은 룰을 주입한다.
- Modify: `README.md`
  - 실제 룰 번들, 클릭 후보 확인, 단일 후보 적용 흐름을 사용자 관점에서 설명한다.
- Create: `test/parser/candidateRuleParser.test.js`
- Create: `test/adapter/candidateRuleAdapter.test.js`
- Create: `test/diagnose/intentSolution.test.js`
- Modify: existing tests under `test/diagnose/`, `test/ui/`, `test/patch/` only where type or behavior changes require it.

---

## Phase 1: Candidate Rule Bundle and Pure Parser

### Task 1: Rule Types and Default Bundle

**Files:**
- Create: `src/types/rule.types.ts`
- Create: `resources/rules/default-candidate-rules.json`
- Modify: `src/diagnose/diagnosticEngine.ts`
- Modify: `test/diagnose/diagnosticEngine.test.js`

- [ ] **Step 1: Write the failing import compatibility test**

Modify `test/diagnose/diagnosticEngine.test.js` so it imports default rule-shaped objects through the same shape the parser will return. Keep the existing assertions intact.

```javascript
const { SETTING_IDS } = require("../../out/constants");

const DEFAULT_RULES_FOR_TEST = [
  {
    type: "lowContrast",
    signals: ["comment"],
    settingId: SETTING_IDS.editorTokenColorCustomizations,
    settingKey: "comments",
    suggestedColor: "#8fb8ff",
    confidence: 0.8
  },
  {
    type: "similarSignal",
    signals: ["error", "diffDeleted"],
    settingId: SETTING_IDS.workbenchColorCustomizations,
    settingKey: "editorGutter.deletedBackground",
    suggestedColor: "#ff6b6b",
    confidence: 0.7
  }
];
```

Use `DEFAULT_RULES_FOR_TEST` in the first two candidate generation tests. This should still pass after compilation, but it prepares the tests to assert the exported type shape rather than fixture module coupling.

- [ ] **Step 2: Run the focused test**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 46 tests. This is a characterization step before moving the type.

- [ ] **Step 3: Create shared rule types**

Create `src/types/rule.types.ts`.

```typescript
import type { TargetSettingId } from "./patch.types";
import type { ColorSignalRole } from "./signal.types";

export type CandidateRuleType = "lowContrast" | "similarSignal";

export interface CandidateMappingRule {
  type: CandidateRuleType;
  signals: ColorSignalRole[];
  settingId: TargetSettingId;
  settingKey: string;
  suggestedColor: string;
  confidence: number;
}

export interface CandidateRuleBundle {
  version: 1;
  candidateMappings: CandidateMappingRule[];
}

export type CandidateRuleParseResult =
  | { status: "valid"; bundle: CandidateRuleBundle; rules: CandidateMappingRule[] }
  | { status: "invalid"; errors: string[]; rules: [] };
```

- [ ] **Step 4: Move `CandidateMappingRule` import**

Modify `src/diagnose/diagnosticEngine.ts`.

Remove the local `CandidateMappingRule` interface and add:

```typescript
import type { CandidateMappingRule } from "../types/rule.types";
```

- [ ] **Step 5: Add the default JSON bundle**

Create `resources/rules/default-candidate-rules.json`.

```json
{
  "version": 1,
  "candidateMappings": [
    {
      "type": "lowContrast",
      "signals": ["comment"],
      "settingId": "editor.tokenColorCustomizations",
      "settingKey": "comments",
      "suggestedColor": "#8fb8ff",
      "confidence": 0.8
    },
    {
      "type": "lowContrast",
      "signals": ["string"],
      "settingId": "editor.tokenColorCustomizations",
      "settingKey": "strings",
      "suggestedColor": "#b7f2a1",
      "confidence": 0.8
    },
    {
      "type": "lowContrast",
      "signals": ["keyword"],
      "settingId": "editor.tokenColorCustomizations",
      "settingKey": "keywords",
      "suggestedColor": "#d7b7ff",
      "confidence": 0.8
    },
    {
      "type": "lowContrast",
      "signals": ["foreground"],
      "settingId": "workbench.colorCustomizations",
      "settingKey": "editor.foreground",
      "suggestedColor": "#eeeeee",
      "confidence": 0.75
    },
    {
      "type": "lowContrast",
      "signals": ["error"],
      "settingId": "workbench.colorCustomizations",
      "settingKey": "editorError.foreground",
      "suggestedColor": "#ff6b6b",
      "confidence": 0.75
    },
    {
      "type": "lowContrast",
      "signals": ["warning"],
      "settingId": "workbench.colorCustomizations",
      "settingKey": "editorWarning.foreground",
      "suggestedColor": "#ffd166",
      "confidence": 0.75
    },
    {
      "type": "similarSignal",
      "signals": ["error", "diffDeleted"],
      "settingId": "workbench.colorCustomizations",
      "settingKey": "editorGutter.deletedBackground",
      "suggestedColor": "#ff6b6b",
      "confidence": 0.7
    },
    {
      "type": "similarSignal",
      "signals": ["diffAdded", "string"],
      "settingId": "workbench.colorCustomizations",
      "settingKey": "editorGutter.addedBackground",
      "suggestedColor": "#4cc38a",
      "confidence": 0.7
    }
  ]
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 46 tests.

- [ ] **Step 7: Commit**

```powershell
git add src/types/rule.types.ts src/diagnose/diagnosticEngine.ts resources/rules/default-candidate-rules.json test/diagnose/diagnosticEngine.test.js
git commit -m ":sparkles: feat: 기본 후보 룰 번들 추가"
```

### Task 2: Pure Candidate Rule Parser

**Files:**
- Create: `src/parser/candidateRuleParser.ts`
- Create: `test/parser/candidateRuleParser.test.js`

- [ ] **Step 1: Write failing parser tests**

Create `test/parser/candidateRuleParser.test.js`.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCandidateRuleBundle } = require("../../out/parser/candidateRuleParser");

test("parseCandidateRuleBundle accepts a valid versioned rule bundle", () => {
  const result = parseCandidateRuleBundle({
    version: 1,
    candidateMappings: [
      {
        type: "lowContrast",
        signals: ["comment"],
        settingId: "editor.tokenColorCustomizations",
        settingKey: "comments",
        suggestedColor: "#8fb8ff",
        confidence: 0.8
      }
    ]
  });

  assert.equal(result.status, "valid");
  assert.equal(result.rules.length, 1);
  assert.equal(result.rules[0].signals[0], "comment");
});

test("parseCandidateRuleBundle rejects invalid rule fields with precise errors", () => {
  const result = parseCandidateRuleBundle({
    version: 1,
    candidateMappings: [
      {
        type: "lowContrast",
        signals: ["notASignal"],
        settingId: "workbench.colorCustomizations",
        settingKey: "",
        suggestedColor: "blue",
        confidence: 1.5
      }
    ]
  });

  assert.equal(result.status, "invalid");
  assert.deepEqual(result.rules, []);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.signals\[0\]/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.settingKey/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.suggestedColor/);
  assert.match(result.errors.join("\n"), /candidateMappings\[0\]\.confidence/);
});

test("parseCandidateRuleBundle rejects unsupported bundle versions", () => {
  const result = parseCandidateRuleBundle({
    version: 2,
    candidateMappings: []
  });

  assert.equal(result.status, "invalid");
  assert.match(result.errors.join("\n"), /version/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/parser/candidateRuleParser'`.

- [ ] **Step 3: Implement the parser**

Create `src/parser/candidateRuleParser.ts`.

```typescript
import { SETTING_IDS } from "../constants";
import type { TargetSettingId } from "../types/patch.types";
import type { CandidateMappingRule, CandidateRuleParseResult } from "../types/rule.types";
import type { ColorSignalRole } from "../types/signal.types";
import { parseHexColor } from "../utils/colorUtils";
import { isPlainObject } from "../utils/objectUtils";

const VALID_SIGNALS = new Set<ColorSignalRole>([
  "background",
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning",
  "diffAdded",
  "diffDeleted"
]);

const VALID_SETTING_IDS = new Set<TargetSettingId>([
  SETTING_IDS.workbenchColorCustomizations,
  SETTING_IDS.editorTokenColorCustomizations,
  SETTING_IDS.editorSemanticTokenColorCustomizations
]);

export function parseCandidateRuleBundle(raw: unknown): CandidateRuleParseResult {
  const errors: string[] = [];

  if (!isPlainObject(raw)) {
    return { status: "invalid", errors: ["bundle must be an object."], rules: [] };
  }

  if (raw.version !== 1) {
    errors.push("version must be 1.");
  }

  if (!Array.isArray(raw.candidateMappings)) {
    errors.push("candidateMappings must be an array.");
    return { status: "invalid", errors, rules: [] };
  }

  const rules = raw.candidateMappings
    .map((entry, index) => parseRule(entry, index, errors))
    .filter((rule): rule is CandidateMappingRule => Boolean(rule));

  if (errors.length > 0) {
    return { status: "invalid", errors, rules: [] };
  }

  return {
    status: "valid",
    bundle: {
      version: 1,
      candidateMappings: rules
    },
    rules
  };
}

function parseRule(raw: unknown, index: number, errors: string[]): CandidateMappingRule | undefined {
  const path = `candidateMappings[${index}]`;
  if (!isPlainObject(raw)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }

  const type = raw.type;
  if (type !== "lowContrast" && type !== "similarSignal") {
    errors.push(`${path}.type must be lowContrast or similarSignal.`);
  }

  const signals = parseSignals(raw.signals, `${path}.signals`, errors);
  const settingId = parseSettingId(raw.settingId, `${path}.settingId`, errors);
  const settingKey = parseNonEmptyString(raw.settingKey, `${path}.settingKey`, errors);
  const suggestedColor = parseColor(raw.suggestedColor, `${path}.suggestedColor`, errors);
  const confidence = parseConfidence(raw.confidence, `${path}.confidence`, errors);

  if (type !== "lowContrast" && type !== "similarSignal") {
    return undefined;
  }

  if (!signals || !settingId || !settingKey || !suggestedColor || confidence === undefined) {
    return undefined;
  }

  return {
    type,
    signals,
    settingId,
    settingKey,
    suggestedColor,
    confidence
  };
}

function parseSignals(raw: unknown, path: string, errors: string[]): ColorSignalRole[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push(`${path} must be a non-empty array.`);
    return undefined;
  }

  const signals: ColorSignalRole[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry !== "string" || !VALID_SIGNALS.has(entry as ColorSignalRole)) {
      errors.push(`${path}[${index}] must be a known signal role.`);
      return;
    }

    signals.push(entry as ColorSignalRole);
  });

  return signals.length === raw.length ? signals : undefined;
}

function parseSettingId(raw: unknown, path: string, errors: string[]): TargetSettingId | undefined {
  if (typeof raw !== "string" || !VALID_SETTING_IDS.has(raw as TargetSettingId)) {
    errors.push(`${path} must be a supported VS Code color customization setting id.`);
    return undefined;
  }

  return raw as TargetSettingId;
}

function parseNonEmptyString(raw: unknown, path: string, errors: string[]): string | undefined {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return undefined;
  }

  return raw;
}

function parseColor(raw: unknown, path: string, errors: string[]): string | undefined {
  if (typeof raw !== "string" || !parseHexColor(raw)) {
    errors.push(`${path} must be a hex color.`);
    return undefined;
  }

  return raw;
}

function parseConfidence(raw: unknown, path: string, errors: string[]): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) {
    errors.push(`${path} must be a number between 0 and 1.`);
    return undefined;
  }

  return raw;
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 49 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/parser/candidateRuleParser.ts test/parser/candidateRuleParser.test.js
git commit -m ":sparkles: feat: 후보 룰 파서 추가"
```

---

## Phase 2: Runtime Rule Loading and Candidate Injection

### Task 3: Adapter Loader for Bundled Rules

**Files:**
- Create: `src/adapter/candidateRuleAdapter.ts`
- Create: `test/adapter/candidateRuleAdapter.test.js`

- [ ] **Step 1: Write failing adapter tests**

Create `test/adapter/candidateRuleAdapter.test.js`.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createDefaultCandidateRuleUri,
  loadCandidateRulesFromUri
} = require("../../out/adapter/candidateRuleAdapter");

test("createDefaultCandidateRuleUri resolves the bundled default rule path", () => {
  const calls = [];
  const vscodeLike = {
    Uri: {
      joinPath(base, ...parts) {
        calls.push({ base, parts });
        return `${base}/${parts.join("/")}`;
      }
    }
  };

  const uri = createDefaultCandidateRuleUri(vscodeLike, "extension-root");

  assert.equal(uri, "extension-root/resources/rules/default-candidate-rules.json");
  assert.deepEqual(calls[0].parts, ["resources", "rules", "default-candidate-rules.json"]);
});

test("loadCandidateRulesFromUri reads and parses a valid rule bundle", async () => {
  const vscodeLike = {
    workspace: {
      fs: {
        async readFile() {
          return Buffer.from(JSON.stringify({
            version: 1,
            candidateMappings: [
              {
                type: "lowContrast",
                signals: ["comment"],
                settingId: "editor.tokenColorCustomizations",
                settingKey: "comments",
                suggestedColor: "#8fb8ff",
                confidence: 0.8
              }
            ]
          }), "utf8");
        }
      }
    }
  };

  const rules = await loadCandidateRulesFromUri(vscodeLike, "rules-uri");

  assert.equal(rules.length, 1);
  assert.equal(rules[0].settingKey, "comments");
});

test("loadCandidateRulesFromUri throws parser errors for invalid bundles", async () => {
  const vscodeLike = {
    workspace: {
      fs: {
        async readFile() {
          return Buffer.from(JSON.stringify({ version: 2, candidateMappings: [] }), "utf8");
        }
      }
    }
  };

  await assert.rejects(
    () => loadCandidateRulesFromUri(vscodeLike, "rules-uri"),
    /Invalid candidate rule bundle/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/adapter/candidateRuleAdapter'`.

- [ ] **Step 3: Implement adapter loader**

Create `src/adapter/candidateRuleAdapter.ts`.

```typescript
import type { CandidateMappingRule } from "../types/rule.types";
import { parseCandidateRuleBundle } from "../parser/candidateRuleParser";

interface VscodeRuleUriLike {
  Uri: {
    joinPath(base: unknown, ...pathSegments: string[]): unknown;
  };
}

interface VscodeRuleFileLike {
  workspace: {
    fs: {
      readFile(uri: unknown): Thenable<Uint8Array> | Promise<Uint8Array>;
    };
  };
}

export function createDefaultCandidateRuleUri(vscodeLike: VscodeRuleUriLike, extensionUri: unknown): unknown {
  return vscodeLike.Uri.joinPath(extensionUri, "resources", "rules", "default-candidate-rules.json");
}

export async function loadCandidateRulesFromUri(
  vscodeLike: VscodeRuleFileLike,
  rulesUri: unknown
): Promise<CandidateMappingRule[]> {
  const bytes = await vscodeLike.workspace.fs.readFile(rulesUri);
  const rawText = Buffer.from(bytes).toString("utf8");
  const raw = JSON.parse(rawText);
  const result = parseCandidateRuleBundle(raw);

  if (result.status === "invalid") {
    throw new Error(`Invalid candidate rule bundle: ${result.errors.join("; ")}`);
  }

  return result.rules;
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 52 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/adapter/candidateRuleAdapter.ts test/adapter/candidateRuleAdapter.test.js
git commit -m ":sparkles: feat: 번들 후보 룰 로더 추가"
```

### Task 4: Inject Loaded Rules into Existing Candidate Flows

**Files:**
- Modify: `src/extension.ts`
- Modify: `README.md`

- [ ] **Step 1: Add rule loading to activation**

Modify imports in `src/extension.ts`.

```typescript
import {
  createDefaultCandidateRuleUri,
  loadCandidateRulesFromUri
} from "./adapter/candidateRuleAdapter";
import type { CandidateMappingRule } from "./types/rule.types";
```

In `activate`, create a lazily loaded rules promise before registering commands.

```typescript
  const candidateRulesPromise = loadCandidateRulesFromUri(
    vscode,
    createDefaultCandidateRuleUri(vscode, context.extensionUri)
  );
```

Pass `candidateRulesPromise` to handlers that generate candidates:

```typescript
    registerCommand(output, COMMAND_IDS.printPatchCandidates, "Patch candidate generation", (out) =>
      handlePrintPatchCandidates(out, candidateRulesPromise)
    ),
    registerCommand(output, COMMAND_IDS.openCandidatePreview, "Candidate preview", (out) =>
      handleOpenCandidatePreview(out, candidateRulesPromise)
    ),
    registerCommand(output, COMMAND_IDS.openEditorViewer, "Editor viewer", (out) =>
      handleOpenEditorViewer(out, candidateRulesPromise)
    ),
    registerCommand(output, COMMAND_IDS.applyCandidatePatch, "Candidate patch apply", (out) =>
      handleApplyCandidatePatch(out, context, candidateRulesPromise)
    ),
```

- [ ] **Step 2: Update handler signatures and candidate calls**

Use this pattern in each handler:

```typescript
async function handlePrintPatchCandidates(
  output: vscode.OutputChannel,
  candidateRulesPromise: Promise<CandidateMappingRule[]>
): Promise<void> {
  const candidateRules = await candidateRulesPromise;
  const probe = await collectThemeSnapshot(vscode, { includeThemeDefinitions: true });
  const report = createThemeSignalReport(probe);
  const candidates = createPatchCandidates(report, candidateRules);
  const recipe = createPatchRecipeFromCandidates(candidates, report.theme.configuredName);
```

Apply the same `const candidateRules = await candidateRulesPromise;` and `createPatchCandidates(report, candidateRules)` change to:

```typescript
handleOpenCandidatePreview
handleOpenEditorViewer
handleApplyCandidatePatch
```

- [ ] **Step 3: Keep rule load failures visible**

Let `registerCommand` catch load errors. Do not swallow parser or file read errors. The user-facing error should already be routed through `showErrorMessage` by the existing wrapper.

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 52 tests.

- [ ] **Step 5: Update README**

Add a short Korean section:

```markdown
## 기본 후보 룰

후보 생성은 `resources/rules/default-candidate-rules.json`에 포함된 기본 룰 번들을 사용합니다. 진단 엔진은 이 파일을 직접 읽지 않고, Extension Host가 로드한 `CandidateMappingRule[]`을 주입받아 후보를 계산합니다.
```

- [ ] **Step 6: Run tests again**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 52 tests.

- [ ] **Step 7: Commit**

```powershell
git add src/extension.ts README.md
git commit -m ":sparkles: feat: 기본 후보 룰 런타임 주입"
```

---

## Phase 3: Real Click-to-Solution Candidates

### Task 5: Pure Intent Solution Service

**Files:**
- Create: `src/diagnose/intentSolution.ts`
- Create: `test/diagnose/intentSolution.test.js`
- Modify: `src/types/editorViewer.types.ts`
- Modify: `src/ui/diagnosticViewModel.ts`
- Modify: `src/ui/notificationFormatter.ts`
- Modify: `test/ui/diagnosticViewModel.test.js`
- Modify: `test/ui/notificationFormatter.test.js`

- [ ] **Step 1: Write failing intent solution tests**

Create `test/diagnose/intentSolution.test.js`.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createIntentSolution } = require("../../out/diagnose/intentSolution");

const RULES = [
  {
    type: "lowContrast",
    signals: ["comment"],
    settingId: "editor.tokenColorCustomizations",
    settingKey: "comments",
    suggestedColor: "#8fb8ff",
    confidence: 0.8
  },
  {
    type: "similarSignal",
    signals: ["error", "diffDeleted"],
    settingId: "workbench.colorCustomizations",
    settingKey: "editorGutter.deletedBackground",
    suggestedColor: "#ff6b6b",
    confidence: 0.7
  }
];

test("createIntentSolution returns candidates related to the clicked low contrast signal", () => {
  const solution = createIntentSolution(createReport([
    { type: "lowContrast", signal: "comment", message: "comment has low contrast." },
    { type: "similarSignal", signals: ["error", "diffDeleted"], message: "error and diffDeleted are visually close." }
  ]), createIntent("comment"), RULES);

  assert.equal(solution.status, "candidates");
  assert.equal(solution.intent.signal, "comment");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 1);
  assert.equal(solution.candidates[0].settingKey, "comments");
});

test("createIntentSolution includes similar-signal risks containing the clicked signal", () => {
  const solution = createIntentSolution(createReport([
    { type: "similarSignal", signals: ["error", "diffDeleted"], message: "error and diffDeleted are visually close." }
  ]), createIntent("diffDeleted"), RULES);

  assert.equal(solution.status, "candidates");
  assert.equal(solution.risks.length, 1);
  assert.deepEqual(solution.candidates[0].signals, ["error", "diffDeleted"]);
});

test("createIntentSolution reports no matching risk when clicked signal is not risky", () => {
  const solution = createIntentSolution(createReport([
    { type: "lowContrast", signal: "comment", message: "comment has low contrast." }
  ]), createIntent("string"), RULES);

  assert.equal(solution.status, "noMatchingRisk");
  assert.equal(solution.risks.length, 0);
  assert.equal(solution.candidates.length, 0);
});

test("createIntentSolution reports no candidate when matching risk has no mapped rule", () => {
  const solution = createIntentSolution(createReport([
    { type: "lowContrast", signal: "diffDeleted", message: "diffDeleted has low contrast." }
  ]), createIntent("diffDeleted"), RULES);

  assert.equal(solution.status, "noCandidate");
  assert.equal(solution.risks.length, 1);
  assert.equal(solution.candidates.length, 0);
});

function createIntent(signal) {
  return {
    source: "viewerClick",
    signal,
    sampleId: "sample",
    targetId: `${signal}-region`,
    severity: "unspecified",
    message: `${signal} visibility needs review.`
  };
}

function createReport(risks) {
  return {
    generatedAt: "2026-06-06T00:00:00.000Z",
    theme: { configuredName: "Sample Dark", definitionStatus: "loaded" },
    signals: {
      background: { value: "#101010" },
      foreground: { value: "#eeeeee" },
      comment: { value: "#222222" },
      string: { value: "#ce9178" },
      error: { value: "#f44747" },
      diffDeleted: { value: "#f44747" }
    },
    contrast: {},
    risks
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL with `Cannot find module '../../out/diagnose/intentSolution'`.

- [ ] **Step 3: Type the Webview intent and solution DTOs**

Modify `src/types/editorViewer.types.ts`.

```typescript
import type { PatchCandidate } from "./patch.types";
import type { ColorHexMap, ColorSignalRole, VisibilityRisk } from "./signal.types";

export type CalibrationIntentSource = "viewerClick";
export type CalibrationIntentSeverity = "unspecified";

export interface CalibrationIntent {
  source: CalibrationIntentSource;
  signal: ColorSignalRole;
  sampleId?: string;
  targetId: string;
  severity: CalibrationIntentSeverity;
  message?: string;
}

export type IntentSolutionStatus = "candidates" | "noMatchingRisk" | "noCandidate";

export interface IntentSolution {
  intent: CalibrationIntent;
  status: IntentSolutionStatus;
  risks: VisibilityRisk[];
  candidates: PatchCandidate[];
}
```

Change `EditorViewerRegion.intent` from `any` to:

```typescript
  intent: CalibrationIntent;
```

- [ ] **Step 4: Implement pure intent solution service**

Create `src/diagnose/intentSolution.ts`.

```typescript
import { createPatchCandidates } from "../diagnose/diagnosticEngine";
import type { CalibrationIntent, IntentSolution } from "../types/editorViewer.types";
import type { CandidateMappingRule } from "../types/rule.types";
import type { ThemeAnalysisReport, VisibilityRisk } from "../types/signal.types";

export function createIntentSolution(
  report: ThemeAnalysisReport,
  intent: CalibrationIntent,
  rules: CandidateMappingRule[]
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
  }, rules);

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

- [ ] **Step 5: Update notification formatter typing**

Modify `src/ui/notificationFormatter.ts`.

```typescript
import type { IntentSolution } from "../types/editorViewer.types";

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
      message: `No obvious visibility risk found for ${solution.intent.signal} in the current rules.`
    };
  }

  return {
    level: "warning",
    message: `Visibility risk found for ${solution.intent.signal}, but no conservative candidate is available yet.`
  };
}
```

Update `test/ui/notificationFormatter.test.js` expected string from `current simple rules` to `current rules`.

- [ ] **Step 6: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 56 tests.

- [ ] **Step 7: Commit**

```powershell
git add src/diagnose/intentSolution.ts src/types/editorViewer.types.ts src/ui/diagnosticViewModel.ts src/ui/notificationFormatter.ts test/diagnose/intentSolution.test.js test/ui/diagnosticViewModel.test.js test/ui/notificationFormatter.test.js
git commit -m ":sparkles: feat: 클릭 intent 후보 해석 추가"
```

### Task 6: Wire Real Candidates into Editor Viewer Clicks

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Replace the placeholder solution**

Modify imports in `src/extension.ts`.

```typescript
import { createIntentSolution } from "./diagnose/intentSolution";
import type { CalibrationIntent } from "./types/editorViewer.types";
```

In `handleOpenEditorViewer`, load rules and pass them into `openEditorViewerPanel`.

```typescript
  const candidateRules = await candidateRulesPromise;

  openEditorViewerPanel(
    "colorCalibrationEditorViewer",
    "Color Calibration Editor Viewer",
    renderEditorViewerHtml(viewerModel, nonce),
    output,
    report,
    candidateRules
  );
```

Modify `openEditorViewerPanel` signature.

```typescript
function openEditorViewerPanel(
  viewType: string,
  title: string,
  html: string,
  output: vscode.OutputChannel,
  report: ReturnType<typeof createThemeSignalReport>,
  candidateRules: CandidateMappingRule[]
): void {
```

Replace the placeholder solution:

```typescript
      const intent = message.intent as CalibrationIntent;
      const solution = createIntentSolution(report, intent, candidateRules);
      const notification = createIntentSolutionNotification(solution);
```

- [ ] **Step 2: Preserve the existing `postMessage` path**

Keep this message send immediately after creating the notification:

```typescript
      void panel.webview.postMessage({
        type: "solutionResult",
        solution
      });
```

- [ ] **Step 3: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 56 tests.

- [ ] **Step 4: Commit**

```powershell
git add src/extension.ts
git commit -m ":sparkles: feat: editor viewer 실제 후보 연결"
```

---

## Phase 4: Webview Candidate Apply Action

### Task 7: Render Apply Buttons and Send Candidate IDs

**Files:**
- Modify: `src/ui/diagnosticViewHtml.ts`
- Modify: `test/ui/diagnosticViewHtml.test.js`

- [ ] **Step 1: Write failing renderer test**

Add this test to `test/ui/diagnosticViewHtml.test.js`.

```javascript
test("renderEditorViewerHtml renders candidate apply message support", () => {
  const html = renderEditorViewerHtml(createEditorViewerModel(createFakeReport("Sample Dark")), "testnonce");

  assert.match(html, /data-candidate-apply/);
  assert.match(html, /type: "applyCandidatePatch"/);
  assert.match(html, /candidateId: candidate\.id/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: FAIL because candidate cards do not render an apply button.

- [ ] **Step 3: Add apply button rendering**

In `renderCandidate(candidate)` inside `src/ui/diagnosticViewHtml.ts`, add:

```javascript
        var applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.textContent = "Apply";
        applyButton.setAttribute("data-candidate-apply", candidate.id);
        applyButton.addEventListener("click", function () {
          vscode.postMessage({
            type: "applyCandidatePatch",
            candidateId: candidate.id
          });
        });
```

Append it before returning:

```javascript
        item.appendChild(applyButton);
```

Add compact button CSS:

```css
    .candidate button {
      border: 1px solid #596274;
      border-radius: 4px;
      background: #2a3140;
      color: #f2f4f8;
      padding: 4px 8px;
      font: inherit;
      cursor: pointer;
    }
    .candidate button:focus {
      outline: 1px solid #ffffff;
      outline-offset: 1px;
    }
```

- [ ] **Step 4: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 57 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/diagnosticViewHtml.ts test/ui/diagnosticViewHtml.test.js
git commit -m ":sparkles: feat: webview 후보 적용 버튼 추가"
```

### Task 8: Apply a Selected Webview Candidate Through Existing Patch Flow

**Files:**
- Modify: `src/extension.ts`
- Modify: `README.md`

- [ ] **Step 1: Add `applyCandidatePatch` Webview message handling**

In `openEditorViewerPanel`, keep `target` scoped to global for now because the existing command uses global writes.

```typescript
  const target = vscode.ConfigurationTarget.Global;
```

Inside `panel.webview.onDidReceiveMessage`, handle `applyCandidatePatch` before the `regionClick` branch.

```typescript
    if (message?.type === "applyCandidatePatch") {
      void applyCandidateFromEditorViewer(message.candidateId, report, candidateRules, target, output);
      return;
    }
```

Create a helper near the command handlers.

```typescript
async function applyCandidateFromEditorViewer(
  candidateId: unknown,
  report: ReturnType<typeof createThemeSignalReport>,
  candidateRules: CandidateMappingRule[],
  target: vscode.ConfigurationTarget,
  output: vscode.OutputChannel
): Promise<void> {
  if (typeof candidateId !== "string" || candidateId.length === 0) {
    vscode.window.showWarningMessage("Invalid candidate id from editor viewer.");
    return;
  }

  const existingSettings = readCurrentPatchableSettings(vscode, target);
  const candidates = createPatchCandidates(report, candidateRules);
  const applyPlan = createCandidatePatchApplyPlan({
    report,
    candidates,
    selectedCandidateIds: [candidateId],
    existingSettings
  });

  if (applyPlan.selectedCandidates.length === 0) {
    vscode.window.showWarningMessage("Selected candidate is no longer available for the current theme report.");
    return;
  }

  await writeSettingsToVscode(vscode, applyPlan.patchPlan.settingsUpdates, target);

  output.appendLine(JSON.stringify({
    source: "editorViewer",
    selectedCandidateIds: applyPlan.selectedCandidates.map((candidate) => candidate.id),
    settingsUpdates: applyPlan.patchPlan.settingsUpdates
  }, null, 2));

  vscode.window.showInformationMessage(`Applied ${applyPlan.selectedCandidates.length} editor viewer candidate patch.`);
}
```

- [ ] **Step 2: Decide rollback state scope**

Do not update `context.globalState` in this task. This keeps the helper signature small and avoids changing rollback semantics before a dedicated rollback UX task. Existing command-based rollback remains unchanged.

- [ ] **Step 3: Run tests**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 57 tests.

- [ ] **Step 4: Update README**

Add:

```markdown
Editor Viewer에서 샘플 영역을 클릭하면 현재 룰 번들로 계산된 후보가 오른쪽 패널에 표시됩니다. 후보의 `Apply` 버튼은 기존 patch flow를 재사용해 해당 후보 하나를 전역 사용자 설정에 적용합니다. 전용 Webview rollback UX는 아직 제공하지 않으며, 명령 기반 rollback 흐름은 기존 동작을 유지합니다.
```

- [ ] **Step 5: Run tests again**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' test
```

Expected: PASS with 57 tests.

- [ ] **Step 6: Commit**

```powershell
git add src/extension.ts README.md
git commit -m ":sparkles: feat: editor viewer 후보 단일 적용 연결"
```

---

## Review Gates

Each Phase/Task must be executed with Subagent-Driven Development:

1. Dispatch one implementation subagent for the task with the full task text and relevant file context.
2. The implementer must follow TDD: failing test, minimal implementation, passing test, self-review.
3. After implementation, dispatch a spec compliance reviewer first.
4. If spec review finds issues, the same implementation owner fixes them and spec review repeats.
5. Only after spec review passes, dispatch a code quality reviewer.
6. If code quality review finds issues, the same implementation owner fixes them and code quality review repeats.
7. Do not start the next task until both reviews pass.
8. Do not ask the user whether to continue unless the status is `BLOCKED` or `NEEDS_CONTEXT`.

## Final Verification

Run:

```powershell
git diff --check
& 'C:\nvm4w\nodejs\npm.cmd' test
git status --short --branch
```

Expected:

- `git diff --check` prints no whitespace errors.
- `npm.cmd test` passes all tests.
- `git status --short --branch` shows only intentional committed branch state or no uncommitted changes.

## Self-Review

- Spec coverage: 인수인계의 다음 단계 1번은 Phase 1-2에서 실제 룰 파일과 로더로 다룬다. 다음 단계 2번은 Phase 3-4에서 클릭 후보 표시와 단일 적용 UX로 다룬다. 다음 단계 3번은 Review Gates와 파일 경계에 반영했다.
- Placeholder scan: 금지된 빈칸 채우기식 표현을 사용하지 않았다.
- Type consistency: `CandidateMappingRule`는 `src/types/rule.types.ts`에 단일 정의로 두고 `diagnose`, `parser`, `extension`에서 같은 타입을 사용한다. `IntentSolution`은 `src/types/editorViewer.types.ts`에 두고 `diagnose`와 `ui`가 공유한다.
