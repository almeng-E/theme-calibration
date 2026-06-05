# Color Calibration Theme Probe

VS Code/Cursor에서 현재 사용 중인 theme를 읽고, visibility risk를 진단하며, 보수적인 settings overlay patch를 preview/apply/rollback 하는 초기 PoC extension입니다.

## 현재 구현된 PoC

- **PoC 1. Theme Probe**
  - 현재 `workbench.colorTheme`, active theme kind, 관련 사용자 설정, 설치된 theme contribution과 theme JSON/JSONC 정의를 출력합니다.
- **PoC 2. Settings Overlay Apply/Rollback**
  - 현재 theme bucket 아래에 hardcoded patch를 적용하고, 저장된 snapshot으로 rollback합니다.
- **PoC 3. Theme Signal Report**
  - `background`, `foreground`, `comment`, `string`, `keyword`, `error`, `warning`, `diffAdded`, `diffDeleted` signal을 추출하고 간단한 risk를 계산합니다.
- **PoC 4. Before/After Preview Webview**
  - 실제 settings를 바꾸기 전에 현재 signal과 hardcoded patch 결과를 Webview에서 비교합니다.
- **PoC 5. Patch Candidate Generator**
  - theme signal report의 risk를 읽어 보수적인 patch candidate와 theme-scoped `PatchRecipe`를 JSON으로 출력합니다.
- **PoC 6. Candidate Preview Selection**
  - 생성된 patch candidate 중 하나를 QuickPick으로 선택하고, 선택한 candidate만 반영한 정적 Webview preview를 엽니다.

## 개발 환경 준비

```powershell
npm install
```

## 테스트

```powershell
npm test
```

`npm test`는 먼저 TypeScript를 `out/`으로 빌드한 뒤 `node --test`로 단위 테스트를 실행합니다.

PoC 6 확인 전에는 아래 검증도 함께 실행합니다.

```powershell
git diff --check
git status --short
```

## VS Code/Cursor에서 실행하기

1. VS Code 또는 Cursor에서 이 폴더를 엽니다.
2. `npm install`을 한 번 실행합니다.
3. `npm test`로 TypeScript 빌드와 테스트가 통과하는지 확인합니다.
4. VS Code/Cursor에서 `F5`를 눌러 Extension Development Host를 엽니다.
5. 새로 열린 Extension Development Host 창에서 Command Palette를 엽니다.
6. 아래 command 중 하나를 실행합니다.

## 제공 Command

```text
Color Calibration: Print Theme Probe
```

현재 theme와 설치된 theme 목록/정의를 `Color Calibration Theme Probe` Output Channel과 Extension Host console에 JSON으로 출력합니다.

```text
Color Calibration: Print Theme Signal Report
```

현재 theme의 주요 color signal과 contrast/risk report를 JSON으로 출력합니다.

```text
Color Calibration: Print Patch Candidates
```

현재 theme signal report의 risk를 기반으로 candidate 목록과 `[Theme Name]` bucket에 들어갈 `PatchRecipe`를 `Color Calibration Theme Probe` Output Channel에 JSON으로 출력합니다. 실제 settings 적용은 하지 않습니다.

```text
Color Calibration: Open Before/After Preview
```

현재 theme signal과 hardcoded patch 후보를 실제 적용 없이 Webview로 비교합니다.

```text
Color Calibration: Open Candidate Preview
```

현재 theme report에서 생성한 patch candidate 중 하나를 QuickPick으로 선택한 뒤, 선택한 candidate만 반영한 before/after Webview preview를 엽니다. settings 적용은 하지 않습니다.

```text
Color Calibration: Apply Hardcoded Patch PoC
```

Global user settings의 현재 theme bucket에 hardcoded patch를 적용합니다. 원본 theme 파일은 수정하지 않습니다.

```text
Color Calibration: Rollback Hardcoded Patch PoC
```

직전 apply 때 저장한 snapshot으로 patch 적용 전 설정을 복원합니다.

## 주의 사항

- 현재 patch는 PoC용 hardcoded recipe입니다.
- Candidate preview는 정적 Webview PoC이며, Webview 내부에서 candidate를 다시 선택하거나 settings를 적용하지 않습니다.
- rollback은 apply 직전의 patchable settings snapshot을 복원합니다. apply 후 사용자가 같은 설정을 직접 수정했다면 그 수정도 되돌아갈 수 있습니다.
- 다음 PoC에서는 apply/rollback/history를 candidate 단위로 확장할 예정입니다.
