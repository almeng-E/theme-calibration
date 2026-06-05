# 가시성 엔진 분리 구현 계획

> **에이전트 작업자 안내:** 이 계획은 작업 단위로 실행하세요. 가능하면 `superpowers:subagent-driven-development`를 사용하고, 그렇지 않으면 `superpowers:executing-plans`를 사용하세요. 체크박스(`- [ ]`)는 진행 상태 추적용입니다.

**목표:** 현재 `themeAnalyzer`에 들어 있는 contrast/risk 판단 로직을 독립적인 `visibilityAnalyzer` core 모듈로 분리한다.

**아키텍처:** `themeAnalyzer`는 현재 사용자의 theme definition에서 signal을 추출하고 report를 조립하는 책임만 유지한다. `visibilityAnalyzer`는 signal map을 입력받아 contrast와 visibility risk를 계산한다. 지금 규칙은 단순 threshold 기반으로 유지하되, threshold와 비교 pair를 옵션으로 받을 수 있게 해서 나중에 더 정교한 가시성 로직으로 교체하기 쉽게 한다.

**기술 스택:** TypeScript, Node.js `node:test`, VS Code Extension API는 직접 사용하지 않음.

---

## 파일 구조

- 생성: `src/core/visibilityAnalyzer.ts`
  - signal contrast 계산, low contrast risk 생성, similar signal risk 생성을 담당한다.
- 생성: `test/core/visibilityAnalyzer.test.js`
  - 새 visibility analyzer의 순수 함수 동작을 검증한다.
- 수정: `src/core/themeAnalyzer.ts`
  - 가시성 계산 로직을 제거하고 `analyzeVisibility`를 호출한다.
- 생성: `docs/superpowers/plans/2026-06-06-visibility-engine-separation.md`
  - Phase 2 계획을 기록한다.

## Task 1: Visibility analyzer RED 테스트

**Files:**
- Create: `test/core/visibilityAnalyzer.test.js`

- [ ] **Step 1: Write the failing test**

`test/core/visibilityAnalyzer.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeVisibility,
  calculateSignalContrasts,
  createVisibilityRisks
} = require("../../out/core/visibilityAnalyzer");

test("calculateSignalContrasts calculates contrast for signals against editor background", () => {
  const contrast = calculateSignalContrasts({
    background: { value: "#101010" },
    comment: { value: "#222222" },
    foreground: { value: "#eeeeee" }
  });

  assert.ok(contrast.comment.ratio < 2);
  assert.ok(contrast.foreground.ratio > 10);
});

test("createVisibilityRisks creates low contrast risks with configurable threshold", () => {
  const risks = createVisibilityRisks(
    {
      background: { value: "#101010" },
      comment: { value: "#777777" }
    },
    {
      comment: { ratio: 4.1 }
    },
    {
      textContrastThreshold: 4.5
    }
  );

  assert.equal(risks.length, 1);
  assert.equal(risks[0].type, "lowContrast");
  assert.equal(risks[0].signal, "comment");
  assert.equal(risks[0].threshold, 4.5);
});

test("createVisibilityRisks creates similar signal risks with configurable pairs and distance", () => {
  const risks = createVisibilityRisks(
    {
      error: { value: "#f44747" },
      diffDeleted: { value: "#f44747" }
    },
    {},
    {
      similarSignalDistanceThreshold: 1,
      similarSignalPairs: [["error", "diffDeleted"]]
    }
  );

  assert.equal(risks.length, 1);
  assert.equal(risks[0].type, "similarSignal");
  assert.deepEqual(risks[0].signals, ["error", "diffDeleted"]);
  assert.equal(risks[0].colorDistance, 0);
});

test("analyzeVisibility returns noObviousRisk when simple rules find nothing", () => {
  const result = analyzeVisibility({
    background: { value: "#000000" },
    foreground: { value: "#ffffff" }
  });

  assert.ok(result.contrast.foreground.ratio > 20);
  assert.equal(result.risks.length, 1);
  assert.equal(result.risks[0].type, "noObviousRisk");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: FAIL with `Cannot find module '../../out/core/visibilityAnalyzer'`.

## Task 2: Visibility analyzer GREEN 구현

**Files:**
- Create: `src/core/visibilityAnalyzer.ts`

- [ ] **Step 1: Write minimal implementation**

`src/core/visibilityAnalyzer.ts`를 만든다.

```typescript
import type {
  ColorSignalMap,
  ColorSignalRole,
  SignalContrastMap,
  VisibilityRisk
} from "./types/signal.types";
import { calculateContrastRatio, calculateColorDistance } from "./colorUtils";

export interface VisibilityAnalysisResult {
  contrast: SignalContrastMap;
  risks: VisibilityRisk[];
}

export interface VisibilityAnalysisOptions {
  textContrastThreshold?: number;
  similarSignalDistanceThreshold?: number;
  textSignals?: readonly ColorSignalRole[];
  similarSignalPairs?: readonly (readonly [ColorSignalRole, ColorSignalRole])[];
}

const DEFAULT_TEXT_SIGNAL_NAMES: readonly ColorSignalRole[] = [
  "foreground",
  "comment",
  "string",
  "keyword",
  "error",
  "warning"
];

const DEFAULT_SIMILAR_SIGNAL_PAIRS: readonly (readonly [ColorSignalRole, ColorSignalRole])[] = [
  ["comment", "string"],
  ["string", "diffDeleted"],
  ["error", "diffDeleted"],
  ["warning", "keyword"],
  ["diffAdded", "string"]
];

export function analyzeVisibility(
  signals: ColorSignalMap,
  options: VisibilityAnalysisOptions = {}
): VisibilityAnalysisResult {
  const contrast = calculateSignalContrasts(signals);
  const risks = createVisibilityRisks(signals, contrast, options);

  return { contrast, risks };
}

export function calculateSignalContrasts(signals: ColorSignalMap): SignalContrastMap {
  const background = signals.background?.value;
  const contrast: SignalContrastMap = {};

  if (!background) {
    return contrast;
  }

  for (const signalName of Object.keys(signals) as ColorSignalRole[]) {
    if (signalName === "background") {
      continue;
    }

    const value = signals[signalName]?.value;
    if (value) {
      contrast[signalName] = {
        ratio: calculateContrastRatio(value, background)
      };
    }
  }

  return contrast;
}

export function createVisibilityRisks(
  signals: ColorSignalMap,
  contrast: SignalContrastMap,
  options: VisibilityAnalysisOptions = {}
): VisibilityRisk[] {
  const risks: VisibilityRisk[] = [];
  const textContrastThreshold = options.textContrastThreshold ?? 4.5;
  const similarSignalDistanceThreshold = options.similarSignalDistanceThreshold ?? 35;
  const textSignals = options.textSignals ?? DEFAULT_TEXT_SIGNAL_NAMES;
  const similarSignalPairs = options.similarSignalPairs ?? DEFAULT_SIMILAR_SIGNAL_PAIRS;

  for (const signalName of textSignals) {
    const item = contrast[signalName as Exclude<ColorSignalRole, "background">];
    if (item && item.ratio < textContrastThreshold) {
      risks.push({
        type: "lowContrast",
        signal: signalName,
        contrastRatio: item.ratio,
        threshold: textContrastThreshold,
        message: `${signalName} has low contrast against the editor background.`
      });
    }
  }

  for (const [left, right] of similarSignalPairs) {
    const leftSignal = signals[left];
    const rightSignal = signals[right];
    if (!leftSignal || !rightSignal) {
      continue;
    }

    const distance = calculateColorDistance(leftSignal.value, rightSignal.value);
    if (distance <= similarSignalDistanceThreshold) {
      risks.push({
        type: "similarSignal",
        signals: [left, right],
        colorDistance: distance,
        message: `${left} and ${right} are visually close.`
      });
    }
  }

  if (risks.length === 0) {
    risks.push({
      type: "noObviousRisk",
      message: "No obvious signal risk was detected by the current simple rules."
    });
  }

  return risks;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: visibility analyzer tests pass, existing tests still pass.

## Task 3: themeAnalyzer에서 visibility logic 제거

**Files:**
- Modify: `src/core/themeAnalyzer.ts`

- [ ] **Step 1: Replace local visibility logic with module call**

`src/core/themeAnalyzer.ts`에서 다음을 수행한다.

- `SignalContrastMap`, `VisibilityRisk` type import를 제거한다.
- `calculateContrastRatio`, `calculateColorDistance` import를 제거한다.
- `analyzeVisibility`를 `./visibilityAnalyzer`에서 import한다.
- `TEXT_SIGNAL_NAMES`, `SIMILAR_SIGNAL_PAIRS`, `calculateSignalContrasts`, `createRisks`를 제거한다.
- `createThemeSignalReport` 안의 visibility 계산을 아래처럼 바꾼다.

```typescript
  const signals = extractSignals(definition);
  const visibility = analyzeVisibility(signals);

  return {
    generatedAt: new Date().toISOString(),
    theme: {
      configuredName,
      activeKind,
      id: matchedTheme.theme.id,
      label: matchedTheme.theme.label,
      extensionId: matchedTheme.extension.id,
      definitionStatus: matchedTheme.themeDefinition.status
    },
    signals,
    contrast: visibility.contrast,
    risks: visibility.risks
  };
```

- [ ] **Step 2: Run full test**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: all tests pass.

## Self Review

- 이번 phase는 UI/Webview를 구현하지 않는다.
- 이번 phase는 candidate 생성 규칙을 바꾸지 않는다.
- 가시성 판단 책임만 `themeAnalyzer`에서 분리한다.
- 현재 사용자의 theme 기반 report 흐름은 그대로 유지한다.
- threshold는 아직 단순값이지만 모듈 옵션으로 분리되어 향후 세분화가 가능하다.
