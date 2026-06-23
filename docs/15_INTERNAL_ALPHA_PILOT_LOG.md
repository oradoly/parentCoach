# 15. Internal Alpha Pilot Log

이 문서는 M9-2 부모 파일럿 3~5회 결과를 모아 판정하는 집계 문서다. 실제 테스트 1회 기록은 `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`를 복사해 작성하고, 이 문서에는 문제 전문이나 참여자 식별 정보 없이 요약만 남긴다.

## 1. 운영 상태

- 현재 상태: **파일럿 준비**
- 대상: 내부 알파 부모 파일럿 3~5회
- 목적: 부모가 실제 상황에서 첫 역질문까지 도달하고, 앱 문구를 참고해 아이에게 말할 수 있는지 확인한다.
- 공개 베타 여부: **아님**

## 2. 파일럿 전 체크

아래 항목을 모두 만족하지 않으면 부모 파일럿을 시작하지 않는다.

- [ ] `pnpm phone:smoke` 또는 `pnpm phone:smoke -- --skip-export`가 통과했다.
- [ ] 진행자 핸드폰에서 홈 → 업로드 → 인식 확인 → 코칭 → 새 문제 시작 흐름을 확인했다.
- [ ] 참여자에게 `docs/10_PRIVACY_AND_BETA_NOTICE.md`의 핵심 안내를 설명할 수 있다.
- [ ] 문제 사진에 이름, 학교, 얼굴, 연락처가 들어가지 않도록 안내했다.
- [ ] 기록자는 `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`의 기록 금지 항목을 이해했다.
- [ ] 문제가 생기면 requestId와 오류 단계만 남기고 문제 전문은 남기지 않는다.

## 3. 회차별 요약 표

아래 표는 3~5회 파일럿이 끝날 때까지 채운다. 문제 전문, 이미지 링크, 참여자 실명, 아이 이름, 학교명은 쓰지 않는다.

| Test ID  | Date | Grade Band | Domain | Skill | Entry Path       | Time to Opening Question | Recognition Edit                         | Opening Question Sayable | Hints Opened  | Final Opened | Similar Opened | Feedback                                                            | P0 Stop  | P0 Reason | P1 Candidate | Next Action |
| -------- | ---- | ---------- | ------ | ----- | ---------------- | ------------------------ | ---------------------------------------- | ------------------------ | ------------- | ------------ | -------------- | ------------------------------------------------------------------- | -------- | --------- | ------------ | ----------- |
| pilot-01 |      |            |        |       | camera / library |                          | none / number / unit / sentence / retake | yes / partial / no       | 0 / 1 / 2 / 3 | yes / no     | yes / no       | helpful / hard_to_explain / misread_problem / wrong_solution / none | yes / no |           |              |             |
| pilot-02 |      |            |        |       | camera / library |                          | none / number / unit / sentence / retake | yes / partial / no       | 0 / 1 / 2 / 3 | yes / no     | yes / no       | helpful / hard_to_explain / misread_problem / wrong_solution / none | yes / no |           |              |             |
| pilot-03 |      |            |        |       | camera / library |                          | none / number / unit / sentence / retake | yes / partial / no       | 0 / 1 / 2 / 3 | yes / no     | yes / no       | helpful / hard_to_explain / misread_problem / wrong_solution / none | yes / no |           |              |             |
| pilot-04 |      |            |        |       | camera / library |                          | none / number / unit / sentence / retake | yes / partial / no       | 0 / 1 / 2 / 3 | yes / no     | yes / no       | helpful / hard_to_explain / misread_problem / wrong_solution / none | yes / no |           |              |             |
| pilot-05 |      |            |        |       | camera / library |                          | none / number / unit / sentence / retake | yes / partial / no       | 0 / 1 / 2 / 3 | yes / no     | yes / no       | helpful / hard_to_explain / misread_problem / wrong_solution / none | yes / no |           |              |             |

## 4. P0 중단 조건

하나라도 발생하면 파일럿을 멈추고 앱 또는 운영 절차를 수정한다.

- 인식 확인 전에 코칭이 보인다.
- 첫 코칭 화면 또는 힌트 1·2에 최종 답이 보인다.
- 검산 실패, 모델 비활성화, 지원 불가 상태에서 임의 풀이가 보인다.
- 문제 이미지, 문제 전문, 아이 식별 정보가 기록 또는 로그에 남는다.
- 부모가 앱을 아이에게 직접 답 확인 도구로 넘겨 사용한다.
- 참여자가 불편함을 표현하거나 중단을 요청한다.
- 업로드 이후 진행이 반복적으로 막혀 첫 역질문까지 도달하지 못한다.

## 5. P1 개선 후보 분류

P0는 아니지만 2회 이상 반복되면 M9-3 수정 대상으로 올린다.

- 촬영 안내가 부족해 재촬영이 반복된다.
- 인식 수정 화면에서 무엇을 고쳐야 할지 헷갈린다.
- 첫 역질문이 부모 입에 자연스럽게 붙지 않는다.
- 힌트 1과 힌트 2의 차이가 작거나, 힌트 3이 너무 갑자기 답에 가까워진다.
- 최종 풀이가 길거나 부모가 아이에게 말하기 어렵다.
- 비슷한 문제가 원문과 너무 비슷하거나 난이도가 어긋난다.
- 피드백 선택지가 실제 느낌과 맞지 않는다.
- `새 문제 시작` 또는 세션 종료 위치를 찾기 어렵다.

## 6. 3~5회 후 판정

### 계속 진행

아래를 모두 만족하면 다음 3~5회 파일럿을 이어갈 수 있다.

- P0 중단 조건 0건
- 첫 역질문을 `yes` 또는 `partial`로 말할 수 있었던 회차가 대부분
- 첫 역질문까지 도달하지 못한 회차가 없음
- 개인정보 기록 금지 위반 없음

### 수정 후 진행

아래 중 하나라도 있으면 M9-3에서 수정하고 다시 3~5회 파일럿을 진행한다.

- P0는 없지만 같은 P1 후보가 2회 이상 반복됨
- 첫 역질문을 `no`로 기록한 회차가 2회 이상
- 인식 수정 또는 촬영 단계에서 같은 혼란이 반복됨
- 피드백이 `설명이 어려워요` 또는 `문제를 잘못 읽었어요`로 반복됨

### 중단

아래 중 하나라도 있으면 다음 파일럿으로 넘어가지 않는다.

- P0 중단 조건 발생
- 문제 전문, 이미지, 아이 식별 정보가 기록됨
- 검증 실패나 모델 비활성화 상태에서 풀이가 노출됨
- 참여자가 중단을 요청함

## 7. M9-3 후보 백로그

파일럿 중 발견한 개선 후보를 문제 전문 없이 적는다.

| Priority | Area | Evidence | Proposed Change | Owner | Status |
| -------- | ---- | -------- | --------------- | ----- | ------ |
| P0 / P1  |      |          |                 |       | open   |
| P0 / P1  |      |          |                 |       | open   |
| P0 / P1  |      |          |                 |       | open   |

## 8. 금지 기록 재확인

이 문서와 회차별 기록에는 아래 항목을 남기지 않는다.

- 문제 사진 또는 image data URL
- 문제 전문
- 참여자 실명, 아이 이름, 학교, 연락처
- 참여자의 자유 발화 전문
- 프롬프트 전문
- 원본 AI 응답 전문
