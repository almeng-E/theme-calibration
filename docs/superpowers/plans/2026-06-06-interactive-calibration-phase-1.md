# 인터랙티브 캘리브레이션 Phase 1 구현 계획

> **에이전트 작업자 안내:** 이 계획은 작업 단위로 실행하세요. 가능하면 `superpowers:subagent-driven-development`를 사용하고, 그렇지 않으면 `superpowers:executing-plans`를 사용하세요. 체크박스(`- [ ]`)는 진행 상태 추적용입니다.

**목표:** 사용자가 편집기형 viewer에서 불편한 색상 신호를 클릭했을 때 core가 이해할 수 있는 `CalibrationIntent` 도메인 모델을 만든다.

**아키텍처:** 이번 단계에서는 UI를 아직 확정하지 않는다. Webview나 QuickPick 같은 adapter는 나중에 바뀔 수 있으므로, `src/core/types/calibration.types.ts`와 `src/core/calibrationIntent.ts`에 순수 도메인 경계만 만든다. 기존 `PatchCandidate` 생성 흐름은 그대로 두고, 다음 phase에서 intent 기반 candidate 생성으로 연결할 수 있게 한다.

**기술 스택:** TypeScript, Node.js `node:test`. VS Code Extension API는 이번 phase에서 직접 사용하지 않는다.

---

## 파일 구조

- 생성: `src/core/types/calibration.types.ts`
  - 사용자가 불편함을 느낀 대상과 입력 출처를 표현하는 타입만 정의한다.
- 생성: `src/core/calibrationIntent.ts`
  - 외부 viewer/UI payload를 검증하고 `CalibrationIntent`로 정규화한다.
- 생성: `test/core/calibrationIntent.test.js`
  - 빌드 산출물 `out/core/calibrationIntent`를 import해서 순수 함수 동작을 검증한다.

## Task 1: CalibrationIntent 타입과 정규화 함수

**Files:**
- Create: `src/core/types/calibration.types.ts`
- Create: `src/core/calibrationIntent.ts`
- Test: `test/core/calibrationIntent.test.js`

- [ ] **Step 1: Write the failing test**

`test/core/calibrationIntent.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCalibrationIntent,
  normalizeCalibrationIntentPayload
} = require("../../out/core/calibrationIntent");

test("createCalibrationIntent creates a user reported intent for a clickable signal", () => {
  const intent = createCalibrationIntent({
    source: "viewerClick",
    signal: "comment",
    sampleId: "editor-main",
    targetId: "line-2-comment",
    message: "주석과 배경의 구분이 어렵습니다."
  });

  assert.equal(intent.source, "viewerClick");
  assert.equal(intent.signal, "comment");
  assert.equal(intent.sampleId, "editor-main");
  assert.equal(intent.targetId, "line-2-comment");
  assert.equal(intent.message, "주석과 배경의 구분이 어렵습니다.");
  assert.equal(intent.severity, "unspecified");
});

test("normalizeCalibrationIntentPayload trims optional text and defaults source and severity", () => {
  const intent = normalizeCalibrationIntentPayload({
    signal: "diffDeleted",
    sampleId: " diff-sample ",
    targetId: " deleted-line ",
    message: "  삭제 라인이 오류처럼 보입니다.  "
  });

  assert.equal(intent.source, "viewerClick");
  assert.equal(intent.signal, "diffDeleted");
  assert.equal(intent.sampleId, "diff-sample");
  assert.equal(intent.targetId, "deleted-line");
  assert.equal(intent.message, "삭제 라인이 오류처럼 보입니다.");
  assert.equal(intent.severity, "unspecified");
});

test("normalizeCalibrationIntentPayload rejects unknown signals", () => {
  assert.throws(
    () => normalizeCalibrationIntentPayload({ signal: "minimap", targetId: "x" }),
    /Unsupported calibration signal: minimap/
  );
});

test("normalizeCalibrationIntentPayload rejects missing target id", () => {
  assert.throws(
    () => normalizeCalibrationIntentPayload({ signal: "comment", targetId: " " }),
    /Calibration intent targetId is required/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: FAIL with `Cannot find module '../../out/core/calibrationIntent'`.

- [ ] **Step 3: Write minimal implementation**

`src/core/types/calibration.types.ts`를 만든다.

```typescript
import type { ColorSignalRole } from "./signal.types";

export type CalibrationIntentSource = "viewerClick" | "diagnosis" | "manual";
export type CalibrationIntentSeverity = "unspecified" | "low" | "medium" | "high";

export interface CalibrationIntent {
  source: CalibrationIntentSource;
  signal: ColorSignalRole;
  targetId: string;
  sampleId?: string;
  message?: string;
  severity: CalibrationIntentSeverity;
}

export interface CalibrationIntentInput {
  source?: CalibrationIntentSource;
  signal: ColorSignalRole;
  targetId: string;
  sampleId?: string;
  message?: string;
  severity?: CalibrationIntentSeverity;
}
```

`src/core/calibrationIntent.ts`를 만든다.

```typescript
import type { ColorSignalRole } from "./types/signal.types";
import type {
  CalibrationIntent,
  CalibrationIntentInput,
  CalibrationIntentSeverity,
  CalibrationIntentSource
} from "./types/calibration.types";

const SUPPORTED_SIGNALS = new Set<ColorSignalRole>([
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

const SUPPORTED_SOURCES = new Set<CalibrationIntentSource>([
  "viewerClick",
  "diagnosis",
  "manual"
]);

const SUPPORTED_SEVERITIES = new Set<CalibrationIntentSeverity>([
  "unspecified",
  "low",
  "medium",
  "high"
]);

export function createCalibrationIntent(input: CalibrationIntentInput): CalibrationIntent {
  return normalizeCalibrationIntentPayload(input);
}

export function normalizeCalibrationIntentPayload(payload: unknown): CalibrationIntent {
  if (!isRecord(payload)) {
    throw new Error("Calibration intent payload must be an object.");
  }

  const signal = normalizeSignal(payload.signal);
  const targetId = normalizeRequiredText(payload.targetId, "targetId");
  const source = normalizeSource(payload.source);
  const severity = normalizeSeverity(payload.severity);
  const sampleId = normalizeOptionalText(payload.sampleId);
  const message = normalizeOptionalText(payload.message);

  return {
    source,
    signal,
    targetId,
    ...(sampleId ? { sampleId } : {}),
    ...(message ? { message } : {}),
    severity
  };
}

function normalizeSignal(value: unknown): ColorSignalRole {
  if (typeof value !== "string" || !SUPPORTED_SIGNALS.has(value as ColorSignalRole)) {
    throw new Error(`Unsupported calibration signal: ${String(value)}`);
  }

  return value as ColorSignalRole;
}

function normalizeSource(value: unknown): CalibrationIntentSource {
  if (value === undefined) {
    return "viewerClick";
  }

  if (typeof value !== "string" || !SUPPORTED_SOURCES.has(value as CalibrationIntentSource)) {
    throw new Error(`Unsupported calibration intent source: ${String(value)}`);
  }

  return value as CalibrationIntentSource;
}

function normalizeSeverity(value: unknown): CalibrationIntentSeverity {
  if (value === undefined) {
    return "unspecified";
  }

  if (typeof value !== "string" || !SUPPORTED_SEVERITIES.has(value as CalibrationIntentSeverity)) {
    throw new Error(`Unsupported calibration intent severity: ${String(value)}`);
  }

  return value as CalibrationIntentSeverity;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new Error(`Calibration intent ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

이 phase에서는 사용자 요청에 따라 파일별로 나누어 커밋한다.

```bash
git add docs/superpowers/plans/2026-06-06-interactive-calibration-phase-1.md
git commit -m ":memo: docs: 인터랙티브 캘리브레이션 1단계 계획 추가"
git add src/core/types/calibration.types.ts
git commit -m ":sparkles: feat: 캘리브레이션 의도 타입 추가"
git add src/core/calibrationIntent.ts
git commit -m ":sparkles: feat: 캘리브레이션 의도 정규화 추가"
git add test/core/calibrationIntent.test.js
git commit -m ":test_tube: test: 캘리브레이션 의도 정규화 검증 추가"
```

## Self Review

- Phase 1은 UI를 확정하지 않는다.
- 현재 사용자의 theme 기반 설계와 충돌하지 않는다.
- 가시성 판단 로직은 이번 phase에 넣지 않는다.
- 다음 phase에서 viewer 영역 모델과 visibility analyzer를 단계적으로 추가할 수 있다.
