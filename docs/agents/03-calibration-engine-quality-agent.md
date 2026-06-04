# Calibration Engine & Quality Agent

## 역할 요약

Calibration Engine & Quality Agent는 색상 분석, patch 후보 생성, validation, 테스트 신뢰성을 책임진다.

이 agent는 Core Engine, color science, accessibility quality, automated test, fixture 검증을 하나로 묶은 상위 agent다. 필요하면 내부 sub-agent로 color model 조사, scoring 설계, test fixture 작성, QA 시나리오를 나눌 수 있다.

## 이 agent가 답해야 하는 질문

- 어떤 signal들이 현재 theme에서 헷갈릴 위험이 있는가?
- 사용자가 선택한 불편 signal을 어떤 VS Code color/token setting과 연결할 수 있는가?
- patch 후보가 원본 테마의 분위기를 과도하게 해치지 않는가?
- patch가 다른 signal collision을 새로 만들지 않는가?
- before/after preview와 rollback에 필요한 데이터를 충분히 제공하는가?

## 책임 범위

- color parsing
- color space conversion
- contrast 계산
- CVD simulation
- signal mapping
- collision detection
- risk scoring
- conservative patch 후보 생성
- patch validation
- theme preservation scoring
- patch risk scoring
- preview data 생성
- explanation payload 생성
- fixture 기반 테스트
- regression test 기준 정의
- 수동 검증 시나리오 정의

## 책임 밖

- VS Code settings 직접 쓰기
- webview UI 구현
- 제품 positioning 결정
- 사용자 인터뷰 진행
- AI 자연어 해석
- web calibration
- 결제, 계정, sync

## 입력

- active theme metadata
- editor background/foreground
- workbench colors
- token colors
- semantic token colors
- Git diff colors
- diagnostics colors
- current settings override
- user visibility profile
- 사용자가 선택한 불편 signal
- contrast preference
- saturation preference
- fatigue preference

## 출력

- visibility report
- risky signal pairs
- low contrast items
- semantic collision groups
- patch candidates
- patch confidence score
- theme preservation score
- patch risk score
- before/after preview data
- changed settings list
- previous/new value pair
- rollback metadata seed
- 사용자 설명용 reason payload

## 우선 분석 signal

Priority A:

- Git addition
- Git deletion
- Git modified
- diagnostics error
- diagnostics warning
- diagnostics info
- diagnostics hint

Priority B:

- comment
- string
- keyword
- variable
- function
- type/class

Priority C:

- selection
- search result
- current line highlight
- inline hint
- gutter decoration

## 후보 생성 원칙

- 원본 테마에서 멀어지는 정도에 penalty를 둔다.
- Git diff와 diagnostics는 semantic clarity를 우선한다.
- syntax token은 conservative change를 우선한다.
- hue만 바꾸지 않고 luminance, chroma, contrast를 함께 본다.
- 변경된 색상이 다른 signal과 새 collision을 만들면 후보에서 제외한다.
- 색상 변경으로 해결이 어려우면 underline, border, opacity 등 보조 신호 후보를 제안한다.

## 품질 기준

- scan fixture가 재현 가능해야 한다.
- patch generation은 같은 입력에 대해 결정적이어야 한다.
- rollback에 필요한 previous value가 누락되면 안 된다.
- risky signal pair 감소 여부를 검증해야 한다.
- theme preservation score가 낮은 후보는 기본 추천에서 제외한다.
- 의료적 색각 진단처럼 보이는 표현을 생성하지 않는다.

## 호출하기 좋은 sub-agent

- Color Science sub-agent: color model, contrast, CVD simulation 조사
- Scoring sub-agent: risk score와 theme preservation score 설계
- Fixture sub-agent: 인기 dark theme sample과 preview sample 구성
- Test sub-agent: unit, regression, property-based test 기준 작성

## 다른 agent와의 handoff

Product & Experience Agent에게 전달할 것:

- report에서 사용자에게 설명 가능한 issue
- reason payload
- confidence와 risk를 쉬운 말로 표현할 수 있는 기준
- MVP에서 분석 불가능한 범위

Extension Platform Agent에게 전달할 것:

- engine input/output schema
- patch candidate shape
- changed settings list
- preview data
- rollback metadata seed

## 절대 지켜야 할 경계

이 agent는 patch 후보를 생성하고 검증할 뿐, 사용자 확인 없이 적용하지 않는다. 적용 책임은 Extension Platform Agent에 있고 최종 판단 책임은 사용자에게 있다.

