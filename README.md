# 부모 코칭 앱 — Codex 개발 문서 패키지

이 저장소 문서들은 **초등학교 5~6학년 자녀의 수학 질문을 부모가 잘 코칭하도록 돕는 앱**의 MVP를 만들기 위한 기준입니다.

## 문서의 역할

- `AGENTS.md`: Codex가 매 작업 전에 따라야 하는 짧고 강한 규칙입니다.
- `docs/00_PRODUCT_CHARTER.md`: 제품의 목적, 사용자, 핵심 가치, 절대 바꾸지 않을 방향입니다. 흔히 말하는 `goal` 문서에 해당합니다.
- `docs/01_MVP_PRD.md`: MVP 기능 요구사항과 범위입니다.
- `docs/02_UX_AND_CONTENT.md`: 화면 흐름, 힌트 단계, 부모용 문구 원칙입니다.
- `docs/03_AI_BEHAVIOR_SPEC.md`: 이미지 인식과 코칭 결과의 AI 계약, JSON 구조, 교육 원칙입니다.
- `docs/04_TECHNICAL_DIRECTION.md`: 권장 기술 구조와 보안·검증 원칙입니다.
- `docs/05_ACCEPTANCE_AND_EVALS.md`: 출시 전에 통과해야 할 수용 기준과 평가 방식입니다.
- `docs/06_MVP_BACKLOG.md`: Codex가 순서대로 구현할 작업 목록입니다.
- `docs/07_DECISIONS.md`: 제품과 기술의 확정 결정을 기록합니다.
- `docs/08_CODEX_START_PROMPTS.md`: Codex에 바로 붙여 넣을 수 있는 시작 프롬프트입니다.
- `docs/09_REFERENCES.md`: 문서 작성의 기준이 된 공식 자료입니다.
- `PLANS.md`: 복잡한 작업을 시작하기 전에 Codex가 작성·갱신할 실행 계획 양식입니다.

## 가장 먼저 할 일

1. 이 폴더 전체를 새 Git 저장소의 루트에 복사합니다.
2. Codex를 저장소 루트에서 시작합니다.
3. 아래 프롬프트로 첫 작업을 요청합니다.

```text
AGENTS.md와 docs/ 문서를 먼저 읽고, 제품 방향을 요약해 주세요.
아직 기능 코드를 작성하지 말고 docs/06_MVP_BACKLOG.md의 M0 저장소 스캐폴딩에 대한 실행 계획을 PLANS.md에 작성해 주세요.
계획에는 기술 선택, 폴더 구조, 실행 명령, 테스트 전략, 위험 요소, 완료 조건을 포함해 주세요.
제품 불변조건과 충돌하는 제안은 제외해 주세요.
```

계획을 검토한 뒤에는 `docs/08_CODEX_START_PROMPTS.md`의 순서로 진행합니다.

## 문서 우선순위

문서가 충돌하면 다음 순서를 따릅니다.

1. `AGENTS.md`의 제품 불변조건과 금지사항
2. `docs/07_DECISIONS.md`의 승인된 결정
3. `docs/00_PRODUCT_CHARTER.md`
4. `docs/01_MVP_PRD.md`
5. `docs/03_AI_BEHAVIOR_SPEC.md`
6. `docs/02_UX_AND_CONTENT.md`
7. `docs/04_TECHNICAL_DIRECTION.md`
8. 현재 작업의 `PLANS.md`

단, 사용자가 명시적으로 방향 변경을 승인하면 관련 문서를 먼저 수정하고 코드에 반영합니다.

## MVP 한 문장

> 아이가 초등학교 5~6학년 수학 문제에 도움을 청했을 때, 부모가 문제를 촬영하여 빠르게 이해하고, 역질문과 단계별 힌트로 아이가 스스로 풀도록 돕는 부모 전용 AI 코칭 앱.
