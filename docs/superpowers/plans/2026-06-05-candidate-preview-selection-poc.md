# Candidate Preview Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생성된 patch candidate 중 하나를 선택하고 선택된 candidate만 before/after webview preview에 반영한다.

**Architecture:** Candidate 생성은 `patchCandidate` 모듈을 재사용한다. Preview 모듈은 candidate metadata와 token color patch를 이해하도록 확장하고, extension command는 QuickPick으로 candidate 선택 후 static webview를 연다.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js `node:test`.

---

## 파일 구조

- 수정: `src/types.ts`
- 수정: `src/previewWebview.ts`
- 수정: `src/constants.ts`
- 수정: `src/extension.ts`
- 수정: `package.json`
- 수정: `test/previewWebview.test.js`
- 수정: `README.md`
- 생성: `docs/superpowers/specs/2026-06-05-candidate-preview-selection-design.md`
- 생성: `docs/superpowers/plans/2026-06-05-candidate-preview-selection-poc.md`

## Task 1: Preview 모델 RED 테스트

- [ ] `test/previewWebview.test.js`에 candidate metadata를 넘기는 테스트를 추가한다.
- [ ] token candidate 기반 recipe가 `after.signals.comment`를 바꾸는지 검증한다.
- [ ] workbench candidate 기반 recipe가 `after.signals.diffDeleted`를 바꾸는지 검증한다.
- [ ] `npm test`를 실행해 기존 `createPreviewModel` signature/동작 부족으로 실패하는지 확인한다.

## Task 2: Preview 모델 GREEN 구현

- [ ] `src/types.ts`의 `PreviewModel`에 optional `candidates`, `selectedCandidateId`를 추가한다.
- [ ] `src/previewWebview.ts`에 `PreviewModelOptions` 타입을 추가한다.
- [ ] `createPreviewModel(report, patchRecipe, options?)` signature로 확장한다.
- [ ] `extractPatchSignals`가 `editor.tokenColorCustomizations`의 `comments`, `strings`, `keywords`도 after signal에 반영하도록 구현한다.
- [ ] `npm test`를 실행해 모델 테스트 통과를 확인한다.

## Task 3: Candidate HTML RED/GREEN

- [ ] `test/previewWebview.test.js`에 candidate 목록과 selected 표시, reason escape 테스트를 추가한다.
- [ ] `renderPreviewHtml`이 candidate 목록 section을 렌더링하도록 구현한다.
- [ ] candidate가 없으면 기존 preview HTML이 자연스럽게 유지되도록 한다.
- [ ] `npm test`를 실행한다.

## Task 4: Extension command 연결

- [ ] `src/constants.ts`에 `openCandidatePreview` command id를 추가한다.
- [ ] `package.json`에 activation event와 contributes command를 추가한다.
- [ ] `src/extension.ts`에 `Color Calibration: Open Candidate Preview` command를 등록한다.
- [ ] command는 candidate가 없으면 warning을 보여주고 output에 no candidates를 기록한다.
- [ ] candidate가 있으면 `vscode.window.showQuickPick`으로 candidate를 선택하게 한다.
- [ ] 선택 취소 시 settings 변경 없이 output에 cancellation을 기록한다.
- [ ] 선택된 candidate만 recipe로 변환해 preview webview를 연다.
- [ ] `README.md`에 새 command를 추가한다.
- [ ] `npm test`를 실행한다.

## Task 5: 검증과 커밋

- [ ] `git diff --check`를 실행한다.
- [ ] `npm test`를 최종 실행한다.
- [ ] 변경 사항을 커밋한다.
- [ ] branch를 push한다.
- [ ] 구현 subagent, spec review subagent, code quality review subagent를 모두 닫는다.
