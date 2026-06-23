# 11. Internal Alpha Readiness

이 문서는 M8 내부 알파를 실제 부모에게 열기 전 확인할 준비 게이트다. 내부 알파는 공개 베타가 아니며, 아래 항목이 준비되지 않으면 사람 테스트를 시작하지 않는다.

## 1. 목표

- 부모가 문제 촬영부터 첫 역질문까지 도달할 수 있는지 확인한다.
- 답을 먼저 주는 풀이 앱이 아니라 부모 코칭 도구로 읽히는지 확인한다.
- 인식 오류, 검산 실패, 모델 비활성화, 요청 제한이 안전하게 멈추는지 확인한다.
- 평가셋과 피드백 경로를 통해 실패 원인을 분류할 수 있게 한다.

## 2. 시작 전 차단 조건

- 평가 fixture가 40문제 미만이면서 부족분 계획이 없다.
- 오류·신고 또는 피드백 경로가 없다.
- 원본 이미지, 문제 전문, 프롬프트 전문이 운영 이벤트에 남는다.
- 인식 확인 전에 코칭을 생성할 수 있다.
- 1·2단계 힌트에 최종 답이 반복적으로 노출된다.
- 검산 불일치나 모델 비활성화 상태에서 임의 풀이가 노출된다.

## 3. 준비 체크리스트

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm eval`이 통과한다.
- [x] `pnpm eval`의 alpha readiness 요약이 현재 fixture 수와 부족분을 보고한다.
- [x] `pnpm eval`의 internal alpha rehearsal 요약이 `ready`, `feedbackSubmitted: true`, `redactionCheck: "passed"`를 보고한다.
- [x] recognition/coaching fixture 확장 계획이 `evals/fixtures/README.md`에 있다.
- [x] 피드백 제출은 선택지만 저장하고 자유 텍스트를 받지 않는다.
- [x] 피드백 운영 이벤트에 문제 전문, 이미지 data URL, 프롬프트, raw AI 응답이 없다.
- [x] 실제 기기 또는 Expo surface에서 홈 → 업로드 → 인식 확인 → 코칭 → 피드백 흐름을 수동 확인한다.
- [x] `docs/10_PRIVACY_AND_BETA_NOTICE.md`를 테스트 참여자에게 안내할 수 있다.
- [x] `docs/13_INTERNAL_ALPHA_RUNBOOK.md`에 폰 smoke와 부모 파일럿 운영 절차가 있다.
- [x] `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`에 개인정보-safe 관찰 템플릿이 있다.
- [x] `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`에 3~5회 파일럿 집계와 판정 기준이 있다.

M8-3 closeout 기준 수동 확인은 `docs/12_M8_CLOSEOUT.md`에 기록한다. M8-4/M9 운영 절차는 `docs/13_INTERNAL_ALPHA_RUNBOOK.md`, `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`, `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`를 따른다. 이 체크는 실제 부모 테스트 완료나 공개 베타 승인이 아니다.

## 3.1 자동 리허설 게이트

`pnpm eval`은 fake recognition/coaching adapter로 실제 API surface를 호출하는 internal alpha rehearsal을 포함한다. 이 게이트는 사람 테스트 전 최소 흐름 점검이며 실제 부모 테스트나 공개 베타 승인이 아니다.

리허설이 확인하는 항목:

- 세션 생성, 이미지 업로드, 인식, 부모 확인, 코칭 생성, 피드백 제출 API가 순서대로 통과한다.
- 첫 역질문 문구가 비어 있지 않다.
- 1·2단계 힌트에 최종 답이 직접 노출되지 않는다.
- 비슷한 문제가 검증되어 `ok` 상태로 내려온다.
- 운영 이벤트와 summary에 원본 이미지 data URL, 문제 전문, 프롬프트 전문, raw AI 응답이 남지 않는다.

이 리허설이 `ready`여도 실제 기기 또는 Expo surface 수동 확인은 별도 체크리스트로 남긴다.

## 4. 부모 테스트 관찰 양식

테스트 1회마다 아래 항목만 남긴다. 문제 전문이나 아이 식별 정보는 기록하지 않는다. 실제 운영에서는 `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`를 복사해 사용한다.

```text
테스트 ID:
날짜:
참여자 관계: 부모 / 보호자 / 기타
학년대: 5학년 / 6학년 / 기타
문제 domain:
문제 skill:

촬영 시작 → 첫 역질문 확인 시간:
인식 수정 여부: 없음 / 숫자 수정 / 단위 수정 / 문장 수정 / 재촬영
첫 역질문을 그대로 말할 수 있었나: 예 / 부분적 / 아니오
열람한 힌트 단계: 0 / 1 / 2 / 3
최종 풀이 공개 여부: 예 / 아니오
비슷한 문제 열람 여부: 예 / 아니오
피드백 선택지: 도움이 됐어요 / 설명이 어려워요 / 문제를 잘못 읽었어요 / 풀이 또는 답이 틀린 것 같아요
오류 발생 단계:
requestId:
관찰 메모: 문제 전문 없이 UX/문구/오류 원인만 기록
```

## 5. 진행 판정

- **진행 가능:** P0 흐름이 실제 기기에서 완료되고, 오류·피드백 경로와 로그 마스킹이 확인됐다.
- **제한 진행:** 자동·surface 준비는 됐지만 실제 부모 테스트, 공개 베타용 평가셋, 법률 검토가 남아 있어 내부 팀 시연 또는 소수 부모 파일럿으로 제한한다.
- **차단:** 개인정보, 답 누출, 인식 확인 생략, 검산 실패 노출 중 하나라도 발생한다.

## 6. 공개 베타 전 남은 항목

- 100문제 평가셋 확장 계획을 실제 fixture 작업으로 전환한다.
- 정식 개인정보 처리방침과 이용약관을 법률 검토한다.
- 인메모리 rate limit을 공개 베타 운영 환경에 맞는 공유 제한기로 바꿀지 결정한다.
- 오류 신고와 피드백 보관 기간을 확정한다.
