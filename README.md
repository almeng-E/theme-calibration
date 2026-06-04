# Color Calibration Theme Probe

VS Code/Cursor extension 형태로 현재 테마와 설치된 테마 정보를 읽을 수 있는지 검증하는 초기 PoC다.

## 실행 방법

1. VS Code 또는 Cursor에서 이 폴더를 연다.
2. `F5`로 Extension Development Host를 실행한다.
3. Command Palette에서 `Color Calibration: Print Theme Probe`를 실행한다.
4. `Color Calibration Theme Probe` Output Channel과 Extension Host console에서 JSON 결과를 확인한다.

## 출력하는 정보

- 현재 설정된 `workbench.colorTheme`
- 현재 active theme kind
- 사용자/워크스페이스 설정 override
  - `workbench.colorCustomizations`
  - `editor.tokenColorCustomizations`
  - `editor.semanticTokenColorCustomizations`
- 설치된 extension의 `contributes.themes` 목록
- 접근 가능한 theme JSON/JSONC 파일의 colors, tokenColors, semanticTokenColors 정의

## PoC 제약

VS Code API는 현재 테마 이름과 사용자 override를 안정적으로 읽을 수 있지만, 모든 fallback이 적용된 최종 resolved color table을 직접 노출하지 않는다. 이 PoC는 설치된 theme contribution 파일과 사용자 설정 overlay를 함께 출력해 다음 단계의 resolver/engine 구현 가능성을 검증한다.
