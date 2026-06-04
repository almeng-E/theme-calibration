# 개발자용 테마 색상 캘리브레이션 서비스 명세서

## 0. 문서 개요

### 0.1 문서 목적

이 문서는 개발자의 눈, 색각 특성, 모니터 환경, 작업 방식에 맞춰 코드 에디터의 색상 신호를 안전하게 조정하는 서비스를 정의한다.

본 서비스는 단순히 색각이상자를 위한 테마를 제공하거나, Git diff 색상만 수정하는 유틸리티가 아니다. 최종 목표는 개발자가 이미 좋아하고 익숙하게 사용 중인 테마를 유지하면서, 잘 보이지 않거나 혼동되는 색상 신호만 개인의 환경에 맞게 진단하고 조정하는 것이다.

이 문서는 다음 인원이 같은 목표를 공유할 수 있도록 작성되었다.

- 제품 기획자
- PM
- 개발자
- UX/UI 디자이너
- 접근성 리서처
- AI/엔진 개발자
- 마케팅/비즈니스 담당자
- 초기 사용자 인터뷰 및 베타 운영 담당자

### 0.2 문서 성격

이 문서는 다음 성격을 가진다.

- PRD, Product Requirements Document
- 개발 기능 명세서
- UX 방향성 문서
- Agile Epic/User Story 정의서
- MVP 범위 정의서
- 제품 철학 및 의사결정 기준 문서

### 0.3 문서의 핵심 변화

초기 아이디어는 색각이상 개발자를 위한 VS Code 테마 접근성 진단 및 안전 패치 도구에 가까웠다. 이후 검토를 통해 제품 목표를 더 넓게 재정의한다.

변경 전 중심축:

- 색각이상 개발자를 위한 테마 진단
- 적녹색약, 녹색약, 적색약 등 CVD 유형별 보정
- Git diff, diagnostics, syntax token 패치
- 웹 기반 정밀 캘리브레이션

변경 후 중심축:

- 개발자가 자신의 눈과 작업 환경에 맞게 기존 테마 색상 신호를 조정하는 서비스
- 색각이상은 가장 강한 초기 beachhead이지만, 전체 시장은 더 넓은 developer visibility personalization 영역으로 확장
- Git diff와 diagnostics는 제품 정체성이 아니라 첫 번째 가치 증명 지점
- 핵심 카테고리는 colorblind theme이 아니라 developer theme calibration

---

# 1. 제품 정의

## 1.1 제품 한 줄 정의

좋아하는 코드 에디터 테마는 그대로 유지하면서, 내 눈과 내 모니터에서 헷갈리는 색상 신호만 안전하게 진단하고 조정하는 개발자용 테마 캘리브레이션 서비스.

## 1.2 제품 카테고리

본 서비스의 제품 카테고리는 다음과 같다.

- Developer Theme Calibration Tool
- Code Editor Visibility Personalization Service
- Accessibility Signal Adjustment Layer for Developers
- Personal Color Calibration Layer for Code Editors

## 1.3 제품이 아닌 것

본 서비스는 다음이 아니다.

- 새로운 테마를 자동 생성하는 AI 테마 생성기
- 색각이상자만을 위한 고정 팔레트 모음
- Git diff 색상만 수정하는 단일 기능 유틸리티
- 의료적 색각검사 도구
- 디자인 시스템 전체를 대체하는 컬러 팔레트 생성기
- 사용자의 원본 테마 파일을 직접 수정하는 위험한 패처

## 1.4 제품이 지향하는 것

본 서비스는 다음을 지향한다.

- 사용자가 이미 좋아하는 테마를 존중한다.
- 색각 특성, 모니터, 조명, 피로도, 작업 언어, 사용 패턴에 따라 다르게 보이는 색상 문제를 다룬다.
- 개발자가 놓치면 안 되는 시각 신호를 더 안전하게 만든다.
- 색만 바꾸는 것이 아니라, 가능하다면 contrast, luminance, decoration, underline, gutter, opacity 등 보조 신호까지 함께 고려한다.
- 모든 변경은 사용자가 이해하고 되돌릴 수 있어야 한다.
- AI는 색상을 결정하지 않고, 사용자의 불편함을 해석하고 설명하며, rule-based engine과 사용자를 연결하는 조정자 역할을 한다.

---

# 2. 문제 정의

## 2.1 근본 문제

개발자는 하루 종일 코드 에디터, Git diff, diagnostics, terminal, code review UI를 본다. 이 환경에서 색상은 단순한 장식이 아니라 의미를 전달하는 신호다.

예를 들어 다음 색상 신호는 개발 과정에서 매우 중요하다.

- 추가된 코드와 삭제된 코드
- 에러, 경고, 정보, 힌트
- string, comment, keyword, function, type
- 검색 결과와 선택 영역
- test passed/failed
- Git 상태
- review 상태
- conflict, modified, staged, untracked

문제는 이 신호들이 많은 경우 색에 과도하게 의존한다는 점이다. 또한 개발자가 사용하는 테마는 개인 선호, 미감, 피로도, 습관과 깊게 연결되어 있어 단순히 “색약 친화 테마로 갈아타세요”라는 해결책은 현실적이지 않다.

## 2.2 사용자가 실제로 겪는 문제

### 2.2.1 특정 상황에서만 잘 안 보인다

색각이상은 항상 동일하게 불편한 문제가 아니다. 어떤 색 조합은 잘 구분되지만, 특정 배경색, 밝기, 대비, 조명, 모니터, 테마 조합에서는 갑자기 구분이 어려워질 수 있다.

따라서 사용자의 문제는 “나는 초록색을 못 본다”처럼 단순하지 않다. 실제 문제는 다음에 가깝다.

- 이 테마에서는 Git addition과 string이 비슷해 보인다.
- 이 모니터에서는 warning과 keyword가 잘 안 구분된다.
- 야간에는 comment가 너무 흐리다.
- 노트북 화면에서는 괜찮은데 외부 모니터에서는 diff가 안 보인다.
- 일반 색약 테마는 diff는 좋은데 sidebar가 너무 부담스럽다.

### 2.2.2 새 테마로 바꾸는 것은 부담스럽다

개발자는 자신이 익숙한 테마를 쉽게 버리지 않는다. 테마는 단순 취향이 아니라 집중력, 피로도, 코드 구조 인식, 작업 루틴과 연결되어 있다.

기존 해결책은 대부분 “색약 친화 테마를 설치하라”에 가깝다. 하지만 사용자는 다음 이유로 새 테마 전환을 꺼릴 수 있다.

- 기존 테마의 분위기와 대비에 익숙하다.
- 색약 친화 테마가 너무 쨍하거나 피곤하다.
- syntax highlighting은 좋아졌지만 workbench UI가 마음에 들지 않는다.
- Git diff는 좋아졌지만 comment나 selection이 나빠졌다.
- 팀이나 프로젝트 환경에서 특정 테마를 선호한다.

### 2.2.3 어떤 설정을 바꿔야 하는지 모른다

VS Code 테마 색상은 workbench colors, token colors, semantic token colors, TextMate scopes, diagnostics, Git decorations 등 여러 계층으로 구성된다.

사용자는 “에러가 잘 안 보인다”는 문제는 느낄 수 있지만, 실제로 어떤 설정을 바꿔야 하는지는 알기 어렵다.

사용자가 겪는 혼란은 다음과 같다.

- 이 초록색이 string인지 Git addition인지 success state인지 모르겠다.
- comment 색을 바꾸려면 어떤 scope를 건드려야 하는지 모르겠다.
- error underline과 deletion 색이 같은 계열인데 어떤 설정이 원인인지 모르겠다.
- semantic token과 TextMate token 중 어느 쪽이 실제 화면에 적용되는지 모르겠다.
- 설정을 잘못 바꾸면 다른 언어에서 이상해질까 봐 두렵다.

### 2.2.4 색각이상이 없어도 색 조정 니즈는 존재한다

본 서비스의 초기 강한 타겟은 색각이상 개발자다. 그러나 문제는 색각이상자에게만 제한되지 않는다.

다음 사용자도 유사한 니즈를 가진다.

- 장시간 다크테마 사용으로 눈이 피로한 개발자
- comment나 inline hint가 너무 흐리다고 느끼는 개발자
- 고대비 테마는 부담스럽지만 기존 테마는 조금 더 또렷했으면 하는 개발자
- 외부 모니터와 노트북 화면에서 색감이 달라 불편한 개발자
- 밝은 사무실과 어두운 야간 작업 환경에서 다른 색상 설정이 필요한 개발자
- 색상 기반 신호를 더 명확히 관리하고 싶은 팀

---

# 3. 제품 비전과 원칙

## 3.1 제품 비전

개발자가 자신의 눈과 환경에 맞는 색상 작업 환경을 쉽게 만들고 유지할 수 있도록 한다.

장기적으로 본 서비스는 VS Code에만 머무르지 않는다. 사용자의 개인 visibility profile을 기반으로 다음 환경까지 확장할 수 있다.

- VS Code
- JetBrains IDE
- GitHub/GitLab code review
- terminal/git diff
- documentation/code block viewer
- design system developer tools
- team accessibility preset

## 3.2 제품 미션

개발자가 색상 신호를 놓쳐서 코드를 잘못 읽거나, 변경 사항을 놓치거나, 에러를 늦게 발견하거나, 장시간 작업에서 불필요한 피로를 겪지 않도록 한다.

## 3.3 제품 원칙

### 원칙 1. 기존 테마를 존중한다

사용자의 현재 테마는 제품이 대체할 대상이 아니라 보존할 대상이다.

제품의 목표는 “더 좋은 테마를 만들어주는 것”이 아니라 “현재 테마에서 사용자의 눈에 맞지 않는 신호를 안전하게 조정하는 것”이다.

### 원칙 2. 색상 신호를 안전하게 만든다

본 서비스의 대상은 단순 color value가 아니라 semantic signal이다.

예를 들어 Git addition은 단순히 초록색이 아니라 “추가된 코드”라는 의미 신호다. Error는 단순히 빨간색이 아니라 “즉시 확인해야 하는 문제”라는 의미 신호다.

제품은 색상 자체보다 그 색상이 전달해야 하는 의미를 보존하고 강화해야 한다.

### 원칙 3. 사용자가 최종 판단자다

색상 구분성은 수학적으로 계산할 수 있지만, 실제 사용자의 체감은 개인마다 다르다.

따라서 제품은 다음을 함께 제공해야 한다.

- 수학적 진단
- 실제 코드 preview
- before/after 비교
- 사용자 선택
- rollback
- 반복 조정

### 원칙 4. AI는 색상 결정자가 아니다

AI가 임의로 HEX color를 추천해서는 안 된다.

AI의 역할은 다음으로 제한한다.

- 사용자 불편함을 자연어로 수집
- 문제를 구조화
- rule engine이 이해할 수 있는 intent로 변환
- 진단 결과 설명
- 후보 간 trade-off 설명
- 적용 전 변경 사항 요약
- rollback 또는 재조정 지원

최종 색상 후보 생성과 안전성 검증은 rule-based engine이 담당한다.

### 원칙 5. 의료적 진단이 아니다

본 서비스는 색각 이상을 의학적으로 진단하지 않는다.

사용해야 할 표현:

- visibility calibration
- editor color calibration
- theme visibility profile
- 내 모니터 기준 가시성 테스트
- 개발 환경 기준 색상 구분성 테스트

피해야 할 표현:

- 색약 진단
- 색각 이상 검사
- 의학적 판정
- 정확한 색각 유형 측정

### 원칙 6. 모든 변경은 설명 가능하고 되돌릴 수 있어야 한다

사용자는 어떤 색이 왜 바뀌는지 이해할 수 있어야 한다.

필수 조건:

- 변경 전후 diff 표시
- 변경 이유 설명
- 영향받는 signal/token 표시
- 적용 범위 표시
- one-click rollback
- patch history

---

# 4. 타겟 사용자와 페르소나

## 4.1 Primary Persona A: Mild/Moderate CVD Developer

### 설명

적녹색약, 녹색약, 적색약, 청황색약 등 색각 특성이 있지만 일상적으로는 큰 불편을 항상 느끼지는 않는다. 그러나 특정 테마, 특정 배경, Git diff, diagnostics, comment, string 등에서 간헐적으로 불편을 겪는다.

### 핵심 니즈

- 현재 테마를 버리고 싶지 않다.
- 무엇이 문제인지 스스로 정확히 설명하기 어렵다.
- 색약 친화 테마가 항상 더 좋지는 않다.
- Git diff와 error/warning은 확실히 잘 보여야 한다.
- 내 눈 기준으로 더 잘 보이는 선택지를 직접 확인하고 싶다.

### 성공 경험

“내가 막연히 불편하다고 느꼈던 부분을 제품이 정확히 찾아냈고, 테마 분위기를 망치지 않으면서 그 부분만 좋아졌다.”

## 4.2 Primary Persona B: Theme-Conservative Developer

### 설명

색각이상이 있거나 없을 수 있다. 핵심은 자신이 쓰는 테마에 강한 애착이 있고, 새 테마로 갈아타는 것을 싫어한다는 점이다.

### 핵심 니즈

- 현재 테마의 분위기와 집중감을 유지하고 싶다.
- comment, selection, search, diagnostics 등 일부만 조정하고 싶다.
- 설정 파일을 직접 만지는 것은 귀찮거나 위험하다.
- 바꾼 뒤 마음에 안 들면 바로 되돌리고 싶다.

### 성공 경험

“테마를 바꾼 게 아니라 내 테마가 내 눈에 더 맞게 정리된 느낌이다.”

## 4.3 Secondary Persona C: Low-Fatigue Developer

### 설명

색각이상은 없지만 장시간 코딩으로 눈 피로를 느낀다. 너무 강한 contrast나 saturation을 싫어한다. 하지만 너무 흐린 색도 싫다.

### 핵심 니즈

- 장시간 사용 가능한 균형 잡힌 contrast
- comment와 inline hint의 적절한 가시성
- 너무 쨍하지 않은 diagnostics
- 낮/밤 프로필

### 성공 경험

“고대비 테마처럼 부담스럽지 않지만, 중요한 신호는 더 잘 보인다.”

## 4.4 Secondary Persona D: Team Accessibility Maintainer

### 설명

팀 또는 조직에서 개발 환경 접근성, 디자인 시스템 접근성, 코드 리뷰 환경 개선을 고민한다.

### 핵심 니즈

- 팀 표준 테마의 접근성 리포트
- 색각 유형별 위험 신호 분석
- 공유 가능한 patch preset
- GitHub/GitLab/code review 색상 신호 개선
- 접근성 기준 설명 자료

### 성공 경험

“개인 취향을 강제로 통일하지 않으면서도 팀의 주요 개발 신호를 접근성 기준에 맞게 개선했다.”

---

# 5. Jobs To Be Done

## 5.1 Core Job

내가 쓰는 코드 에디터 테마에서 헷갈리거나 잘 보이지 않는 색상 신호를 찾아, 테마 전체를 바꾸지 않고 안전하게 조정하고 싶다.

## 5.2 Functional Jobs

- 현재 테마에서 위험한 색상 충돌을 찾고 싶다.
- Git diff의 추가/삭제/변경을 더 명확히 보고 싶다.
- 에러와 경고를 더 빨리 발견하고 싶다.
- comment, string, keyword 같은 주요 token이 서로 헷갈리지 않게 하고 싶다.
- 너무 흐린 색은 조금 더 또렷하게 만들고 싶다.
- 너무 쨍한 색은 덜 피로하게 만들고 싶다.
- 여러 모니터나 낮/밤 환경에 맞는 프로필을 저장하고 싶다.
- 설정 파일을 직접 건드리지 않고 안전하게 적용하고 싶다.
- 언제든 원래대로 되돌리고 싶다.

## 5.3 Emotional Jobs

- 내 불편함이 개인적인 착각이 아니라 실제로 설명 가능한 문제라는 확신을 얻고 싶다.
- 내가 좋아하는 테마를 포기하고 싶지 않다.
- 색약 친화 테마가 나에게 맞지 않았던 경험을 반복하고 싶지 않다.
- 접근성 도구가 내 미적 취향을 무시하지 않았으면 좋겠다.
- 내가 통제권을 갖고 있다고 느끼고 싶다.

## 5.4 Social Jobs

- 팀원이나 디자이너에게 “이 색 조합은 나에게 잘 안 보인다”고 설명할 근거를 갖고 싶다.
- 팀 표준 테마를 접근성 관점에서 개선하고 싶다.
- 내가 만든 patch를 다른 사용자와 공유하고 싶다.

---

# 6. 제품 구조

## 6.1 전체 구성

본 서비스는 네 개의 핵심 구성요소로 이루어진다.

### 6.1.1 VS Code Extension

사용자의 현재 테마를 스캔하고, 기본 visibility report를 생성하며, safe patch를 적용하고 rollback할 수 있게 한다.

초기 제품의 가장 중요한 접점이다.

### 6.1.2 Web Calibration

사용자의 실제 모니터와 조명 환경에서 A/B preview와 visibility test를 통해 더 개인화된 색상 프로필을 만든다.

초기에는 MVP 이후 단계로 두며, 제품의 장기 유료 가치와 연결한다.

### 6.1.3 Core Visibility Engine

색상 파싱, contrast 계산, CVD 시뮬레이션, signal collision 분석, 후보 색상 생성, patch validation을 담당한다.

서비스 신뢰성의 핵심이다.

### 6.1.4 AI Agent

사용자의 자연어 피드백을 수집하고, 문제를 설명하며, rule engine과 patch flow를 조율한다.

초기 MVP에서는 제외하거나 제한적으로 제공한다.

---

# 7. PRD

## 7.1 제품 목표

### Goal 1. 사용자가 현재 테마의 visibility 문제를 이해하게 한다

제품은 사용자가 막연하게 느끼던 불편함을 구체적인 색상 신호 문제로 설명해야 한다.

예:

- Git addition과 string이 특정 색각 프로필에서 유사하게 보인다.
- Error와 deletion이 같은 red family에 의존한다.
- Comment contrast가 낮아 장시간 작업에서 피로를 유발할 수 있다.
- Warning과 keyword가 일부 preview에서 시각적으로 가까워진다.

### Goal 2. 기존 테마를 보존하면서 안전한 patch를 제공한다

사용자는 새 테마로 갈아타지 않고 현재 테마를 개선할 수 있어야 한다.

Patch는 보수적이어야 하며, 원본 테마의 분위기를 최대한 유지해야 한다.

### Goal 3. 사용자가 결과를 직접 보고 선택하게 한다

제품은 자동 적용이 아니라 preview 중심이어야 한다.

사용자는 변경 전후를 비교하고, 자신에게 더 잘 보이는 쪽을 선택할 수 있어야 한다.

### Goal 4. 모든 변경을 되돌릴 수 있게 한다

Rollback은 부가 기능이 아니라 핵심 신뢰 장치다.

### Goal 5. 장기적으로 개인 visibility profile을 만든다

서비스의 장기 가치는 단일 patch가 아니라 사용자의 눈, 모니터, 환경, 선호를 담은 visibility profile이다.

이 profile은 여러 테마, 여러 기기, 여러 개발 환경에 재사용될 수 있어야 한다.

## 7.2 비목표

MVP 단계에서 다음은 목표가 아니다.

- 모든 VS Code 테마 완벽 지원
- 모든 언어별 semantic token 완벽 분석
- 의료적 색각 유형 진단
- AI 기반 임의 색상 생성
- GitHub/GitLab 브라우저 확장 동시 출시
- JetBrains/Neovim/Terminal 동시 지원
- 팀 관리 기능 완성
- 완벽한 자동 최적화

## 7.3 제품 성공 기준

### 사용자 가치 기준

- 사용자가 현재 테마의 문제를 이해한다.
- 사용자가 before/after preview에서 개선을 체감한다.
- 사용자가 patch를 적용해도 원본 테마가 망가지지 않았다고 느낀다.
- 사용자가 rollback이 가능하다는 점 때문에 안심하고 시도한다.
- 사용자가 “내 눈에 맞는 조정”이라고 느낀다.

### 제품 지표 기준

- scan started
- scan completed
- report viewed
- patch generated
- preview interacted
- patch applied
- rollback used
- patch retained after 7 days
- web calibration clicked
- calibration completed
- personalized profile created

### 품질 지표 기준

- risky signal pair 감소율
- contrast 개선율
- user preference before/after score
- manual adjustment frequency
- rollback rate
- issue report rate
- patch confidence score

### 비즈니스 지표 기준

- free extension install to scan conversion
- scan to patch conversion
- patch to web calibration click-through
- web calibration purchase conversion
- lifetime/profile plan conversion
- repeat calibration rate
- team inquiry count

---

# 8. 사용자 여정

## 8.1 Journey A: 첫 설치 후 현재 테마 스캔

### 상황

사용자는 현재 VS Code 테마를 좋아하지만, Git diff나 error/warning이 가끔 잘 안 보인다.

### 흐름

1. Extension 설치
2. “Scan Current Theme” 실행
3. 간단한 visibility profile 선택
4. 현재 테마 분석
5. 위험 신호 리포트 확인
6. 문제 항목별 before/after preview 확인
7. conservative patch 생성
8. settings overlay로 적용
9. 마음에 들지 않으면 rollback

### 사용자가 느껴야 할 것

- “내가 불편했던 이유가 설명된다.”
- “테마를 바꾸는 게 아니라 일부를 조정하는 것이다.”
- “원하면 되돌릴 수 있으니 안전하다.”

## 8.2 Journey B: 기본 patch 후 더 정밀하게 조정

### 상황

기본 patch는 좋아졌지만, 사용자는 특정 모니터나 야간 작업 환경에서 더 정밀한 조정을 원한다.

### 흐름

1. Extension 리포트에서 Web Calibration CTA 확인
2. Web에서 GitHub OAuth 또는 간단 계정 로그인
3. 현재 환경 선택
4. A/B 코드 preview 수행
5. Git diff, diagnostics, comment, string, selection 등 항목별 선호 선택
6. personalized visibility profile 생성
7. patch export 또는 extension import
8. VS Code에 적용
9. 프로필 저장

### 사용자가 느껴야 할 것

- “내 모니터 기준으로 직접 고른 결과라 더 믿을 수 있다.”
- “낮/밤 또는 모니터별로 다르게 관리할 수 있다.”

## 8.3 Journey C: 자연어로 재조정

### 상황

사용자가 patch 적용 후 일부 항목에 대해 추가 조정을 원한다.

### 흐름

1. Agent chat에 자연어로 말한다.
2. Agent가 문제를 구조화한다.
3. Rule engine이 재계산한다.
4. 변경 후보를 preview로 보여준다.
5. 사용자가 적용 또는 취소한다.

### 사용자가 느껴야 할 것

- “설정 이름을 몰라도 말로 조정할 수 있다.”
- “AI가 멋대로 색을 정하는 게 아니라 안전한 후보를 보여준다.”

---

# 9. 기능 요구사항

## 9.1 FR-001: 온보딩

### 목적

사용자가 이 서비스가 색약 진단 도구가 아니라 개발 환경 색상 캘리브레이션 도구임을 이해하게 한다.

### 요구사항

- 제품의 핵심 가치를 한 문장으로 설명한다.
- 현재 테마를 유지한다는 점을 강조한다.
- 변경은 언제든 rollback 가능하다는 점을 안내한다.
- 의료적 진단이 아님을 명확히 고지한다.
- 사용자가 자신의 visibility profile을 간단히 선택할 수 있게 한다.

### 초기 profile 옵션

- 잘 모르겠음, 먼저 스캔하기
- 적녹 계열 구분이 가끔 어렵다
- 초록/노랑/갈색 계열이 헷갈린다
- 빨강/갈색/주황 계열이 헷갈린다
- 파랑/보라/청록 계열이 헷갈린다
- comment나 흐린 색이 잘 안 보인다
- 고대비는 부담스럽지만 조금 더 또렷했으면 한다
- 장시간 작업용 저피로 조정을 원한다

전문 용어는 advanced option으로 제공한다.

- deuteranomaly
- protanomaly
- tritanomaly
- deuteranopia
- protanopia
- tritanopia

## 9.2 FR-002: 현재 테마 스캔

### 목적

현재 VS Code에서 적용 중인 테마와 사용자 설정을 읽고, 분석 가능한 색상 신호 목록을 구성한다.

### 분석 대상

- editor background/foreground
- workbench colors
- Git decoration colors
- diff editor colors
- diagnostics colors
- token colors
- semantic token colors
- selection/highlight colors
- search result colors
- inline hint/comment 색상
- gutter/line highlight 관련 색상

### 요구사항

- 현재 active theme을 식별한다.
- user/workspace setting override를 구분한다.
- 분석 가능한 색상과 분석 불가능한 색상을 구분해 표시한다.
- theme 파일 또는 원본 확장을 직접 수정하지 않는다.
- 스캔 실패 시 사용자에게 원인을 설명한다.

## 9.3 FR-003: Visibility Report

### 목적

사용자가 현재 테마의 문제를 구체적으로 이해하게 한다.

### 리포트 항목

- 전체 visibility risk score
- high priority signal issues
- Git diff visibility
- diagnostics visibility
- syntax token collision
- low contrast tokens
- color family overuse
- theme preservation risk
- recommended patch mode

### 우선순위

리포트는 다음 순서로 문제를 보여준다.

1. Git diff addition/deletion/modified
2. diagnostics error/warning/info/hint
3. critical UI signal
4. comment/string/keyword/function/type
5. selection/search/highlight
6. low-priority aesthetic suggestions

### 리포트 톤

- 사용자를 탓하지 않는다.
- “잘못된 테마”라고 표현하지 않는다.
- “현재 테마에서 일부 신호가 특정 조건에서 헷갈릴 수 있다”처럼 설명한다.
- 숫자와 시각 preview를 함께 제공한다.

## 9.4 FR-004: Safe Patch Generator

### 목적

사용자의 visibility profile과 현재 테마를 기반으로 보수적인 patch 후보를 생성한다.

### patch mode

- Conservative: 최소 변경, 원본 분위기 최대 보존
- Balanced: visibility와 theme preservation 균형
- High Visibility: 중요한 신호 구분 우선
- Low Fatigue: 장시간 사용과 낮은 자극 우선
- Diff & Diagnostics First: Git diff와 diagnostics만 우선 개선

### patch 원칙

- 원본 테마 파일을 직접 수정하지 않는다.
- 현재 테마의 배경색과 전체 분위기를 유지한다.
- 중요한 신호를 우선 개선한다.
- 한 색상을 바꾸면 관련 signal pair도 재검증한다.
- contrast가 악화되면 안 된다.
- 색각 시뮬레이션 후에도 의미가 다른 신호가 충분히 구분되어야 한다.
- 사용자가 원하지 않는 과도한 saturation 증가를 피한다.

## 9.5 FR-005: Before/After Preview

### 목적

사용자가 patch를 적용하기 전에 실제 코드와 개발 신호에서 차이를 확인할 수 있게 한다.

### preview 항목

- Git diff sample
- diagnostics sample
- TypeScript 또는 JavaScript sample
- Python sample
- comment/string/keyword/function sample
- selection/search highlight sample
- optional TSX/Rust/Go sample

### 요구사항

- before와 after를 명확히 비교할 수 있어야 한다.
- 바뀐 signal을 강조 표시한다.
- 사용자가 항목별로 patch를 켜고 끌 수 있어야 한다.
- preview에서 “좋아짐/나빠짐/잘 모르겠음” 피드백을 받을 수 있어야 한다.

## 9.6 FR-006: Patch Apply

### 목적

사용자가 안전하게 patch를 적용할 수 있게 한다.

### 초기 적용 방식

MVP에서는 settings overlay 방식을 우선한다.

### 적용 범위

- user-level settings
- workspace-level settings

MVP에서는 user-level 우선, workspace-level은 선택 옵션으로 제공한다.

### 요구사항

- 적용 전 변경 목록을 보여준다.
- 변경 이유를 보여준다.
- 적용 범위를 명확히 표시한다.
- 적용 후 즉시 preview 또는 reload 안내를 제공한다.
- 실패 시 원인을 설명하고 기존 설정을 보존한다.

## 9.7 FR-007: Rollback Manager

### 목적

사용자가 언제든 원래 설정으로 되돌릴 수 있게 한다.

### 요구사항

- patch 적용 전 상태를 저장한다.
- patch id, 적용 시간, theme id, 변경 항목, 이전 값, 새 값을 기록한다.
- one-click rollback을 제공한다.
- 여러 patch history를 관리한다.
- rollback 후에도 사용자의 기존 수동 설정이 손상되지 않도록 한다.

## 9.8 FR-008: Web Calibration

### 목적

사용자의 실제 모니터와 조명 환경에서 더 개인화된 visibility profile을 만든다.

### 주요 기능

- account login
- calibration session 생성
- 환경 정보 입력
- A/B code preview
- color distinguishability test
- diff recognition test
- diagnostics recognition test
- low fatigue preference test
- personalized profile 생성
- patch export/import

### 환경 정보

- dark/light theme preference
- 낮/밤 작업 환경
- 주변 조명
- 모니터 종류
- 모니터 밝기 대략값
- 주 사용 언어
- 주요 불편 항목

### Web의 역할

Web은 무료 extension보다 더 정밀한 색상 조정, 프로필 저장, 여러 환경 관리, 재캘리브레이션을 담당한다.

## 9.9 FR-009: Visibility Profile Management

### 목적

사용자가 자신의 눈과 환경에 맞는 색상 선호와 가시성 기준을 저장하고 재사용할 수 있게 한다.

### profile 종류

- Default profile
- Night coding profile
- Office monitor profile
- Laptop profile
- High visibility profile
- Low fatigue profile
- Theme-specific profile

### 요구사항

- profile 생성
- profile 이름 변경
- profile 복제
- profile 삭제
- profile별 patch history 확인
- extension으로 profile import/export
- 여러 테마에 profile 적용 가능성 평가

## 9.10 FR-010: AI Agent

### 목적

사용자의 자연어 피드백을 patch intent로 변환하고, 진단 결과와 변경 사항을 이해하기 쉽게 설명한다.

### 역할

- 문제 수집
- 사용자 표현 정규화
- 관련 signal/token 추론
- rule engine 호출 intent 생성
- 결과 설명
- trade-off 설명
- 적용/취소/rollback 안내

### 하지 말아야 할 것

- AI가 직접 최종 HEX color를 결정
- 접근성 기준을 우회한 색상 추천
- 사용자의 확인 없이 patch 적용
- 의료적 색각 진단

## 9.11 FR-011: 결제 및 권한

### 목적

무료 extension과 유료 web calibration/profile 관리 기능을 명확히 구분한다.

### Free

- 현재 테마 스캔
- 기본 visibility report
- 제한된 conservative patch
- rollback
- 기본 preview

### Paid

- 정밀 web calibration
- 다중 profile 저장
- 다중 테마 관리
- profile sync/export
- 반복 calibration
- 고급 A/B preview
- AI-assisted advanced adjustment
- team preset, 향후

### 가격 원칙

- 초기에는 복잡한 pass보다 단순한 one-time 또는 lifetime 중심
- 유료 가치는 “정밀도”만이 아니라 “지속 관리, 여러 환경, profile 재사용”으로 정의

## 9.12 FR-012: Analytics and Feedback

### 목적

제품 품질과 가설 검증을 위해 사용자 행동과 피드백을 수집한다.

### 수집 이벤트

- extension install
- scan started
- scan completed
- report issue clicked
- patch generated
- preview toggled
- patch applied
- rollback triggered
- satisfaction feedback
- web CTA clicked
- calibration started
- calibration completed
- profile created
- paid conversion

### 개인정보 원칙

- 원본 코드 내용을 수집하지 않는다.
- 테마 색상 데이터와 사용자 피드백은 명시적 동의 하에 수집한다.
- 사용자의 색각 특성은 민감한 정보로 다룬다.
- 의료 정보처럼 표현하거나 취급하지 않되, 프라이버시는 엄격히 보호한다.

---

# 10. Core Visibility Engine 명세

## 10.1 엔진 목적

Core Visibility Engine은 서비스의 신뢰성을 담당한다.

엔진은 사용자의 테마와 visibility profile을 입력받아, 의미가 다른 색상 신호들이 사용자의 조건에서 충분히 구분 가능한지 분석하고, 안전한 patch 후보를 생성한다.

## 10.2 입력

- active theme metadata
- editor background
- editor foreground
- workbench colors
- token colors
- semantic token colors
- Git diff colors
- diagnostics colors
- user visibility profile
- CVD simulation profile
- contrast preference
- saturation preference
- fatigue preference
- environment profile
- language preview priority

## 10.3 출력

- visibility report
- risky signal pairs
- low contrast items
- semantic collision groups
- recommended patch candidates
- patch confidence score
- theme preservation score
- before/after preview data
- rollback metadata
- explanation payload for AI/UX

## 10.4 분석 범주

### 10.4.1 Signal Priority Group A

놓치면 개발 흐름에 직접 영향을 주는 신호다.

- Git addition
- Git deletion
- Git modified
- diagnostics error
- diagnostics warning
- diagnostics info
- diagnostics hint
- conflict marker

### 10.4.2 Signal Priority Group B

코드 이해와 장시간 가독성에 영향을 주는 신호다.

- comment
- string
- keyword
- function
- variable
- type/class
- operator
- number/constant

### 10.4.3 Signal Priority Group C

작업 편의성과 UI 이해에 영향을 주는 신호다.

- selection
- search result
- current line highlight
- bracket match
- inline hint
- disabled text
- gutter decoration
- minimap highlight

## 10.5 Scoring 개념

엔진은 다음 점수를 조합해 patch 후보를 평가한다.

### Contrast Score

배경 대비와 텍스트 가독성을 평가한다.

### Distinguishability Score

의미가 다른 두 signal이 색각 시뮬레이션 후에도 충분히 구분되는지 평가한다.

### Semantic Safety Score

같은 색상 계열이 서로 다른 의미에 과도하게 재사용되는지 평가한다.

### Theme Preservation Score

원본 테마의 분위기, saturation, luminance, hue family, contrast mood를 얼마나 유지하는지 평가한다.

### Fatigue Score

장시간 사용 시 너무 쨍하거나 눈에 부담이 되는 후보인지 평가한다.

### Patch Risk Score

특정 색상 변경이 다른 signal에 부작용을 일으킬 가능성을 평가한다.

## 10.6 후보 생성 원칙

- 원본 테마에서 멀어지는 정도를 penalty로 계산한다.
- Git diff와 diagnostics는 semantic clarity를 더 우선한다.
- syntax token은 theme preservation을 더 우선한다.
- comment와 inline hint는 low fatigue와 readability 균형을 본다.
- hue만 바꾸지 않고 luminance, saturation, contrast도 함께 고려한다.
- 색상 변경으로 해결이 어려운 경우 비색상 보조 신호를 제안한다.

## 10.7 비색상 보조 신호

가능한 경우 엔진은 다음을 함께 고려한다.

- underline
- border
- gutter marker
- opacity
- font style
- line background
- icon 또는 symbol
- pattern, 향후 플랫폼이 지원하는 경우

MVP에서는 VS Code settings로 제어 가능한 범위 내에서만 적용한다.

---

# 11. UX 요구사항

## 11.1 UX 핵심 원칙

### 11.1.1 사용자를 환자로 만들지 않는다

사용자는 “진단받는 사람”이 아니라 “작업 환경을 조정하는 사람”이다.

표현은 다음처럼 한다.

- “색각 유형을 진단합니다”가 아니라 “잘 보이는 조합을 찾습니다.”
- “당신은 이 색을 못 봅니다”가 아니라 “이 조합은 현재 조건에서 헷갈릴 수 있습니다.”
- “정답 색상”이 아니라 “더 안전한 후보”라고 표현한다.

### 11.1.2 사용자의 취향을 존중한다

접근성 개선이 곧 미감 파괴가 되어서는 안 된다.

UX는 항상 다음을 보여줘야 한다.

- 원본 테마 유지 정도
- 변경 범위
- visibility 개선 정도
- 사용자가 선택 가능한 대안

### 11.1.3 불안을 낮춘다

테마 설정을 바꾸는 것은 사용자에게 부담일 수 있다.

따라서 항상 다음 장치를 제공한다.

- preview first
- apply after confirmation
- visible diff
- rollback
- patch history

## 11.2 화면 구조

### Screen 1. Welcome / Onboarding

목적:

- 제품 정체성 설명
- 의료적 진단 아님 고지
- 현재 테마 보존과 rollback 강조
- 첫 scan 유도

### Screen 2. Profile Quick Setup

목적:

- 사용자의 대략적 불편 유형 수집
- 전문 용어 없이 시작 가능
- advanced profile 선택 가능

### Screen 3. Scan Progress

목적:

- 현재 테마를 분석 중임을 표시
- 분석 대상 설명
- 실패 시 복구 안내

### Screen 4. Visibility Report

목적:

- 가장 중요한 문제를 우선순위로 보여줌
- Git diff/diagnostics를 상단에 배치
- 각 issue에 preview와 설명 제공

### Screen 5. Patch Preview

목적:

- before/after 비교
- patch mode 선택
- 항목별 patch on/off
- 만족도 피드백

### Screen 6. Apply & Rollback

목적:

- 변경 목록 확인
- 적용 범위 선택
- 적용 후 상태 표시
- rollback 버튼 제공

### Screen 7. Web Calibration CTA

목적:

- 기본 patch 이후 더 정밀한 개인화를 안내
- 유료 전환을 강요하지 않음
- “더 정확한 색”보다 “여러 환경과 profile 관리” 가치를 강조

## 11.3 문구 가이드

### 좋은 문구

- 좋아하는 테마는 그대로, 헷갈리는 색상 신호만 조정합니다.
- 현재 테마에서 일부 신호가 비슷하게 보일 수 있습니다.
- 이 patch는 원본 테마를 수정하지 않으며 언제든 되돌릴 수 있습니다.
- 더 잘 보이는 쪽을 직접 선택하세요.
- 이 결과는 현재 디스플레이 환경 기준입니다.

### 피해야 할 문구

- 당신은 이 색을 볼 수 없습니다.
- 이 테마는 색약 사용자에게 나쁩니다.
- 정확한 색각 유형을 진단합니다.
- AI가 최적 색상을 골라드립니다.
- 이 색상이 정답입니다.

---

# 12. Agile Epics and User Stories

## Epic 1. Current Theme Scan

### 목표

사용자가 현재 VS Code 테마의 색상 신호를 분석할 수 있게 한다.

### User Story 1.1

색 구분에 불편함을 느끼는 개발자로서, 나는 현재 사용 중인 테마를 자동으로 스캔하고 싶다. 그래야 어떤 색상 신호가 문제인지 직접 설정 파일을 열지 않고도 알 수 있다.

Acceptance Criteria:

- 사용자는 command 또는 sidebar에서 scan을 시작할 수 있다.
- 시스템은 active theme을 식별한다.
- 시스템은 분석 가능한 색상 항목을 수집한다.
- scan 실패 시 사용자는 이유와 다음 행동을 안내받는다.

### User Story 1.2

테마 설정을 잘 모르는 개발자로서, 나는 전문 용어 없이 내 불편 유형을 선택하고 싶다. 그래야 deuteranomaly 같은 용어를 몰라도 시작할 수 있다.

Acceptance Criteria:

- quick profile 선택지가 일반 언어로 제공된다.
- advanced profile은 선택 사항이다.
- “잘 모르겠음”으로도 scan을 진행할 수 있다.

## Epic 2. Visibility Report

### 목표

사용자가 현재 테마의 문제를 구체적으로 이해하게 한다.

### User Story 2.1

색상 때문에 Git diff가 헷갈리는 개발자로서, 나는 addition/deletion/modified 색상이 내 profile에서 얼마나 구분되는지 알고 싶다. 그래야 변경 사항을 놓칠 위험을 줄일 수 있다.

Acceptance Criteria:

- report는 Git diff 관련 issue를 우선순위로 표시한다.
- addition/deletion/modified 구분성 점수를 제공한다.
- before preview를 제공한다.
- 문제의 이유를 쉬운 언어로 설명한다.

### User Story 2.2

에러와 경고를 빨리 찾고 싶은 개발자로서, 나는 diagnostics 색상이 충분히 눈에 띄는지 알고 싶다. 그래야 실수를 더 빨리 발견할 수 있다.

Acceptance Criteria:

- error/warning/info/hint 항목이 분석된다.
- 배경 대비와 signal 간 구분성이 표시된다.
- 위험도가 높은 항목이 상단에 배치된다.

### User Story 2.3

현재 테마를 좋아하는 개발자로서, 나는 어떤 색을 바꾸면 테마 분위기가 얼마나 변하는지 알고 싶다. 그래야 접근성과 미감 사이에서 선택할 수 있다.

Acceptance Criteria:

- report는 theme preservation 관점을 포함한다.
- 각 patch 후보는 원본 테마 유지 정도를 표시한다.
- 과도한 변경이 필요한 경우 경고한다.

## Epic 3. Safe Patch Generation

### 목표

사용자가 원본 테마를 망치지 않고 문제 신호만 조정할 수 있게 한다.

### User Story 3.1

현재 테마를 유지하고 싶은 개발자로서, 나는 문제 되는 색상만 최소한으로 바꾸고 싶다. 그래야 테마를 새로 배울 필요 없이 가시성만 개선할 수 있다.

Acceptance Criteria:

- conservative patch mode가 제공된다.
- patch는 변경 항목과 이유를 표시한다.
- 원본 테마 파일은 수정하지 않는다.
- patch 생성 후 validation 결과를 표시한다.

### User Story 3.2

장시간 코딩하는 개발자로서, 나는 너무 쨍하지 않은 방향으로 가시성을 개선하고 싶다. 그래야 눈 피로를 줄이면서 중요한 신호는 놓치지 않을 수 있다.

Acceptance Criteria:

- low fatigue patch mode가 제공된다.
- saturation 증가가 과도한 후보는 제외된다.
- comment/inline hint/readability 항목이 반영된다.

### User Story 3.3

중요한 변경 신호를 놓치고 싶지 않은 개발자로서, 나는 Git diff와 diagnostics를 우선 개선하는 patch를 원한다. 그래야 가장 위험한 문제부터 해결할 수 있다.

Acceptance Criteria:

- Diff & Diagnostics First mode가 제공된다.
- syntax token 변경 없이 diff/diagnostics만 patch할 수 있다.
- patch 적용 전 해당 범위를 명확히 표시한다.

## Epic 4. Preview and Feedback

### 목표

사용자가 patch 결과를 실제 적용 전 확인하고 피드백할 수 있게 한다.

### User Story 4.1

조심스럽게 설정을 바꾸고 싶은 개발자로서, 나는 patch 적용 전에 before/after를 보고 싶다. 그래야 내 테마가 망가지지 않는지 확인할 수 있다.

Acceptance Criteria:

- before/after preview가 제공된다.
- Git diff, diagnostics, syntax sample이 포함된다.
- 변경된 signal이 표시된다.
- 사용자는 patch 적용 전 취소할 수 있다.

### User Story 4.2

내 눈에 맞는지를 직접 판단하고 싶은 사용자로서, 나는 patch 후보에 대해 좋아짐/나빠짐/잘 모르겠음 피드백을 남기고 싶다. 그래야 다음 후보가 더 나에게 맞게 조정될 수 있다.

Acceptance Criteria:

- preview별 간단 피드백 UI가 제공된다.
- 피드백은 다음 patch 후보 생성에 반영된다.
- 사용자는 피드백 없이도 진행할 수 있다.

## Epic 5. Apply and Rollback

### 목표

사용자가 안심하고 patch를 적용하고 되돌릴 수 있게 한다.

### User Story 5.1

설정 변경이 두려운 개발자로서, 나는 언제든 원래대로 되돌릴 수 있음을 확인하고 싶다. 그래야 부담 없이 patch를 시도할 수 있다.

Acceptance Criteria:

- patch 적용 전 rollback 가능 여부를 명시한다.
- patch history가 저장된다.
- one-click rollback이 제공된다.
- rollback 후 설정이 이전 상태로 복원된다.

### User Story 5.2

여러 프로젝트를 오가는 개발자로서, 나는 user-level과 workspace-level 적용 범위를 선택하고 싶다. 그래야 특정 프로젝트에만 patch를 적용할 수 있다.

Acceptance Criteria:

- 적용 범위를 선택할 수 있다.
- 각 범위의 의미를 설명한다.
- workspace-level 적용 시 프로젝트 설정 변경임을 안내한다.

## Epic 6. Web Calibration

### 목표

사용자가 실제 환경 기준으로 더 정밀한 visibility profile을 만들 수 있게 한다.

### User Story 6.1

외부 모니터와 노트북 화면에서 색이 다르게 보이는 개발자로서, 나는 환경별 profile을 만들고 싶다. 그래야 각 환경에 맞는 patch를 적용할 수 있다.

Acceptance Criteria:

- 사용자는 환경 정보를 입력할 수 있다.
- 환경별 profile을 저장할 수 있다.
- profile 이름을 지정할 수 있다.
- extension으로 profile을 가져올 수 있다.

### User Story 6.2

기본 patch보다 더 개인화된 결과를 원하는 개발자로서, 나는 A/B preview에서 더 잘 보이는 조합을 직접 선택하고 싶다. 그래야 내 체감에 맞는 patch를 만들 수 있다.

Acceptance Criteria:

- A/B code preview가 제공된다.
- diff, diagnostics, syntax, comment 관련 테스트가 포함된다.
- 선택 결과가 personalized profile에 반영된다.

## Epic 7. AI Agent

### 목표

사용자가 설정 명칭을 몰라도 자연어로 문제를 설명하고 안전하게 재조정할 수 있게 한다.

### User Story 7.1

설정 이름을 모르는 개발자로서, 나는 “문자열이 너무 튄다”처럼 말하고 싶다. 그래야 복잡한 color setting을 몰라도 원하는 방향으로 조정할 수 있다.

Acceptance Criteria:

- agent는 사용자 문장을 patch intent로 변환한다.
- agent는 관련 signal/token을 추정한다.
- rule engine validation을 거친 후보만 제시한다.
- 사용자 확인 전 적용하지 않는다.

### User Story 7.2

결과를 이해하고 싶은 사용자로서, 나는 왜 이 색이 바뀌었는지 설명을 보고 싶다. 그래야 변경을 신뢰할 수 있다.

Acceptance Criteria:

- agent는 변경 이유를 쉬운 언어로 설명한다.
- 관련 risk reduction을 요약한다.
- trade-off가 있으면 설명한다.

## Epic 8. Profile and Business Model

### 목표

무료 extension과 유료 profile/calibration 서비스를 자연스럽게 연결한다.

### User Story 8.1

기본 기능으로 가치를 확인한 사용자로서, 나는 여러 환경과 테마를 관리할 수 있는 유료 기능을 검토하고 싶다. 그래야 반복 조정 시간을 줄일 수 있다.

Acceptance Criteria:

- free와 paid 차이가 명확하다.
- CTA는 scan/report 이후 자연스럽게 등장한다.
- 유료 기능은 정밀도뿐 아니라 profile 저장, sync, 다중 환경 관리를 강조한다.

---

# 13. MVP 범위

## 13.1 MVP v0: Local Theme Calibration Scanner

### 목표

사용자가 현재 VS Code 테마에서 헷갈리는 주요 색상 신호를 발견하고, 안전한 conservative patch를 적용할 수 있다.

### 포함 기능

- VS Code extension
- current theme scan
- quick visibility profile
- Git diff analysis
- diagnostics analysis
- comment/string/keyword basic collision analysis
- visibility report
- conservative patch generation
- before/after preview
- settings overlay apply
- rollback
- local patch history

### 제외 기능

- web payment
- full web calibration
- AI chat
- generated theme extension
- full language-specific optimization
- GitHub/GitLab browser extension
- team profile

### 지원 범위

- VS Code only
- dark theme first
- deuteranomaly/protanomaly-oriented profile first
- mild/moderate CVD and low-contrast discomfort use cases
- 인기 테마 3~5개 수동 검증

## 13.2 MVP v1: Web Calibration Beta

### 목표

사용자가 실제 모니터 기준으로 A/B preview를 통해 개인화 profile을 만들고 extension에 적용할 수 있다.

### 포함 기능

- web calibration session
- account login
- environment profile
- A/B code preview
- personalized visibility profile
- profile export/import
- simple paid entitlement

## 13.3 MVP v2: AI-Assisted Adjustment

### 목표

사용자가 자연어 피드백으로 patch를 재조정할 수 있다.

### 포함 기능

- chat panel
- diagnosis explanation
- natural language to patch intent
- rule engine function call
- preview/apply/rollback flow

## 13.4 Future Expansion

- GitHub/GitLab browser extension
- terminal/git config export
- JetBrains plugin
- Neovim theme export
- team accessibility report
- shared preset marketplace
- design system integration

---

# 14. 데이터 모델 개념

## 14.1 User

사용자의 계정과 권한 정보를 저장한다.

주요 필드:

- user id
- auth provider id
- email
- created date
- entitlement status
- privacy consent status

## 14.2 Theme Snapshot

특정 시점의 사용 테마 분석 정보를 저장한다.

주요 필드:

- snapshot id
- user id
- theme name
- theme id
- editor background
- editor foreground
- extracted colors
- token colors summary
- semantic token colors summary
- source environment
- created date

## 14.3 Visibility Profile

사용자의 눈, 환경, 선호에 따른 가시성 기준을 저장한다.

주요 필드:

- profile id
- user id
- profile name
- self-reported visibility type
- CVD simulation preference
- contrast preference
- saturation preference
- fatigue preference
- preferred signal families
- avoided color families
- environment metadata

## 14.4 Calibration Session

웹 캘리브레이션 한 회차의 테스트 결과를 저장한다.

주요 필드:

- session id
- user id
- profile id
- theme snapshot id
- environment info
- A/B choices
- recognition results
- preference results
- generated profile changes
- completed date

## 14.5 Patch Recipe

특정 테마와 profile에 대해 생성된 patch를 저장한다.

주요 필드:

- patch id
- theme snapshot id
- profile id
- patch mode
- changed signals
- previous values
- new values
- reasons
- risk score before
- risk score after
- theme preservation score
- confidence score

## 14.6 Patch History

사용자가 적용한 patch와 rollback 기록을 저장한다.

주요 필드:

- history id
- patch id
- applied scope
- applied date
- rollback status
- rollback date
- user feedback

---

# 15. 기술 아키텍처

## 15.1 Extension Layer

역할:

- VS Code API 연동
- active theme detection
- settings overlay read/write
- preview webview
- local patch history
- rollback
- extension-web import/export

## 15.2 Core Engine Package

역할:

- color parsing
- color space conversion
- contrast calculation
- CVD simulation
- signal mapping
- collision detection
- patch candidate generation
- validation
- explanation data generation

## 15.3 Web App

역할:

- calibration UI
- A/B preview
- profile dashboard
- payment
- account management
- profile export/import

## 15.4 Backend

역할:

- user account
- profile storage
- calibration session storage
- entitlement management
- analytics events
- AI agent API gateway, 향후

## 15.5 AI Layer

역할:

- natural language interpretation
- intent extraction
- explanation generation
- rule engine action orchestration

제약:

- 최종 색상 결정 금지
- validation 우회 금지
- 사용자 확인 없는 적용 금지

---

# 16. 단계별 로드맵

## Phase 0. Research, Theme Resolution PoC, Engine R&D

기간 목표:

- 1~2주

목표:

- VS Code 테마 구조와 patch 적용 가능성 검증
- 초기 엔진 기준 결정
- 실제 사용자 문제 검증

작업:

- VS Code settings overlay PoC
- active theme extraction PoC
- TextMate/semantic token fallback 조사
- Git diff/diagnostics 색상 override 검증
- 인기 테마 3~5개 수동 테스트
- CVD simulation 모델 후보 비교
- contrast 기준 결정
- theme preservation score 초안 정의
- 색각이상 또는 색 구분 불편 개발자 5명 인터뷰

산출물:

- technical feasibility note
- sample visibility report
- sample conservative patch
- interview insight summary
- MVP scope confirmation

## Phase 1. Extension MVP Alpha

기간 목표:

- 3~6주

작업:

- onboarding
- quick profile
- theme scan
- visibility report
- patch generator
- before/after preview
- settings overlay apply
- rollback
- local feedback

산출물:

- VS Code extension alpha
- 3~5개 테마 검증 결과
- user test report

## Phase 2. Web Calibration Beta

기간 목표:

- 4~8주

작업:

- web calibration UI
- A/B preview
- profile creation
- account login
- profile export/import
- simple payment

산출물:

- web beta
- paid calibration validation
- profile retention metrics

## Phase 3. AI Agent

기간 목표:

- 3~6주

작업:

- chat UI
- natural language to patch intent
- diagnosis explanation
- rule engine action call
- preview/apply flow

산출물:

- AI-assisted adjustment beta
- user feedback loop

## Phase 4. Platform Expansion

후보:

- GitHub PR diff patcher
- GitLab diff patcher
- terminal/git config export
- JetBrains support
- team preset
- accessibility reporting

---

# 17. 리스크와 대응 전략

## 17.1 시장 과소/과대평가 리스크

### 리스크

커뮤니티에서 관찰되는 painpoint가 실제 지불 의향으로 이어지지 않을 수 있다.

### 대응

- MVP는 결제 전환보다 사용 유지와 patch 만족도를 먼저 검증한다.
- 색각이상 개발자만이 아니라 low fatigue, theme tweak, monitor profile 사용자까지 관찰한다.
- 유료 기능은 “정밀도”만이 아니라 profile 관리와 반복 사용 가치로 설계한다.

## 17.2 너무 niche해지는 리스크

### 리스크

Git diff/diagnostics만 강조하면 제품이 작은 유틸리티로 인식될 수 있다.

### 대응

- 제품 카테고리는 theme calibration으로 유지한다.
- Git diff/diagnostics는 첫 번째 high-signal use case로만 사용한다.
- onboarding과 마케팅에서 “내 눈에 맞는 테마 조정”을 중심에 둔다.

## 17.3 기술 복잡성 리스크

### 리스크

VS Code token hierarchy, semantic token, TextMate scope, theme fallback이 복잡해 분석/patch가 예상보다 어렵다.

### 대응

- MVP는 settings overlay 중심으로 제한한다.
- full token coverage를 약속하지 않는다.
- Git diff/diagnostics처럼 override 가능성이 높은 영역부터 시작한다.
- 인기 테마 3~5개에서 수동 검증한다.

## 17.4 접근성 품질 리스크

### 리스크

patch가 일부 사용자에게는 오히려 더 나쁠 수 있다.

### 대응

- before/after preview 필수
- 사용자 선택 기반
- conservative default
- rollback 필수
- feedback loop 수집
- confidence score 표시

## 17.5 AI 신뢰성 리스크

### 리스크

AI가 부정확한 색상 또는 위험한 변경을 제안할 수 있다.

### 대응

- AI는 intent까지만 담당
- final patch는 rule engine validation 필수
- 사용자 확인 없는 적용 금지
- AI 응답에 색상 직접 추천 제한

## 17.6 개인정보 리스크

### 리스크

색각 특성, 작업 환경, 테마 데이터가 민감하게 느껴질 수 있다.

### 대응

- 코드 내용 수집 금지
- 색상/테마 데이터 수집 동의 명확화
- profile 데이터 export/delete 지원
- 의료 정보가 아니라 visibility preference로 표현

---

# 18. 검증 계획

## 18.1 인터뷰 대상

초기 인터뷰는 다음 그룹을 포함한다.

- 적녹색약 또는 색각이상 개발자
- 색각이상은 없지만 테마 색상에 민감한 개발자
- 장시간 다크테마 사용자
- VS Code heavy user
- Git diff/code review 빈도가 높은 개발자
- 프론트엔드/백엔드/DevOps 혼합

## 18.2 인터뷰 질문

- 현재 어떤 에디터와 테마를 쓰는가?
- 테마를 바꾸기 어려운 이유는 무엇인가?
- 색 때문에 실제로 개발 중 실수하거나 늦게 알아차린 적이 있는가?
- Git diff, diagnostics, comment, string, search, selection 중 무엇이 가장 불편한가?
- 색약 친화 테마를 써본 적이 있는가?
- 기존 테마를 유지하면서 일부만 조정할 수 있다면 써볼 의향이 있는가?
- 자동 patch를 신뢰하려면 무엇이 필요하다고 느끼는가?
- rollback이 있다면 patch 적용 부담이 줄어드는가?
- 웹에서 A/B preview로 직접 고르는 과정에 시간을 쓸 의향이 있는가?
- 유료라면 어떤 기능에 돈을 낼 수 있는가?

## 18.3 검증 가설

### Hypothesis 1

사용자는 새 테마로 갈아타기보다 기존 테마를 유지한 채 일부 신호만 조정하길 원한다.

### Hypothesis 2

Git diff와 diagnostics는 첫 번째 가치 체감 지점으로 충분히 강하다.

### Hypothesis 3

사용자는 리포트와 preview를 통해 자신의 불편함이 설명될 때 제품을 더 신뢰한다.

### Hypothesis 4

Rollback이 있으면 patch 적용 의향이 높아진다.

### Hypothesis 5

정밀 web calibration의 유료 가치는 단발성 정확도보다 환경별 profile 관리에서 더 강하게 발생한다.

### Hypothesis 6

AI agent는 색상 추천자보다 설정 탐색, 설명, 재조정 인터페이스로 더 가치 있다.

---

# 19. 팀별 역할과 협업 기준

## 19.1 PM/Product

책임:

- 제품 목표와 scope 관리
- 무료/유료 가치 경계 정의
- 사용자 인터뷰 설계
- 성공 지표 관리
- roadmap 우선순위 결정

핵심 질문:

- 사용자가 실제로 어떤 순간에 가치를 느끼는가?
- 제품이 너무 niche해지고 있지는 않은가?
- 유료 기능이 사용자에게 명확한가?

## 19.2 UX/UI Design

책임:

- onboarding 설계
- report UX
- preview 비교 UX
- patch diff UX
- rollback UX
- calibration test UX

핵심 질문:

- 사용자가 불안하지 않게 patch를 시도할 수 있는가?
- 접근성 개선이 사용자의 취향을 침범하지 않는가?
- 설명이 사용자를 환자로 만들지 않는가?

## 19.3 Extension Engineering

책임:

- VS Code API 연동
- theme scan
- settings overlay
- preview webview
- apply/rollback
- local storage

핵심 질문:

- 실제 VS Code에서 patch가 안정적으로 적용되는가?
- 사용자 설정을 손상하지 않는가?
- rollback이 항상 가능한가?

## 19.4 Core Engine Engineering

책임:

- color parsing
- contrast/scoring
- CVD simulation
- collision detection
- candidate generation
- validation

핵심 질문:

- patch가 수학적으로 안전한가?
- theme preservation이 충분한가?
- 사용자의 실제 피드백을 반영할 수 있는가?

## 19.5 AI Engineering

책임:

- natural language intent parsing
- explanation generation
- rule engine orchestration
- guardrail 설계

핵심 질문:

- AI가 색상 결정자가 되지 않도록 통제되는가?
- 사용자의 표현을 정확한 patch intent로 바꾸는가?
- 설명이 과장되거나 단정적이지 않은가?

## 19.6 Research/Accessibility

책임:

- 사용자 인터뷰
- 테스트 설계
- accessibility terminology 검토
- CVD model 검토
- 실제 사용자 피드백 분석

핵심 질문:

- 이 테스트가 의료적 진단처럼 보이지 않는가?
- 사용자 다양성을 충분히 반영하는가?
- 색 이외 신호도 충분히 고려하는가?

---

# 20. Definition of Done

## 20.1 기능 단위 Done

기능은 다음 조건을 만족해야 완료로 본다.

- 사용자 시나리오가 정의되어 있다.
- 실패 상태와 복구 UX가 있다.
- 접근성 문구 검토가 완료되었다.
- patch 관련 기능은 rollback이 가능하다.
- analytics event가 정의되었다.
- 사용자에게 변경 이유를 설명할 수 있다.

## 20.2 MVP Done

MVP v0는 다음 조건을 만족해야 완료로 본다.

- 사용자가 현재 테마를 scan할 수 있다.
- Git diff와 diagnostics issue가 report에 표시된다.
- 최소 3개 이상의 인기 dark theme에서 동작한다.
- conservative patch를 생성할 수 있다.
- before/after preview가 제공된다.
- settings overlay로 적용할 수 있다.
- one-click rollback이 동작한다.
- 최소 5명의 실제 대상 사용자에게 테스트를 완료한다.
- 사용자 중 일부가 patch 적용 후 유지 의향을 보인다.

## 20.3 Product-Market Learning Done

초기 검증은 다음 질문에 답할 수 있어야 한다.

- 사용자는 이 문제를 실제로 자신의 문제라고 느끼는가?
- scan report만으로도 제품 가치를 이해하는가?
- patch 적용에 대한 불안은 무엇인가?
- rollback이 불안을 줄이는가?
- 사용자는 어떤 항목에 가장 먼저 가치를 느끼는가?
- web calibration에 시간을 쓰고 돈을 낼 이유가 있는가?
- 제품을 colorblind tool로 볼 때와 theme calibration tool로 볼 때 반응이 어떻게 다른가?

---

# 21. 최종 제품 문장

본 서비스는 색각이상 개발자만을 위한 특수 테마가 아니다.

본 서비스는 개발자가 이미 사용 중인 코드 에디터 테마를 자신의 눈, 모니터, 조명, 작업 방식에 맞게 안전하게 조정하는 personal theme calibration layer다.

초기에는 VS Code에서 Git diff, diagnostics, 주요 syntax token의 색상 신호를 진단하고 보수적으로 patch하는 것부터 시작한다. 그러나 장기적으로는 사용자의 visibility profile을 기반으로 여러 개발 환경의 색상 신호를 관리하는 서비스로 확장한다.

최종적으로 지향하는 제품 문장은 다음과 같다.

좋아하는 테마는 그대로, 내 눈에 헷갈리는 색상 신호만 안전하게 조정합니다.

