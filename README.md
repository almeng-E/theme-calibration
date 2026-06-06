# Color Calibration

현재 사용 중인 VS Code/Cursor theme를 읽고, 코드 편집기에서 헷갈리거나 잘 보이지 않는 색상 신호를 점검하기 위한 extension입니다.

## 사용자용 명령

Command Palette에서는 아래 명령 하나만 실행하면 됩니다.

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
