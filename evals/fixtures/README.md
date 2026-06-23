# Evaluation Fixtures

Fixture는 부모코치가 “화면이 동작한다”를 넘어 부모 코칭 제품으로 올바르게 동작하는지 확인하기 위한 평가 데이터다.

## 작성 원칙

- 자체 작성 또는 사용 허가된 문제만 사용한다.
- 실제 출판 교재 문장을 대량 복제하지 않는다.
- 대한민국 초등학교 5~6학년 수학, 한국어, 한 번에 한 문제 범위를 지킨다.
- 문제 전문은 평가 fixture 안에만 두고 운영 로그나 피드백 이벤트로 복사하지 않는다.
- 이미지 인식 변형은 텍스트-only coaching fixture와 분리한다.

## 내부 알파 40문제 분포

`docs/05_ACCEPTANCE_AND_EVALS.md`의 내부 알파 최소 기준은 40문제다.

| Domain                               | 목표 |
| ------------------------------------ | ---: |
| `number_and_operations`              |   12 |
| `change_and_relationships`           |    8 |
| `geometry_and_measurement`           |   10 |
| `data_and_possibility`               |    6 |
| `intentional_failure_or_unsupported` |    4 |

M8-1 기준으로 현재 fixture는 40문제 분포를 채웠다.

| Domain                               | 현재 |
| ------------------------------------ | ---: |
| `number_and_operations`              |   12 |
| `change_and_relationships`           |    8 |
| `geometry_and_measurement`           |   10 |
| `data_and_possibility`               |    6 |
| `intentional_failure_or_unsupported` |    4 |

`pnpm eval`은 `alpha-readiness-eval`에서 fixture 수, domain 부족분, metadata 누락을 요약한다. `ready`는 내부 알파 평가셋 분포가 준비되었다는 뜻이며, 공개 베타 승인 신호가 아니다.

## 필수 메타데이터

새 fixture는 아래 필드를 포함한다.

- `id` 또는 `name`
- `domain`
- `skill`
- `source`: `self_authored` 또는 사용 허가 출처 메모
- `expectedAnswer`
- `expectedVerification`
- `forbiddenEarlyHintLeaks`
- `similarProblemConstraints`

Recognition fixture는 `expectedStatus`와 인식 응답 schema를 포함한다. Coaching fixture는 `sourceProblemText`, `response`, 답 누출 금지어, 비슷한 문제 제약을 포함한다.
