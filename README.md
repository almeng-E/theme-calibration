# Color Calibration Theme Probe

VS Code/Cursor extension 형태로 현재 테마와 설치된 테마 정보를 읽을 수 있는지 검증하는 초기 PoC다.

## 실행 방법

1. VS Code 또는 Cursor에서 이 폴더를 연다.
2. `F5`로 Extension Development Host를 실행한다.
3. Command Palette에서 `Color Calibration: Print Theme Probe`를 실행한다.
4. `Color Calibration Theme Probe` Output Channel과 Extension Host console에서 JSON 결과를 확인한다.

## PoC 3: Theme Signal Report

Extension Development Host 창에서 Command Palette를 열고 아래 명령을 실행한다.

```text
Color Calibration: Print Theme Signal Report
```

이 명령은 현재 테마의 거대한 전체 JSON 대신 핵심 개발 신호만 요약한다.

- `background`
- `foreground`
- `comment`
- `string`
- `keyword`
- `error`
- `warning`
- `diffAdded`
- `diffDeleted`

출력에는 각 signal의 색상, 출처, 배경 대비 contrast ratio, 단순 위험 목록이 포함된다. 현재 기준에서는 `lowContrast`, `similarSignal`, `missingThemeDefinition`만 탐지한다.

## PoC 2: settings overlay 적용과 rollback

Extension Development Host 창에서 Command Palette를 열고 아래 명령을 순서대로 실행한다.

1. `Color Calibration: Apply Hardcoded Patch PoC`
   - Global user settings의 `workbench.colorCustomizations`에 hardcoded contrast patch를 merge 적용한다.
   - patch는 현재 `workbench.colorTheme` 이름의 bucket, 예를 들어 `[Default Dark+]`, 아래에만 들어간다.
   - 적용 전 Global 설정 snapshot을 extension `globalState`에 저장한다.
   - 원본 theme 파일은 수정하지 않는다.

2. `Color Calibration: Rollback Hardcoded Patch PoC`
   - 저장된 snapshot을 다시 `workbench.colorCustomizations`, `editor.tokenColorCustomizations`, `editor.semanticTokenColorCustomizations`에 복원한다.
   - rollback 후 저장된 snapshot을 삭제한다.

적용/복원 결과는 `Color Calibration Theme Probe` Output Channel에 JSON으로 출력된다.

주의: 이 PoC의 rollback은 apply 직전의 Global 설정 object를 그대로 복원한다. Apply 이후 사용자가 같은 설정을 직접 수정했다면 rollback이 그 수정을 되돌릴 수 있다. 다음 PoC에서는 patch key 단위 rollback이나 변경 감지 hash를 추가한다.

## 출력하는 정보

- 현재 설정된 `workbench.colorTheme`
- 현재 active theme kind
- 사용자/워크스페이스 설정 override
  - `workbench.colorCustomizations`
  - `editor.tokenColorCustomizations`
  - `editor.semanticTokenColorCustomizations`
- 설치된 extension의 `contributes.themes` 목록
- 접근 가능한 theme JSON/JSONC 파일의 colors, tokenColors, semanticTokenColors 정의
- settings overlay patch 적용 결과와 rollback snapshot
- theme signal summary와 visibility risk report

## PoC 제약

VS Code API는 현재 테마 이름과 사용자 override를 안정적으로 읽을 수 있지만, 모든 fallback이 적용된 최종 resolved color table을 직접 노출하지 않는다. 이 PoC는 설치된 theme contribution 파일과 사용자 설정 overlay를 함께 출력해 다음 단계의 resolver/engine 구현 가능성을 검증한다.
