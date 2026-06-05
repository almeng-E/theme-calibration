# TS 마이그레이션 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 VS Code/Cursor theme calibration PoC를 TypeScript 기반으로 이전하고, 현재 기능과 테스트를 보존한다.

**Architecture:** TypeScript compiler만 도입하고 bundler는 사용하지 않는다. `src/*.ts`를 `out/*.js`로 빌드하며, extension entry와 테스트 import는 빌드 산출물을 바라본다.

**Tech Stack:** VS Code Extension API, TypeScript, Node.js `node:test`, CommonJS output.

---

## 파일 구조

- 생성: `tsconfig.json`
- 생성: `src/types.ts`
- 생성: `src/constants.ts`
- 변경: `package.json`
- 변경: `src/extension.js` -> `src/extension.ts`
- 변경: `src/themeProbe.js` -> `src/themeProbe.ts`
- 변경: `src/themeReport.js` -> `src/themeReport.ts`
- 변경: `src/themePatch.js` -> `src/themePatch.ts`
- 변경: `src/previewWebview.js` -> `src/previewWebview.ts`
- 변경: `test/*.test.js`
- 변경: `README.md`
- 변경: `docs/README.md`
- 삭제: `docs/agents/*`

## Task 1: TypeScript 빌드 기반 추가

- [ ] `package.json`에 `typescript`, `@types/node`, `@types/vscode` dev dependency를 추가한다.
- [ ] `package.json`의 `main`을 `./out/extension.js`로 바꾼다.
- [ ] `scripts`에 `compile`, `clean`, `test`를 추가한다.
- [ ] `tsconfig.json`을 만든다.
- [ ] `npm install` 후 `npm test`를 실행해 JS 소스 상태에서는 compile 실패를 확인한다.

## Task 2: 공용 타입과 상수 추가

- [ ] `src/types.ts`에 theme probe/report/patch/preview 타입을 정의한다.
- [ ] `src/constants.ts`에 command id, output channel name, setting id, rollback key를 정의한다.
- [ ] 타입 파일은 런타임 side effect가 없도록 작성한다.

## Task 3: 소스 파일 TS 이전

- [ ] `src/*.js`를 대응되는 `src/*.ts`로 이동한다.
- [ ] CommonJS `require/module.exports`를 TypeScript `import/export`로 바꾼다.
- [ ] VS Code 의존성이 있는 함수는 `typeof import("vscode")` 타입을 사용한다.
- [ ] 기존 함수 이름과 export surface를 유지한다.
- [ ] 깨진 한국어 message 문자열은 읽을 수 있는 한국어로 교체한다.

## Task 4: 테스트 import와 빌드 흐름 정리

- [ ] 테스트 파일이 `../out/*.js`를 import하도록 바꾼다.
- [ ] `npm test`가 `npm run compile` 후 `node --test`를 실행하도록 한다.
- [ ] 기존 16개 테스트가 동일하게 통과하는지 확인한다.

## Task 5: 문서 정리

- [ ] `README.md`를 한국어로 복구하고 모든 command 실행 방법을 최신화한다.
- [ ] `docs/README.md`를 현재 문서 구조 중심으로 간결하게 복구한다.
- [ ] 현재 PoC 실행에 직접 필요 없는 `docs/agents` 문서를 제거한다.
- [ ] `npm test`를 다시 실행한다.

## Task 6: 마무리

- [ ] `git status --short`로 변경 범위를 확인한다.
- [ ] `npm test`를 최종 실행한다.
- [ ] 변경 사항을 커밋한다.
- [ ] branch를 push한다.
- [ ] 사용자에게 테스트 방법과 다음 PoC 브랜치 계획을 안내한다.
