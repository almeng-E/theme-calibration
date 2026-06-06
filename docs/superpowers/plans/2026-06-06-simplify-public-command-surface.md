# 공개 command surface 정리 구현 계획

> **에이전트 작업자 안내:** 이 계획은 작업 단위로 실행하세요. 가능하면 `superpowers:subagent-driven-development`를 사용하고, 그렇지 않으면 `superpowers:executing-plans`를 사용하세요. 체크박스(`- [ ]`)는 진행 상태 추적용입니다.

**목표:** Command Palette에 노출되는 Color Calibration 명령을 실제 사용자가 선택할 수 있는 진입점 중심으로 줄인다.

**아키텍처:** `COMMAND_IDS`와 extension handler는 유지해서 개발/테스트 명령을 내부적으로 계속 사용할 수 있게 한다. `package.json`의 `contributes.commands`에는 사용자용 명령인 `colorCalibration.openEditorViewer`만 남겨 Command Palette 표면을 단순화한다. README는 사용자용 실행 방법과 개발자용 내부 명령을 분리해 설명한다.

**기술 스택:** TypeScript, VS Code Extension manifest, Node.js `node:test`.

---

## 파일 구조

- 생성: `test/manifest.test.js`
  - `package.json`의 사용자 노출 command 목록이 의도대로 좁혀졌는지 검증한다.
- 수정: `package.json`
  - `contributes.commands`에는 `Color Calibration: Open Editor Viewer`만 남긴다.
  - `activationEvents`는 내부 명령 실행 가능성을 위해 기존 command를 유지한다.
- 수정: `README.md`
  - 깨진 한국어 문서를 UTF-8로 복구한다.
  - 사용자용 명령과 개발자용 내부 명령을 분리한다.

## Task 1: Manifest RED 테스트

**Files:**
- Create: `test/manifest.test.js`

- [ ] **Step 1: Write the failing test**

`test/manifest.test.js`를 만들고 아래 테스트를 작성한다.

```javascript
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const manifest = require("../package.json");

test("package manifest exposes only the public editor viewer command", () => {
  assert.deepEqual(
    manifest.contributes.commands.map((command) => command.command),
    ["colorCalibration.openEditorViewer"]
  );
  assert.deepEqual(
    manifest.contributes.commands.map((command) => command.title),
    ["Color Calibration: Open Editor Viewer"]
  );
});

test("package manifest keeps internal commands activatable for development use", () => {
  const activationEvents = new Set(manifest.activationEvents);

  assert.ok(activationEvents.has("onCommand:colorCalibration.printThemeProbe"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.printThemeSignalReport"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.printPatchCandidates"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openBeforeAfterPreview"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openCandidatePreview"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.applyHardcodedPatch"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.rollbackHardcodedPatch"));
  assert.ok(activationEvents.has("onCommand:colorCalibration.openEditorViewer"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: FAIL because `package.json` still contributes eight commands.

## Task 2: Manifest GREEN 구현

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Keep only the public command in contributes**

`package.json`의 `contributes.commands`를 아래처럼 줄인다.

```json
"contributes": {
  "commands": [
    {
      "command": "colorCalibration.openEditorViewer",
      "title": "Color Calibration: Open Editor Viewer"
    }
  ]
}
```

`activationEvents`는 그대로 둔다.

- [ ] **Step 2: Run test to verify it passes**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: manifest test passes and existing tests still pass.

## Task 3: README 사용자/개발자 명령 정리

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with UTF-8 Korean document**

`README.md`를 UTF-8 한국어 문서로 복구하고 아래 구조로 정리한다.

```markdown
# Color Calibration

현재 사용 중인 VS Code/Cursor theme를 읽고, 코드 편집기에서 헷갈리거나 잘 보이지 않는 색상 신호를 점검하기 위한 extension입니다.

## 사용자용 명령

Command Palette에서 아래 명령 하나만 실행하면 됩니다.

```text
Color Calibration: Open Editor Viewer
```

이 명령은 현재 theme를 읽고 syntax, diagnostics, diff 샘플을 Webview로 엽니다. 각 샘플 영역은 이후 click-to-solution 흐름에서 사용할 수 있도록 내부 intent 정보를 포함합니다.

## 개발 환경

```powershell
npm install
npm test
```

`npm test`는 TypeScript compile 후 Node.js 단위 테스트를 실행합니다.

## VS Code/Cursor에서 실행하기

1. VS Code 또는 Cursor에서 이 폴더를 엽니다.
2. `npm install`을 실행합니다.
3. `npm test`로 빌드와 테스트가 통과하는지 확인합니다.
4. `F5`로 Extension Development Host를 엽니다.
5. Command Palette에서 `Color Calibration: Open Editor Viewer`를 실행합니다.

## 개발자용 내부 명령

아래 명령들은 진단과 회귀 검증을 위한 내부 명령입니다. Command Palette에는 노출하지 않습니다.

- `colorCalibration.printThemeProbe`
- `colorCalibration.printThemeSignalReport`
- `colorCalibration.printPatchCandidates`
- `colorCalibration.openBeforeAfterPreview`
- `colorCalibration.openCandidatePreview`
- `colorCalibration.applyHardcodedPatch`
- `colorCalibration.rollbackHardcodedPatch`

## 현재 상태

- 현재 theme 정보 수집
- theme signal 분석
- 가시성 분석 로직 분리
- editor viewer model 생성
- editor viewer Webview shell

아직 candidate 기반 apply, 안전한 rollback, patch history는 제품용 흐름으로 연결되지 않았습니다.
```

- [ ] **Step 2: Save README as UTF-8**

Windows에서 한글이 깨지지 않도록 UTF-8로 저장한다. PowerShell을 사용한다면 BOM 포함 UTF-8 저장을 사용한다.

- [ ] **Step 3: Run full test**

Run: `& 'C:\nvm4w\nodejs\npm.cmd' test`

Expected: all tests pass.

## Self Review

- Command Palette에 사용자용 명령 하나만 노출한다.
- 내부 명령의 command id와 handler는 제거하지 않는다.
- README에서 PoC 중심 설명을 사용자 중심 설명으로 정리한다.
- 한국어 문서는 UTF-8로 저장한다.
