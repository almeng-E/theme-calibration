# Color Calibration 아키텍처 및 디렉토리 구조 명세

이 문서는 Color Calibration Extension의 현재 아키텍처와 데이터 흐름을 실제 코드 기준으로 정의한다. 개발자와 Agent가 코드 구조와 경계 규칙을 빠르게 파악하도록 돕는 것이 목적이다.

## 1. 아키텍처 핵심 원칙 (Hexagonal: Port vs Core)

이 확장은 **헥사고날(포트 & 어댑터)** 구조를 따른다. VS Code에 종속된 모든 코드는 단 하나의 **포트(`src/adapter/vscode/`)** 안에 격리되고, 그 바깥의 **코어**는 에디터에 무관한 순수 로직이다.

- **포트 (`adapter/vscode/`)**: VS Code API와의 I/O, VS Code 고유 데이터 형태(테마 파일, 설정 JSON)의 읽기/쓰기/직렬화를 전담한다. 비즈니스 판단(어떤 색이 위험한가)은 하지 않는다.
- **코어 (`diagnose/`, `patch/`, `ui/`, `types/`, `utils/`)**: 에디터에 무관한 순수 영역. 진단·후보 생성·배치 저장 계획·뷰모델 구성을 담당한다.
- **경계 규칙 (불변식)**: 코어(`diagnose`/`patch`/`utils`)는 `adapter/**`에서 아무것도 import하지 않으며, `Vscode*` 타입을 일절 사용하지 않는다. 포트와 코어는 오직 `*Dto` 타입을 통해서만 데이터를 주고받는다.
- **조립 책임은 진입점에**: `extension.ts`가 포트와 코어를 와이어링한다. 코어 모듈(`patch`)이 포트(`io`/`serializer`)를 직접 호출하지 않는다 — 코어는 DTO만 반환하고, `extension.ts`가 그 DTO를 포트에 넘겨 직렬화·저장을 지시한다.

---

## 2. 디렉토리 구조 (Directory Structure)

```text
src/
 ├── adapter/vscode/   # [PORT] VS Code에 종속된 유일한 영역 (I/O · raw 형태 변환 · 직렬화)
 ├── diagnose/         # [CORE] 순수 진단 엔진 — 가시성 계산, 교체 후보 생성, intent 해결
 ├── patch/            # [CORE] 배치 저장 세션(스테이징) 및 staleness 판정. DTO만 반환
 ├── ui/               # [CORE] Webview ViewModel 구성, HTML 렌더링, 알림 포맷, signal 기본값
 ├── types/            # [CORE] 계층 간 공유 DTO (*Dto) 및 인터페이스
 ├── utils/            # [CORE] 색상/객체 순수 유틸
 ├── constants.ts      # 설정 식별자·커맨드 ID 등 상수
 └── extension.ts      # [진입점] 커맨드 등록 + 포트/코어 와이어링
```

### 2.1. 계층별 실제 파일과 역할

- **`adapter/vscode/` (PORT, VS Code 종속)**
  - `io.ts` — VS Code API 읽기/쓰기: `collectThemeSnapshot`, `readCurrentSettings`, `readCurrentPatchableSettings`, `writeSettingsToVscode`.
  - `themeColorMapper.ts` — VS Code 테마 정의 → `ThemeColorsDto` 매핑(`mapVscodeThemeToColors`) 후 코어 진단(`createThemeReport`)에 위임하는 진입 함수 `createThemeSignalReport`.
  - `themeFileParser.ts` — 설치된 테마 파일 수집/매칭(`collectInstalledThemes`, `isMatchingThemeName`).
  - `settingsSerializer.ts` — DTO → VS Code 설정 형태 직렬화(순수): `serializeCandidatePatch`, `createPatchRecipeFromCandidates`, `buildRollbackPlan`, `createEmptySettingsSnapshot`.
  - `patchApply.ts` — 롤백 스냅샷 저장 + 설정 쓰기를 묶는 `applyPatchPlanWithRollback`.
  - `ruleParser.ts` / `ruleAdapter.ts` / `ruleProvider.ts` — 후보 룰 파싱·로딩·제공.
  - `apiTypes.ts` — VS Code API 인터페이스 정의(`VscodeReadApis`/`VscodeSettingsApis` 등).
  - `types.ts` — `Vscode*` raw 설정/테마 타입.
- **`diagnose/` (CORE, 순수)**
  - `diagnosticService.ts` — `createThemeReport`(테마 분석 리포트 생성).
  - `diagnosticEngine.ts` — `createPatchCandidates`(룰 기반 교체 후보 생성), `analyzeVisibility`.
  - `intentSolution.ts` — `createIntentSolution`(특정 영역 클릭에 대한 동적 후보 해결).
  - `visibilityRules.ts` — 대비/가시성 계산 규칙.
  - 제약: 색상 헥스코드 하드코딩 금지. 외부 주입 룰(`CandidateRuleDto[]`)에만 기반.
- **`patch/` (CORE, 순수)**
  - `candidateSaveSession.ts` — `CandidateSaveSession`. 뷰어 오픈 시 스냅샷 캡처, accept/reject/컬러 오버라이드를 메모리에 스테이징, `computeApplyPlan`이 DTO `{ status, selectedCandidates, themeName }`만 반환. VS Code API·I/O 없음.
  - `reportStaleness.ts` — `isReportStale`(뷰어 오픈 이후 테마 변경 감지).
- **`ui/` (CORE, 순수)**
  - `editorViewModel.ts`, `editorViewHtml.ts`, `afterLayer.ts`, `previewHtml.ts`, `notificationFormatter.ts`, `htmlUtils.ts`, `viewerCss.ts`, `components/`, `sample/`.
  - `themeColorDefaults.ts` — `SIGNAL_DEFAULTS`, `normalizeReportSignals`. `ThemeColorsDto` → `ThemeColorHexMap` 정규화. 순수 DTO 기반이며 ui 전용으로 소비되어 이 계층에 위치한다.
- **`extension.ts` (진입점)**: 커맨드 등록 + 포트/코어 파이프라인 조립만 담당. 복잡한 비즈니스 계산식은 두지 않는다.

---

## 3. 명명 규칙과 경계 (Naming Convention & Boundary)

| 접두/접미사 | 의미 | 소속 |
| --- | --- | --- |
| `Vscode*` | VS Code 고유의 raw 형태 (테마 파일/설정 JSON/롤백 스냅샷 등) | **포트 전용** (`adapter/vscode/**`) |
| `*Dto` | 에디터 무관 내부 도메인 객체. 경계를 넘나든다 | 코어·포트 공용 (`types/**`) |

**경계 불변식**: `src/diagnose/**`, `src/patch/**`, `src/utils/**`는 `adapter/**`를 import하지 않으며 어떤 `Vscode*` 타입도 사용하지 않는다. 포트 ↔ 코어 통신은 `*Dto`로만 이뤄진다.

---

## 4. 데이터 흐름 (Data Flow)

세 가지 시퀀스로 정리한다. 함수명은 실제 코드 기준이다.

### 4.1. LOAD (로드 및 진단)

```text
extension(handle*)
  → io.collectThemeSnapshot                 // 포트: VS Code 테마/설정 raw 수집
  → themeColorMapper.createThemeSignalReport // 포트 진입점
      ├─ mapVscodeThemeToColors              //   raw 테마 → ThemeColorsDto
      └─ diagnose.createThemeReport          //   코어 순수 분석에 위임 → ThemeReportDto
  → diagnose.createPatchCandidates           // 코어: 룰 기반 교체 후보(CandidateDto[]) 생성
  → ui (createEditorViewerModel / createPreviewModel → render*)  // 코어: 뷰모델·HTML 렌더
```

### 4.2. SAVE (배치 저장)

```text
extension(saveCandidates 메시지 핸들러)
  → patch.CandidateSaveSession.computeApplyPlan({ currentReport })
        // 코어 순수: staleReport / noStagedCandidates / ready 중 하나.
        // ready면 DTO { selectedCandidates, themeName } 반환 (오버라이드 적용 완료)
  → io.readCurrentPatchableSettings           // 포트: 현재 설정 스냅샷 읽기
  → settingsSerializer.serializeCandidatePatch(selectedCandidates, themeName, existingSettings)
        // 포트: DTO → VS Code 패치 플랜(settingsUpdates + 롤백 스냅샷) 직렬화
  → patchApply.applyPatchPlanWithRollback
        ├─ saveRollback → globalState 에 VscodeRollbackSnapshot 저장
        └─ writeSettings → io.writeSettingsToVscode  // 포트: 실제 설정 쓰기
```

쓰기가 성공한 뒤에만 웹뷰에 `saveResult ok:true`를 보낸다(silent success 금지).

### 4.3. ROLLBACK (롤백)

```text
extension(handleRollbackCandidatePatch)
  → globalState.get<VscodeRollbackSnapshot>     // 저장 시 기록한 스냅샷 조회
  → settingsSerializer.buildRollbackPlan(snapshot)  // 포트: 스냅샷 → 복원 플랜
  → io.writeSettingsToVscode                    // 포트: 이전 설정값으로 복원 쓰기
  → globalState.update(..., undefined)          // 스냅샷 소거
```

---

## 5. 남아 있는 경계 항목 (Known remaining boundary items, future)

현재 코어 중 `ui/`만 포트를 부분적으로 참조하는 지점이 남아 있다. 향후 정리 대상이다.

- **(a) `ui/previewHtml.ts`가 `VscodePatchRecipe`를 직접 받는다.** `createPreviewModel(report, patchRecipe: VscodePatchRecipe, ...)` 및 `extractPatchSignals(patchRecipe: VscodePatchRecipe)`가 `adapter/vscode/types`의 VS Code 형태(`VscodePatchRecipe` / `VscodeSettingDictionary`)에 의존한다. ui → adapter import가 남아 있는 유일한 지점이다.
- **(b) `CandidateDto`에 VS Code 설정 식별자가 박혀 있다.** `CandidateDto.settingId`/`settingKey`가 VS Code 설정 식별자(`TargetSettingId`)를 담고 있어, 후보 모델이 아직 완전히 에디터 무관하지 않다.

이 두 항목은 별도 슬라이스로 분리할 후속 작업이며, 그 전까지 위 경계 불변식의 예외는 `ui/previewHtml.ts` 하나뿐이다.
