# PoC 5 Patch Candidate Generator 설계

## 목표

현재 theme signal report의 `risks`를 읽어 최소한의 patch candidate를 생성한다. 이 단계가 끝나면 제품 루프가 `진단 -> 후보 생성 -> preview -> apply/rollback`으로 이어질 수 있다.

## 성공 기준

- 현재 theme report에서 `risks`를 읽는다.
- risk가 있는 report에서 최소 1개 이상의 patch candidate를 만든다.
- candidate에는 다음 정보가 들어간다.
  - 바꿀 setting key
  - 기존 signal
  - 제안 색상
  - 이유
  - 적용 범위
  - confidence 또는 risk type
- candidate 생성은 단위 테스트로 검증한다.

## 범위

- 새 모듈 `src/patchCandidate.ts`를 만든다.
- 새 테스트 `test/patchCandidate.test.js`를 만든다.
- 새 command `Color Calibration: Print Patch Candidates`를 추가한다.
- candidate를 `PatchRecipe`로 변환하는 함수를 제공한다.
- 실제 settings 적용은 아직 기존 hardcoded apply command에 맡기고, 이번 PoC에서는 출력/검증만 한다.

## Candidate 모델

candidate는 하나의 risk를 해결하기 위한 보수적인 제안이다. MVP에서는 한 candidate가 하나의 대표 setting key를 바꾼다.

- `id`: deterministic id
- `riskType`: 원본 risk type
- `signals`: 관련 signal 목록
- `settingId`: VS Code setting id
- `settingKey`: setting 내부에서 바꿀 key
- `currentSignals`: 기존 signal 색상
- `suggestedColor`: 제안 색상
- `reason`: 사용자에게 설명 가능한 이유
- `scope`: `Global` target과 현재 theme bucket 적용 여부
- `confidence`: 0~1 사이의 보수적 confidence

## Candidate 생성 규칙

- `lowContrast`
  - `comment` -> `editor.tokenColorCustomizations.comments`
  - `string` -> `editor.tokenColorCustomizations.strings`
  - `keyword` -> `editor.tokenColorCustomizations.keywords`
  - `foreground` -> `workbench.colorCustomizations.editor.foreground`
  - `error` -> `workbench.colorCustomizations.editorError.foreground`
  - `warning` -> `workbench.colorCustomizations.editorWarning.foreground`
- `similarSignal`
  - `error + diffDeleted` -> `workbench.colorCustomizations.editorGutter.deletedBackground`
  - `diffAdded + string` -> `workbench.colorCustomizations.editorGutter.addedBackground`
  - 그 외 pair는 오른쪽 signal의 대표 setting을 조정한다.
- `missingThemeDefinition`, `noObviousRisk`는 candidate를 만들지 않는다.

## PatchRecipe 변환

`createPatchRecipeFromCandidates(candidates, themeName)`은 candidate 목록을 기존 `PatchRecipe` 구조로 바꾼다. `themeName`이 있으면 `workbench.colorCustomizations`와 `editor.tokenColorCustomizations` 모두 `[Theme Name]` bucket 아래에 넣는다.

## 테스트 전략

- `lowContrast` risk에서 comment candidate가 생성되는지 검증한다.
- `similarSignal` risk에서 deletion candidate가 생성되는지 검증한다.
- candidate가 theme-scoped `PatchRecipe`로 변환되는지 검증한다.
- candidate를 만들 수 없는 risk는 빈 목록이 되는지 검증한다.
