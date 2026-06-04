# Settings Overlay Rollback PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VS Code/Cursor extension에서 원본 theme 파일을 수정하지 않고 settings overlay로 hardcoded color patch를 적용하고, 저장된 snapshot으로 rollback할 수 있음을 검증한다.

**Architecture:** `src/themePatch.js`는 기존 설정과 patch를 merge하고 rollback snapshot을 만드는 순수 로직을 담당한다. `src/extension.js`는 VS Code API의 `workspace.getConfiguration().update(...)`만 호출하며, rollback metadata는 PoC 단계에서 `context.globalState`에 저장한다.

**Tech Stack:** JavaScript CommonJS, VS Code Extension API, Node built-in test runner.

---

## 파일 구조

- Create: `src/themePatch.js` - patch recipe, merge, snapshot, rollback helper.
- Modify: `src/extension.js` - apply/rollback 명령 등록.
- Modify: `package.json` - command contribution 추가.
- Modify: `README.md` - PoC 2 실행 방법 추가.
- Test: `test/themePatch.test.js` - patch merge와 rollback snapshot 검증.

---

### Task 1: Patch Merge Helper

**Files:**
- Create: `src/themePatch.js`
- Test: `test/themePatch.test.js`

- [ ] **Step 1: Write the failing test**

`createPatchPlan(existingSettings, patchRecipe)`가 기존 `workbench.colorCustomizations` 값을 보존하면서 PoC patch key만 덮어쓰고, rollback snapshot에는 기존 값을 그대로 저장해야 한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test`

Expected: `Cannot find module '../src/themePatch'`

- [ ] **Step 3: Write minimal implementation**

`createPatchPlan`, `createRollbackPlan`, `POC_PATCH_RECIPE`를 구현한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test`

Expected: all tests pass.

### Task 2: Extension Commands

**Files:**
- Modify: `src/extension.js`
- Modify: `package.json`

- [ ] **Step 1: Register commands**

`colorCalibration.applyHardcodedPatch`와 `colorCalibration.rollbackHardcodedPatch`를 추가한다.

- [ ] **Step 2: Wire VS Code configuration updates**

Apply는 기존 설정을 읽고 `globalState`에 rollback snapshot을 저장한 뒤 `ConfigurationTarget.Global`로 세 설정을 update한다. Rollback은 저장된 snapshot 값을 다시 update한다.

### Task 3: Documentation and Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document commands**

테스트 창에서 apply/rollback 명령을 실행하고 Output Channel에서 결과를 확인하는 방법을 기록한다.

- [ ] **Step 2: Run final verification**

Run: `npm.cmd test`

Expected: all tests pass.
