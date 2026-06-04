# Theme Signal Report PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 테마 정의에서 핵심 개발 신호 색상을 추출하고, 낮은 대비와 유사 색상 위험을 사람이 읽을 수 있는 JSON 리포트로 출력한다.

**Architecture:** `src/themeReport.js`는 VS Code API와 분리된 순수 helper로 색상 추출, contrast 계산, risk 생성만 담당한다. `src/extension.js`는 기존 `collectThemeProbe()` 결과를 helper에 전달하고 Output Channel/console에 리포트를 출력한다.

**Tech Stack:** JavaScript CommonJS, VS Code Extension API, Node built-in test runner.

---

## 파일 구조

- Create: `src/themeReport.js` - signal extraction, color parsing, contrast, risk report helper.
- Create: `test/themeReport.test.js` - 핵심 signal 추출과 risk 생성 테스트.
- Modify: `src/extension.js` - `Color Calibration: Print Theme Signal Report` 명령 추가.
- Modify: `package.json` - command contribution 추가.
- Modify: `README.md` - PoC 3 실행 방법 추가.

---

### Task 1: Signal Report Helper

**Files:**
- Create: `src/themeReport.js`
- Test: `test/themeReport.test.js`

- [ ] **Step 1: Write failing tests**

`createThemeSignalReport(probe)`가 현재 테마의 `editor.background`, `comment`, `string`, `keyword`, `error`, `warning`, `diffAdded`, `diffDeleted`를 추출하고 contrast/risk를 생성하는지 검증한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: `Cannot find module '../src/themeReport'`

- [ ] **Step 3: Implement minimal helper**

색상 parser, relative luminance, contrast ratio, token color lookup, risk detection을 구현한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test`

Expected: all tests pass.

### Task 2: Extension Command

**Files:**
- Modify: `src/extension.js`
- Modify: `package.json`

- [ ] **Step 1: Register command**

`colorCalibration.printThemeSignalReport`를 등록한다.

- [ ] **Step 2: Wire output**

명령 실행 시 `collectThemeProbe(vscode, { includeThemeDefinitions: true })`를 호출하고 `createThemeSignalReport(probe)` 결과를 Output Channel에 출력한다.

### Task 3: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document command**

Extension Development Host에서 Theme Signal Report 명령을 실행하고 Output Channel을 확인하는 방법을 기록한다.

- [ ] **Step 2: Run final verification**

Run: `npm.cmd test`

Expected: all tests pass.
