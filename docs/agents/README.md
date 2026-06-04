# Agent 문서 인덱스

이 디렉터리는 사용자가 직접 orchestration할 3개의 상위 agent가 참고할 역할 문서를 담는다.

원본 기획안은 [theme_calibration_service_prd_and_agile_spec.md](../../theme_calibration_service_prd_and_agile_spec.md)에 보존한다. 이 디렉터리의 문서는 원본을 대체하지 않고, MVP 실행을 위한 역할별 작업 경계를 정의한다.

## MVP 한 줄 정의

사용자가 좋아하는 현재 VS Code 테마는 유지하고, 잘 안 보이는 색상 신호만 로컬 엔진이 보수적으로 조정해 before/after preview와 rollback까지 제공하는 확장 프로그램.

## MVP 핵심 플로우

1. 현재 VS Code active theme을 스캔한다.
2. 사용자가 불편한 signal을 선택하거나 리포트에서 문제를 확인한다.
3. Core Calibration Engine이 conservative patch 후보를 생성한다.
4. 사용자가 before/after 슬라이더 preview로 변경 전후를 비교한다.
5. 사용자가 승인한 patch만 settings overlay 방식으로 적용한다.
6. 적용 기록을 저장하고 one-click rollback을 제공한다.

## 3개 상위 Agent

- [01-product-experience-agent.md](./01-product-experience-agent.md): 사용자가 원하는 제품인지, 어떤 경험이어야 하는지 책임진다.
- [02-extension-platform-agent.md](./02-extension-platform-agent.md): VS Code extension에서 스캔, preview, apply, rollback이 안정적으로 동작하게 한다.
- [03-calibration-engine-quality-agent.md](./03-calibration-engine-quality-agent.md): 색상 분석, patch 생성, validation, 테스트 신뢰성을 책임진다.

## 왜 이 3개인가?

- Product & Experience Agent는 "사용자가 이걸 왜 써야 하는가?"를 책임진다.
- Extension Platform Agent는 "이게 실제 VS Code에서 안전하게 돌아가는가?"를 책임진다.
- Calibration Engine & Quality Agent는 "색상 판단과 patch가 믿을 만한가?"를 책임진다.

각 agent는 필요할 때 자기 내부 sub-agent를 호출할 수 있다. 예를 들어 Product & Experience Agent는 UX copy sub-agent를, Extension Platform Agent는 VS Code API 조사 sub-agent를, Calibration Engine & Quality Agent는 color science 또는 test fixture sub-agent를 호출할 수 있다.

## 공통 원칙

- 현재 테마를 대체하지 않는다.
- 원본 theme file을 직접 수정하지 않는다.
- MVP에 AI chat, web calibration, 결제, 계정 기능을 넣지 않는다.
- 사용자가 승인하지 않은 변경을 적용하지 않는다.
- rollback 가능성을 기능의 중심 신뢰 장치로 본다.
- 색각이상 진단처럼 표현하지 않는다.
- 색상 변경만 고집하지 않고, VS Code가 허용하는 범위에서 보조 신호도 고려한다.
- 3개 agent 모두 MVP 밖 기능을 발견하면 구현하지 말고 Post-MVP 후보로만 기록한다.

## MVP 밖 기능

- AI chat
- LLM 기반 자연어 patch intent 추론
- web calibration
- 계정, 로그인, sync
- 결제, entitlement
- team preset
- GitHub/GitLab browser extension
- JetBrains, Neovim, terminal export
- 완전한 theme generator
- 의료적 색각 진단
