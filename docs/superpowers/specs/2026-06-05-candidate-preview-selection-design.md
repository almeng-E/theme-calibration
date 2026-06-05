# PoC 6 Candidate Preview Selection 설계

## 목표

PoC 5에서 생성한 patch candidate를 사용자가 하나 선택하고, 선택한 candidate만 before/after preview에서 확인할 수 있게 한다. 이 단계는 실제 apply 없이 `candidate 생성 -> 선택 -> preview` 흐름을 검증한다.

## 성공 기준

- 현재 theme report에서 patch candidate를 생성한다.
- candidate가 있으면 사용자가 하나를 선택할 수 있다.
- 선택된 candidate만 preview의 `after` 색상에 반영된다.
- preview에는 candidate 목록과 선택된 candidate 정보가 표시된다.
- settings는 변경하지 않는다.
- 테스트로 candidate 기반 preview model과 HTML 렌더링을 검증한다.

## 범위

- 새 command `Color Calibration: Open Candidate Preview`를 추가한다.
- command id는 `colorCalibration.openCandidatePreview`로 한다.
- VS Code `showQuickPick`으로 candidate를 선택한다.
- 선택된 candidate를 `createPatchRecipeFromCandidates([candidate], themeName)`으로 recipe화한다.
- 기존 `createPreviewModel`은 optional candidate metadata를 받을 수 있게 확장한다.
- 기존 hardcoded preview command는 계속 유지한다.

## 비범위

- Webview 안에서 candidate를 클릭해 바꾸는 interactive UI는 구현하지 않는다.
- 선택한 candidate를 settings에 apply하지 않는다.
- candidate 여러 개를 한 번에 적용하는 flow는 구현하지 않는다.
- patch history/rollback 고도화는 구현하지 않는다.

## 데이터 흐름

1. `collectThemeProbe`
2. `createThemeSignalReport`
3. `createPatchCandidates`
4. `showQuickPick`
5. `createPatchRecipeFromCandidates([selectedCandidate], themeName)`
6. `createPreviewModel(report, recipe, { candidates, selectedCandidateId })`
7. `renderPreviewHtml`

## Preview 모델 변경

`PreviewModel`에 다음 optional 필드를 추가한다.

- `candidates`: preview에 표시할 candidate 목록
- `selectedCandidateId`: 선택된 candidate id

`createPreviewModel`은 patch recipe의 다음 값을 after signal에 반영한다.

- `workbench.colorCustomizations`
  - `editorError.foreground` -> `error`
  - `editorWarning.foreground` -> `warning`
  - `editorGutter.addedBackground` -> `diffAdded`
  - `editorGutter.deletedBackground` -> `diffDeleted`
- `editor.tokenColorCustomizations`
  - `comments` -> `comment`
  - `strings` -> `string`
  - `keywords` -> `keyword`

## 테스트 전략

- token candidate recipe가 after comment signal을 바꾸는지 검증한다.
- workbench candidate recipe가 after diffDeleted signal을 바꾸는지 검증한다.
- HTML이 candidate 목록, 선택 표시, reason을 렌더링하고 escape하는지 검증한다.
- 기존 hardcoded preview 테스트는 유지한다.
