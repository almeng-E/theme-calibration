# Patch Candidate Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theme signal report의 risk를 읽어 conservative patch candidate와 candidate 기반 patch recipe를 생성한다.

**Architecture:** `themeReport`는 진단만 담당하고, 새 `patchCandidate` 모듈이 risk-to-candidate 변환과 recipe 변환을 담당한다. Extension command는 probe -> report -> candidates -> output JSON 흐름만 연결한다.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `node:test`.

---

## 파일 구조

- 생성: `src/patchCandidate.ts`
- 생성: `test/patchCandidate.test.js`
- 수정: `src/types.ts`
- 수정: `src/constants.ts`
- 수정: `src/extension.ts`
- 수정: `package.json`
- 수정: `README.md`
- 수정: `docs/superpowers/plans/2026-06-05-patch-candidate-generator-poc.md`

## Task 1: Candidate 타입과 RED 테스트

- [x] `src/types.ts`에 `PatchCandidateScope`, `PatchCandidate`, `PatchCandidateSettingChange` 타입을 추가한다.
- [x] `test/patchCandidate.test.js`를 만들고 `createPatchCandidates` import를 `../out/patchCandidate`로 작성한다.
- [x] `lowContrast comment` report fixture에서 candidate가 생성된다는 테스트를 작성한다.
- [x] `npm test`를 실행해 `Cannot find module '../out/patchCandidate'` 실패를 확인한다.

## Task 2: Candidate 생성 GREEN 구현

- [x] `src/patchCandidate.ts`를 만든다.
- [x] `createPatchCandidates(report)`를 구현한다.
- [x] `lowContrast comment`는 `editor.tokenColorCustomizations`의 `comments` key candidate를 생성한다.
- [x] `similarSignal error + diffDeleted`는 `workbench.colorCustomizations`의 `editorGutter.deletedBackground` key candidate를 생성한다.
- [x] `missingThemeDefinition`, `noObviousRisk`는 candidate를 만들지 않는다.
- [x] `npm test`를 실행해 candidate 테스트가 통과하는지 확인한다.

## Task 3: Candidate -> PatchRecipe 변환

- [x] `test/patchCandidate.test.js`에 `createPatchRecipeFromCandidates` 테스트를 추가한다.
- [x] themeName `Sample Dark`를 넘기면 `workbench.colorCustomizations["[Sample Dark]"]`와 `editor.tokenColorCustomizations["[Sample Dark]"]` 아래에 patch가 들어가는지 검증한다.
- [x] `src/patchCandidate.ts`에 `createPatchRecipeFromCandidates(candidates, themeName)`을 구현한다.
- [x] `npm test`를 실행해 변환 테스트가 통과하는지 확인한다.

## Task 4: Extension command 연결

- [x] `src/constants.ts`의 `COMMAND_IDS`에 `printPatchCandidates`를 추가한다.
- [x] `package.json`에 activation event와 contributes command를 추가한다.
- [x] `src/extension.ts`에 `Color Calibration: Print Patch Candidates` command를 등록한다.
- [x] command는 `collectThemeProbe` -> `createThemeSignalReport` -> `createPatchCandidates` -> `createPatchRecipeFromCandidates` 순서로 JSON을 출력한다.
- [x] `README.md`에 새 command 실행 방법을 추가한다.
- [x] `npm test`를 실행한다.

## Task 5: 검증과 커밋

- [x] `git diff --check`를 실행한다.
- [x] `npm test`를 최종 실행한다.
- [x] 변경 사항을 커밋한다.
- [x] branch를 push한다.
- [x] 구현 subagent, spec review subagent, code quality review subagent를 모두 닫는다.
