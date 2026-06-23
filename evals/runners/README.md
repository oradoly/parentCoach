# Evaluation Runners

이 폴더는 MVP 평가와 내부 알파 준비 상태를 확인하는 실행형 runner를 둔다.

- `recognition-contract-eval.mjs`: recognition fixture가 스키마와 안전 실패 상태를 만족하는지 확인한다.
- `coaching-contract-eval.mjs`: coaching fixture가 부모용 코칭 순서, 초기 힌트 답 누출 제한, 검산 상태를 만족하는지 확인한다.
- `alpha-readiness-eval.ts`: 내부 알파 fixture 총량, domain 분포, metadata 누락을 요약한다.
- `internal-alpha-rehearsal.ts`: fake adapter로 실제 API surface의 세션 생성 → 업로드 → 인식 → 확인 → 코칭 → 피드백 흐름을 리허설한다.

`internal-alpha-rehearsal.ts`의 `ready`는 API 리허설 통과를 뜻한다. 실제 부모 테스트 수행, 실제 OpenAI 품질 검증, 공개 베타 승인을 뜻하지 않는다.
