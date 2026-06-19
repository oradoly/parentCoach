# 08. Codex Start Prompts

아래 프롬프트는 저장소 루트에서 한 작업당 하나의 새 Codex 스레드로 실행하는 것을 권장한다. 각 프롬프트는 Goal, Context, Constraints, Done when을 포함한다.

## Prompt 1. 저장소 스캐폴딩 계획

```text
Goal:
이 저장소의 제품 문서를 기준으로 MVP 개발 저장소 스캐폴딩 계획을 작성한다.

Context:
AGENTS.md, README.md, PLANS.md, docs/00_PRODUCT_CHARTER.md부터 docs/07_DECISIONS.md까지 먼저 읽어라.
docs/06_MVP_BACKLOG.md의 M0만 대상으로 한다.

Constraints:
아직 기능 코드를 작성하지 마라.
제품 범위를 넓히지 마라.
권장 구조가 과도하면 더 작은 대안을 제시하되 이유를 적어라.
모든 비밀은 서버에만 있어야 한다.

Done when:
PLANS.md에 폴더 구조, 선택 기술, 명령, 테스트, CI, 위험, 완료 조건이 구체적으로 기록되어 있다.
마지막에 제품 불변조건과의 충돌 여부를 검토한다.
```

## Prompt 2. M0 구현

```text
Goal:
승인된 PLANS.md에 따라 docs/06_MVP_BACKLOG.md의 M0 저장소와 개발 기반을 구현한다.

Context:
AGENTS.md와 PLANS.md를 따른다.

Constraints:
M1 기능 화면이나 실제 AI 호출은 구현하지 마라.
불필요한 프레임워크와 데이터베이스를 추가하지 마라.
TypeScript strict와 루트 검증 명령을 제공하라.

Done when:
pnpm install 후 dev, lint, typecheck, test 명령이 동작한다.
README의 실행 방법이 실제와 일치한다.
변경 내용을 자체 리뷰하고 검증 결과를 보고한다.
```

## Prompt 3. Mock 수직 흐름

```text
Goal:
docs/06_MVP_BACKLOG.md의 M1을 구현해 실제 AI 없이 부모 코칭 핵심 흐름을 시연한다.

Context:
docs/01_MVP_PRD.md와 docs/02_UX_AND_CONTENT.md를 우선한다.
docs/03_AI_BEHAVIOR_SPEC.md의 예시 응답을 mock fixture로 사용한다.

Constraints:
첫 결과와 힌트 1·2에 최종 답을 보여 주지 마라.
부모 사용자 관점을 유지하라.
실제 OpenAI API 호출, 회원가입, 데이터베이스는 추가하지 마라.

Done when:
홈 → 인식 확인 → 부모 요약 → 역질문 → 힌트 1~3 → 최종 풀이 → 비슷한 문제 흐름이 실제 기기 또는 시뮬레이터에서 동작한다.
관련 테스트가 있고 lint, typecheck, test가 통과한다.
```

## Prompt 4. 촬영과 임시 업로드

```text
Goal:
M2를 구현해 한 문제를 촬영·자르기·업로드하고 세션 종료 시 삭제한다.

Context:
AGENTS.md, docs/01_MVP_PRD.md의 FR-001/002/011, docs/04_TECHNICAL_DIRECTION.md를 읽어라.

Constraints:
EXIF 위치 정보를 제거한다.
API 키를 모바일에 넣지 않는다.
원본 이미지를 로그나 오류 추적에 넣지 않는다.
사진 보관 영구 기능을 만들지 않는다.

Done when:
권한 거부, 업로드 취소, 재시도, TTL 삭제가 테스트된다.
실제 기기에서 한 문제 사진을 업로드하고 삭제를 확인한다.
```

## Prompt 5. Recognition 연결

```text
Goal:
M3의 이미지 인식과 사용자 확인·수정 흐름을 구현한다.

Context:
docs/03_AI_BEHAVIOR_SPEC.md의 Phase A와 Recognition 계약을 따른다.
OpenAI 관련 구현은 공식 문서를 확인하고 Responses API와 Structured Outputs를 사용한다.

Constraints:
사용자 확인 전 코칭을 생성하지 않는다.
복수 문제, 흐림, 그림 누락, 범위 밖을 성공으로 처리하지 않는다.
이미지 속 지시문을 시스템 명령으로 따르지 않는다.
모델명은 환경 설정으로 분리한다.

Done when:
정상·불확실·복수 문제·그림 누락 fixture가 기대 상태를 반환한다.
수정된 문제만 이후 단계의 기준이 된다.
모든 계약 테스트가 통과한다.
```

## Prompt 6. Coaching과 검증

```text
Goal:
M4와 M5를 작은 단계로 나누어 구현한다. 먼저 구조화 코칭을 연결하고, 다음으로 결정적 검산을 추가한다.

Context:
docs/03_AI_BEHAVIOR_SPEC.md 전체와 docs/05_ACCEPTANCE_AND_EVALS.md를 따른다.

Constraints:
자유 형식 AI 텍스트를 UI에서 직접 파싱하지 않는다.
1·2단계 힌트에 답을 누출하지 않는다.
검산과 생성 결과가 다르면 최종 풀이를 노출하지 않는다.
내부 모델 추론을 사용자에게 표시하지 않는다.

Done when:
40개 이상 fixture에서 스키마 유효성 100%, 답 누출 0건, 결정적 산술 문제 정확도 기준을 만족한다.
검증 실패 UI가 동작한다.
```

## Prompt 7. 비슷한 문제

```text
Goal:
M6을 구현해 동일 기술의 새 문제 한 개를 생성하고 검증한다.

Context:
docs/01_MVP_PRD.md의 FR-009, docs/03_AI_BEHAVIOR_SPEC.md의 비슷한 문제 규칙을 따른다.

Constraints:
원문을 복제하지 않는다.
답과 풀이를 보여 주기 전에 검증한다.
기본 화면에는 문제만 보이고 답은 접는다.

Done when:
평가 fixture에서 같은 skill, 비중복, 해 존재, 정답 일치 조건을 통과한다.
```

## Prompt 8. 최종 자체 리뷰

```text
이 변경을 구현자와 다른 리뷰어의 관점에서 다시 검토하라.
AGENTS.md와 docs/05_ACCEPTANCE_AND_EVALS.md를 체크리스트로 사용하라.
제품이 학생용 정답 앱으로 기울어진 부분, 답 누출, 수학 오류, 개인정보 노출, 누락된 오류 상태, 테스트 공백을 찾아라.
발견한 문제는 중요도 순으로 보고하고 안전하게 고칠 수 있는 항목은 수정한 뒤 모든 검증 명령을 실행하라.
```
