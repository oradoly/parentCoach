# 12. M8 Closeout

이 문서는 M8 내부 알파 준비 작업의 closeout 판정이다. M8의 산출물은 내부 팀이 실제 부모 테스트를 시작할 수 있는 최소 준비 상태를 확인하는 것이며, 공개 베타 승인이 아니다.

## 1. 판정

**제한 진행**

내부 팀 시연과 소수 부모 테스트 준비는 가능하다. 다만 실제 부모 5~10명 테스트 결과, 공개 베타용 100문제 평가셋, 정식 개인정보·이용약관 법률 검토가 없으므로 공개 베타는 아직 차단 상태로 둔다.

## 2. 완료된 산출물

- 내부 알파 40문제 평가 fixture 분포와 metadata readiness가 준비됐다.
- fake adapter 기반 API 리허설이 세션 생성, 업로드, 인식, 부모 확인, 코칭, 피드백 경로를 검증한다.
- Expo web surface에서 홈, 이미지 선택, 임시 업로드, 인식 확인, 코칭, 힌트, 최종 풀이, 비슷한 문제, 피드백 흐름을 수동 확인했다.
- Expo web 수동 QA 중 발견된 `expo-file-system` web 미지원 업로드 문제를 web 전용 multipart 경로로 해결했다.
- 정적 Expo web에서 API 호출이 가능하도록 explicit CORS allowlist를 추가했다.
- local fixture mode를 추가해 모델 키 없이도 내부 알파 surface QA를 반복할 수 있게 했다.

## 3. 수동 QA 결과

실행 조건:

- API: `ENABLE_LOCAL_AI_FIXTURES=true`, `NODE_ENV=development`, `PORT=3001`, `ALLOWED_WEB_ORIGINS=http://127.0.0.1:4173`
- Web: Expo web static export, `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001`
- Browser: Playwright, mobile width 390px 중심 확인, 768px·1280px overflow 확인

확인 결과:

- 홈에서 사진 가져오기 진입 가능
- 이미지 선택 후 미리보기와 업로드 전 안내 표시
- 임시 업로드 성공, 원본 bytes 영구 저장 안 함 안내 표시
- 인식 결과 확인 화면에서 부모 확인 전에는 코칭으로 이동하지 않음
- 부모 확인 후 첫 역질문과 부모용 핵심 설명 표시
- 1단계와 2단계 힌트 본문에 최종 답이 노출되지 않음
- 3단계 힌트 이후 최종 풀이 버튼 활성화
- 명시적 최종 풀이 클릭 뒤에만 최종 답과 검산 표시
- 비슷한 문제 답은 별도 풀이 보기 전까지 숨김
- 피드백 선택 후 개인정보-safe 저장 문구 표시
- 768px, 1280px에서 horizontal overflow 없음
- 지원하지 않는 이미지 형식 선택 시 업로드 전 오류 문구가 표시되고 풀이가 노출되지 않음
- recognition 모델 비활성화 상태에서 코칭/풀이로 넘어가지 않고 모델/API 사용 불가 문구가 표시됨

수동 QA 중 발견해 고친 문제:

- Expo web에서 `expo-file-system.getInfoAsync`가 미지원이라 이미지 준비 단계가 실패했다.
- Expo web에서 native 전용 `FileSystem.uploadAsync`를 사용할 수 없어 web multipart upload 분기를 추가했다.
- API가 cross-origin 정적 web surface에 CORS 헤더를 주지 않아 explicit allowlist middleware를 추가했다.
- 브라우저 번들에서 HTTP error class 경계가 흔들릴 수 있어 구조화 에러 response를 body 기준으로도 읽도록 보강했다.
- recognition/coaching fallback 문구가 단순 서버 연결 실패처럼 보이지 않도록 모델 또는 API 사용 불가 copy로 조정했다.

## 4. 자동 검증 근거

M8 closeout 전 확인한 명령:

- `pnpm format:check`: 통과
- `pnpm lint`: 통과
- `pnpm typecheck`: 통과
- `pnpm test`: 21 files, 92 tests 통과
- `pnpm eval`: 통과

`pnpm eval`은 sandbox에서 `tsx` IPC pipe 생성이 막혀 `EPERM`으로 실패한 뒤, 같은 명령을 외부 실행으로 재시도해 통과했다.

`pnpm eval` 결과 요약:

- Recognition contract eval: 5 cases, 0 failed
- Coaching contract eval: 35 cases, 0 failed
- Alpha readiness: `ready`, total 40 cases, missing total 0, missing metadata 0
- Internal alpha rehearsal: `ready`, `feedbackSubmitted: true`, `earlyHintAnswerLeakCount: 0`, `redactionCheck: "passed"`

추가 targeted 검증:

- `apps/api/test/cors.test.ts`
- `apps/api/test/local-ai-fixtures.test.ts`
- `apps/mobile/test/problem-session-client.test.ts`
- `apps/mobile/test/image-intake-rules.test.ts`
- API 수동 smoke: 정상 flow, pre-confirm coach 차단, unsupported upload, invalid feedback

## 5. 개인정보와 로그 확인

Closeout 문서와 내부 알파 관찰 양식에는 다음을 남기지 않는다.

- 원본 이미지 또는 image data URL
- 참여 부모·아이 식별 정보
- 문제 전문
- 프롬프트 전문
- 원본 AI 응답 전문

운영 이벤트는 request ID, route, stage, status, latency, model/schema version, verification status 같은 진단 metadata 중심으로 제한한다.

## 6. 공개 베타 전 남은 차단 항목

- 부모 5~10명 내부 사용성 테스트를 실제로 수행하고 관찰 양식을 채운다.
- 촬영 시작부터 첫 역질문 확인까지 걸리는 시간을 실제 기기에서 계측한다.
- 이해하기 어려운 문구, 인식 오류, 오답 의심 피드백을 분류한다.
- 공개 베타 전 100문제 평가셋 확장을 실제 fixture 작업으로 전환한다.
- 정식 개인정보 처리방침, 이용약관, AI 처리 고지를 법률 검토한다.
- 운영 환경 rate limit과 세션 저장소가 인메모리로 충분한지 결정한다.

## 7. 다음 단계 권고

다음 마일스톤은 새 기능 확장보다 실제 부모 테스트 운영이 우선이다. 내부 알파를 3~5회 먼저 돌려 관찰 양식을 검증하고, 그 결과로 문구·인식 실패·검산 실패의 P0/P1 수정 항목을 분리한다.

M8-4에서 폰 smoke와 부모 파일럿 운영 절차는 `docs/13_INTERNAL_ALPHA_RUNBOOK.md`로 분리하고, 테스트 1회 관찰 기록은 `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`를 사용한다.
