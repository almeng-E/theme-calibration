# TS 마이그레이션 기반 설계

## 목표

현재 JavaScript 기반 VS Code/Cursor extension PoC를 TypeScript 기반으로 이전한다. 기능 동작은 유지하고, 이후 patch candidate, preview selection, apply/rollback 고도화를 타입 안정성 있게 진행할 수 있는 구조를 만든다.

## 범위

- `src/*.js`를 `src/*.ts`로 이전한다.
- extension entry는 빌드 산출물 `out/extension.js`를 사용한다.
- 테스트는 현재 `node --test` 흐름을 유지하되 TypeScript 소스의 빌드 결과를 검증하도록 바꾼다.
- 중복 타입과 설정 id를 정리하기 위해 공용 타입/상수를 분리한다.
- 깨진 한국어 README/docs 문구를 복구한다.
- 현재 PoC 실행에 불필요한 오래된 agent 문서는 제거한다.

## 비범위

- patch candidate 자동 생성은 이번 브랜치에서 만들지 않는다.
- preview에서 candidate를 선택하거나 실제 candidate 기반 apply를 수행하지 않는다.
- VS Code extension integration test runner는 도입하지 않는다.
- 대규모 패키지 구조나 bundler는 도입하지 않는다.

## 구조

- `src/types.ts`: theme probe, signal report, patch recipe, preview model 공용 타입을 정의한다.
- `src/constants.ts`: patch 가능한 setting id와 command id처럼 여러 파일에서 공유하는 상수를 둔다.
- `src/themeProbe.ts`: theme contribution과 JSON/JSONC theme definition 수집을 담당한다.
- `src/themeReport.ts`: theme definition에서 signal을 추출하고 contrast/risk를 계산한다.
- `src/themePatch.ts`: settings overlay patch/rollback plan을 만든다.
- `src/previewWebview.ts`: before/after preview model과 HTML을 생성한다.
- `src/extension.ts`: VS Code command 등록과 output channel 연결만 담당한다.

## 테스트 전략

- 기존 단위 테스트 16개를 유지한다.
- 테스트 파일은 빌드된 `out/*.js`를 import한다.
- `npm test`는 먼저 `tsc`를 실행하고, 그 다음 `node --test`를 실행한다.
- TypeScript compile 통과와 기존 동작 보존을 완료 기준으로 삼는다.

## 완료 기준

- `npm test`가 성공한다.
- VS Code/Cursor에서 기존 command들이 그대로 보인다.
- README가 한국어로 읽히고, 실행 방법이 명확하다.
- 불필요한 오래된 agent 문서가 제거되어 docs가 현재 PoC 흐름 중심으로 정리된다.
