# Before After Preview Webview PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 테마 signal과 hardcoded patch 후보를 실제 적용 없이 Webview에서 before/after로 비교할 수 있게 한다.

**Architecture:** `src/previewWebview.js`는 signal report와 patch recipe를 preview model로 바꾸고 정적 HTML을 렌더링한다. `src/extension.js`는 VS Code WebviewPanel을 만들고 HTML을 넣는 command wiring만 담당한다.

**Tech Stack:** JavaScript CommonJS, VS Code Extension API Webview, Node built-in test runner.

---

## 파일 구조

- Create: `src/previewWebview.js` - preview model 생성과 HTML 렌더링.
- Create: `test/previewWebview.test.js` - model 생성과 HTML escaping 테스트.
- Modify: `src/extension.js` - `Color Calibration: Open Before/After Preview` 명령 추가.
- Modify: `package.json` - command contribution 추가.
- Modify: `README.md` - PoC 4 실행 방법 추가.

---

### Task 1: Preview Helper

**Files:**
- Create: `src/previewWebview.js`
- Test: `test/previewWebview.test.js`

- [ ] **Step 1: Write failing tests**

`createPreviewModel(report, patchRecipe)`가 before signal과 after signal을 만들고, `renderPreviewHtml(model)`이 HTML을 escape하며 before/after 섹션을 출력하는지 검증한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: `Cannot find module '../src/previewWebview'`

- [ ] **Step 3: Implement minimal helper**

정적 샘플 코드, signal별 color fallback, patch color mapping, HTML 렌더러를 구현한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test`

Expected: all tests pass.

### Task 2: Extension Command

**Files:**
- Modify: `src/extension.js`
- Modify: `package.json`

- [ ] **Step 1: Register command**

`colorCalibration.openBeforeAfterPreview`를 등록한다.

- [ ] **Step 2: Wire WebviewPanel**

명령 실행 시 theme probe와 signal report를 생성하고, preview HTML을 WebviewPanel에 넣는다. Webview scripts는 비활성화한다.

### Task 3: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document command**

Extension Development Host에서 Preview 명령을 실행하는 방법과 기대 화면을 기록한다.

- [ ] **Step 2: Run final verification**

Run: `npm.cmd test`

Expected: all tests pass.
