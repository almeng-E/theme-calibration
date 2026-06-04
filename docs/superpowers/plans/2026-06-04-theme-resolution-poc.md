# Theme Resolution PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VS Code/Cursor extension host에서 현재 테마와 설치된 테마 목록/설정 파일을 읽어 JSON으로 출력하는 최소 PoC를 만든다.

**Architecture:** Extension command는 VS Code API 어댑터 역할만 맡고, theme 수집/파싱 로직은 `src/themeProbe.js`에 순수 함수로 둔다. 설치된 테마는 `vscode.extensions.all[*].packageJSON.contributes.themes`에서 찾고, theme path가 JSON/JSONC일 때 `workspace.fs.readFile`로 읽어 파싱한다.

**Tech Stack:** JavaScript CommonJS, VS Code Extension API, Node built-in test runner.

---

## 파일 구조

- Create: `package.json` - extension manifest, command contribution, test script.
- Create: `.vscodeignore` - VSIX 패키징 제외 목록.
- Create: `README.md` - PoC 실행 방법과 제약 설명.
- Create: `src/extension.js` - command 등록, Output Channel 출력, console 출력.
- Create: `src/themeProbe.js` - 설정 수집, theme contribution 열람, JSONC 파싱 helper.
- Create: `test/themeProbe.test.js` - JSONC 파싱과 theme 수집 로직 테스트.

---

### Task 1: Extension Skeleton

**Files:**
- Create: `package.json`
- Create: `.vscodeignore`
- Create: `README.md`

- [x] **Step 1: VS Code command contribution 정의**

`colorCalibration.printThemeProbe` 명령을 Command Palette에 노출한다.

- [x] **Step 2: 문서와 패키징 제외 파일 작성**

PoC 실행 방법, 출력 정보, 공식 API 제약을 한국어로 기록한다.

### Task 2: Theme Probe Helper

**Files:**
- Create: `src/themeProbe.js`
- Test: `test/themeProbe.test.js`

- [x] **Step 1: 실패 테스트 작성**

JSONC comments/trailing comma 제거, theme contribution 목록 추출, 현재 theme matching을 검증한다.

- [x] **Step 2: 최소 구현 작성**

`collectThemeProbe`, `collectInstalledThemes`, `parseJsonc`를 구현한다.

- [ ] **Step 3: 테스트 실행**

Run: `npm test`

Expected: `node --test`가 모든 helper 테스트를 통과한다.

### Task 3: Extension Command

**Files:**
- Create: `src/extension.js`

- [x] **Step 1: command handler 작성**

`collectThemeProbe(vscode)` 결과를 Output Channel과 console에 출력한다.

- [ ] **Step 2: package smoke verification**

Run: `npm test`

Expected: helper 테스트가 통과하고 extension manifest가 Node 테스트 환경에서 깨지지 않는다.
