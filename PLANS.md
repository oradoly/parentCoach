# PLANS.md

이 파일은 여러 파일 또는 계층을 변경하는 작업의 실행 계획을 기록한다. Codex는 복잡한 작업에서 코드를 작성하기 전에 이 양식을 채우고, 구현 중 발견된 사실에 따라 갱신한다.

## 현재 작업

- 상태: M10-1 Render API 배포 준비 완료
- 작업명: M10-1 Render API Deployment Prep
- 담당: Codex
- 관련 백로그: `docs/06_MVP_BACKLOG.md`의 M8 이후 내부 알파 제한 진행
- 작성일: 2026-06-23

## M10-1 계획: Render API 배포 준비

### 1. Goal

TestFlight 앱이 `localhost`/LAN이 아니라 공개 HTTPS API를 호출할 수 있도록 Render Web Service 배포 설정을 준비한다. 목표는 실제 Render 계정에서 Blueprint 또는 수동 Web Service 생성으로 `https://...onrender.com/health`가 뜨고, 그 URL을 EAS `EXPO_PUBLIC_API_BASE_URL` production 값으로 넣을 수 있게 하는 것이다.

### 2. Platform decision

초기 TestFlight용 API는 Render를 우선한다.

이유:

- 현재 API는 `@hono/node-server` 기반 상시 Node web service라 Supabase Edge Function보다 Render Web Service에 직접 맞는다.
- Render는 public URL과 managed HTTPS/TLS를 제공한다.
- 지금은 DB/Auth/Storage보다 “핸드폰에서 접근 가능한 API surface”가 먼저 필요하다.

Supabase는 향후 Postgres/Storage/Auth 또는 TTL 저장소가 필요해질 때 붙이는 후보로 남긴다.

### 3. Product constraints

- 모바일 번들에는 `OPENAI_API_KEY`를 넣지 않는다. Render service env var에만 둔다.
- Render logs에도 원본 이미지, 문제 전문, prompt 전문, raw AI 응답 전문을 남기지 않는다.
- local fixture mode는 production에서 꺼둔다.
- 현재 세션 store는 인메모리이므로 단일 인스턴스 내부 테스트에만 적합하다. 재시작 또는 scale-out 시 세션이 사라질 수 있음을 문서화한다.
- TestFlight production API URL은 EAS `EXPO_PUBLIC_API_BASE_URL`로 별도 등록한다.

### 4. Scope

포함:

1. Render Blueprint `render.yaml` 추가.
2. Render가 요구하는 host/port binding을 API entrypoint에서 명시한다.
3. Render 배포 runbook 문서 추가.
4. README와 TestFlight runbook에서 Render API 배포 문서 연결.
5. lint/typecheck/test와 설정 포맷 검증.

제외:

- 실제 Render 계정 생성/로그인/배포 실행
- OpenAI 키 입력 대행
- Supabase/Postgres/Redis 기반 세션 저장소 전환
- production custom domain 연결
- 공개 베타 운영환경 hardening

### 5. Done when

- [x] `render.yaml`에 API Web Service, build/start command, `/health` health check, 필수 env var가 정의된다.
- [x] API server가 Render 호환 host/port binding을 명시한다.
- [x] Render 배포 runbook이 TestFlight/EAS production URL 연결까지 설명한다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`가 통과한다.
- [x] 최종 보고에 Render에서 사용자가 입력해야 하는 secret과 남은 위험을 적는다.

### 6. Implementation result

- `render.yaml`을 추가했다.
  - `parent-coach-api` Render Web Service를 `node` runtime, Singapore region, `/health` health check로 정의했다.
  - production에서는 local AI fixture mode를 끄고, `OPENAI_API_KEY`는 `sync: false` secret으로만 입력하게 했다.
- API entrypoint가 Render의 `PORT`와 `0.0.0.0` host binding을 사용하도록 수정했다.
- `apps/api/package.json`에 Render runtime에서 필요한 workspace/runtime dependency를 명시했다.
- `package.json`에 Node engine을 명시했다.
- `docs/17_RENDER_API_DEPLOYMENT.md`를 추가했다.
  - Render Blueprint 생성, secret 입력, smoke test, EAS `EXPO_PUBLIC_API_BASE_URL` 연결 절차를 정리했다.
- `README.md`와 `docs/16_TESTFLIGHT_DISTRIBUTION.md`에서 Render 배포 문서로 연결했다.

### 7. Verification evidence

- `pnpm install --frozen-lockfile --ignore-scripts`: 통과.
- `pnpm lint`: 통과.
- `pnpm typecheck`: 통과.
- `pnpm test`: 통과, 22 files / 106 tests.
- `./node_modules/.bin/prettier --check render.yaml apps/api/src/index.ts apps/api/package.json package.json README.md docs/16_TESTFLIGHT_DISTRIBUTION.md docs/17_RENDER_API_DEPLOYMENT.md PLANS.md`: 통과.

### 8. Remaining risks

- 실제 Render 배포는 사용자 Render 계정과 GitHub 연결, `OPENAI_API_KEY` secret 입력이 필요해 이 세션에서 완료하지 않았다.
- 현재 API session/image store는 인메모리이므로 단일 인스턴스 내부 TestFlight 테스트에만 적합하다. Render 재시작 또는 scale-out 시 세션이 사라질 수 있다.
- Free plan은 cold start가 있어 iPhone 첫 요청이 느리거나 타임아웃처럼 보이면 Starter 이상으로 올리는 것이 낫다.
- 공개 베타 전에는 TTL 저장소, 공유 rate limit, 운영 로그/개인정보 정책을 추가 검토해야 한다.

## M10 계획: TestFlight 기기 빌드 준비

### 1. Goal

부모 파일럿을 시작하기 전에 사용자의 실제 iPhone에 TestFlight를 통해 설치 가능한 iOS 빌드를 만든다. 이 단계는 공개 베타 승인이 아니라, 사용자가 직접 앱을 만져 보기 위한 내부 테스트 빌드 준비다.

### 2. Product constraints

- TestFlight 빌드에서도 부모 우선, 인식 확인 gate, 힌트/최종 풀이 공개 순서는 바꾸지 않는다.
- 모바일 번들에 `OPENAI_API_KEY`나 서버 비밀을 넣지 않는다.
- TestFlight 앱은 `127.0.0.1` 또는 임시 LAN 주소가 아니라 iPhone에서 접근 가능한 API base URL을 빌드 시점에 받아야 한다.
- 서버 API가 아직 공개 HTTPS 환경에 없으면 앱 설치는 가능해도 사진 업로드 이후 실제 코칭 흐름은 실패할 수 있음을 명시한다.
- TestFlight 업로드에는 Apple Developer Program, App Store Connect 앱 record, Expo 계정 로그인이 필요하며 agent가 사용자 Apple 로그인 없이 완료했다고 표시하지 않는다.

### 3. Scope

포함:

1. Expo iOS app config에 bundle identifier와 카메라/사진 권한 문구를 추가한다.
2. EAS Build/Submit용 `eas.json` production profile을 추가한다.
3. `EXPO_PUBLIC_API_BASE_URL` dot-notation build-time inline과 TypeScript strict 설정이 충돌하지 않게 타입 선언을 추가한다.
4. TestFlight 배포 runbook을 문서화한다.
5. README에서 TestFlight runbook으로 연결한다.
6. lint/typecheck/test를 다시 확인한다.

제외:

- Apple Developer 계정 생성 또는 로그인 대행
- App Store Connect 앱 생성 대행
- 실제 OpenAI/API production 배포
- 공개 베타 메타데이터, 심사용 스크린샷, 개인정보 문항 최종 확정
- 앱 아이콘/브랜드 최종화

### 4. Done when

- [x] `apps/mobile/app.json`에 iOS bundle identifier와 권한 문구가 있다.
- [x] `eas.json`에 TestFlight용 iOS production build/submit profile이 있다.
- [x] TestFlight runbook이 Apple/Expo 계정이 필요한 단계와 repo 준비 단계를 분리한다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`가 통과한다.
- [x] 최종 보고에 사용자가 실행할 EAS/Apple 단계와 남은 위험을 적는다.

### 5. Implementation result

- `apps/mobile/app.json`에 iOS 설정을 추가했다.
  - `ios.bundleIdentifier`: `com.oradoly.parentcoach`
  - `supportsTablet`: `false`
  - 카메라/사진 보관함 권한 문구를 부모 코칭 맥락으로 추가했다.
- `eas.json`을 추가했다.
  - `production` build profile은 iOS store distribution과 EAS `production` environment를 사용한다.
  - `production` submit profile을 추가했다.
- `apps/mobile/src/env.d.ts`를 추가해 `process.env.EXPO_PUBLIC_API_BASE_URL` dot-notation을 TypeScript strict 설정에서 허용했다.
  - Expo web/native build-time inline 동작을 위해 bracket access로 되돌리지 않았다.
- `docs/16_TESTFLIGHT_DISTRIBUTION.md`를 추가했다.
  - EAS login, production env var, App Store Connect 앱 record, iOS build, TestFlight submit, iPhone smoke 절차를 분리했다.
  - TestFlight 앱에는 iPhone에서 접근 가능한 HTTPS API URL이 필요하고, OpenAI 키는 모바일 번들에 넣지 않도록 명시했다.
- `README.md`에서 TestFlight runbook을 연결했다.

### 6. Verification evidence

- `pnpm lint`: 통과.
- `pnpm typecheck`: 통과.
- `pnpm test`: 통과, 22 files / 106 tests.
- `./node_modules/.bin/prettier --check apps/mobile/app.json eas.json apps/mobile/src/env.d.ts docs/16_TESTFLIGHT_DISTRIBUTION.md README.md PLANS.md`: 통과.
- `./node_modules/.bin/expo config --type public`:
  - `ios.bundleIdentifier`가 `com.oradoly.parentcoach`로 표시됨.
  - 카메라/사진 권한 문구가 public Expo config에 포함됨.

### 7. Remaining risks

- 실제 TestFlight 업로드는 Apple Developer Program, App Store Connect 앱 record, Expo 계정 로그인이 필요해 이 세션에서 완료하지 않았다.
- `EXPO_PUBLIC_API_BASE_URL`에 공개 HTTPS API URL을 넣지 않으면 TestFlight 앱은 설치되어도 업로드 이후 흐름이 실패한다.
- App Store Connect에서 `com.oradoly.parentcoach`가 이미 사용 중이면 앱 record 생성 전 bundle identifier를 바꿔야 한다.

## M9-3 계획: 풀이 계획/의미 정규화 단계

### 1. Goal

실제 AI 코칭 품질을 문제별 휴리스틱 누적으로 보완하지 않고, 코칭 전 단계에서 문제 의미와 풀이 계획을 구조화한다. 목표는 모델이 최종 풀이를 바로 생성하기 전에 `무엇을 구하는지`, `주어진 값`, `필요한 관계/공식`, `계산 계획`, `검산 전략`을 먼저 확정하게 만드는 것이다.

### 2. Finding

`gpt-4.1-mini` 코칭은 비용과 속도는 좋지만, 사다리꼴 높이 문제에서 숫자 자체를 더하는 엉뚱한 풀이를 만들었다. 현재 M5 검산은 최종 산술식이 답과 맞는지 좁게 확인하므로, 식 세움 자체가 문제 의미와 맞는지는 충분히 검증하지 못한다.

### 3. Product direction

- recognition은 저비용 모델을 유지해 사진 문장 인식 비용을 낮춘다.
- coaching은 더 강한 모델로 올려 실제 부모 테스트에서의 풀이 품질을 우선하되, 긴 자유 출력을 만들기 전에 짧은 `solutionPlan`을 먼저 생성한다.
- 장기 해법은 개별 오답 문자열 차단이 아니라 `Problem Solving Plan` 구조화다.
- 비용 최적화는 무조건 가장 싼 모델을 쓰는 방식이 아니라, 오답이 비싼 사용자 흐름에서는 강한 모델을 좁은 역할로 쓰고 deterministic 검증으로 재호출을 줄이는 방식으로 한다.
- OpenAI prompt caching 효과를 살리기 위해 긴 고정 지침과 JSON schema 설명은 prompt 앞쪽에 두고, 문제별 텍스트·이미지·수정값은 뒤쪽에 둔다.

### 3.1. Model routing default

초기 내부 알파 기본값:

- `recognition`: `gpt-4.1-mini` 또는 동급 저비용 vision-capable 모델.
  - 역할: 이미지에서 문제 텍스트, 수식, 단위, 도형 누락 여부를 읽는다.
  - 금지: 풀이, 정답, 코칭 생성.
- `solutionPlan`: `gpt-5.4`.
  - 역할: 확인된 문제의 의미를 짧은 구조로 정규화한다.
  - 출력 제한: 최종 코칭 문구가 아니라 문제 유형, 주어진 값, 목표, 필요한 관계, planned equation, inverse check, confidence만 생성한다.
- `coaching`: `gpt-5.4`를 기본으로 하되, 입력은 confirmed problem + validated solutionPlan으로 제한한다.
  - 역할: 부모용 문장, 역질문, 3단계 힌트, 최종 풀이 표현을 만든다.
  - 금지: plan과 다른 공식·목표·답으로 재해석하기.

비용 근거: OpenAI standard pricing 기준 `gpt-5.4`는 `gpt-5.5` 대비 input, cached input, output 단가가 모두 약 50%다. 초등 5-6학년 MVP 범위에서는 `gpt-5.4`를 기본으로 두고, plan validation 실패·낮은 confidence·사용자 신고가 누적되는 유형만 `gpt-5.5` fallback 후보로 둔다.

추후 40문제 평가셋에서 `solutionPlan` 정확도가 충분하면 `coaching`만 더 저렴한 모델(`gpt-5.4-mini` 등)로 낮추는 A/B를 검토한다. 반대로 인식 오류가 많은 사진에서는 recognition 모델을 올리기보다 촬영·자르기·확인 UI와 재촬영 분기를 먼저 강화한다.

### 4. Proposed design

새 structured 단계 `solutionPlan`을 coaching 전에 둔다.

필드 초안:

- `problemType`: fraction_division, trapezoid_area_height, ratio, unit_conversion 등
- `givenValues`: 값, 단위, 의미 라벨
- `target`: 구해야 하는 것
- `requiredRelation`: 공식 또는 관계. 예: `area = (topBase + bottomBase) * height / 2`
- `plannedEquation`: 실제로 풀 식
- `inverseCheck`: 답을 대입해 확인할 식
- `confidence`: high / medium / low
- `needsParentReview`: boolean
- `reviewPrompt`: 부모가 확인해야 할 조건 문장

생성 규칙:

- `solutionPlan`은 최종 답 문장을 길게 만들지 않는다. 비용과 검증 가능성을 위해 짧은 필드 중심으로 둔다.
- `requiredRelation`과 `plannedEquation`이 서로 맞지 않으면 coaching으로 넘기지 않는다.
- `inverseCheck`가 비어 있거나 원문 조건과 연결되지 않으면 `needsParentReview = true`로 둔다.
- 도형·측정 문제는 공식, 단위, 구해야 하는 대상이 모두 있어야 한다.
- 문장제는 `target`이 문제의 마지막 물음과 맞는지 검증한다.
- 검증기는 `verified`를 쉽게 주지 않는다. 식 계산만 맞고 문제 의미 검증이 약하면 `unverified` 또는 `partially_verified`로 둔다.

### 5. API flow

현재:

```text
recognize -> parent confirm -> coach
```

제안:

```text
recognize -> parent confirm -> plan solution -> validate plan -> coach from plan
```

세부 흐름:

1. `POST /recognize`: 이미지 인식만 수행한다.
2. `PATCH /problem`: 부모가 문제 텍스트를 확인·수정한다.
3. `POST /plan-solution` 또는 내부 planning step: 확인된 문제에서 `solutionPlan`을 생성한다.
4. `validateSolutionPlan`: curriculum scope, target, formula/equation, inverse check를 결정적으로 확인한다.
5. `POST /coach`: 검증된 plan을 입력으로 받아 코칭을 만든다.
6. `applyM5VerificationPolicy`: 최종 풀이와 비슷한 문제를 다시 검산한다.

### 6. Guardrails

- plan이 `low confidence`거나 공식/관계가 비어 있으면 최종 풀이를 만들지 않고 문제 재확인 요청.
- 도형 문제는 공식과 대입식이 없으면 final solution 생성 금지.
- coaching prompt는 confirmed problem만이 아니라 validated solutionPlan을 입력으로 받는다.
- digit-sum 같은 휴리스틱은 영구 전략이 아니라 P0 임시 안전망으로만 유지하고, plan validator가 자리 잡으면 제거/축소를 검토한다.
- 모델 호출은 `store: false`를 유지한다.
- 운영 로그에는 문제 전문, 이미지 data URL, prompt 전문, raw response를 남기지 않고 model, promptVersion, latency, usage metadata만 남긴다.
- provider가 `verified`를 주장하지 못하게 하고, 서버 deterministic validation만 `verified`로 승격할 수 있게 유지한다.
- `solutionPlan`이 plan과 다른 최종 풀이를 만들면 `VERIFICATION_FAILED`로 차단한다.

### 6.1. Cost controls

- 같은 세션에서 사용자가 문제 텍스트를 수정하지 않았고 `solutionPlan`이 이미 있으면 plan 재생성을 하지 않는다.
- coaching 재시도는 같은 `solutionPlan`을 재사용한다.
- 기본 실시간 경로는 `gpt-5.4`를 사용하고, `solutionPlan`이 schema는 맞지만 confidence가 낮거나 validator가 지원 가능 유형에서만 실패한 경우에만 `gpt-5.5` fallback을 검토한다.
- 유저가 최종 풀이를 열기 전에는 가능하면 finalSolution 전문 생성을 지연하는 방식을 검토한다. 다만 현재 계약이 한 번에 coaching JSON을 받는 구조라면 M9-3에서는 schema 변화 비용을 보고 별도 reveal API는 후속으로 둔다.
- 내부 평가셋·대량 회귀 평가는 실시간 API가 아니라 Batch/Flex 같은 비동기 저비용 경로를 검토한다. 실제 휴대폰 코칭 흐름은 부모가 기다리므로 기본 synchronous로 유지한다.
- response usage를 기록하고 세션당 estimated input/output tokens, cached input tokens, model별 비용 추정치를 운영 이벤트에 추가한다.

### 7. Done when

- [ ] `SolutionPlan` 공유 스키마가 추가된다.
- [ ] API가 coaching 전에 solution plan을 생성하고 schema parse한다.
- [ ] plan validator가 사다리꼴 높이 문제의 공식/대입식 누락을 차단한다.
- [ ] coaching adapter가 confirmed problem + solution plan을 입력으로 받는다.
- [ ] 사다리꼴 높이 fixture에서 숫자 합산 오답이 plan 단계 또는 검산 단계에서 차단된다.
- [ ] 비용/latency를 기록해 recognition mini + coaching stronger model 조합을 평가한다.
- [ ] 같은 confirmed problem에서 coaching 재시도 시 solutionPlan을 재사용한다.
- [ ] provider usage metadata가 있으면 원문 없이 token/cost 추정 로그가 남는다.
- [ ] `solutionPlan`과 다른 공식·목표로 생성된 coaching fixture가 차단된다.

## M9-3 hotfix: client API call de-duplication

### 1. Finding

현재 모바일 흐름은 `useEffect` 자동 호출 루프가 아니라 버튼/핸들러 기반으로 API를 호출한다. `ky`의 자동 retry도 `retry: 0`으로 꺼져 있다. 다만 React state가 다음 렌더에 반영되기 전 사용자가 버튼을 빠르게 두 번 누르면 같은 세션의 upload, recognition, confirm, coaching, feedback 요청이 중복으로 나갈 수 있다.

### 2. Scope

포함:

1. 같은 operation key가 이미 진행 중이면 새 API 호출을 만들지 않고 진행 중 promise를 공유한다.
2. 업로드, 문제 인식, 문제 확인, 코칭 생성, 피드백 전송 경로에 가드를 둔다.
3. reset 시 새 사용자 행동을 막지 않도록 in-flight registry를 초기화한다.
4. 순수 guard 유틸에 단위 테스트를 추가해 같은 key 중복 호출은 한 번만 실행되고, 완료 후 재호출은 가능함을 고정한다.

제외:

- 서버 rate-limit 변경
- React Query 같은 새 데이터 패칭 의존성 추가
- 자동 재시도 정책 도입

### 3. Done when

- [ ] 같은 key의 동시 호출은 네트워크 함수를 1회만 실행한다.
- [ ] 첫 호출이 완료된 뒤 같은 key를 다시 호출할 수 있다.
- [ ] 모바일 upload/recognize/confirm/coach/feedback hook이 shared in-flight guard를 사용한다.
- [ ] 타입 검사, 관련 테스트, 포맷 검증이 통과한다.

## M9-2 hotfix: nonsensical digit-sum solution block

### 1. Finding

실제 AI 코칭에서 사다리꼴의 높이를 구하는 문제에 대해 최종 풀이가 `4 1/8의 숫자 4, 1, 8을 모두 더하면 13`처럼 문제 의미와 맞지 않는 숫자 나열 합산을 제시했다. 이어지는 검산은 다른 산술식으로 정답처럼 보이는 값을 냈다.

이는 모델 생성 오류이며, 현재 서버 검산이 도형 문제의 식 세움 의미를 완전히 검증하지 못해 `unverified` 코칭으로 통과할 수 있는 gap이다.

### 2. Scope

포함:

1. 원문 문제가 `각 자리 숫자`, `숫자의 합`, `자릿수` 계열을 묻지 않는데 최종 풀이가 숫자 자체를 모두 더한다고 설명하면 서버에서 차단한다.
2. 차단은 기존 `VERIFICATION_FAILED` 경로를 재사용해 최종 풀이를 앱에 노출하지 않는다.
3. 좁은 휴리스틱으로 시작해 정상적인 자료 합산/둘레/각도 합산 설명은 건드리지 않는다.

제외:

- 사다리꼴 공식 전체 검산기 구현
- 모든 도형 문제 의미 검증
- 모델 교체

### 3. Done when

- [x] 최종 풀이가 문제 근거 없이 숫자 자체를 더한다고 말하면 `VERIFICATION_FAILED`가 반환된다.
- [x] `각 자리 숫자의 합`을 실제로 묻는 문제는 해당 휴리스틱에서 차단하지 않는다.
- [x] 관련 API 테스트와 타입/린트/포맷 검증이 통과한다.

### 4. Implementation result

- `apps/api/src/coaching-policy.ts`에 `detectUnsupportedDigitSumSolution`을 추가했다.
  - 원문이 `각 자리 숫자`, `숫자의 합`, `자릿수` 계열을 묻는 경우는 허용한다.
  - 그렇지 않은데 최종 풀이가 `숫자 4, 1, 8을 모두 더하면...`처럼 숫자 자체를 더한다고 설명하면 `verification_failed`로 차단한다.
- 기존 `VERIFICATION_FAILED` API 경로를 재사용해 finalSolution을 응답에 포함하지 않게 했다.
- `apps/api/test/coaching.test.ts`에 실제 관찰 패턴 기반 차단 테스트와 과차단 방지 테스트를 추가했다.

### 5. Verification evidence

검증 결과:

- `CI=true ./node_modules/.bin/vitest run apps/api/test/coaching.test.ts`: 통과, 8 tests.
- `CI=true ./node_modules/.bin/tsc --noEmit -p tsconfig.json`: 통과.
- `CI=true ./node_modules/.bin/eslint apps/api/src/coaching-policy.ts apps/api/test/coaching.test.ts --max-warnings=0`: 통과.
- `./node_modules/.bin/prettier --check apps/api/src/coaching-policy.ts apps/api/test/coaching.test.ts PLANS.md`: 통과.

남은 한계:

- 이 hotfix는 명백한 digit-sum 오답만 막는다.
- 사다리꼴 공식 적용 전체, 도형 조건 해석, 대분수 의미 검증은 별도 검산 범위 확장이 필요하다.

## M9-2 hotfix: coaching timeout

### 1. Finding

실제 핸드폰 사진 업로드 후 앱에는 `코칭을 만들지 못했어요`가 표시됐지만, API 로그에서는 `POST /coach`가 `200`, `outcome: "success"`, latency `14430ms`와 `17522ms`로 완료됐다.

모바일 API client의 기본 timeout은 `10_000ms`다. 따라서 서버 코칭 생성은 성공했지만, 클라이언트가 10초에서 먼저 timeout 처리해 실패 화면을 보여 준 것으로 판단한다.

### 2. Scope

포함:

1. `coachProblem` 요청에만 더 긴 timeout을 적용한다.
2. 세션 생성, 업로드, 인식, 확인, 피드백 요청의 기존 timeout 정책은 유지한다.
3. timeout 상수를 export해 테스트로 고정한다.

제외:

- 모델 변경
- 서버 코칭 정책 변경
- UI 문구 변경
- 실제 부모 파일럿 완료 처리

### 3. Done when

- [x] `coachProblem`이 서버의 14~18초 실제 응답을 기다릴 수 있다.
- [x] 기본 API timeout과 coaching timeout이 테스트로 고정된다.
- [x] typecheck/test/lint/format 검증이 통과한다.

### 4. Implementation result

- `apps/mobile/src/problem-session-timeouts.ts`를 추가해 timeout 정책을 React Native 의존성 없이 테스트 가능하게 분리했다.
- 기본 API timeout은 `10_000ms`로 유지했다.
- `coachProblem` 요청만 `45_000ms` timeout을 사용하게 했다.
- 실제 로그에서 관찰된 `POST /coach` latency `14430ms`, `17522ms`를 클라이언트가 기다릴 수 있게 됐다.

### 5. Verification evidence

검증 결과:

- `CI=true ./node_modules/.bin/vitest run apps/mobile/test/problem-session-client.test.ts`: 통과, 8 tests.
- `CI=true ./node_modules/.bin/tsc --noEmit -p tsconfig.json`: 통과.
- `CI=true ./node_modules/.bin/eslint apps/mobile/src/problem-session-client.ts apps/mobile/src/problem-session-timeouts.ts apps/mobile/test/problem-session-client.test.ts --max-warnings=0`: 통과.
- `./node_modules/.bin/prettier --check apps/mobile/src/problem-session-client.ts apps/mobile/src/problem-session-timeouts.ts apps/mobile/test/problem-session-client.test.ts PLANS.md`: 통과.

## M9-2 후속 계획: fixture mode 오해 방지

### 1. Finding

폰 smoke 중 어떤 사진을 올려도 `3/4L의 주스...` 문제와 같은 해설이 나오는 현상이 확인됐다. API surface를 직접 확인한 결과, 임의 PNG 업로드 후 recognition 결과도 같은 고정 문제 문장을 반환했다.

이는 `ENABLE_LOCAL_AI_FIXTURES=true`가 켜진 local fixture mode의 의도된 동작이다. 이 모드는 모델 키 없이 홈 → 업로드 → 인식 확인 → 코칭 → 피드백 흐름을 점검하기 위한 샘플 모드이며, 실제 사진별 AI 인식/풀이 검증이 아니다.

### 2. Scope

포함:

1. `phone:smoke` helper 출력에 fixture mode의 고정 샘플 한계를 명시한다.
2. README와 internal alpha runbook에 fixture mode와 실제 AI mode 실행 경계를 분리해 적는다.
3. 실제 AI 확인은 서버 환경에만 `OPENAI_API_KEY`를 두고, `ENABLE_LOCAL_AI_FIXTURES` 없이 API를 재시작해야 함을 기록한다.

제외:

- 실제 AI 품질 개선
- OpenAI 키 또는 비밀값 문서화
- 앱 화면 기능 변경
- 부모 파일럿 완료 처리

### 3. Done when

- [x] helper 출력이 fixture mode의 고정 샘플 응답을 경고한다.
- [x] runbook이 “샘플 흐름 확인”과 “사진별 실제 AI 확인”을 구분한다.
- [x] README가 local fixture mode를 실제 AI 검증으로 오해하지 않게 설명한다.
- [x] 관련 문서/스크립트 포맷 검증이 통과한다.

### 4. Implementation result

- `scripts/phone-smoke.mjs` 출력에 fixture mode 한계를 추가했다.
  - fallback API 명령은 폰 smoke용임을 밝힌다.
  - fixture mode에서는 어떤 이미지든 같은 샘플 문제와 코칭을 반환한다고 경고한다.
  - 사진별 AI 확인은 `ENABLE_LOCAL_AI_FIXTURES` 없이, 서버 환경의 `OPENAI_API_KEY`로 API를 시작해야 한다고 안내한다.
- `README.md`와 `docs/13_INTERNAL_ALPHA_RUNBOOK.md`에 fixture mode와 실제 AI mode를 분리해 설명했다.
- runbook에는 실제 AI mode API 시작 예시를 추가하되, 비밀키는 클라이언트나 Expo 공개 환경 변수에 넣지 않도록 유지했다.

### 5. Verification evidence

검증 결과:

- Runtime API probe:
  - `curl -X POST /v1/problem-sessions` 성공.
  - 임의 PNG 업로드 후 `POST /recognize`가 `3/4L의 주스...` 고정 문제를 반환함을 확인.
  - local fixture mode의 고정 응답 현상으로 판정.
- `./node_modules/.bin/prettier --check scripts/phone-smoke.mjs README.md docs/13_INTERNAL_ALPHA_RUNBOOK.md PLANS.md`: 통과.
- `CI=true ./node_modules/.bin/eslint scripts/phone-smoke.mjs --max-warnings=0`: 통과.
- `pnpm phone:smoke -- --skip-export --lan-ip=127.0.0.1`: sandbox 로컬 포트 제한으로 1회 `EPERM` 실패 후, 승인된 로컬 서버 접속으로 통과.
  - 출력에 `In fixture mode, every uploaded image returns the same sample problem and coaching.` 경고 확인.

## M9-2 실행 계획

### 1. Goal

M9-2의 목표는 실제 부모 3~5회 파일럿을 바로 수행했다는 표시를 만드는 것이 아니라, 사용자가 안전하게 파일럿을 진행하고 결과를 P0/P1로 판정할 수 있는 기록 패킷을 완성하는 것이다.

M9-1에서 폰 smoke가 사용자 기기에서 확인됐으므로, 다음 병목은 “파일럿을 해도 무엇을 기록하고 어떤 기준으로 다음 단계로 갈지”다. M9-2는 이를 문서와 체크리스트로 닫는다.

### 2. Product constraints

- 실제 부모 테스트 완료로 표시하지 않는다.
- 문제 전문, 원본 이미지, 아이 식별 정보, 자유 발화 전문을 기록하지 않는다.
- 부모가 앱을 아이에게 직접 답 확인 도구로 넘겨 쓰는 흐름은 중단 조건으로 둔다.
- M9-2는 공개 베타 승인, 100문제 평가셋 확장, 법률 검토 완료를 포함하지 않는다.

### 3. Scope

포함:

1. 3~5회 부모 파일럿을 모아 보는 집계/판정 문서를 추가한다.
2. 각 테스트별 P0 중단 조건, P1 개선 후보, 다음 액션을 기록하는 표를 제공한다.
3. 3~5회 완료 후 `계속 진행 / 수정 후 진행 / 중단` 판정 기준을 구체화한다.
4. runbook과 README에서 M9-2 파일럿 기록 문서를 연결한다.

제외:

- 실제 부모 파일럿 수행
- 참여자 모집 문구 자동화
- 개인정보 처리방침 법률 확정
- 앱 기능 변경
- 평가 fixture 100문제 확장

### 4. Done when

- [x] M9-2 계획이 `PLANS.md`에 기록된다.
- [x] 부모 파일럿 집계/판정 문서가 추가된다.
- [x] runbook과 README가 M9-2 문서를 참조한다.
- [x] 문서 포맷 검증이 통과한다.

### 5. Implementation result

- `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`를 추가했다.
  - 3~5회 부모 파일럿 전 체크리스트, 회차별 요약 표, P0 중단 조건, P1 개선 후보, 3~5회 후 판정 기준을 담았다.
  - 문제 전문, 원본 이미지, 아이 식별 정보, 자유 발화 전문, 프롬프트 전문, 원본 AI 응답 전문은 기록 금지로 명시했다.
- `docs/13_INTERNAL_ALPHA_RUNBOOK.md`에서 1회 기록은 `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`, 집계/판정은 `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`로 연결했다.
- `docs/11_INTERNAL_ALPHA_READINESS.md`와 `README.md`에 M9-2 파일럿 집계 문서를 연결했다.

### 6. Verification evidence

검증 결과:

- `./node_modules/.bin/prettier --check PLANS.md README.md docs/11_INTERNAL_ALPHA_READINESS.md docs/13_INTERNAL_ALPHA_RUNBOOK.md docs/15_INTERNAL_ALPHA_PILOT_LOG.md`: 통과.
- `git diff --check -- PLANS.md README.md docs/11_INTERNAL_ALPHA_READINESS.md docs/13_INTERNAL_ALPHA_RUNBOOK.md docs/15_INTERNAL_ALPHA_PILOT_LOG.md`: 통과.
- `test -f docs/15_INTERNAL_ALPHA_PILOT_LOG.md`: 통과.
- `rg` 개인정보 금지 패턴 스캔:
  - `문제 전문`, `원본 이미지`, `image data URL`, `프롬프트 전문`, `원본 AI 응답`, `참여자 실명`, `아이 이름`, `학교명`, `자유 발화 전문` 매치는 모두 기록 금지/중단 조건 문구로 확인했다.
- 문서 연결 확인:
  - README, `docs/11_INTERNAL_ALPHA_READINESS.md`, `docs/13_INTERNAL_ALPHA_RUNBOOK.md`, `PLANS.md`에서 `docs/15_INTERNAL_ALPHA_PILOT_LOG.md` 참조 확인.

## M9-1 실행 계획

### 1. Goal

M9의 첫 단위는 실제 부모 파일럿을 바로 시작하는 것이 아니라, 사용자가 핸드폰에서 같은 앱 surface를 반복 확인할 수 있게 폰 smoke 준비를 안정화하는 것이다.

목표는 “내부 알파 제한 진행” 상태에서 홈 → 사진 선택/촬영 → 업로드 → 인식 확인 → 첫 역질문 → 힌트 → 최종 풀이 → 비슷한 문제 → 새 문제 시작 흐름을 실제 폰에서 재현할 수 있는 운영 표면을 만든다.

### 2. Product constraints

- 부모 우선, 인식 확인 gate, 답 누출 금지, 최종 풀이 명시적 reveal, 비슷한 문제 답 접힘을 변경하지 않는다.
- M9-1은 공개 베타 준비 완료가 아니다.
- 부모 파일럿 3~5회 실행은 M9-2로 남긴다.
- 새 기능 확장, 계정, 장기 기록, 결제, 범위 확장은 포함하지 않는다.

### 3. Scope

포함:

1. LAN 기반 static web phone smoke를 재현하는 helper 명령을 추가한다.
2. helper가 Expo web export, API health, static server, CORS, bundle API URL 인라인을 확인한다.
3. `docs/13_INTERNAL_ALPHA_RUNBOOK.md`에 M9-1 helper 사용법과 수동 확인 항목을 연결한다.
4. 검증 결과와 남은 한계를 기록한다.

제외:

- 실제 부모 파일럿 수행
- 100문제 평가셋 확장
- 정식 배포/법률 문서 확정
- Playwright browser 설치 또는 외부 registry 다운로드

### 4. Done when

- [x] `pnpm phone:smoke`로 LAN phone smoke 준비 상태를 확인할 수 있다.
- [x] helper가 Mac LAN IP, phone URL, API/static/CORS 상태를 출력한다.
- [x] runbook이 helper와 수동 폰 확인 절차를 설명한다.
- [ ] lint/typecheck/test/eval/export/smoke 검증 결과가 기록된다.

### 5. Implementation result

- `scripts/phone-smoke.mjs`를 추가했다.
  - `--lan-ip`, `--api-port`, `--web-port`, `--web-dir`, `--skip-export` 옵션을 지원한다.
  - LAN IP를 `PARENT_COACH_LAN_IP`, `ipconfig getifaddr en0`, `ifconfig` 순서로 확인한다.
  - Expo web export를 `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3001`로 생성한다.
  - export bundle에 LAN API URL이 인라인됐는지 확인한다.
  - API health, static web, CORS preflight를 확인한다.
  - 핸드폰에서 열 URL과 API/static server 실행 명령을 출력한다.
- 루트 `package.json`에 `phone:smoke` script를 추가했다.

### 6. Verification evidence

검증 결과:

- `./node_modules/.bin/prettier --check scripts/phone-smoke.mjs package.json PLANS.md docs/13_INTERNAL_ALPHA_RUNBOOK.md`: 통과.
- `CI=true ./node_modules/.bin/eslint scripts/phone-smoke.mjs --max-warnings=0`: 통과.
- `CI=true ./node_modules/.bin/tsc --noEmit -p tsconfig.json`: 통과.
- `CI=true ./node_modules/.bin/vitest run`: 통과, 21 files / 99 tests.
- `pnpm phone:smoke -- --skip-export --lan-ip=192.168.3.23`: 통과.
  - 일반 sandbox에서는 LAN API 접속이 `connect EPERM 192.168.3.23:3001`로 막혀 승인된 sandbox 밖 실행으로 재검증했다.
  - 출력 Phone URL: `http://192.168.3.23:4174/?m9-phone-smoke=1`.
  - API health: `{"status":"ok","service":"parent-coach-api","schemaVersion":"1.0"}`.
  - static web: `http://192.168.3.23:4174`, 1179 bytes.
- `pnpm phone:smoke -- --lan-ip=192.168.3.23`: 통과.
  - Expo web export 포함 기본 경로가 성공했다.
  - helper가 API/static/CORS/bundle URL 확인 후 동일한 Phone URL을 출력했다.

남은 한계:

- 실제 핸드폰에서의 카메라/사진 picker 동작은 사용자 기기에서 수동 확인이 필요하다.
- Playwright bundled Chromium 설치는 M9-1 범위 밖이다.

## 화면 마무리 4단계 실행 계획

### 0. Phone smoke hotfix: 새 문제 시작

휴대폰 실제 사용 중 최종 풀이까지 본 뒤 다음 문제로 넘어가는 명확한 진입점이 부족한 문제가 확인됐다.

범위:

- 코칭 결과 하단에 `새 문제 시작` 액션을 추가한다.
- 기존 reset flow를 재사용해 이미지, 인식, 코칭, 피드백, reveal 상태를 초기화한다.
- 답 공개 순서, 힌트 점진 공개, 인식 확인 gate는 변경하지 않는다.

Done when:

- [x] 최종 풀이 공개 후 화면 하단에서 `새 문제 시작`을 누를 수 있다.
- [x] 버튼은 최소 48px 터치 높이를 유지한다.
- [x] lint/typecheck/test/export와 모바일 폭 browser smoke를 다시 확인한다.

### 0.1 Final review hardening: 임시 세션 정리

gstack/superpowers 최종 점검에서 `새 문제 시작`과 기존 reset flow가 화면 상태만 초기화하고 API 임시 세션 삭제를 호출하지 않는 gap을 확인했다.

범위:

- 업로드된 문제 세션이 있는 상태에서 reset flow가 실행되면 `DELETE /v1/problem-sessions/:sessionId`를 best-effort로 호출한다.
- 삭제 실패가 다음 문제 시작 UX를 막지는 않는다.
- 인식 확인 gate, 힌트 순서, 최종 풀이 reveal 순서는 변경하지 않는다.

Done when:

- [x] `새 문제 시작`/다시 시작 계열 reset이 업로드 세션 삭제를 시도한다.
- [x] 개인정보 최소화 원칙과 임시 이미지 처리 방향을 강화한다.
- [x] lint/typecheck/test/eval/export와 가능한 static smoke를 다시 확인한다.

### 1. Goal

Cal.com 참고 A 첫 화면을 기준으로 실제 앱 화면 개발을 “핸드폰에서 확인 가능한 상태”에 가깝게 닫는다.

이번 단위는 의존성/lockfile 복구, 앱 실행, 홈/인식/코칭 첫 화면 시각 톤 정리, smoke test까지 포함한다. 제품 범위와 코칭 순서는 변경하지 않는다.

### 2. Product constraints

- 홈과 인식 전 화면에는 코칭, 풀이, 최종 답을 노출하지 않는다.
- 인식 확인 화면은 “사용자가 확인한 문장이 이후 기준”이라는 gate 역할을 유지한다.
- 코칭 첫 화면은 역질문이 힌트 1보다 먼저 보이고, 최종 풀이는 명시적 버튼 뒤에만 유지한다.
- 색상은 흑백/회색 토큰 안에서만 사용한다.
- 새 의존성은 화면 polish를 위해 추가하지 않는다.

### 3. Steps

1. `pnpm-lock.yaml`과 `node_modules`를 복구해 검증 명령을 다시 실행 가능하게 한다.
2. 앱을 실제 실행 표면에서 열어 첫 화면이 보이는지 확인한다.
3. `RecognitionReviewScreen`과 `CoachingScreen`의 첫 화면을 Cal.com-like monochrome 톤으로 정리한다.
4. 가능한 실제 기기 또는 브라우저 smoke test를 수행하고 남은 한계를 기록한다.

### 4. Done when

- [x] `pnpm install` 또는 동등한 복구 경로가 성공한다.
- [x] 홈 화면을 실행 표면에서 관찰한다.
- [x] 인식 확인 화면과 코칭 첫 화면이 홈과 같은 흑백/회색 위계를 따른다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` 중 가능한 검증 결과를 기록한다.
- [x] 실제 기기 테스트가 가능하면 URL/절차를 제공하고, 불가능하면 이유와 대체 smoke test를 기록한다.

### 5. Implementation result

- `pnpm-lock.yaml`은 원래 포맷을 유지한 채 `@parent-coach/math-validation` workspace importer만 최소 반영했다.
- `pnpm install --frozen-lockfile --lockfile-only --offline --ignore-scripts`: 통과.
- 사용자가 `pnpm install`을 완료했고, `node_modules/.bin`과 `apps/mobile/node_modules/.bin`의 검증/Expo 바이너리 복구를 확인했다.
- 이전 환경에서는 `node_modules` 복구를 완료하지 못했다.
  - 외부 registry 설치는 승인 시스템에서 거절됐다.
  - 오프라인 전체 설치는 `@eslint/js@10.0.1` tarball 누락으로 실패했다.
  - prod-only 설치는 `hono@4.12.26` tarball 누락으로 실패했다.
  - mobile-only 설치는 `expo@56.0.12` tarball 누락으로 실패했다.
- `apps/mobile/src/m3-screens.tsx`의 인식 진행/확인/복구 화면을 Cal.com-like monochrome header와 gate card 구조로 정리했다.
- `apps/mobile/src/m4-screens.tsx`의 코칭 진행/복구/첫 코칭 화면을 같은 톤으로 정리했다.
  - 첫 역질문을 강한 question surface로 올렸다.
  - 부모님 빠른 이해와 힌트 1은 보조 카드로 유지했다.
  - 최종 풀이는 기존처럼 명시적 reveal 뒤에만 렌더링한다.
- `apps/mobile/src/m4-result-sections.tsx`를 추가해 최종 풀이/비슷한 문제/피드백 섹션을 분리했고, `m4-screens.tsx`를 250 LOC 아래로 낮췄다.
- `apps/mobile/src/m1-components.tsx`의 `Pill` 반경을 `radius.full`로 맞췄다.
- `DESIGN.md`에 인식 gate와 코칭 question surface 지침을 보강했다.
- Expo web export가 `/private/tmp/parent-coach-web`로 성공했다.
- 승인된 로컬 정적 서버 `http://127.0.0.1:4174/`에서 Expo web export를 열어 모바일 폭 smoke를 수행했다.
- 휴대폰 업로드 smoke 중 `API 서버에 연결하지 못했어요` 오류를 확인했다.
  - 원인: Expo web export가 `process.env["EXPO_PUBLIC_API_BASE_URL"]` bracket 접근을 인라인하지 못해 번들 내부 API base URL이 `http://127.0.0.1:3001`로 고정됐다.
  - 조치: 모바일 API base URL helper를 React Native 의존성 없는 `api-base-url.ts`로 분리하고, hook들은 `process.env.EXPO_PUBLIC_API_BASE_URL` dot notation을 사용하도록 수정했다.
  - LAN용 export를 `EXPO_PUBLIC_API_BASE_URL=http://192.168.3.23:3001`로 재생성했다.
- 최종 풀이와 비슷한 문제 풀이까지 확인한 뒤 새 문제로 넘어갈 수 있도록 코칭 결과 하단에 `새 문제 시작` 액션을 추가했다.
  - 기존 reset flow를 재사용해 이미지, 인식, 코칭, 피드백, reveal 상태를 초기화한다.
  - 상단 보조 reset 액션도 같은 `새 문제 시작` 라벨로 맞췄다.
- gstack/superpowers 최종 점검 중 reset flow의 서버 세션 lifecycle gap을 발견했다.
  - `useImageIntake`가 업로드된 세션 삭제 helper를 제공하도록 보강했다.
  - `ParentCoachFlow` reset flow가 현재 업로드 세션 ID를 캡처해 `DELETE /v1/problem-sessions/:sessionId`를 best-effort로 호출한다.
  - 삭제 실패가 사용자에게 다음 문제 시작을 막지 않도록 화면 초기화는 기존처럼 즉시 진행한다.
- superpowers code review에서 추가로 확인한 제품 위험을 보강했다.
  - 부모가 OCR 문장을 수정하면 원래 OCR의 `normalizedText`/`latex`를 confirm 요청에서 제외해 수정된 문제 문장을 단일 기준으로 둔다.
  - live coaching 응답의 parent briefing, 첫 질문, 힌트 1-2에 최종 답이 섞이면 API가 `ANSWER_LEAK_DETECTED`로 차단한다.
  - internal alpha rehearsal runner는 이제 답 누출 fixture가 200 응답 이후 평가기에서 막히는 대신, coaching API 단계에서 blocked 되는 경로를 정상 차단으로 본다.

### 6. Verification evidence

- `./node_modules/.bin/prettier --check apps/mobile/src/m1-components.tsx apps/mobile/src/m3-screens.tsx apps/mobile/src/m4-screens.tsx apps/mobile/src/m4-result-sections.tsx DESIGN.md PLANS.md pnpm-lock.yaml`: 통과.
- `CI=true ./node_modules/.bin/eslint . --max-warnings=0`: 통과.
- `CI=true ./node_modules/.bin/tsc --noEmit -p tsconfig.json`: 통과.
- `CI=true ./node_modules/.bin/vitest run`: 통과, 21 files / 99 tests.
- `CI=true ./node_modules/.bin/tsx evals/runners/recognition-contract-eval.mjs && CI=true ./node_modules/.bin/tsx evals/runners/coaching-contract-eval.mjs && CI=true ./node_modules/.bin/tsx evals/runners/alpha-readiness-eval.ts && CI=true ./node_modules/.bin/tsx evals/runners/internal-alpha-rehearsal.ts`: 통과.
  - 일반 sandbox에서는 `tsx` IPC pipe 생성이 `EPERM`으로 막혀 승인된 sandbox 밖 실행으로 재검증했다.
  - Recognition 5 cases / 0 failed, Coaching 35 cases / 0 failed.
  - Alpha readiness `ready`, 40/40 cases.
  - Internal alpha rehearsal `ready`, redaction check `passed`, observed stages session/upload/recognition/confirmation/coaching/feedback.
- `EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo export --platform web --output-dir /private/tmp/parent-coach-web`: 통과.
- `EXPO_PUBLIC_API_BASE_URL=http://192.168.3.23:3001 EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo export --platform web --output-dir /private/tmp/parent-coach-phone-web`: 통과.
- `EXPO_PUBLIC_API_BASE_URL=http://192.168.3.23:3001 EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo export --platform web --output-dir /private/tmp/parent-coach-phone-web`를 `apps/mobile`에서 재실행: 통과.
- LAN용 bundle 검사:
  - hook 호출부 base URL이 `http://192.168.3.23:3001`로 인라인됨.
  - `http://127.0.0.1:3001`은 fallback 상수에만 남음.
- 최신 LAN static/API smoke:
  - `curl http://192.168.3.23:3001/health`: `{"status":"ok","service":"parent-coach-api","schemaVersion":"1.0"}`.
  - `curl http://192.168.3.23:4174/`: `200`.
  - CORS preflight `OPTIONS http://192.168.3.23:3001/v1/problem-sessions` from `http://192.168.3.23:4174`: `204`.
  - 최신 bundle에 `http://192.168.3.23:3001`, `ANSWER_LEAK_DETECTED`, `새 문제 시작` 포함 확인.
- `curl -X OPTIONS http://192.168.3.23:3001/v1/problem-sessions -H Origin:http://192.168.3.23:4174 ...`: `204`, CORS allow origin 정상.
- `curl -X POST http://192.168.3.23:3001/v1/problem-sessions -H Origin:http://192.168.3.23:4174`: `201`, temporary session 생성 성공.
- Playwright LAN origin fetch:
  - page URL `http://192.168.3.23:4174/?phone-fix=1`.
  - browser `fetch("http://192.168.3.23:3001/v1/problem-sessions", { method: "POST" })`: `201`.
- Playwright 390x844 full-flow smoke:
  - page URL `http://192.168.3.23:4174/?new-problem-hotfix=2`.
  - 사진 선택 → 업로드 → 문제 확인 → 인식 확인 → 코칭 → 힌트 3개 → 최종 풀이 → 비슷한 문제 풀이까지 진행.
  - 최종 풀이 이후 `새 문제 시작` 버튼 2개 노출. 화면 하단 버튼은 342x48px.
  - 하단 `새 문제 시작` 클릭 후 홈 화면으로 복귀했고, 최종 답 `6컵`은 더 이상 렌더링되지 않음.
  - horizontal overflow 없음.
  - 스크린샷: `parent-coach-new-problem-action-390.png`.
  - 잔여 관찰: Expo web file picker에서 기존과 같은 `removeChild` console error 1건이 발생했지만 업로드와 이후 흐름은 정상 완료됨.
- `python3 -m http.server 4174 --bind 127.0.0.1 --directory /private/tmp/parent-coach-web`: 사용자 승인 후 실행 성공.
- Playwright 390x844 smoke:
  - fresh home URL `http://127.0.0.1:4174/?fresh=console-check` 렌더링 성공.
  - body text: `초등 5-6 수학`, `아이에게 어떻게 물어볼지 먼저 준비해요`, `카메라 열기`, `사진 선택`.
  - `documentElement.scrollWidth === clientWidth`, horizontal overflow 없음.
  - console warning/error 0건, page error 0건.
  - 촬영 영역 클릭 후 intake 화면으로 전환됨. `문제 하나`, `촬영 영역`, `카메라`, `사진`, `뒤로` 표시.
  - 주요 버튼은 342x48px로 최소 터치 높이 48px 유지.
- `git diff --check -- ...`: 통과.
- `rg` 금지 패턴 검사: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `enum`, `: any`, non-null assertion 매치 없음.
- 순수 LOC:
  - `apps/mobile/src/m3-screens.tsx`: 176
  - `apps/mobile/src/m4-screens.tsx`: 209
  - `apps/mobile/src/m4-result-sections.tsx`: 111
- `CI=true pnpm typecheck`, `CI=true pnpm lint`, `CI=true pnpm test`: 이전에는 스크립트 실행 전 `pnpm install` 단계에서 registry DNS 실패 재시도에 들어가 중단했다. 설치 복구 뒤에는 위 직접 바이너리 검증으로 대체 확인했다.
- LSP diagnostics: `mcp__lsp.diagnostics` 호출 시 LSP transport가 닫혀 진단을 받지 못했다.
- 최신 Playwright full-flow smoke 재실행 시도:
  - Playwright bundled Chromium cache가 없어 실행 불가.
  - 로컬 Chrome channel headless 실행도 `kill EPERM`으로 종료되어 이번 재검증에서는 full-flow 브라우저 자동화를 완료하지 못했다.
- Expo/브라우저/실제 기기 smoke test: Expo web export와 브라우저 smoke는 완료했다. 실제 핸드폰 Safari/Chrome에서의 camera/file picker 검증은 아직 별도 기기에서 확인해야 한다.

## Cal.com 참고 A 첫 화면 구현 계획

### 1. Goal

`design-samples/cal-com-parent-coach`의 A 첫 화면을 실제 모바일 홈 화면에 반영한다.

이번 단위는 홈 화면만 바꾼다. 인식 확인, 코칭, 최종 풀이, 비슷한 문제 흐름은 제품 불변조건을 유지하기 위해 건드리지 않는다.

### 2. Product constraints

- 홈은 답풀이 앱처럼 보이지 않고, 부모가 아이에게 묻기 전에 한 문제를 촬영하는 준비 화면이어야 한다.
- 인식 확인 전에는 코칭 또는 풀이 내용을 보여 주지 않는다.
- 한 번에 한 문제, 초등 5-6학년 수학, 한국어 코칭 범위를 벗어나지 않는다.
- 색과 장식은 Cal.com 참고 샘플처럼 흑백/회색, shadow-ring, 명확한 버튼 위계 안에서만 쓴다.

### 3. Scope

포함:

1. `DESIGN.md`에 Cal.com 참고 A 첫 화면 적용 결정을 남긴다.
2. 필요한 경우 모바일 디자인 토큰에 shadow-ring 값을 추가한다.
3. `apps/mobile/src/m1-screens.tsx`의 `HomeScreen`만 A 첫 화면 구조로 바꾼다.
4. 가능한 정적 검증과 시각 확인을 수행한다.

제외:

- 코칭 화면 구현 변경
- 인식 확인 화면 구현 변경
- 새 폰트 또는 의존성 설치
- 샘플 전체 4화면 구현

### 4. Done when

- [x] 홈 첫 화면이 Cal.com 참고 샘플의 A 화면 구조를 따른다.
- [x] 홈에서 코칭/정답/풀이가 노출되지 않는다.
- [x] 주요 버튼의 48px 이상 터치 높이가 유지된다.
- [x] 가능한 검증 또는 제한 사유가 최종 보고에 기록된다.

### 5. Implementation result

- `apps/mobile/src/m1-screens.tsx`의 `HomeScreen`을 Cal.com 참고 A 샘플 구조로 바꿨다.
  - `초등 5-6 수학` pill, 부모 지향 타이틀, 간결한 보조 문구를 추가했다.
  - 점선 capture zone, 흑백 camera glyph, `카메라 열기`/`사진 선택` 액션을 유지했다.
- `apps/mobile/src/design-tokens.ts`에 pill/circle용 `radius.full`을 추가했다.
- `DESIGN.md`에 Home Capture Card 지침과 Cal.com A home baseline 결정을 기록했다.
- 인식 확인, 코칭, 최종 풀이, 비슷한 문제 흐름은 변경하지 않았다.

### 6. Verification evidence

- `git diff --check -- apps/mobile/src/m1-screens.tsx apps/mobile/src/design-tokens.ts DESIGN.md PLANS.md`: 통과.
- `CI=true pnpm typecheck`, `CI=true pnpm lint`: 실행 시도했지만 현재 `apps/api/package.json`과 `pnpm-lock.yaml`의 기존 불일치로 pnpm이 frozen install 단계에서 중단했다.
- `pnpm exec prettier --check ...`: 실행 시도했지만 같은 의존성 상태에서 `pnpm`이 `node_modules` 재생성을 시도했고, 제한된 네트워크 환경에서 registry 접근이 실패해 중단했다.
- 실제 Expo 화면 스크린샷 검증은 위 의존성 상태 때문에 이번 단위에서 수행하지 못했다.

## Cal.com 참고 디자인 샘플링 계획

### 1. Goal

현재 흑백 미니멀 방향을 유지하되, Cal.com의 깨끗한 중립 UI, 정교한 shadow-ring 카드, 명확한 액션 위계를 참고한 모바일 샘플 화면을 만든다.

### 2. Product constraints

- 부모 우선, 질문 우선, 인식 확인 전 코칭 금지 원칙을 유지한다.
- 최종 풀이와 비슷한 문제 답은 명시적 공개 뒤에만 나타난다.
- 색상은 기존 `DESIGN.md`의 검정, 흰색, 회색 토큰 안에서만 사용한다.
- 실제 앱 코드는 변경하지 않고 `design-samples`의 독립 샘플로 제한한다.

### 3. Scope

포함:

1. 홈 촬영 화면 샘플
2. 인식 결과 확인 화면 샘플
3. 첫 역질문과 힌트 1이 보이는 코칭 화면 샘플
4. 최종 풀이 공개와 비슷한 문제 접힘 상태 샘플

제외:

- React Native 화면 구현
- 최종 디자인 방향 확정
- 새 폰트 또는 의존성 설치
- 제품 플로우 변경

### 4. Done when

- [x] 샘플 화면이 브라우저에서 보인다.
- [x] Cal.com 참고 요소가 우리 제품 불변조건과 충돌하지 않는다.
- [x] 모바일 폭에서 한국어 문구가 잘리지 않는다.
- [x] 사용자에게 미리보기 경로와 남은 판단 포인트를 보고한다.

### 5. Implementation result

- `design-samples/cal-com-parent-coach/index.html`에 4개 모바일 화면 샘플을 추가했다.
- `design-samples/cal-com-parent-coach/cal-parent-coach-board.svg`와 PNG 미리보기를 추가했다.
- 샘플 화면은 홈, 인식 확인, 첫 코칭, 최종 풀이/비슷한 문제 상태를 포함한다.
- 제품 불변조건 확인:
  - 인식 확인 화면 전에는 코칭 카드가 없다.
  - 코칭 화면은 첫 역질문이 힌트 1보다 먼저 보인다.
  - 최종 풀이와 비슷한 문제 답은 별도 공개 상태로 분리했다.
- 검증:
  - 로컬 HTML/SVG 정적 체크를 통과했다.
  - `./node_modules/.bin/prettier --check design-samples/cal-com-parent-coach/index.html PLANS.md` 통과.
  - 브라우저 자동 스크린샷은 이 세션의 Playwright/Chrome 제한으로 완료하지 못했고, SVG를 Quick Look으로 PNG 렌더링해 시각 확인했다.

## M9 실행 계획

### 1. Goal

M8까지 닫힌 부모 코칭 MVP 흐름을 유지한 채, 실제 핸드폰에서 “답풀이 앱”이 아니라 “부모가 아이 옆에서 차분히 준비하는 코칭 도구”로 느껴지는 모바일 디자인 방향을 정한다.

M9의 첫 단위는 화면 구현이 아니라 디자인 판단 기준을 고정하는 것이다. `DESIGN.md`를 M8 이후 상태에 맞게 갱신하고, 다음 단계의 design-shotgun과 design-review가 같은 기준으로 작동하게 만든다.

### 2. Product constraints

- 부모 우선 흐름을 유지한다.
- 정답보다 코칭을 먼저 보여 주는 정보 위계를 디자인 원칙에 포함한다.
- 인식 확인 전 코칭 생성 금지, 힌트 점진 공개, 최종 풀이 분리, 비슷한 문제 답 접힘을 시각 구조로 보호한다.
- 모바일 앱은 초등 5~6학년 수학 한 문제, 한국어 코칭, 내부 알파 제한 진행 상태를 벗어나지 않는다.
- 디자인 polish 중에도 회원가입, 장기 기록, 리포트, 결제, 학년·과목 확장은 넣지 않는다.

### 3. Design read

- 기존 `DESIGN.md`는 M0/M1 수준의 조용한 study desk 방향과 기본 토큰을 담고 있다.
- 현재 앱은 M8 기준으로 업로드, 인식 확인, 코칭, 검산 상태, 비슷한 문제, 피드백까지 이어진다.
- 기존 색상은 안정적이지만 한 화면에 카드가 많이 쌓일 때 정보 단계와 “부모가 말할 문장”의 우선순위가 약해질 수 있다.
- 가장 중요한 기억점은 “부모가 답을 대신 주는 사람이 아니라, 아이에게 좋은 질문을 할 준비가 됐다”는 감각이다.

### 4. Proposed direction

디자인 방향은 **Calm Coaching Desk**로 둔다.

- Aesthetic: 조용한 preparation desk, 교육 앱보다 부모용 생산성 도구에 가까운 차분함
- Layout: 모바일 단일 컬럼, 코칭 흐름은 timeline-like progressive stack
- Color: warm neutral 기반, deep ink text, restrained blue action, amber caution
- Typography: 시스템 폰트를 유지하되 역할별 크기와 굵기를 더 명확히 한다. 커스텀 폰트 도입은 실제 visual direction 선택 후 검토한다.
- Motion: minimal-functional. 힌트와 최종 풀이 reveal에만 짧은 상태 전환을 허용한다.
- Creative risk: 첫 코칭 카드의 중심을 “설명”이 아니라 “부모가 바로 말할 한 문장”으로 둔다.

### 5. Scope decision

이번 단위에 포함:

1. `DESIGN.md`를 M9 기준으로 갱신한다.
2. M9에서 지킬 디자인 원칙, 토큰, 컴포넌트 역할, 화면별 hierarchy를 문서화한다.
3. design-shotgun에서 비교할 후보 방향을 정의한다.
4. design-review에서 볼 QA 기준을 정의한다.

이번 단위에서 제외:

- 실제 React Native 화면 구현
- Figma 파일 생성
- 이미지/일러스트 asset 생성
- 커스텀 폰트 설치
- 화면 전환 애니메이션 구현
- 공개 베타용 브랜드 확정

### 6. Next design flow

1. `design-shotgun`으로 아래 3개 visual direction을 비교한다.
   - Calm Coaching Desk: 현재 방향을 정제한 기본안
   - Warm Notebook: 더 따뜻하고 가정적인 종이/노트 감각
   - Focused Tutor Console: 더 기능적이고 빠른 도구 감각
2. 사용자가 하나를 고른 뒤 앱 코드에 토큰과 주요 화면 hierarchy를 적용한다.
3. `design-review`로 실제 Expo surface에서 간격, 문구 밀도, 답 누출 hierarchy, 모바일 터치 UX를 검수한다.

### 7. Testing

- 문서 변경 후 `pnpm format:check`를 실행한다.
- `DESIGN.md`가 제품 불변조건과 충돌하지 않는지 확인한다.
- 실제 화면 구현을 하지 않았으므로 lint/typecheck/test 재실행은 다음 구현 단위에서 수행한다.

### 8. Done when

- [x] `DESIGN.md`가 M9 디자인 방향과 M8 이후 앱 흐름을 반영한다.
- [x] design-shotgun 후보 3개와 비교 기준이 문서화된다.
- [x] design-review QA 기준이 문서화된다.
- [x] M9 첫 단위가 실제 화면 구현 전 기준 정리임을 명확히 기록한다.
- [x] 문서 포맷 검증이 통과한다.

### 9. Implementation result

- `DESIGN.md`를 M9 기준으로 갱신했다.
  - 제품 맥락과 기억점: “부모가 아이에게 좋은 질문을 할 준비가 됐다.”
  - aesthetic direction: `Calm Coaching Desk`
  - 디자인 불변조건: 인식 확인 전 코칭 금지, 질문 우선, 힌트 점진 공개, 최종 풀이 명시적 공개, 비슷한 문제 답 접힘
  - 토큰 방향: warm neutral, restrained blue action, coaching green, semantic warning/error/success
  - 화면별 hierarchy: home, intake, recognition, coaching, recovery
  - design-shotgun 후보: Calm Coaching Desk, Warm Notebook, Focused Tutor Console
  - design-review QA checklist
- `AGENTS.md`의 작업 전 읽기 목록에 UI·디자인 작업 시 `DESIGN.md`를 추가했다.
- README 문서 목록에 `DESIGN.md`를 추가했다.
- 실제 React Native 화면 구현, Figma 파일 생성, asset 생성, 커스텀 폰트 도입은 다음 단위로 남겼다.

### 10. Design-shotgun sample result

2026-06-22에 3개 visual direction 샘플을 생성했다.

- 산출물 디렉터리: `/Users/oradoly/.gstack/projects/oradoly-parentCoach/designs/m9-shotgun-20260622`
- 비교 보드: `/Users/oradoly/.gstack/projects/oradoly-parentCoach/designs/m9-shotgun-20260622/shotgun-board.svg.png`
- A: Calm Coaching Desk
- B: Warm Notebook
- C: Focused Tutor Console

현재 상태:

- 아직 최종 visual direction은 선택하지 않았다.
- 1차 추천은 A를 기본으로 두고 B의 따뜻함을 일부 섞는 방향이다.
- C는 빠른 스캔에는 강하지만 부모 코칭 도구보다 업무용 console처럼 느껴질 위험이 있다.
- 다음 구현 단계는 사용자 선택 후 `apps/mobile/src/design-tokens.ts`와 주요 화면 hierarchy에 반영한다.

### 11. Black-and-white redesign plan

사용자 피드백에 따라 샷건 방향을 폐기하고 더 깔끔하고 명확한 흑백 미니멀 UI로 전환한다.

목표:

- 첫 화면은 문제를 찍거나 고르는 영역만 남긴다.
- 불필요한 설명 문구와 장식적 색을 제거한다.
- 색상은 검정/흰색과 회색만 사용한다.
- 인식 확인 뒤 코칭 첫 화면에는 첫 역질문과 힌트 1이 바로 보이게 한다.
- 최종 풀이와 비슷한 문제 답은 계속 명시적 행동 뒤에만 둔다.

제품 제약:

- 인식 확인 전 코칭 생성 금지는 유지한다.
- 역질문은 생략하지 않는다. 힌트 1이 바로 보이더라도 질문이 먼저 온다.
- 최종 답은 힌트 1·2와 초기 코칭 화면에 노출하지 않는다.
- 실제 화면 구현 후 Expo web surface에서 확인한다.

구현 범위:

1. `DESIGN.md`를 흑백 미니멀 기준으로 갱신한다.
2. `apps/mobile/src/design-tokens.ts`를 monochrome 토큰으로 바꾼다.
3. `apps/mobile/src/m1-components.tsx`의 카드/버튼/텍스트 밀도를 줄인다.
4. 홈, 이미지 intake, 인식 확인, 코칭 화면의 불필요한 문구를 제거한다.
5. `INITIAL_COACHING_VISIBILITY`를 힌트 1 노출 상태로 조정하고 테스트를 갱신한다.
6. Expo web surface에서 홈 → 업로드 → 인식 확인 → 코칭 첫 화면을 확인한다.

Done when:

- [x] 첫 화면이 촬영/사진 선택 중심으로 보인다.
- [x] 코칭 첫 화면에서 첫 역질문과 힌트 1이 보이고 최종 답은 보이지 않는다.
- [x] 흑백/회색 외 장식 색이 모바일 UI 토큰에서 제거된다.
- [x] 불필요한 설명 카드가 줄어든다.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`가 통과한다.
  - 마지막 피드백 카드 배치 수정 전에는 모두 통과했다.
  - 마지막 수정 뒤 재실행 중 `pnpm`이 `node_modules`를 재구성하려다 네트워크 제한과 캐시 누락으로 중단되어 재검증이 제한됐다.
- [x] Expo web surface QA가 완료된다.

Implementation result:

- `DESIGN.md`를 흑백 미니멀 방향으로 갱신하고 이전 샷건 후보를 구현 대상에서 제외했다.
- 모바일 토큰을 검정/흰색/회색 중심으로 바꾸고 카드/버튼 반경과 밀도를 낮췄다.
- 홈은 큰 촬영 영역, `카메라 열기`, `사진 선택`만 남기는 구조로 단순화했다.
- 이미지 intake, 인식 확인, 코칭 화면의 안내 문구와 설명 카드를 줄였다.
- 코칭 초기 visibility를 힌트 1 노출 상태로 바꿨다.
- 코칭 첫 화면은 `질문` 카드와 `힌트 1` 카드가 먼저 보이며, 최종 풀이/검산/비슷한 문제 답은 계속 명시적 공개 뒤에만 보인다.
- 피드백 카드는 코칭 첫 화면에서 제거하고 최종 풀이 공개 이후로 미뤘다.
- Expo web surface에서 390px 모바일 폭으로 홈 → 사진 선택 → 업로드 → 인식 확인 → 코칭 첫 화면을 확인했다.
- 관찰된 잔여 리스크: 웹 파일 선택 중 Expo 내부 `removeChild` 콘솔 오류가 1건 발생했지만, 업로드와 이후 코칭 흐름은 정상 완료됐다.

## M8-4 실행 계획

### 1. Goal

M8 closeout의 `제한 진행` 상태를 실제 폰 smoke와 부모 3~5회 파일럿 테스트를 시작할 수 있는 운영 준비 상태로 닫는다.

M8-4는 공개 베타 준비 완료가 아니다. 새 기능을 늘리기보다, 지금 있는 MVP 흐름을 실제 핸드폰에서 밟아 보고 부모 파일럿을 안전하게 진행할 수 있도록 runbook, 관찰 템플릿, 중단 조건, 개인정보-safe 기록 방식을 정리한다.

### 2. Current readiness snapshot

- M8-3 closeout 결과는 `제한 진행`이다.
- 40문제 내부 알파 fixture, API 리허설, Expo web surface QA는 준비됐다.
- 실제 부모 5~10명 테스트, 100문제 평가셋, 법률 검토는 아직 완료되지 않았다.
- 사용자는 빠르게 샘플 앱을 핸드폰에서 만져 보고 이후 디자인 polish로 넘어가고 싶어 한다.

### 3. Product constraints

- 부모 우선 흐름을 유지한다.
- 아이가 직접 답을 받는 학생용 튜터로 바꾸지 않는다.
- 인식 확인 전 코칭 생성 금지, 답 우선 노출 금지, 힌트 점진 공개를 테스트 항목에 포함한다.
- 관찰 기록에는 문제 전문, 원본 이미지, 아이 식별 정보, 프롬프트 전문, 원본 AI 응답 전문을 남기지 않는다.
- 실제 부모 테스트를 수행하지 않았으면 완료로 표시하지 않는다.

### 4. Scope decision

M8-4는 “내부 알파 1차 운영 준비”로 제한한다.

구현/문서 범위:

1. `docs/13_INTERNAL_ALPHA_RUNBOOK.md`를 추가한다.
   - 진행자 준비물
   - 로컬 API와 Expo 앱 실행 방식
   - 핸드폰 smoke 절차
   - 부모 파일럿 진행 순서
   - 중단 조건
   - 기록 금지 항목
2. `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`를 추가한다.
   - 테스트 1회당 작성할 최소 관찰 필드
   - 개인정보-safe 작성 규칙
   - P0/P1 분류 기준
3. `docs/11_INTERNAL_ALPHA_READINESS.md`와 README에서 M8-4 산출물을 연결한다.
4. runbook dry-run을 agent가 가능한 범위에서 실행한다.
   - 문서 링크/명령 확인
   - 로컬 네트워크 IP 확인 명령 검증
   - Expo web/API fixture surface를 통한 절차 재확인

명시적으로 제외:

- 실제 부모 테스트 수행
- 공개 베타 승인
- 디자인 polish
- 계정, 결제, 리포트, 장기 기록
- 중등/고등 또는 타 과목 확장
- 정식 법률 문서 작성 대행

### 5. Human-dependent boundary

agent가 완료할 수 있는 항목:

- runbook과 관찰 템플릿 작성
- 개인정보-safe 기록 기준 정리
- 폰 smoke 준비 절차 문서화
- 가능한 로컬 dry-run과 자동 검증

사용자 또는 실제 참여자가 필요한 항목:

- 실제 핸드폰에서 Expo Go 또는 네이티브 앱을 실행해 터치감 확인
- 부모 3~5회 파일럿 테스트 수행
- 실제 관찰 결과 제공
- 디자인 polish 방향 선택
- 공개 베타 승인 여부 결정

### 6. Testing and manual QA

자동 검증:

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
env CI=true pnpm test
env CI=true pnpm eval
```

문서 검증:

- 새 문서에 문제 전문, 이미지 data URL, 비밀키, 프롬프트 전문, 원본 AI 응답 전문이 없는지 `rg`로 확인한다.
- README와 readiness 문서가 새 runbook/template을 참조하는지 확인한다.

surface dry-run:

- M8-3과 동일한 local fixture API와 Expo web static surface로 핵심 경로를 한 번 더 확인한다.
- 실제 폰 테스트는 사용자 기기에서 수행해야 하므로, runbook에는 Mac LAN IP와 `EXPO_PUBLIC_API_BASE_URL` 설정 절차를 명시한다.

### 7. Implementation result

- `docs/13_INTERNAL_ALPHA_RUNBOOK.md`를 추가해 진행자 준비물, 로컬 API 실행, Mac LAN IP 확인, Expo 폰 smoke, 부모 3~5회 파일럿, 중단 조건, 기록 금지 항목을 정리했다.
- `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`를 추가해 1회 테스트 기록 양식, 개인정보-safe 작성 규칙, P0/P1 분류 기준, 스프레드시트 컬럼을 정리했다.
- README와 `docs/11_INTERNAL_ALPHA_READINESS.md`가 새 runbook/template을 참조하도록 갱신했다.
- `docs/12_M8_CLOSEOUT.md`에는 M8-4 운영 문서가 다음 실행 산출물임을 연결했다.
- 실제 부모 테스트와 실제 물리 핸드폰 검증은 수행하지 않았고, 사용자 기기에서 runbook대로 진행해야 하는 human-dependent 항목으로 남겼다.

검증 결과:

- `ipconfig getifaddr en0`는 현재 샌드박스에서 `ipconfig_server_port failed`로 실패했다. fallback인 `ifconfig`로 LAN IP `192.168.3.23` 확인 절차를 검증했다.
- Expo web export: `env CI=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 pnpm --filter @parent-coach/mobile exec expo export --platform web --output-dir /private/tmp/parent-coach-m8-4-web` 통과.
- fixture API + static Expo web dry-run에서 홈, 사진 가져오기, 임시 업로드, 인식 확인, 확인 전 코칭 미노출, 코칭 도달, 초기 최종 답 미노출, 피드백 선택지 노출을 확인했다.
- 문서 링크 스캔에서 README, readiness, closeout, plan의 새 문서 참조를 확인했다.
- 개인정보/비밀 스캔은 새 문서에서 금지 데이터를 찾지 못했다. 기존 `PLANS.md`의 guardrail 예시 문구만 매칭됐다.
- `env CI=true pnpm format:check` 통과.
- `env CI=true pnpm lint` 통과.
- `env CI=true pnpm typecheck` 통과.
- `env CI=true pnpm test` 통과: 21 files, 92 tests.
- `env CI=true pnpm eval`은 샌드박스 IPC 제한으로 1회 실패했고, 외부 실행에서 통과했다. recognition 5 cases 0 failed, coaching 35 cases 0 failed, alpha readiness `ready`, internal alpha rehearsal `ready`.

### 8. Done when

- [x] `docs/13_INTERNAL_ALPHA_RUNBOOK.md`가 추가된다.
- [x] `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`가 추가된다.
- [x] README와 `docs/11_INTERNAL_ALPHA_READINESS.md`가 M8-4 산출물을 참조한다.
- [x] runbook이 폰 smoke와 부모 파일럿 절차를 구분한다.
- [x] 실제 부모 테스트 미수행 상태를 거짓 없이 기록한다.
- [x] 문서 개인정보 스캔과 자동 검증이 통과한다.
- [x] 가능한 범위의 surface dry-run이 완료된다.

## M8-3 실행 계획

### 1. Goal

M8을 “내부 알파 준비 완료/제한 진행/차단” 중 하나로 닫을 수 있게 만든다.

M8-3의 목표는 새 제품 범위를 늘리는 것이 아니라, 지금까지 만든 M8-1 평가셋과 M8-2 API 리허설을 실제 Expo surface 수동 확인, 내부 부모 테스트 기록 양식, 공개 베타 전 gap 판정으로 묶어 최종 closeout 산출물을 남기는 것이다.

### 2. Current readiness snapshot

- M8-1: 내부 알파 fixture 40문제 분포는 준비됐다.
- M8-2: fake adapter 기반 API 리허설은 `ready`를 보고한다.
- `docs/11_INTERNAL_ALPHA_READINESS.md`에는 아직 실제 기기 또는 Expo surface에서 홈 → 업로드 → 인식 확인 → 코칭 → 피드백 흐름을 수동 확인하는 항목이 남아 있다.
- 실제 부모 5~10명 테스트와 공개 베타 전 100문제 평가셋 확장 계획은 아직 closeout 산출물로 정리되지 않았다.
- 현재 API 기본 실행은 OpenAI 환경 설정이 없으면 recognition/coach가 안전 실패한다. 따라서 surface 리허설은 실 OpenAI 키 환경 또는 명시적 fixture/dev mode 중 하나가 필요하다.

### 3. Product constraints

- 부모 우선 흐름을 유지한다. 학생용 직접 풀이 앱, 숙제 전체 풀이, 범위 확장은 하지 않는다.
- 인식 확인 전 코칭 생성 금지를 실제 surface에서 다시 확인한다.
- 첫 결과와 1·2단계 힌트에 최종 답이 보이지 않아야 한다.
- 최종 풀이는 명시적 행동 뒤에만 보인다.
- 비슷한 문제의 답과 풀이도 접힌 상태를 유지한다.
- 피드백은 선택지만 기록하고 자유 텍스트를 받지 않는다.
- closeout 문서와 관찰 기록에는 문제 전문, 원본 이미지, 아이 식별 정보를 남기지 않는다.
- 공개 베타 전 남은 항목이 있으면 `ready`로 과대 표시하지 않는다.

### 4. Scope decision

M8-3은 “내부 알파 closeout 패킷과 판정”으로 제한한다.

구현/문서 범위:

1. `docs/12_M8_CLOSEOUT.md`를 추가한다.
   - 자동 검증 결과
   - surface 수동 QA 결과
   - 내부 부모 테스트 관찰 요약
   - 공개 베타 전 gap
   - 최종 판정: `진행 가능`, `제한 진행`, `차단`
2. surface 수동 QA를 실행 가능하게 한다.
   - 우선순위 A: 실제 OpenAI 키가 있는 환경에서 API + Expo surface를 밟는다.
   - 우선순위 B: 키가 없으면 production에서는 꺼져 있는 명시적 local fixture mode 또는 fixture server를 만들어 Expo surface를 밟는다.
   - fixture mode를 만들 경우 기본값은 off이고, 운영/배포 환경에서 자동 활성화되지 않게 한다.
3. 실제 surface에서 아래 경로를 확인한다.
   - 홈 → 업로드/사진 선택 → 인식 중 → 인식 확인/수정 → 코칭 생성 → 역질문 → 힌트 1·2·3 → 최종 풀이 공개 → 비슷한 문제 답 접힘/공개 → 피드백 제출
4. 실패 surface를 확인한다.
   - 복수 문제 또는 그림 누락 인식 실패
   - OpenAI 미설정 또는 모델 비활성화
   - 검산 불일치
   - rate limit
5. `docs/11_INTERNAL_ALPHA_READINESS.md` 체크리스트를 closeout 결과와 맞춰 갱신한다.
6. 공개 베타 전 100문제 평가셋 확장 계획을 closeout에 요약한다.

명시적으로 제외:

- 실제 공개 베타 오픈
- 결제, 계정, 장기 리포트
- 중등/고등 또는 타 과목 확장
- 자유 텍스트 피드백
- 외부 analytics/APM 도입
- 정식 법률 문서 작성 대행

### 5. Human-dependent boundary

agent가 직접 완료할 수 있는 항목:

- 자동 검증 재실행
- fixture 또는 실키 기반 API/Expo surface 리허설
- closeout 문서와 체크리스트 정리
- 공개 베타 gap 판정 초안 작성

사용자 또는 실제 참여자가 필요한 항목:

- 부모 5~10명 내부 사용성 테스트 수행
- 실제 참여자 관찰 결과 제공
- 정식 개인정보 처리방침/약관 법률 검토
- 공개 베타 승인 여부 결정

부모 테스트 데이터가 없으면 M8-3 최종 판정은 `제한 진행` 또는 `차단`으로 기록하고, “부모 테스트 완료”를 거짓으로 표시하지 않는다.

### 6. Proposed closeout output

`docs/12_M8_CLOSEOUT.md`는 다음 구조로 작성한다.

1. `Executive summary`
   - M8 closeout 판정
   - 공개 베타 가능 여부
   - 가장 큰 남은 리스크 3개
2. `Evidence`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm eval`
   - Expo/API surface QA
3. `Internal alpha observations`
   - 사람 테스트가 있으면 익명 요약
   - 없으면 미실시로 명시
4. `Acceptance review`
   - `docs/05_ACCEPTANCE_AND_EVALS.md` AC-01~AC-08별 통과/제한/차단
5. `Beta gaps`
   - 100문제 평가셋 확장
   - 법률 검토
   - 운영 rate limit/storage 결정
   - 오류 신고/피드백 보관 기간
6. `Decision`
   - `진행 가능`, `제한 진행`, `차단` 중 하나

### 7. Testing and manual QA

자동 검증:

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
./node_modules/.bin/tsc --noEmit -p tsconfig.json
env CI=true pnpm test
env CI=true pnpm eval
```

surface QA:

- API와 Expo surface를 동시에 띄운다.
- 정상 문제 1건으로 전체 흐름을 밟는다.
- 1·2단계 힌트와 최종 풀이 공개 전 화면에서 답이 보이지 않는지 확인한다.
- 비슷한 문제 답이 기본 접힘인지 확인한다.
- 피드백 선택지 제출 후 자유 텍스트가 없는지 확인한다.
- 실패 상태 2건 이상을 실제 surface에서 확인한다.

closeout 검증:

- `docs/12_M8_CLOSEOUT.md`에 문제 전문, 이미지 data URL, 프롬프트 전문, raw AI 응답이 없는지 `rg`로 확인한다.
- `docs/11_INTERNAL_ALPHA_READINESS.md` 체크리스트가 실제 증거와 모순되지 않는지 확인한다.

### 8. Risks and mitigations

- **부모 테스트 없이 M8을 과대 완료할 위험**
  - 대응: 실제 참여자 데이터가 없으면 closeout 판정을 `제한 진행` 또는 `차단`으로 남긴다.
- **fixture mode가 운영에서 켜질 위험**
  - 대응: fixture mode가 필요하면 명시적 env flag, non-production guard, 테스트를 둔다.
- **surface QA가 API rehearsal과 다른 실패를 찾을 위험**
  - 대응: M8-3 범위 안에서 P0 흐름 차단 버그만 고치고, 큰 UX 개편은 다음 마일스톤으로 분리한다.
- **관찰 기록에 민감 정보가 들어갈 위험**
  - 대응: 관찰 양식은 문제 domain/skill, 단계, requestId, UX 메모만 허용한다.
- **공개 베타 gap을 구현 작업으로 확장할 위험**
  - 대응: M8-3은 gap 판정까지로 제한하고, 100문제 확장·법률 검토·운영 인프라는 별도 후속 계획으로 둔다.

### 9. Done when

- [x] `docs/12_M8_CLOSEOUT.md`가 추가된다.
- [x] 자동 검증 결과가 closeout에 기록된다.
- [x] Expo 또는 실제 기기 surface QA 결과가 closeout에 기록된다.
- [x] 정상 흐름에서 답 우선 노출이 없음을 확인한다.
- [x] 실패 흐름에서 임의 풀이가 노출되지 않음을 확인한다.
- [x] 내부 부모 테스트 수행 여부와 결과가 거짓 없이 기록된다.
- [x] `docs/11_INTERNAL_ALPHA_READINESS.md` 체크리스트가 closeout 결과와 맞게 갱신된다.
- [x] 공개 베타 전 gap과 최종 판정이 명확히 기록된다.
- [x] 검증 명령과 closeout 문서 개인정보 스캔이 완료된다.

### 10. Implementation result

- `docs/12_M8_CLOSEOUT.md`를 추가하고 M8 판정을 `제한 진행`으로 기록했다.
- 실제 부모 5~10명 테스트는 수행하지 않았다고 명시했다. 따라서 공개 베타는 아직 차단 상태다.
- `docs/11_INTERNAL_ALPHA_READINESS.md`와 README를 M8 closeout 기준으로 갱신했다.
- 모델 키 없이 surface QA를 반복할 수 있도록 production에서 꺼지는 `ENABLE_LOCAL_AI_FIXTURES` 경로를 추가했다.
- Expo web에서 막힌 `expo-file-system` 준비/업로드 문제를 web-safe multipart 업로드 경로로 해결했다.
- 정적 Expo web surface에서 API를 호출할 수 있도록 `ALLOWED_WEB_ORIGINS` 기반 CORS allowlist를 추가했다.
- 브라우저 번들에서 HTTP error class 경계가 흔들릴 때도 구조화 에러 body를 읽을 수 있게 보강했고, fallback copy를 모델/API 사용 불가 문구로 조정했다.
- Playwright로 정상 flow와 실패 flow를 확인했다.
  - 정상 flow: 홈 → 사진 선택 → 임시 업로드 → 인식 확인 → 부모 확인 → 코칭 → 힌트 1·2·3 → 최종 풀이 → 비슷한 문제 풀이 → 피드백 제출.
  - 답 누출: 첫 화면, 역질문, 힌트 1·2, 힌트 3 이후 최종 풀이 클릭 전까지 최종 답이 보이지 않음을 확인했다.
  - 비슷한 문제: 별도 풀이 보기 전까지 비슷한 문제 답이 보이지 않음을 확인했다.
  - 실패 flow: unsupported image는 업로드 전 안전 실패, recognition disabled는 코칭/풀이 없이 모델/API 사용 불가 문구로 멈춤.
  - 반응형: 768px와 1280px에서 horizontal overflow 없음.
- API 수동 smoke로 정상 flow, 인식 확인 전 coach 차단, unsupported upload, invalid feedback을 확인했다.
- 검증:
  - `pnpm format:check`: 통과
  - `pnpm lint`: 통과
  - `pnpm typecheck`: 통과
  - `pnpm test`: 통과
  - `pnpm eval`: sandbox `tsx` IPC 제한 때문에 외부 실행으로 재시도해 통과
- closeout 개인정보 스캔 결과, closeout/readiness/README에는 원본 이미지 data URL, 비밀키, 문제 전문, 프롬프트 전문, 원본 AI 응답 전문을 새로 기록하지 않았다.

## M8-2 실행 계획

### 1. Goal

부모 5~10명 내부 사용성 테스트를 시작하기 전에, 현재 앱/API가 내부 알파의 핵심 흐름을 한 번에 통과하는지 agent가 재현 가능한 방식으로 확인한다.

M8-2는 실제 부모 테스트 수행이 아니다. 실제 참여자를 부르기 전, fake recognition/coaching adapter와 API surface를 사용해 홈 이후 핵심 경로와 피드백·로그 마스킹을 리허설하고, 진행 가능/제한 진행/차단 판정을 남기는 게 목표다.

### 2. Current readiness snapshot

- M8-1에서 alpha readiness fixture는 40개, domain 부족분 0, metadata 누락 0으로 `ready`다.
- `docs/11_INTERNAL_ALPHA_READINESS.md`에는 아직 실제 기기 또는 Expo surface의 홈 → 업로드 → 인식 확인 → 코칭 → 피드백 흐름 수동 확인 항목이 남아 있다.
- API 단위 테스트는 세션/업로드/recognition/coach/feedback을 각각 다루지만, 내부 알파 리허설 관점의 한 번짜리 end-to-end 판정 산출물은 없다.
- 실제 부모 테스트를 시작하려면 requestId, 피드백, redacted event, 첫 역질문 도달 여부를 한 보고서로 확인할 수 있어야 한다.

### 3. Product constraints

- 부모 테스트 전 리허설도 부모 우선 흐름으로 본다. 아이 단독 튜터나 답 먼저 공개 흐름으로 바꾸지 않는다.
- 인식 확인 전에는 코칭을 생성하지 않는다.
- 1·2단계 힌트와 첫 코칭 surface에는 최종 답을 노출하지 않는다.
- 피드백은 선택지만 기록하고 자유 텍스트를 받지 않는다.
- 리허설 로그와 보고서에는 원본 이미지, 문제 전문, 프롬프트 전문, raw AI response를 남기지 않는다.
- fake adapter를 사용하더라도 모델 비활성화/검산 실패를 가짜 성공으로 만들지 않는다.
- `ready`는 내부 알파 리허설 통과를 의미할 뿐 공개 베타 승인이 아니다.

### 4. Scope decision

M8-2는 “실제 부모 테스트 전 리허설 게이트”로 제한한다.

구현 범위:

1. `evals/runners/internal-alpha-rehearsal.ts`를 추가한다.
2. runner는 Hono app을 직접 생성하고 fake recognition/coaching adapter를 주입한다.
3. runner는 아래 흐름을 실제 API request로 실행한다.
   - `POST /v1/problem-sessions`
   - `POST /v1/problem-sessions/:sessionId/image`
   - `POST /v1/problem-sessions/:sessionId/recognize`
   - `PATCH /v1/problem-sessions/:sessionId/problem`
   - `POST /v1/problem-sessions/:sessionId/coach`
   - `POST /v1/problem-sessions/:sessionId/feedback`
4. runner는 첫 역질문 도달 여부, 힌트 1·2 답 누출 여부, 비슷한 문제 검증 여부, 피드백 제출 여부, redacted event 위반 여부를 요약한다.
5. `pnpm eval`에 rehearsal runner를 연결해 M8 readiness와 함께 실행한다.
6. `docs/11_INTERNAL_ALPHA_READINESS.md`를 M8-2 기준으로 갱신한다.
7. README에 rehearsal runner의 의미를 설명한다.

명시적으로 제외:

- 실제 부모 5~10명 테스트 수행
- 실제 OpenAI 호출
- 실제 카메라 권한 다이얼로그 검증
- 외부 analytics/APM 연동
- 자유 텍스트 피드백
- 공개 베타 승인

### 5. Proposed rehearsal output

runner는 JSON summary를 출력한다.

필수 필드:

- `status: "ready" | "blocked"`
- `stages`
  - `sessionCreated`
  - `imageUploaded`
  - `recognized`
  - `problemConfirmed`
  - `coachingReady`
  - `feedbackSubmitted`
- `firstQuestionReady`
- `earlyHintAnswerLeakCount`
- `similarProblemStatus`
- `feedbackChoice`
- `redactionCheck`
- `observedStages`
- `requestIds`

### 6. Testing

- runner 단위/통합 테스트
  - happy path가 `ready`를 반환한다.
  - 인식 확인 전 coach 요청은 기존 API에서 차단된다.
  - 1·2단계 힌트에 최종 답이 있으면 `blocked`다.
  - operation event JSON에 `problemText`, `data:image`, `prompt`, `rawResponse`가 있으면 실패한다.
- eval 연결 테스트
  - `pnpm eval`이 recognition, coaching, alpha readiness, internal alpha rehearsal을 모두 실행한다.

### 7. Verification commands

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
env CI=true pnpm test
env CI=true pnpm eval
```

M8-2 구현 후 manual QA:

- `pnpm eval` 출력에서 internal alpha rehearsal summary가 `ready`인지 확인한다.
- summary에 문제 전문이나 이미지 data URL이 직접 포함되지 않는지 확인한다.
- requestId가 feedback/operation event에 연결되는지 확인한다.

### 8. Risks and mitigations

- **runner가 실제 UX를 과대 대표할 위험:** API 흐름은 실제 터치/카메라 UX와 다르다.
  - 대응: M8-2는 API 리허설과 Expo surface 확인으로 제한하고, 실제 부모 테스트는 별도 M8-3로 남긴다.
- **fake adapter 때문에 모델 실패를 못 볼 위험:** fake adapter는 모델 품질을 검증하지 않는다.
  - 대응: 모델 품질은 M8-1 fixture/eval과 별도 실호출 smoke에서 다룬다. M8-2는 흐름·로그·피드백 게이트다.
- **보고서에 민감 정보가 들어갈 위험:** 리허설에서 문제 전문을 그대로 출력하면 개인정보 원칙과 충돌한다.
  - 대응: summary는 stage, status, requestId, counts만 출력한다.

### 9. Done when

- [x] M8-2 계획이 `PLANS.md`에 기록된다.
- [x] internal alpha rehearsal runner가 추가된다.
- [x] runner happy path와 차단 조건 테스트가 추가된다.
- [x] `pnpm eval`이 rehearsal runner를 실행한다.
- [x] rehearsal summary가 `ready`, feedback submitted, redaction passed를 보고한다.
- [x] `docs/11_INTERNAL_ALPHA_READINESS.md`와 README가 M8-2 기준을 설명한다.
- [x] 검증 명령과 manual QA가 완료된다.

### 10. Implementation result

- `evals/runners/internal-alpha-rehearsal.ts`를 추가해 fake recognition/coaching adapter로 실제 API surface의 세션 생성 → 업로드 → 인식 → 부모 확인 → 코칭 → 피드백 경로를 실행한다.
- summary는 stage 통과 여부, 첫 역질문 준비 여부, 1·2단계 힌트 답 누출 수, 비슷한 문제 상태, 피드백 선택지, redaction 상태, observed stage, requestId만 출력한다.
- 문제 전문, 이미지 data URL, 프롬프트 전문, raw AI response는 summary와 operation event에 남기지 않는다.
- `apps/api/test/internal-alpha-rehearsal.test.ts`가 happy path `ready`와 초기 힌트 답 누출 `blocked` 조건을 검증한다.
- `pnpm eval`에 rehearsal runner를 연결하고 README, `docs/11_INTERNAL_ALPHA_READINESS.md`, `evals/runners/README.md`를 M8-2 기준으로 갱신했다.

### 11. Verification evidence

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
./node_modules/.bin/tsc --noEmit -p tsconfig.json
env CI=true pnpm test
env CI=true pnpm eval
```

- `pnpm test`: 18 files, 85 tests passed.
- `pnpm eval`: recognition 5 cases, coaching 35 cases, alpha readiness `ready`, internal alpha rehearsal `ready`.
- sandbox 안의 최초 `pnpm eval`은 `tsx` 임시 IPC pipe 생성에서 `EPERM`으로 실패했고, 같은 명령을 승인 실행해 통과했다.
- rehearsal summary는 `feedbackSubmitted: true`, `earlyHintAnswerLeakCount: 0`, `similarProblemStatus: "ok"`, `redactionCheck: "passed"`를 보고했다.

### 12. Remaining limits

- M8-2의 `ready`는 fake adapter 기반 API 리허설 통과다. 실제 부모 5~10명 테스트, 실제 OpenAI 품질 검증, 공개 베타 승인이 아니다.
- 실제 기기 또는 Expo surface에서 홈 → 업로드 → 인식 확인 → 코칭 → 피드백 흐름을 직접 누르는 체크는 다음 단계로 남긴다.

## M8-1 실행 계획

### 1. Goal

내부 알파를 사람에게 열기 전에 자동·수동 평가의 최소 표본을 40문제로 채운다.

M8-1의 목표는 `pnpm eval`의 alpha readiness 요약이 fixture 수, domain 분포, 필수 metadata 기준에서 `ready`가 될 수 있게 만드는 것이다. 이 단계는 실제 부모 5~10명 테스트, 공개 베타 승인, 100문제 평가셋 완성이 아니다.

### 2. Current readiness snapshot

- 현재 fixture는 recognition 5개, coaching 1개로 총 6개다.
- `alpha-readiness-eval`은 현재 목표 40개 대비 34개 부족을 보고한다.
- 기존 recognition fixture 5개에는 `domain`, `skill`, `source` metadata가 부족해 `missingMetadata`가 발생한다.
- 기존 5개 recognition fixture는 다음처럼 M8 분포에 재분류할 수 있다.
  - 정상 분수 나눗셈 인식 1개: `number_and_operations`
  - 흐린 분수, 그림 누락, 복수 문제, 범위 밖 4개: `intentional_failure_or_unsupported`
- 기존 coaching fixture 1개는 `number_and_operations` / `fraction_division`이다.
- 따라서 M8-1에서 새로 필요한 fixture는 34개다.

### 3. Product constraints

- fixture는 자체 작성 또는 사용 허가된 문제만 사용한다.
- 대한민국 초등학교 5~6학년 수학, 한국어, 한 번에 한 문제만 포함한다.
- 문제 전문은 eval fixture에만 두고 운영 로그·피드백 이벤트·문서 예시에 복사하지 않는다.
- 평가셋 확장을 이유로 중등·고등, 타 과목, 여러 문제 일괄 풀이 범위를 열지 않는다.
- 1·2단계 힌트에는 최종 답 또는 답을 사실상 확정하는 숫자를 넣지 않는다.
- 검산 가능한 fixture만 `verified`로 두고, 검산 범위 밖이면 `partially_verified` 또는 `unverified`로 명시한다.
- 비슷한 문제는 같은 skill을 유지하되 원문 문장을 복제하지 않는다.

### 4. Scope decision

M8-1은 “평가셋 준비”로 제한한다.

구현 범위:

1. 기존 recognition fixture 5개에 `id`, `domain`, `skill`, `source` metadata를 추가한다.
2. 새 coaching fixture 34개를 자체 작성한다.
3. 새 fixture는 내부 알파 40문제 분포를 정확히 맞춘다.
4. 각 coaching fixture는 `sourceProblemText`, `expectedAnswer`, `expectedVerification`, `forbiddenEarlyHintLeaks`, `similarProblemConstraints`, `response`를 포함한다.
5. 기존 `coaching-contract-eval`과 `alpha-readiness-eval`이 새 fixture 전체를 검사하게 유지한다.
6. 필요하면 `alpha-readiness-eval`을 강화해 목표 domain 분포가 충족되지 않으면 `not_ready`로 남기고, `ready` 조건에는 domain 부족분 0을 포함한다.
7. `evals/fixtures/README.md`에 M8-1 작성 규칙과 검토 상태를 갱신한다.

명시적으로 제외:

- 실제 부모 테스트 수행
- 공개 베타 승인
- 100문제 평가셋 완성
- OpenAI 실호출 평가 자동화
- 외부 교재 문항 대량 복제
- 자유 텍스트 피드백 수집
- 제품 UX나 프롬프트의 대규모 개편

### 5. Target fixture distribution

기존 fixture를 metadata 보강 후 다음처럼 계산한다.

| Domain                               | 목표 | 기존 인정 | M8-1 신규 |
| ------------------------------------ | ---: | --------: | --------: |
| `number_and_operations`              |   12 |         2 |        10 |
| `change_and_relationships`           |    8 |         0 |         8 |
| `geometry_and_measurement`           |   10 |         0 |        10 |
| `data_and_possibility`               |    6 |         0 |         6 |
| `intentional_failure_or_unsupported` |    4 |         4 |         0 |
| **Total**                            |   40 |         6 |        34 |

### 6. Fixture content plan

`number_and_operations` 신규 10개:

- 자연수 혼합 계산 1개
- 약수·배수 또는 공배수 문장제 1개
- 분수 덧셈·뺄셈 2개
- 분수 곱셈 1개
- 분수 나눗셈 2개
- 소수 곱셈·나눗셈 2개
- 어림 또는 답의 타당성 확인 1개

`change_and_relationships` 신규 8개:

- 비와 비율 2개
- 비례식 또는 대응 관계 2개
- 규칙 찾기 2개
- 간단한 식 세우기 2개

`geometry_and_measurement` 신규 10개:

- 평면도형 넓이 3개
- 입체도형 부피 또는 겉넓이 2개
- 각도·둘레·길이 2개
- 단위 변환 포함 측정 2개
- 그림 조건이 필요한 문제의 안전한 `unverified` 또는 `partially_verified` 예 1개

`data_and_possibility` 신규 6개:

- 평균 2개
- 표 읽기 2개
- 그래프 또는 자료 비교 1개
- 가능성·경우의 수 기초 1개

### 7. Fixture authoring rules

- 모든 문제는 짧은 자체 작성 문장으로 만든다.
- 한 fixture에 한 문제만 넣는다.
- 초등 5~6학년 용어를 사용한다.
- 답이 유일하거나 명확히 채점 가능한 문제만 `status: "ok"`로 둔다.
- `expectedAnswer`와 `finalSolution.answer`는 같은 값을 가리킨다.
- `finalSolution.steps[].expression`은 가능한 경우 `packages/math-validation`이 계산할 수 있는 좁은 산술식으로 둔다.
- `forbiddenEarlyHintLeaks`에는 최종 답 문자열과 핵심 숫자를 모두 넣는다.
- 1·2단계 힌트는 방향과 연산 선택까지만 제공한다.
- 3단계 힌트는 식 또는 다음 행동까지 허용하되 최종 계산 결과는 가능한 한 남긴다.
- `similarProblem.problemText`는 원문과 문장 구조·맥락을 바꾼다.
- `similarProblem.verification.status`는 검산 가능 여부와 일치시킨다.

### 8. Proposed implementation

- `evals/fixtures/recognition-cases.json`
  - 기존 5개 case에 `id`, `domain`, `skill`, `source`를 추가한다.
  - 실패·지원불가 fixture는 `domain: "intentional_failure_or_unsupported"`로 둔다.
- `evals/fixtures/coaching-cases.json`
  - 기존 1개 case는 유지한다.
  - 신규 34개 case를 domain별로 추가한다.
  - 모든 case에 `source: "self_authored"`를 추가한다.
- `evals/runners/alpha-readiness-eval.ts`
  - `missingDomainCounts`가 하나라도 0보다 크면 `status: "not_ready"`로 남기도록 조건을 명확히 한다.
  - 필요하면 `missingMetadata`가 어떤 case에서 발생했는지 사람이 찾기 쉬운 요약 필드를 추가한다.
- `evals/fixtures/README.md`
  - M8-1에서 채운 분포와 작성 원칙을 최신화한다.

### 9. Testing

- 계약·eval 테스트
  - 모든 coaching fixture가 `coachingResponseSchema`를 통과한다.
  - 모든 recognition fixture가 `recognitionResponseSchema`를 통과한다.
  - `coaching-contract-eval`이 새 35개 coaching case를 모두 검사한다.
  - 1·2단계 힌트에 `forbiddenEarlyHintLeaks`가 있으면 실패한다.
  - 비슷한 문제가 원문과 중복되면 실패한다.
  - `alpha-readiness-eval`이 총 40개, domain 부족분 0, metadata 누락 0을 보고한다.
- 수동 검토
  - 새 문제 34개가 초등 5~6학년 범위를 벗어나지 않는지 검토한다.
  - 부모가 바로 말할 문장이 비난 없는 한국어인지 검토한다.
  - `verified`로 표시된 fixture가 deterministic 검산 가능 범위인지 확인한다.

### 10. Verification commands

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
env CI=true pnpm test
env CI=true pnpm eval
```

M8-1 구현 후 수동 QA:

- `pnpm eval` 출력에서 alpha readiness가 총 40개, 부족 0개, metadata 누락 0개를 보고하는지 확인한다.
- `coaching-contract-eval` 출력이 35개 coaching case를 검사하는지 확인한다.
- fixture JSON에서 출판 교재 문장 복제, 아이 개인정보, 자유 대화형 튜터 문구가 없는지 `rg`와 수동 표본 검토로 확인한다.

### 11. Risks and mitigations

- **fixture를 빠르게 채우다 품질이 낮아질 위험:** 숫자만 바꾼 반복 문제는 평가셋 다양성을 부풀린다.
  - 대응: domain별 skill 목록을 먼저 정하고, 각 문제의 학습 목표를 다르게 둔다.
- **검산 불가 문제를 `verified`로 과대 표시할 위험:** 도형·자료 문제는 문장 의미 검증이 좁을 수 있다.
  - 대응: 산술식 검산이 명확하지 않으면 `partially_verified` 또는 `unverified`로 둔다.
- **답 누출 검사 회피 위험:** forbidden leak 목록이 부족하면 1·2단계 힌트에 답이 남을 수 있다.
  - 대응: 답 문자열과 핵심 숫자를 모두 leak 목록에 넣고 수동 표본 검토를 한다.
- **저작권 위험:** 교재 스타일을 따라 쓰다 실제 문항과 유사해질 수 있다.
  - 대응: 자체 작성 문항만 사용하고 `source: "self_authored"`를 명시한다.
- **M8 사람 테스트와 혼동할 위험:** readiness가 `ready`가 되어도 실제 기기 흐름과 부모 사용성은 별도다.
  - 대응: M8-1 완료 조건을 평가셋 준비로 제한하고, 부모 5~10명 테스트는 M8-2로 남긴다.

### 12. Done when

- [x] 기존 recognition fixture 5개에 필수 metadata가 추가된다.
- [x] 신규 coaching fixture 34개가 추가된다.
- [x] domain 분포가 내부 알파 40문제 목표와 정확히 맞는다.
- [x] 모든 신규 fixture가 자체 작성 또는 사용 허가 출처를 명시한다.
- [x] `alpha-readiness-eval`이 domain 부족분과 metadata 누락을 ready 조건에 반영한다.
- [x] `pnpm eval`이 readiness total 40, missingTotal 0, missingMetadata 0을 보고한다.
- [x] `coaching-contract-eval`이 35개 coaching case를 검사한다.
- [x] 1·2단계 힌트 답 누출과 비슷한 문제 중복 검사가 통과한다.
- [x] README 또는 fixture README가 M8-1 상태를 정확히 설명한다.

### 13. Implementation result

- 기존 `evals/fixtures/recognition-cases.json` 5개에 `id`, `domain`, `skill`, `source` metadata를 추가했다.
- `evals/fixtures/coaching-cases.json`에 신규 자체 작성 coaching fixture 34개를 추가했다.
- 최종 fixture 분포는 총 40개다.
  - `number_and_operations`: 12
  - `change_and_relationships`: 8
  - `geometry_and_measurement`: 10
  - `data_and_possibility`: 6
  - `intentional_failure_or_unsupported`: 4
- `evals/runners/alpha-readiness-eval.ts`가 `missingDomainCounts`를 `ready` 조건에 포함하도록 강화했다.
- `apps/api/test/alpha-readiness-eval.test.ts`에 domain 목표가 부족하면 총 개수와 metadata가 충분해도 `not_ready`를 보고해야 한다는 회귀 테스트를 추가했다.
- `evals/fixtures/README.md`와 `README.md`를 M8-1 기준으로 갱신했다.

### 14. Verification evidence

- RED 확인: `env CI=true pnpm exec vitest run apps/api/test/alpha-readiness-eval.test.ts`가 domain 부족 ready 오판으로 실패했다.
- GREEN 확인: 같은 테스트가 runner 수정 후 통과했다.
- `env CI=true pnpm format` 통과
- `env CI=true pnpm format:check` 통과
- `env CI=true pnpm lint` 통과
- `env CI=true pnpm typecheck` 통과
- `env CI=true pnpm test` 통과: 17 files / 83 tests
- `env CI=true pnpm eval` 통과:
  - Recognition contract eval checked 5 cases; 0 failed.
  - Coaching contract eval checked 35 cases; 0 failed.
  - Alpha readiness `ready`, totalCases 40, missingTotal 0, missingMetadata 0, domain 부족분 0.

환경 메모:

- sandbox 안에서는 `tsx`가 IPC pipe 생성에서 `EPERM`으로 실패해 `pnpm eval`은 승인된 sandbox 밖 실행으로 확인했다.

### 15. Manual QA notes

- eval runner 자체가 M8-1의 matching surface다. `pnpm eval`로 schema, early hint answer leak, similar problem duplication, readiness 분포를 관찰했다.
- `rg`로 fixture와 관련 문서에서 범위 확장·개인정보·부모 비난 문구 후보를 검색했다. 매치된 `고등학교 미적분`은 의도적 지원불가 recognition fixture이고, `과학/미술/음악`은 동아리 이름이라 과목 확장이 아니다.
- TS 변경 파일에서 `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, non-null assertion, `enum` 금지 패턴 매치가 없었다.

### 16. Remaining limits

- M8-1의 `ready`는 내부 알파 평가셋 40문제 분포와 metadata 준비 상태만 의미한다.
- 실제 부모 5~10명 사용성 테스트, 실제 기기 전체 흐름 확인, 공개 베타 승인 여부 판단은 M8-2 이후로 남긴다.

## M8-0 실행 계획

### 1. Goal

내부 알파를 실제 부모에게 열기 전에, 현재 MVP가 `docs/05_ACCEPTANCE_AND_EVALS.md`의 공개 베타 기준으로 어디까지 준비됐는지 계측 가능하게 만든다.

M8-0은 부모 5~10명 테스트 자체가 아니다. 사람 테스트를 시작하기 전에 필요한 평가셋, 수동 관찰 양식, 피드백/오류 신고 경로, 출시 체크리스트 판정 방식을 준비하는 게 목표다.

### 2. Current readiness snapshot

- 자동 평가 fixture는 현재 recognition 5개, coaching 1개다.
- `docs/05_ACCEPTANCE_AND_EVALS.md`의 내부 알파 최소 기준은 40문제 이상이다.
- 제품 문서에는 `feedback_submitted` 이벤트와 오류·신고 경로가 필요하다고 되어 있지만, 현재 앱/서버에는 실제 피드백 제출 표면이 없다.
- M7에서 requestId, redacted operation event, rate limit, 모델 비활성화 플래그는 API 경계까지 구현됐다.
- M8 전체를 바로 시작하면 “제품 사용성 문제”와 “평가/관찰 체계 부재”가 섞여 원인을 분리하기 어렵다.

### 3. Product constraints

- 부모 우선 제품 정체성을 유지한다. 내부 알파도 아이 단독 사용이나 자유 대화형 튜터 검증으로 바꾸지 않는다.
- 피드백은 “세션 결과가 부모 코칭에 도움이 됐는가”를 보기 위한 최소 선택지로 제한한다.
- 아이 이름, 학교, 성적, 장기 학습 기록, 원본 이미지, 문제 전문을 피드백 로그에 저장하지 않는다.
- 피드백이나 평가를 이유로 답을 더 빨리 노출하거나 역질문 → 힌트 → 최종 풀이 → 비슷한 문제 순서를 깨지 않는다.
- 평가셋은 직접 작성하거나 사용 허가된 문제만 사용한다. 출판 교재 문장을 대량 복제하지 않는다.
- 내부 알파 준비 단계에서는 공개 베타를 승인하지 않는다. 공개 베타 여부는 M8 완료 시 체크리스트로 별도 판단한다.

### 4. Scope decision

M8-0은 “준비 게이트”로 제한한다.

구현/문서화 범위:

1. `docs/05_ACCEPTANCE_AND_EVALS.md` 기준을 실제 실행 가능한 내부 알파 체크리스트로 풀어낸다.
2. 40문제 평가셋 확장을 위한 fixture schema와 분포 계획을 확정한다.
3. 현재 fixture 수를 자동으로 세고 기준 미달을 실패로 보고하는 평가 요약 runner를 추가한다.
4. 부모 테스트 관찰 기록 양식을 문서화한다.
5. 개인정보-safe 피드백/오류 신고의 최소 계약과 API/mobile 표면을 설계한다.
6. 피드백 이벤트에는 requestId/sessionId 수준의 진단 ID와 선택지만 남기고 문제 전문·이미지·프롬프트는 남기지 않는다.
7. README의 현재 상태 문구를 M7/M8-0 기준으로 갱신한다.

명시적으로 제외:

- 실제 부모 5~10명 리크루팅과 테스트 수행
- 공개 베타 승인
- 100문제 평가셋 완성
- 외부 analytics/APM/SaaS 연동
- 장기 사용자 계정, 부모 리포트, 아이 프로필
- 자유 텍스트 피드백 저장
- 원본 문제 이미지 또는 문제 전문을 포함한 오류 신고

### 5. Proposed artifacts

- `docs/11_INTERNAL_ALPHA_READINESS.md`
  - 내부 알파 목표
  - 준비 체크리스트
  - 수동 QA 시나리오
  - 부모 테스트 관찰 양식
  - 차단/진행 판정 기준
- `evals/fixtures/README.md`
  - 40문제 분포 계획과 fixture 작성 규칙 갱신
  - 현재 부족분을 명시
- `evals/runners/alpha-readiness-eval.ts`
  - fixture 개수와 domain 분포 확인
  - required metadata 누락 확인
  - 금지 필드 또는 출처 메모 누락 확인
  - 아직 40문제 미만이면 실패가 아니라 `not_ready` 요약을 출력할지, CI 실패로 볼지 계획에서 결정한다.
- `packages/contracts/src/problem-session.ts`
  - 최소 피드백 요청/응답 계약 후보
  - 선택지: `helpful`, `hard_to_explain`, `misread_problem`, `wrong_solution`
  - 자유 텍스트는 M8-0에서 제외한다.
- `apps/api/src/problem-session-routes.ts`
  - 후보 route: `POST /v1/problem-sessions/:sessionId/feedback`
  - redacted operation event stage 후보: `feedback`
  - 저장은 인메모리 또는 injected sink로 제한한다.
- `apps/mobile/src/m4-screens.tsx`
  - 코칭 결과 하단에 최소 피드백 선택지를 배치한다.
  - 답/풀이 공개 흐름보다 시각적으로 우선하지 않는다.
- `README.md`
  - 현재 구현 상태와 알파 준비 전 남은 게이트를 최신화한다.

### 6. Feedback design

피드백은 내부 알파의 학습 루프를 만들기 위한 최소 신호다.

허용 필드:

- `schemaVersion`
- `sessionId`
- `requestId`
- `choice`
- `submittedAt`
- 선택적 비식별 컨텍스트:
  - `coachingVerificationStatus`
  - `similarProblemStatus`

금지 필드:

- 원본 이미지
- 문제 전문
- 인식된 문제 문장
- 최종 풀이 전문
- AI 프롬프트 전문
- raw AI response
- 아이 이름, 학교, 성적, 연락처
- 자유 서술 피드백

사용자 문구 후보:

- `도움이 됐어요`
- `설명이 어려워요`
- `문제를 잘못 읽었어요`
- `풀이 또는 답이 틀린 것 같아요`

### 7. Evaluation plan

- 내부 알파 전 기준:
  - 평가 fixture 40문제 이상 계획이 문서화되어 있다.
  - 최소 분포: 수와 연산 12, 변화와 관계 8, 도형과 측정 10, 자료와 가능성 6, 의도적 실패·범위 밖 4.
  - 현재 fixture 부족분이 자동 요약된다.
  - schema validity 목표는 100%다.
  - 1·2단계 힌트의 직접 답 누출은 0건이어야 한다.
  - 검증 실패나 모델 비활성화 상태에서 임의 풀이가 노출되지 않는다.
  - 비슷한 문제는 `status: "ok"`일 때만 답/풀이가 열릴 수 있다.
- 수동 알파 관찰:
  - 촬영 시작부터 첫 역질문 확인까지 시간을 기록한다.
  - 부모가 첫 역질문을 그대로 말할 수 있었는지 기록한다.
  - 부모가 힌트를 어떤 단계까지 열었는지 기록한다.
  - 최종 풀이를 보기 전 막힌 이유를 기록한다.
  - 문제 인식 수정 여부와 수정 원인을 기록한다.
  - 오류나 재촬영이 있었다면 requestId만 남긴다.

### 8. Testing

- 계약 테스트
  - 피드백 선택지 schema가 허용 값만 통과한다.
  - 피드백 요청에 문제 전문, 이미지, 자유 텍스트가 있으면 실패한다.
- API 테스트
  - active session에 feedback을 제출하면 201과 requestId를 반환한다.
  - inactive/expired session은 기존 requestId 포함 오류로 실패한다.
  - 피드백 이벤트가 redacted logger에 기록된다.
  - 피드백 이벤트에 문제 전문·이미지·프롬프트가 들어가면 guard가 실패한다.
- 모바일 테스트
  - 코칭 결과 화면에 피드백 선택지가 보인다.
  - 피드백 선택은 최종 풀이/비슷한 문제 답 공개 상태를 바꾸지 않는다.
  - 네트워크 실패 시 부모에게 짧은 재시도 가능 문구를 보여 준다.
- 평가 runner 테스트
  - fixture 수가 40개 미만이면 readiness summary가 `not_ready`를 보고한다.
  - domain/skill metadata 누락을 잡는다.
  - forbidden hint leak 기준이 없는 fixture를 잡는다.

### 9. Verification commands

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
env CI=true pnpm test
env CI=true pnpm eval
```

M8-0 구현 후 수동 QA:

- API surface에서 feedback 제출을 호출하고 event JSON에 문제 전문, 이미지 data URL, 프롬프트, raw response가 없는지 확인한다.
- 모바일 코칭 결과 화면에서 피드백 버튼이 보이되 힌트/최종 풀이/비슷한 문제 공개 순서를 바꾸지 않는지 확인한다.
- fixture readiness runner가 현재 부족분을 정확히 보고하는지 확인한다.

### 10. Risks and mitigations

- **내부 알파를 너무 빨리 시작할 위험:** fixture와 신고 경로 없이 사람 테스트를 시작하면 실패 원인을 분리하기 어렵다.
  - 대응: M8-0을 준비 게이트로 두고, 실제 부모 테스트는 다음 단계에서 한다.
- **피드백이 개인정보 수집으로 커질 위험:** 자유 텍스트를 열면 문제 전문이나 아이 정보가 들어올 수 있다.
  - 대응: M8-0은 선택지만 허용하고 자유 텍스트는 제외한다.
- **평가셋 확장이 제품 범위 확장으로 흐를 위험:** 중등/고등 또는 타 과목 문제를 섞으면 MVP 기준이 흐려진다.
  - 대응: 초등 5~6학년 수학, 한국어, 한 번에 한 문제만 허용한다.
- **자동 점수에 과신할 위험:** schema 통과가 부모 코칭 품질을 보장하지 않는다.
  - 대응: 사람 평가 루브릭과 수동 관찰 양식을 M8-0 산출물에 포함한다.
- **피드백 UI가 정답 공개보다 앞서 보일 위험:** 평가 수집이 코칭 흐름을 방해할 수 있다.
  - 대응: 피드백은 코칭 결과 하단의 보조 행동으로 둔다.

### 11. Done when

- [x] M8-0 준비 문서가 추가된다.
- [x] 40문제 평가셋 분포 계획과 현재 부족분이 문서화된다.
- [x] readiness eval runner 계획 또는 구현 범위가 확정된다.
- [x] 개인정보-safe 피드백/오류 신고 계약이 확정된다.
- [x] 피드백 구현에서 저장하지 않을 금지 데이터가 명시된다.
- [x] 내부 알파 수동 관찰 양식이 준비된다.
- [x] README가 현재 구현 상태와 다음 게이트를 정확히 설명한다.
- [x] 테스트, eval, 수동 QA 계획이 정리된다.

### 12. Implementation result

- `docs/11_INTERNAL_ALPHA_READINESS.md`를 추가해 내부 알파 차단 조건, 준비 체크리스트, 수동 관찰 양식, proceed/limited/block 판정 기준을 문서화했다.
- `evals/fixtures/README.md`와 `evals/runners/alpha-readiness-eval.ts`를 추가·갱신해 40문제 목표, 영역별 분포, metadata 누락, 현재 부족분을 자동 요약한다.
- `packages/contracts/src/problem-session.ts`에 feedback request/response 계약, `feedback` operation stage, `FEEDBACK_INVALID` 오류를 추가했다.
- `apps/api/src/problem-session-routes.ts`에 `POST /v1/problem-sessions/:sessionId/feedback`을 추가하고, 선택지 기반 피드백만 저장·로그하도록 `apps/api/src/feedback-store.ts`를 추가했다.
- `apps/mobile/src/m4-screens.tsx`, `apps/mobile/src/use-problem-feedback.ts`, `apps/mobile/src/problem-session-client.ts`에 코칭 결과 하단의 최소 피드백 제출 UI와 client hook을 연결했다.
- README와 `.env.example`을 M7/M8-0 기준으로 갱신했다.

### 13. Verification evidence

- `env CI=true pnpm format:check` 통과
- `env CI=true pnpm lint` 통과
- `env CI=true pnpm typecheck` 통과
- `env CI=true pnpm test` 통과
- `env CI=true pnpm eval` 통과. readiness runner는 현재 6개 fixture, 목표 40개, 부족 34개로 `not_ready`를 보고한다.
- `env CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web` 통과
- Playwright static export QA: `http://127.0.0.1:4173/`에서 375, 768, 1280px 폭 모두 `scrollWidth === clientWidth`, 주요 CTA 노출, console error 0건 확인.
- API smoke QA: active session feedback은 201, 문제 전문 포함 feedback은 400 `FEEDBACK_INVALID`, feedback event 로그에서 `problemText`, `data:image`, `prompt`, `rawResponse` 미포함 확인.

### 14. Remaining limits

- M8-0은 내부 알파 준비 게이트이므로 공개 베타 승인으로 보지 않는다.
- 실제 부모 5~10명 테스트와 40문제 fixture 확장은 다음 단계에서 진행한다.
- 브라우저 QA는 static export의 홈/진입 surface와 API smoke까지 확인했다. 실제 기기 이미지 선택 후 코칭 결과 하단 피드백 카드까지의 end-to-end 탭 검증은 다음 내부 알파 리허설에서 확인한다.

## M7 실행 계획

### 1. Goal

제한된 베타를 운영할 수 있도록, 원본 이미지·문제 전문·프롬프트 전문을 로그에 남기지 않으면서 요청 흐름, 오류, 모델 설정, 지연, 비용 추정, 요청 제한을 관찰할 수 있는 최소 운영 기반을 만든다.

M7은 분석 대시보드나 장기 사용자 기록을 만드는 단계가 아니다. MVP의 개인정보 최소화 원칙을 지키면서 “문제가 생겼을 때 원문 없이도 어떤 단계가 실패했는지 알 수 있고, 비용 폭주를 막을 수 있는가”를 검증한다.

### 2. Product constraints

- 아이 계정, 실명, 학교, 성적, 장기 기록은 추가하지 않는다.
- 원본 이미지, 문제 전문, AI 프롬프트 전문, OpenAI 응답 전문은 기본 로그와 오류 객체에 남기지 않는다.
- 관찰 이벤트는 부모 코칭 품질과 운영 안정성에 필요한 최소 필드만 담는다.
- 비용 통제 때문에 부모 코칭 핵심 흐름이 복잡해지면 안 된다. 제한에 걸린 경우 재시도 가능 여부와 다음 행동을 짧게 안내한다.
- 모델 비활성화 또는 kill switch는 “가짜 성공”을 만들지 않고 기존 안전 실패 응답으로 연결한다.

### 3. M7 scope decision

M7 첫 수직 단위는 서버 API 경계에서 끝낸다. 별도 DB, 외부 로그 SaaS, 사용자 계정, 결제·쿼터 시스템, 관리자 UI는 만들지 않는다.

구현 범위:

1. 요청 ID를 모든 API 응답 오류와 운영 이벤트에 붙인다.
2. redacted event logger를 서버 의존성으로 주입 가능하게 만든다.
3. recognition/coach 단계의 모델명, schema version, 단계명, latency, 성공·실패 코드, 검증 상태, 추정 비용/사용량 메타데이터를 문제 원문 없이 기록한다.
4. 인메모리 rate limiter로 세션 생성·이미지 업로드·recognize·coach 호출을 제한한다.
5. 환경 플래그로 recognition 또는 coaching 모델 호출을 비활성화할 수 있게 한다.
6. 개인정보·이용 안내 초안을 문서로 추가한다.

명시적으로 제외:

- 외부 APM/로그 서비스 연동
- IP·기기 지문 장기 저장
- 아이 또는 부모 계정 생성
- 세션별 학습 기록 보관
- 문제 원문 샘플 저장
- 비용 청구/결제

### 4. Proposed contract changes

- `packages/contracts/src/problem-session.ts`
  - `problemSessionErrorResponseSchema.error.requestId`를 추가한다.
  - `RATE_LIMITED`, `MODEL_DISABLED` 오류 코드를 추가한다.
  - 오류 응답은 계속 `message`, `retryable`을 포함한다.
- 새 계약 후보:
  - `operationEventSchema`
  - 필드:
    - `schemaVersion`
    - `requestId`
    - `route`
    - `stage: "session" | "upload" | "recognition" | "confirmation" | "coaching" | "delete"`
    - `outcome: "success" | "error" | "blocked"`
    - `statusCode`
    - `latencyMs`
    - `errorCode?`
    - `model?`
    - `promptVersion?`
    - `responseSchemaVersion?`
    - `verificationStatus?`
    - `estimatedCostUnits?`
  - 금지 필드: `problemText`, `normalizedText`, `latex`, `imageDataUrl`, `prompt`, `rawResponse`.

### 5. Proposed implementation

- `apps/api/src/observability.ts`
  - `createRequestId()`를 추가한다.
  - `OperationLogger` 인터페이스를 정의한다.
  - 기본 logger는 JSON 라인 형태로 redacted event만 출력한다.
  - 테스트용 logger는 이벤트 배열에 저장할 수 있게 한다.
  - 런타임 guard로 금지 키가 event에 들어오면 throw한다.
- `apps/api/src/rate-limit.ts`
  - 의존성 없는 인메모리 fixed window limiter를 추가한다.
  - 기본값은 환경 변수로 조절한다.
    - `RATE_LIMIT_WINDOW_MS`
    - `RATE_LIMIT_SESSION_CREATE`
    - `RATE_LIMIT_IMAGE_UPLOAD`
    - `RATE_LIMIT_RECOGNIZE`
    - `RATE_LIMIT_COACH`
  - 테스트에서는 now와 key resolver를 주입한다.
  - MVP 첫 단위의 key는 IP가 있으면 IP, 없으면 `anonymous-local`로 둔다.
- `apps/api/src/server.ts`
  - `createApp` dependencies에 `operationLogger`, `requestIdFactory`, `rateLimiter`, `modelControls`를 추가한다.
  - Hono middleware 또는 route helper로 requestId, timing, error event 기록을 통일한다.
- `apps/api/src/problem-session-errors.ts`
  - `createProblemSessionError`가 requestId를 필수로 받도록 바꾼다.
  - 기존 라우트의 모든 오류 응답에 requestId를 넣는다.
- `apps/api/src/recognition-adapter.ts`, `apps/api/src/coaching-adapter.ts`
  - 모델 비활성화 플래그를 env에서 읽는다.
    - `DISABLE_RECOGNITION_MODEL=true`
    - `DISABLE_COACHING_MODEL=true`
  - disabled면 OpenAI 호출 전에 전용 오류를 던진다.
  - OpenAI 응답의 usage/cost가 있으면 원문 없이 메타데이터로 반환할 준비를 한다. SDK usage shape가 불안정하면 M7 첫 단위에서는 `estimatedCostUnits`를 optional로 둔다.
- `apps/api/src/problem-session-routes.ts`
  - 각 route에서 rate limit을 검사한다.
  - recognition/coach 성공·실패 이벤트를 기록한다.
  - 이벤트에는 이미지 크기, MIME, byteSize 같은 비식별 메타데이터만 허용한다.
  - confirmed problem text는 logger에 넘기지 않는다.
- `docs/10_PRIVACY_AND_BETA_NOTICE.md`
  - MVP 베타 안내 초안을 추가한다.
  - 포함:
    - 회원가입 없이 임시 세션으로 처리
    - 사진에는 이름/학교/얼굴이 들어가지 않게 촬영 권장
    - 원본 이미지는 짧은 TTL 또는 세션 삭제로 처리
    - 운영 로그에 원본 이미지와 문제 전문을 기본 저장하지 않음
    - AI 결과는 검산 가능한 범위에서 확인되며 오류 신고 가능

### 6. Testing

- 계약 테스트
  - 오류 응답에 `requestId`가 필수다.
  - `RATE_LIMITED`, `MODEL_DISABLED` 오류 코드가 schema를 통과한다.
  - operation event schema가 허용 필드를 통과한다.
  - operation event에 `problemText`, `imageDataUrl`, `prompt`, `rawResponse`가 있으면 실패한다.
- observability 단위 테스트
  - 성공 이벤트에는 route/stage/outcome/statusCode/latencyMs/requestId가 있다.
  - provider/schema/verification 오류 이벤트에는 errorCode만 있고 원문은 없다.
  - logger guard가 금지 키를 중첩 객체에서도 잡는다.
- rate-limit 단위 테스트
  - 같은 window 안에서 한도를 넘으면 blocked다.
  - window가 지나면 다시 허용된다.
  - route별 limit이 독립적으로 적용된다.
- API 통합 테스트
  - 세션 생성 또는 coach 요청이 한도를 넘으면 `429 RATE_LIMITED`와 requestId를 반환한다.
  - recognition disabled flag면 OpenAI adapter를 호출하지 않고 `503 MODEL_DISABLED`를 반환한다.
  - coaching disabled flag면 최종 풀이를 만들지 않고 안전 오류를 반환한다.
  - recognition/coach 성공 이벤트가 원문 없이 기록된다.
  - verification failure 이벤트에도 finalSolution, problemText가 없다.
- 문서 검증
  - `docs/10_PRIVACY_AND_BETA_NOTICE.md`가 AGENTS.md의 개인정보 최소화 원칙과 충돌하지 않는다.

### 7. Verification commands

```bash
env CI=true pnpm format:check
env CI=true pnpm lint
env CI=true pnpm typecheck
env CI=true pnpm test
env CI=true pnpm eval
```

수동 QA:

- fake logger를 주입한 API surface에서 정상 흐름을 실행하고 event JSON에 `problemText`, `imageDataUrl`, `prompt`, `rawResponse`가 없는지 직접 확인한다.
- rate limit을 낮춘 테스트 app에서 coach 요청을 반복해 429와 한국어 재시도 문구가 보이는지 확인한다.
- `DISABLE_COACHING_MODEL=true` 상태로 coach 요청을 실행해 모델 호출 없이 안전 오류가 반환되는지 확인한다.
- 세션 삭제 후 삭제 이벤트와 이후 접근 거부 이벤트가 requestId로 연결되는지 확인한다.

### 8. Risks and mitigations

- **로그에 민감 데이터가 섞일 위험:** 이벤트 타입을 자유 객체로 두면 실수로 문제 전문을 넣을 수 있다.
  - 대응: event schema와 runtime guard에서 금지 키를 중첩까지 검사한다.
- **rate limit이 로컬 개발과 테스트를 방해할 위험:** 기본값이 너무 낮으면 개발 UX가 나빠진다.
  - 대응: env 기본값은 느슨하게 두고, 테스트에서 낮은 limit을 주입해 검증한다.
- **비용 메타데이터 과대 설계:** SDK usage shape가 바뀌거나 모델별 비용 계산이 불안정할 수 있다.
  - 대응: 첫 단위는 optional `estimatedCostUnits`와 모델명/단계/latency 기록까지로 제한한다.
- **인메모리 limiter 한계:** 서버 인스턴스가 여러 개면 전역 제한이 아니다.
  - 대응: M7 첫 단위에서는 “단일 베타 인스턴스 보호”로 명시하고, 공개 베타 전 Redis/edge limiter 전환을 별도 결정으로 남긴다.
- **requestId가 사용자 추적자로 오해될 위험:** requestId를 장기 사용자 식별자로 쓰면 개인정보 원칙과 충돌한다.
  - 대응: requestId는 요청 단위 진단 ID로만 쓰고 세션/사용자 분석 키로 재사용하지 않는다.

### 9. Done when

- [x] 모든 오류 응답에 requestId가 포함된다.
- [x] redacted operation logger가 성공·실패·차단 이벤트를 기록한다.
- [x] logger guard가 원본 이미지, 문제 전문, 프롬프트, raw response 기록을 막는다.
- [x] recognition/coach 모델 비활성화 플래그가 안전 오류로 연결된다.
- [x] route별 rate limit이 동작하고 429 응답이 계약화된다.
- [x] model/prompt/schema version과 latency가 문제 원문 없이 이벤트에 남는다.
- [x] 개인정보·베타 이용 안내 초안이 문서화된다.
- [x] 테스트, eval, 수동 QA가 완료된다.

## M6 실행 계획

### 1. Goal

최종 풀이 이후 부모가 아이의 이해를 확인할 수 있도록, 같은 `skill`과 유사 난이도의 새 문제 1개를 제공한다. 새 문제는 원문을 복제하지 않아야 하며, 답과 풀이가 서버 검증을 통과한 경우에만 답·해설을 접힌 상태로 제공한다.

M6는 “비슷한 문제도 보여 준다”가 아니라 “검증된 비슷한 문제만 보여 준다”가 핵심이다. 검증할 수 없거나 원문 복제 위험이 있으면 문제·답을 그럴듯하게 노출하지 않고 안전한 대체 문구를 반환한다.

### 2. Product constraints

- 부모 우선 흐름을 유지한다. 비슷한 문제는 최종 풀이 뒤 이해 확인용이며, 첫 코칭 화면의 중심이 아니다.
- 비슷한 문제의 답과 풀이도 기본적으로 접힌다.
- 원문 문장, 고유 맥락, 숫자 조합을 그대로 복제하지 않는다.
- 새 문제는 기존 `classification.skill`과 같은 학습 목표를 유지해야 한다.
- 새 문제의 답과 풀이가 M5 검산 계층으로 확인되지 않으면 답·해설을 제공하지 않는다.
- 검증 실패 시 최종 풀이 전체를 막지 않는다. 최종 풀이가 검증됐다면 코칭은 반환하되, 비슷한 문제 영역만 unavailable 상태로 둔다.
- 문제 전문, 이미지, 프롬프트 전문은 로그나 warning에 남기지 않는다.

### 3. M6 scope decision

현재 M4/M5 구현은 Coaching 응답 안에 `similarProblem` 후보를 포함한다. 기술 문서에는 별도 `POST /v1/problem-sessions/{id}/similar-problem` 초안이 있지만, M6 첫 수직 단위에서는 새 AI 호출 표면을 먼저 늘리지 않는다.

M6 첫 구현은 다음 순서로 제한한다.

1. 기존 `/coach` 응답의 `similarProblem`을 **후보(candidate)** 로 취급한다.
2. 서버에서 후보를 검증한다.
3. 검증 성공 시에만 모바일이 기존처럼 문제, 이유, 첫 힌트, 접힌 답·풀이를 렌더링한다.
4. 검증 실패·검증 불가·원문 복제 위험이면 모바일은 안전한 대체 문구만 보여 준다.

별도 `/similar-problem` API는 M6 후반 또는 M7 이후 비용·재시도·멱등성 정책이 필요해질 때 추가한다. M6 계획에는 타입과 validator를 독립적으로 설계해 이후 분리 API로 옮기기 쉽게 둔다.

### 4. Verification policy

M6의 `verified` 의미는 M5보다 좁고 명확하게 둔다.

- `similarProblem.verification.status: "verified"`는 새 문제의 `answer`와 `solutionSteps` 산술이 일치함을 뜻한다.
- 같은 skill·유사 난이도는 deterministic math 검산이 아니라 구조·메타데이터·평가 fixture로 확인한다.
- 원문 비복제는 문자열/숫자/토큰 유사도 휴리스틱과 fixture eval로 검사한다.
- 위 조건 중 하나라도 실패하면 `similarProblem.status: "unavailable"`로 반환하고 답·풀이를 렌더링하지 않는다.

### 5. Proposed contract changes

- `packages/contracts/src/coaching.ts`
  - 기존 `similarProblem` 단일 object를 discriminated union으로 바꾼다.
  - 성공형:
    - `status: "ok"`
    - `problemText`
    - `whySimilar`
    - `firstHint`
    - `answer`
    - `solutionSteps`
    - `verification`
  - 실패형:
    - `status: "unavailable"`
    - `message`
    - `reasonCode: "validation_failed" | "duplicate_source" | "unsupported_validation"`
  - 기존 모바일 호환을 위해 API policy에서 provider의 legacy similarProblem 후보를 성공/실패 union으로 변환한다.
- `packages/contracts/src/problem-session.ts`
  - API 오류 코드를 추가하지 않는 것을 기본으로 한다. 비슷한 문제 실패는 코칭 전체 실패가 아니라 부분 unavailable 상태이기 때문이다.

### 6. Proposed implementation

- `packages/math-validation`
  - `validateSimilarProblemCandidate(input)`를 추가한다.
  - 입력:
    - original problem text
    - source classification skill/difficulty
    - candidate problemText
    - candidate answer
    - candidate solutionSteps
  - 검사:
    - `solutionSteps` 중 검산 가능한 산술식이 `answer` 숫자와 일치하는지 M5 validator로 확인한다.
    - candidate problemText가 original problemText와 완전히 같거나, 한쪽이 다른 쪽을 포함하면 duplicate로 실패한다.
    - normalized token Jaccard similarity가 높은데 숫자만 일부 바뀐 경우 duplicate 위험으로 실패한다.
    - answer 숫자나 계산식이 M5 parser 범위 밖이면 unsupported로 실패한다.
  - 반환:
    - `verified`
    - `duplicate_source`
    - `unsupported_validation`
    - `mismatch`
- `apps/api/src/coaching-policy.ts`
  - `applyM5VerificationPolicy`를 M5+M6 policy로 확장하거나 `applyCoachingValidationPolicy`로 이름을 바꾼다.
  - finalSolution 검증은 계속 coaching 전체의 gate다.
  - similarProblem 검증은 partial gate다.
    - verified: `similarProblem.status = "ok"`와 verification notes를 붙인다.
    - duplicate/unsupported/mismatch: `similarProblem.status = "unavailable"`로 변환한다.
  - warning은 문제 원문 없이 reason code만 남긴다.
- `apps/api/src/coaching-adapter.ts`
  - provider JSON schema는 M6 첫 단위에서 legacy similarProblem 후보 shape를 유지한다.
  - instructions에 “비슷한 문제는 원문을 복제하지 말고, 계산 가능한 숫자로 만들며, answer와 solutionSteps를 맞춰라”를 강화한다.
  - 서버 검증 전에는 provider가 similar problem verification을 주장하지 못하게 한다.
- `apps/mobile/src/m4-screens.tsx`
  - `similarProblem.status === "ok"`이면 기존 화면을 유지한다.
  - `similarProblem.status === "unavailable"`이면 `비슷한 문제를 안전하게 만들지 못했어요. 원래 문제로 한 번 더 설명을 마무리해 주세요.` 계열 문구를 보여 준다.
  - unavailable 상태에는 답 보기 버튼을 렌더링하지 않는다.
- `apps/mobile/src/flow-rules.ts`
  - visible copy 계산에서 unavailable 상태의 answer/solutionSteps 접근을 막는다.
  - similar answer reveal은 ok 상태에서만 의미가 있게 한다.
- `evals/fixtures/coaching-cases.json`
  - `similarProblemConstraints`를 추가한다.
    - `notDuplicate: true`
    - `expectedVerification: "verified"`
  - duplicate source와 wrong similar answer는 API policy 테스트로 고정한다.
- `evals/runners/coaching-contract-eval.mjs`
  - similarProblem schema 검증
  - 원문 복제/과도한 유사도 검사
  - expected similar verification 검사
  - unavailable이면 answer leak이 없는지 검사

### 7. Testing

- 계약 테스트
  - `similarProblem.status: "ok"` 응답이 schema를 통과한다.
  - `similarProblem.status: "unavailable"` 응답이 schema를 통과한다.
  - unavailable 상태에 answer/solutionSteps가 있으면 schema에서 실패한다.
- math-validation 단위 테스트
  - 올바른 비슷한 문제 후보는 verified다.
  - `problemText`가 원문과 같으면 duplicate_source다.
  - 답이 `4컵`인데 solutionSteps가 `2/3 ÷ 1/6 = 5`면 mismatch다.
  - 검산 가능한 산술식이 없으면 unsupported_validation이다.
- API 테스트
  - fake adapter의 올바른 similarProblem 후보는 `status: "ok"`와 verified verification으로 반환된다.
  - fake adapter의 원문 복제 후보는 coaching 전체를 실패시키지 않고 `similarProblem.status: "unavailable"`로 반환된다.
  - fake adapter의 wrong similar answer도 `similarProblem.status: "unavailable"`로 반환된다.
  - finalSolution mismatch는 기존처럼 `VERIFICATION_FAILED`로 전체 coach 응답을 차단한다.
- 모바일 테스트
  - ok 상태에서는 문제만 먼저 보이고 answer는 `비슷한 문제 풀이 보기` 전까지 숨는다.
  - unavailable 상태에서는 answer와 solutionSteps가 visible copy에 절대 포함되지 않는다.
  - unavailable 상태에서는 답 보기 버튼이 없다.
- 평가 테스트
  - normal fixture의 similarProblem expected verification이 verified다.
  - normal fixture의 similarProblem이 원문 복제가 아닌지 검사한다.
  - duplicate/wrong answer 후보는 API 테스트에서 unavailable 변환을 검사한다.

### 8. Verification commands

```bash
CI=true pnpm format:check
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm eval
CI=true pnpm --filter @parent-coach/mobile exec expo install --check
CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web
```

수동 QA:

- fake adapter로 검증된 비슷한 문제 후보를 반환해 최종 풀이 후 비슷한 문제는 보이고 답은 접혀 있는지 확인한다.
- fake adapter로 duplicate source 후보를 반환해 최종 풀이 화면은 유지되고 비슷한 문제 영역만 unavailable로 보이는지 확인한다.
- fake adapter로 wrong similar answer 후보를 반환해 답·풀이가 모바일에 렌더링되지 않는지 확인한다.
- 375px, 768px, 1280px 폭에서 unavailable 문구와 ok 상태 버튼/카드가 넘치지 않는지 확인한다.

### 9. Risks and mitigations

- **같은 skill 검증 과대 주장:** M6 첫 단위에서 자연어 문제 의미를 완전 검증할 수 없다.
  - 대응: `verified`는 answer/solutionSteps 산술 일치만 의미하게 하고, same skill은 classification + fixture eval + 휴리스틱으로 별도 관리한다.
- **비슷한 문제 실패가 코칭 전체를 막음:** 비슷한 문제가 실패해도 부모는 이미 검증된 최종 풀이가 필요하다.
  - 대응: finalSolution mismatch만 전체 차단하고, similarProblem 실패는 unavailable 상태로 부분 처리한다.
- **원문 복제 false negative:** 단순 문자열 비교만으로는 문장 복제를 놓칠 수 있다.
  - 대응: exact match, substring, normalized token Jaccard, 숫자 제거 후 유사도 검사를 조합한다.
- **스키마 변경 충격:** 모바일과 API가 기존 `similarProblem.answer` 접근을 가정한다.
  - 대응: union 전환 후 모든 접근부를 status 분기로 바꾸고, flow-rules 테스트로 답 누출을 고정한다.
- **검증 범위 제한:** 도형·표·문장제의 의미까지 검증하지 못할 수 있다.
  - 대응: M6 첫 verified 범위를 M5 arithmetic-compatible similar problem으로 제한하고, 검증 불가 후보는 unavailable로 둔다.

### 10. Done when

- [x] `similarProblem` 계약이 ok/unavailable union으로 바뀐다.
- [x] M5 validator를 재사용한 `validateSimilarProblemCandidate`가 추가된다.
- [x] 서버가 verified similar problem만 ok 상태로 반환한다.
- [x] duplicate, unsupported, mismatch 후보는 unavailable로 안전하게 변환된다.
- [x] 모바일은 비슷한 문제 답을 접힌 상태로 유지하고 unavailable 상태에는 답 보기 버튼을 표시하지 않는다.
- [x] eval이 not duplicate/verified answer 조건을 검사한다. 같은 skill은 M6 첫 단위에서 프롬프트, classification, fixture 문구, 수동 검토로 제한한다.
- [x] 검증 명령과 수동 QA가 완료된다.

## M5 실행 계획

### 1. Goal

M4 코칭 결과의 최종 풀이가 산술적으로 맞는지 독립적으로 검산하고, 검산 가능한 좁은 범위에서만 `verification.status: "verified"`를 허용한다.

M5 첫 수직 단위는 자연수·분수·소수 사칙연산, 기본 단위 suffix 보존, 최종 답과 풀이식의 역검산에 한정한다. 문장제 전체 의미 파싱, 도형 조건 해석, 비슷한 문제 검증은 아직 verified 판정 범위에 넣지 않는다.

### 2. Product constraints

- 부모 우선 흐름과 코칭 순서는 유지한다. 검산은 최종 풀이 공개 여부와 검증 표시만 제어한다.
- 인식 확인 전에는 코칭과 검산을 모두 실행하지 않는다.
- LLM이 `verified`를 반환해도 그대로 믿지 않는다. 서버의 결정적 검산 결과가 유일한 verified 근거다.
- 산술 검산으로 불일치가 확인되면 최종 풀이를 반환하지 않는다.
- 검산 불가 문제는 성공처럼 verified로 보이지 않는다. `unverified` 또는 이후 범위의 `partially_verified`만 쓴다.
- 문제 전문, 이미지, 프롬프트 전문은 운영 로그나 warning에 남기지 않는다.

### 3. Supported verified scope

- 지원:
  - 자연수, 분수, 소수 숫자 정규화
  - `+`, `-`, `*`, `×`, `x`, `÷` 사칙연산
  - 분수 표기 `a/b`
  - 최종 답의 숫자와 단위 suffix 분리
  - 최종 풀이 steps 안의 계산식과 answer 숫자 일치 검산
- 제한:
  - 문제 문장 전체가 올바른 식으로 바뀌었는지는 M5 첫 단위에서 verified로 보증하지 않는다.
  - 단위 변환은 기본 단위 일치 또는 단위 존재 확인까지만 다룬다.
  - 비슷한 문제의 정답 검증은 M6에서 별도 적용한다.
  - 괄호, 대분수, 복잡한 방정식은 지원하지 못하면 `unverified`로 둔다.

### 4. Proposed implementation

- `packages/math-validation`을 추가한다.
  - exact rational 기반 숫자 타입을 구현한다.
  - 소수는 부동소수점이 아니라 분모 10의 거듭제곱인 유리수로 정규화한다.
  - 풀이 step의 arithmetic expression을 parse/evaluate한다.
  - answer에서 숫자와 단위 suffix를 추출한다.
  - 결과는 `verified`, `unverified`, `mismatch`로 반환한다.
- `apps/api`의 coach route는 AI 응답을 schema parse한 뒤 M5 validator를 통과시킨다.
  - `verified`: `verification.status = "verified"`, `method = "exact_rational_arithmetic"`로 반환한다.
  - `unverified`: 기존 코칭은 반환하되 verified copy가 나오지 않게 notes/method를 갱신한다.
  - `mismatch`: `VERIFICATION_FAILED` 오류로 응답하고 최종 풀이를 포함하지 않는다.
- `packages/contracts`에 `VERIFICATION_FAILED` 오류 코드를 추가한다.
- `apps/mobile`의 검증 안내 copy를 M4 전용에서 M5 상태 기반 copy로 바꾼다.
  - verified: `계산으로 확인했어요.`
  - partially_verified: 일부 검산 안내
  - unverified: 자동 검산 어려움 안내
- `evals`는 M4 verified 금지에서 M5 expected verification 검사로 전환한다.

### 5. Testing

- math-validation 단위 테스트
  - `3/4 ÷ 1/8`이 `6`으로 계산된다.
  - `1.5 + 2.25`가 `3.75`와 같은 유리수로 계산된다.
  - `6컵`에서 숫자 `6`과 단위 `컵`을 추출한다.
  - 풀이식과 최종 답이 일치하면 `verified`다.
  - 풀이식과 최종 답이 다르면 `mismatch`다.
  - 지원하지 않는 식은 `unverified`다.
- API 테스트
  - correct final solution은 M5 validator로 `verified`가 된다.
  - wrong final answer는 `VERIFICATION_FAILED`로 차단되고 finalSolution이 반환되지 않는다.
  - confirmed problem 없는 coach 요청은 계속 거부된다.
- 모바일 테스트
  - verified 상태에서는 `계산으로 확인했어요`가 보인다.
  - unverified 상태에서는 verified copy가 보이지 않는다.
  - 최종 풀이 공개 전 답 숨김 규칙은 유지된다.
- 평가 테스트
  - fixture의 `expectedVerification`과 실제 verification status가 일치해야 한다.
  - 힌트 1·2 answer leak 검사는 유지한다.

### 6. Verification commands

```bash
CI=true pnpm format:check
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm eval
CI=true pnpm --filter @parent-coach/mobile exec expo install --check
CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web
```

### 7. Risks and mitigations

- **검산 범위 과대 표시:** 식 자체가 문제 문장에서 맞게 세워졌는지까지 verified처럼 보일 수 있다.
  - 대응: notes와 method를 `final_solution_arithmetic` 계열로 좁게 설명하고, 문장 의미 검증은 아직 제한이라고 둔다.
- **지원하지 않는 형식 오판:** 대분수, 괄호, 긴 문장 포함 식을 잘못 parse할 수 있다.
  - 대응: parser는 산술 token만 있는 좁은 식을 처리하고, 모호하면 `unverified`로 빠진다.
- **LLM 불일치 노출:** wrong answer가 코칭 결과에 섞이면 부모에게 오답을 보여 줄 수 있다.
  - 대응: validator가 `mismatch`를 반환하면 API 오류로 차단하고 finalSolution을 반환하지 않는다.

### 8. Done when

- [x] M5 계획이 `PLANS.md`에 기록된다.
- [x] exact rational 산술 검산 패키지가 추가된다.
- [x] API가 검산 가능한 올바른 최종 풀이만 `verified`로 반환한다.
- [x] API가 검산 불일치 최종 풀이를 `VERIFICATION_FAILED`로 차단한다.
- [x] 모바일 검증 copy가 M5 상태 기반으로 표시된다.
- [x] eval이 M5 expected verification을 검사한다.
- [x] 검증 명령과 제품 불변조건 검토가 완료된다.

### 9. Result

- `packages/math-validation`을 추가해 자연수·분수·소수 산술식을 exact rational로 계산한다.
- 최종 답에서 숫자와 단위 suffix를 추출하고, `finalSolution.steps[].expression`의 계산 결과와 비교한다.
- API coach route는 서버 검산이 성공한 경우에만 `verified`, `exact_rational_arithmetic`으로 반환한다.
- API coach route는 산술 불일치가 확인되면 `VERIFICATION_FAILED`를 반환하고 `finalSolution`을 노출하지 않는다.
- 검산 불가 응답은 `unverified`, `m5_validation_unavailable`으로 남긴다.
- 모바일 검증 copy는 M4 전용 문구에서 `verified`/`partially_verified`/`unverified` 상태 기반 문구로 바뀌었다.
- Coaching eval은 M4 `verified` 금지에서 fixture별 `expectedVerification` 검사로 전환했다.

### 10. Verification evidence

2026-06-20에 아래 명령을 확인했다.

- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test` → 12 files / 52 tests pass
- `CI=true pnpm eval` → Recognition 5 cases / 0 failed, Coaching 1 case / 0 failed
- `CI=true pnpm --filter @parent-coach/mobile exec expo install --check`
- `CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web`

환경 메모:

- 새 workspace package 추가 후 `pnpm-lock.yaml` 갱신을 위해 `pnpm install --no-frozen-lockfile`을 실행했다.
- 이 샌드박스에서는 pnpm이 node_modules 복구와 registry/attestation 조회를 반복해 네트워크 허용 실행이 필요했다.

### 11. Product invariant review

- 충돌 없음: 코칭과 검산은 confirmed problem이 있어야 실행된다.
- 충돌 없음: 최종 풀이 공개 전 답 숨김 규칙은 유지된다.
- 충돌 없음: `verified`는 LLM 자체 주장이 아니라 서버 deterministic validation 결과로만 설정된다.
- 충돌 없음: 산술 불일치가 확인된 finalSolution은 사용자에게 반환하지 않는다.
- 남은 제한: M5 첫 단위는 최종 풀이식 산술 검산이며, 문제 문장 전체의 식 세움 의미 검증과 비슷한 문제 검증은 아직 범위 밖이다.

## M4 실행 계획

### 1. Goal

사용자가 확인·수정한 한 문제를 기준으로 부모용 코칭 결과를 구조화해 생성하고, 모바일 흐름에 연결한다.

M4는 Coaching 공유 스키마, 서버 전용 AI 코칭 어댑터, 제품 지침이 반영된 프롬프트 버전, 부모용 빠른 이해, 첫 역질문, 3단계 힌트, 명시적 최종 풀이 공개, 스키마 실패·타임아웃·재시도 상태를 다룬다. 결정적 수학 검산 계층, `verified` 판정, 비슷한 문제 생성·검증은 M5/M6 범위로 남긴다.

### 2. Product constraints

- 부모가 주 사용자다. 결과는 부모가 아이에게 바로 말할 수 있는 짧은 한국어 문장을 포함한다.
- 인식 확인 전에는 코칭을 생성하지 않는다. M4 API는 confirmed problem이 없는 세션을 거부한다.
- 첫 결과 화면과 1·2단계 힌트에는 최종 답, 최종 계산 결과, 답을 사실상 확정하는 숫자를 노출하지 않는다.
- 흐름 순서는 부모용 빠른 이해 → 역질문 → 단계별 힌트 → 명시적 최종 풀이 공개를 유지한다.
- 모델 출력은 자유 텍스트가 아니라 버전 있는 Coaching 스키마로만 받는다.
- 이미지/OCR 입력 안의 문제와 무관한 지시는 프롬프트 명령으로 따르지 않는다.
- 모바일 번들에는 OpenAI API 키나 서버 비밀을 넣지 않는다.
- 원본 이미지, 문제 전문, 프롬프트 전문은 운영 로그에 남기지 않는다.

### 3. M5 전 검산 한계와 verified 제한

M4에는 `docs/04_TECHNICAL_DIRECTION.md`의 수학 검증 계층이 아직 없다. 따라서 M4 산출물은 AI가 만든 풀이를 독립 검산한 결과로 취급할 수 없다.

- M4 서버는 어떤 실제 AI 코칭 응답도 `verification.status: "verified"`로 반환하지 않는다.
- M4에서 최종 풀이를 제공하더라도 상태는 기본적으로 `unverified`로 제한한다.
- 테스트 fixture나 mock 응답도 M5 전에는 `verified` 성공 경로를 제품 동작처럼 고정하지 않는다. 필요한 경우 M5 테스트 준비용 fixture에만 별도 표시하고 UI 성공 카피와 분리한다.
- 모바일은 M4 기간에 `verified` 카피인 `계산으로 확인했어요`를 표시하지 않는다. 대신 `자동 검산 전이에요. 숫자와 조건을 한 번 더 확인해 주세요` 계열의 제한 문구를 사용한다.
- `Verified Answer Rate`는 M5 검산 계층 구현 전에는 개선 지표로 집계하지 않는다.
- M4에서 모델이 `verified`를 반환해도 서버 매핑 계층에서 `unverified`로 강등하고 warning을 남긴다. 이 warning에는 문제 전문이나 프롬프트 전문을 기록하지 않는다.
- `partially_verified`는 M4에서 독립적으로 확인한 규칙 기반 검사가 있을 때만 사용한다. 그런 검사가 없다면 사용하지 않는다.

### 4. Proposed implementation

- `packages/contracts`에 Coaching 스키마를 추가한다.
  - classification, verification, parentBriefing, openingQuestion, hints, finalSolution, warnings를 포함한다.
  - hints는 정확히 3개 이상이며 level 1·2·3의 의미를 계약과 테스트로 고정한다.
  - verification status enum은 `verified`, `partially_verified`, `unverified`를 포함하되, M4 서버 매핑 정책은 `verified` 금지로 둔다.
- `packages/ai` 또는 현재 AI adapter 위치에 Coaching prompt와 adapter를 추가한다.
  - M3 Recognition adapter와 같은 서버 전용 패턴을 재사용한다.
  - 모델명, prompt version, timeout은 환경 설정으로 분리한다.
  - Structured Output strict schema와 Zod 재파싱을 모두 적용한다.
  - 프롬프트는 부모 우선, 답보다 코칭, 점진적 힌트, 안전 실패, M5 전 `verified` 금지를 명시한다.
- `apps/api`에 `POST /v1/problem-sessions/:sessionId/coach`를 추가한다.
  - 세션 없음, 만료, 이미지 미업로드, confirmed problem 없음, OpenAI 설정 없음, 모델 timeout, schema 실패를 구분한다.
  - confirmed problem text만 코칭 입력으로 사용한다.
  - 이전 confirmed problem과 다른 버전이면 기존 coaching result를 재사용하지 않는다.
  - AI 응답이 `verified`이면 `unverified`로 강등하고, 사용자에게는 검산 전 제한 문구를 전달한다.
- `apps/mobile`은 M3 확인 이후 mock coaching 대신 M4 API 결과를 렌더링한다.
  - 로딩, 취소, 재시도, 실패 상태를 정상 흐름과 같은 수준으로 구현한다.
  - 부모용 빠른 이해와 역질문을 먼저 보여 준다.
  - 힌트는 한 단계씩 사용자의 명시적 행동으로만 연다.
  - 최종 풀이는 별도 `최종 풀이 보기` 행동 뒤에만 보인다.
  - M4에서는 검산 완료 표시를 쓰지 않고, `unverified` 안내를 최종 풀이 영역에 노출한다.
- `evals/fixtures`에 내부 알파용 Coaching fixture를 추가한다.
  - 최소 40문제 목표로 확장 가능하게 구조를 만들되, M4 착수 단위는 대표 정상/실패/답누출 검사 fixture부터 시작한다.
  - 1·2단계 힌트 금지어와 forbidden answer leak을 fixture에 포함한다.
- `evals/runners`에 Coaching contract와 answer leak eval을 추가한다.
  - schema valid 100%를 확인한다.
  - level 1·2 힌트에 expected answer 또는 forbidden leaks가 들어가면 실패한다.
  - `verified`가 나오면 M4에서는 실패한다.

### 5. Testing

- 계약 테스트
  - 정상 Coaching 응답이 schema를 통과한다.
  - hints가 3개 미만이면 실패한다.
  - level 1·2 hint에 fixture forbidden answer가 있으면 실패한다.
  - M4 정책상 `verified` 응답은 서버 매핑 후 `unverified`로 내려간다.
  - final solution은 answer, steps, check 또는 제한 안내, closing question을 포함한다.
- API 테스트
  - confirmed problem 없는 세션의 coach 요청은 거부된다.
  - fake adapter 정상 응답이 부모용 설명, 역질문, 힌트, 최종 풀이를 반환한다.
  - fake adapter가 `verified`를 반환해도 API 응답은 M4 정책에 따라 `unverified`다.
  - schema 실패, timeout, OpenAI 미설정은 가짜 성공을 만들지 않는다.
  - confirmed problem 수정 후 이전 coaching result를 재사용하지 않는다.
- 모바일 테스트
  - 코칭 로딩/오류/재시도 문구가 보인다.
  - 첫 코칭 화면과 힌트 1·2에는 최종 답이 렌더링되지 않는다.
  - 다음 힌트 버튼을 눌러야 다음 단계가 열린다.
  - 최종 풀이 보기 전에는 answer가 렌더링되지 않는다.
  - M4에서는 verified 문구가 렌더링되지 않는다.
- 평가 테스트
  - Coaching fixture schema eval
  - answer leak eval
  - M4 verified prohibition eval

### 6. Verification commands

```bash
CI=true pnpm format:check
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm eval
CI=true pnpm --filter @parent-coach/mobile exec expo install --check
CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web
```

수동 QA:

- API 서버에서 세션 생성 → 이미지 업로드 → recognize → confirm → coach를 실제 HTTP 요청으로 확인한다.
- confirmed problem 없이 `POST /coach`가 안전하게 실패하는지 확인한다.
- fake adapter가 `verified`를 반환하는 경우에도 실제 API 응답과 모바일 copy가 `unverified` 제한으로 보이는지 확인한다.
- Expo web export에서 인식 확인 이후 코칭 로딩 → 부모용 빠른 이해 → 역질문 → 힌트 단계 공개 → 최종 풀이 공개를 확인한다.
- 375px, 768px, 1280px 폭에서 한국어 문구가 버튼/카드 밖으로 넘치지 않는지 확인한다.
- 실제 OpenAI 호출은 `OPENAI_API_KEY`가 있는 환경에서 별도 smoke test로 확인한다.

### 7. Risks and mitigations

- **M5 범위 침범:** M4에서 검산기를 일부 만들고 `verified`를 표시하고 싶어질 수 있다.
  - 대응: M4는 생성과 공개 제어만 완료하고, `verified` 처리는 M5 전 금지한다. 서버 매핑, UI copy, eval에 동일한 제한을 둔다.
- **답 누출:** 모델이 부모용 설명이나 힌트 1·2에 답을 섞을 수 있다.
  - 대응: 프롬프트 규칙, fixture forbidden leaks, 렌더링 테스트, eval runner로 차단한다.
- **AI 스키마 drift:** 모델이 계약과 어긋난 응답을 낼 수 있다.
  - 대응: Structured Output strict schema, Zod 재파싱, schema 실패 오류 UX를 모두 둔다.
- **과도한 설명:** 최종 풀이 전 카드가 길어져 부모가 빠르게 말하기 어려울 수 있다.
  - 대응: 콘텐츠 길이 가이드를 fixture와 수동 검토 기준에 포함한다.
- **지원 범위 확대:** 중등/고등 또는 여러 문제 코칭을 받아들이는 방향으로 흐를 수 있다.
  - 대응: classification과 unsupported 분기를 유지하고, MVP 범위 밖이면 풀이하지 않는다.

### 8. Done when

- [x] Coaching 공유 스키마와 fixture가 추가된다.
- [x] 서버가 confirmed problem 기반 `POST /coach` API를 제공한다.
- [x] OpenAI 호출은 서버 전용 adapter 뒤에 있고 모바일 번들에 비밀이 없다.
- [x] 부모용 빠른 이해, 첫 역질문, 3단계 힌트, 최종 풀이가 구조화 결과로 연결된다.
- [x] 최종 풀이는 명시적 행동 전까지 렌더링되지 않는다.
- [x] 1·2단계 힌트에 최종 답이 노출되지 않는다.
- [x] M5 전에는 실제 AI 결과와 mock 제품 경로 모두 `verified`로 처리되지 않는다.
- [x] 스키마 실패, timeout, OpenAI 미설정, retry/cancel 상태가 보인다.
- [x] 검증 명령과 API/브라우저 QA가 통과한다.
- [x] 제품 불변조건과 충돌이 없음을 검토한다.

### 9. Result

- 계약: 기존 Coaching 스키마를 M4 API/eval에서 사용하고, 세션 오류 코드에 `PROBLEM_NOT_CONFIRMED`, `COACHING_FAILED`, `COACHING_SCHEMA_INVALID`를 추가했다.
- API: 서버 전용 OpenAI Coaching adapter와 `POST /v1/problem-sessions/:sessionId/coach`를 추가했다.
- M4 검산 제한: `enforceM4VerificationPolicy`로 provider가 `verified`를 반환해도 `unverified`, `m4_generation_only`로 강등하고 warning을 남긴다.
- 세션 store: 부모가 확정한 문제 문장을 coaching 입력으로 조회할 수 있게 했다.
- 모바일: M3 문제 확인 후 mock coaching 대신 `/coach` API를 호출하고, 코칭 로딩/오류/재시도/ready 상태를 연결했다.
- UI: 코칭 화면을 M4 전용 화면으로 분리하고, 최종 풀이 공개 전에는 답을 렌더링하지 않으며, 최종 풀이 영역에는 M4 자동 검산 전 안내를 표시한다.
- 평가: `evals/fixtures/coaching-cases.json`와 `evals/runners/coaching-contract-eval.mjs`를 추가해 schema, early hint answer leak, M4 `verified` 금지를 검사한다.

### 10. Verification evidence

2026-06-20에 아래 명령을 확인했다.

- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test` → 11 files / 44 tests pass
- `CI=true pnpm eval` → Recognition 5 cases / 0 failed, Coaching 1 case / 0 failed
- `CI=true pnpm --filter @parent-coach/mobile exec expo install --check`
- `CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web`

수동/API QA:

- `OPENAI_API_KEY` 없이 API 서버를 `http://127.0.0.1:3001`에 띄워 실제 HTTP 요청으로 확인했다.
- 세션 생성 후 JPEG multipart 업로드가 `201`, `imageStatus: uploaded`, `retained: false`를 반환했다.
- 업로드 후 confirmed problem 없이 `POST /coach`는 `409`, `PROBLEM_NOT_CONFIRMED`, `retryable: true`를 반환했다.
- `PATCH /problem`으로 부모가 확정한 문제 문장을 저장한 뒤 `POST /coach`는 OpenAI 키가 없는 환경에서 fake 성공을 만들지 않고 `503`, `OPENAI_NOT_CONFIGURED`, `retryable: false`를 반환했다.
- fake coaching adapter가 `verified`를 반환하는 HTTP 서버를 `http://127.0.0.1:3002`에 띄워 `POST /coach` 응답이 `unverified`, `m4_generation_only`로 강등되고 warning을 포함하는지 확인했다.

브라우저 QA:

- Expo web export를 `http://127.0.0.1:4173/`로 열어 홈 화면과 촬영/업로드 안내 화면 진입을 확인했다.
- 홈 화면은 375px, 768px, 1280px 폭에서 수평 overflow가 없었다.
- 브라우저 console error는 0건이었다.
- `browse responsive`로 `/tmp/parent-coach-m4-layout-mobile.png`, `/tmp/parent-coach-m4-layout-tablet.png`, `/tmp/parent-coach-m4-layout-desktop.png`를 생성해 레이아웃을 확인했다.

추가 점검:

- `rg`로 `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `enum`, non-null assertion, `: any` 금지 패턴을 스캔했고 매치가 없었다.
- OMO TypeScript no-excuse 스크립트는 skill 디렉터리에서 `typescript` 패키지를 resolve하지 못해 실행하지 못했다. 위 수동 스캔과 `lint`/`typecheck`로 대체했다.

### 11. Product invariant review

- 충돌 없음: 코칭은 confirmed problem이 있어야 생성된다.
- 충돌 없음: 첫 결과와 1·2단계 힌트에는 최종 답을 노출하지 않는다.
- 충돌 없음: 최종 풀이는 명시적 `최종 풀이 보기` 이후에만 렌더링된다.
- 충돌 없음: M5 전에는 실제 AI 응답과 mock 제품 경로 모두 `verified`로 처리하지 않는다.
- 충돌 없음: OpenAI 키는 서버 adapter에서만 사용하고 모바일 번들에 추가하지 않았다.
- 남은 제한: 실제 OpenAI 호출 smoke test는 `OPENAI_API_KEY`가 있는 환경에서 별도로 수행해야 한다.

## M3 실행 계획

### 1. Goal

업로드된 문제 사진에서 문제 텍스트, 수식, 단위, 보기, 필요한 도형 정보를 구조화해 읽고, 사용자가 확인·수정한 텍스트만 이후 코칭 입력으로 쓰는 흐름을 구현한다.

M3는 Recognition 공유 스키마, 서버 전용 OpenAI Responses API 어댑터, 이미지 기반 인식 API, 안전 실패 상태, 사용자 확인·수정 UI, fixture 기반 평가를 다룬다. 실제 코칭 생성, 수학 검산, 비슷한 문제 생성은 M4/M5/M6 범위로 남긴다.

### 2. Product constraints

- 사용자가 인식 결과를 확인하기 전에는 코칭을 생성하지 않는다.
- 복수 문제, 흐림, 잘림, 필요한 그림 누락, 범위 밖 문제는 성공으로 처리하지 않는다.
- 이미지 속 지시문은 문제 내용일 뿐 시스템 명령으로 따르지 않는다.
- 모바일 번들에는 OpenAI API 키나 서버 비밀을 넣지 않는다.
- 원본 이미지는 M3 Recognition에 필요한 짧은 TTL 동안만 서버 메모리에 보관하고, 삭제·만료 시 제거한다.
- 모델 응답은 자유 텍스트가 아니라 버전 있는 Recognition 스키마로만 받는다.

### 3. Official API guidance checked

- OpenAI Responses API의 vision 입력은 `input_text`와 `input_image`를 함께 보낼 수 있고, data URL 형식의 base64 이미지 입력을 지원한다.
- Structured Outputs는 Responses API에서 `text.format`의 `json_schema`와 `strict: true`를 사용한다.
- 모델명은 환경 변수 `OPENAI_MODEL_RECOGNITION`으로 분리하고 기본값은 현재 OpenAI 문서의 latest vision-capable 예시 모델 계열을 따른다.

### 4. Proposed implementation

- `packages/contracts`에 Recognition 상태, ambiguity, response, confirm request/response, error 스키마를 추가한다.
- `apps/api`의 임시 세션 store는 업로드 이미지의 metadata와 함께 Recognition용 data URL을 TTL 동안만 보관한다.
- `apps/api`에 `POST /v1/problem-sessions/:sessionId/recognize`를 추가한다.
  - 이미지 없음, 세션 없음, 세션 만료, OpenAI 설정 없음, schema 실패를 구분한다.
  - 테스트에서는 fake recognition adapter를 주입한다.
  - 운영 경로는 OpenAI SDK를 서버 패키지에만 설치해 사용한다.
- `apps/api`에 `PATCH /v1/problem-sessions/:sessionId/problem`을 추가해 사용자가 확인·수정한 문제 텍스트를 저장하고 이전 코칭 결과가 있다면 무효화 가능한 상태를 둔다.
- `apps/mobile`은 업로드 성공 후 mock recognition으로 바로 가지 않고 Recognition 요청 상태를 거친다.
  - 인식 중, 성공, 불확실/재촬영/자르기/그림 누락/지원 불가 상태를 보여 준다.
  - 사용자가 문제를 수정하고 `맞아요`를 눌러야 기존 mock coaching으로 넘어간다.

### 5. Testing

- 계약 테스트
  - 정상 Recognition 응답, uncertain 응답, needs_crop, missing_diagram, unsupported 상태가 schema를 통과한다.
  - `uncertain`은 ambiguity가 반드시 있어야 한다.
  - confirm request는 빈 문제 텍스트를 거부한다.
- API 테스트
  - 이미지 업로드 전 recognize는 오류를 반환한다.
  - fake adapter가 정상 Recognition 응답을 반환한다.
  - 복수 문제/그림 누락 fixture 상태가 그대로 전달된다.
  - confirm endpoint는 수정된 텍스트를 저장하고 응답한다.
  - OpenAI API 키가 없고 real adapter를 쓰면 가짜 성공을 만들지 않는다.
- 모바일 테스트
  - Recognition 상태 copy와 confirm 가능 조건을 순수 함수로 고정한다.
  - 확인 전에는 coaching stage로 넘어가지 않는 흐름을 유지한다.

### 6. Verification commands

```bash
CI=true pnpm format:check
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm eval
CI=true pnpm --filter @parent-coach/mobile exec expo install --check
CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web
```

수동 QA:

- API 서버에서 세션 생성 → 이미지 업로드 → recognize → confirm을 실제 HTTP 요청으로 확인한다.
- OpenAI API 키 없이 recognize가 설정 오류로 안전하게 실패하는지 확인한다.
- Expo web export에서 업로드 이후 Recognition 로딩/성공/안전 실패 화면과 수정·확정 행동을 확인한다.
- 실제 OpenAI 호출은 `OPENAI_API_KEY`가 있는 환경에서 별도 smoke test로 확인한다.

### 7. Risks and mitigations

- **이미지 임시 보관 범위 확대:** M2는 bytes를 버렸지만 M3는 Recognition까지 이미지를 보관해야 한다.
  - 대응: 서버 메모리, 짧은 TTL, 삭제/만료 제거, 로그 미포함으로 제한한다.
- **AI 비용/키 부재:** 로컬·CI에는 OpenAI 키가 없을 수 있다.
  - 대응: adapter 주입 테스트와 설정 오류 응답을 분리하고, fake 성공으로 숨기지 않는다.
- **스키마 drift:** OpenAI 응답이 계약과 어긋날 수 있다.
  - 대응: Structured Outputs strict schema와 Zod 재파싱을 모두 적용한다.
- **M4 범위 침범:** 인식 직후 코칭 생성까지 연결하고 싶어질 수 있다.
  - 대응: 확인된 문제 텍스트 저장까지만 M3 완료로 둔다. 코칭은 기존 mock 흐름으로 이어진다.

### 8. Done when

- [x] Recognition 공유 스키마와 fixture가 추가된다.
- [x] 서버가 업로드된 임시 이미지를 기반으로 recognize API를 제공한다.
- [x] OpenAI 호출은 서버 전용 어댑터 뒤에 있고 모바일 번들에 비밀이 없다.
- [x] 사용자는 인식 결과를 수정하고 확인할 수 있다.
- [x] 확인 전에는 코칭이 생성·확정되지 않는다.
- [x] 복수 문제, 흐림/재촬영, 그림 누락, 범위 밖 상태가 안전 실패로 보인다.
- [x] 검증 명령과 API QA가 통과한다.
- [x] 제품 불변조건과 충돌이 없음을 검토한다.

### 9. Result

- 계약: `packages/contracts`에 Recognition 상태, ambiguity, response, confirm request/response 스키마를 추가했다.
- API: 서버 전용 OpenAI Responses API 어댑터와 `POST /v1/problem-sessions/:sessionId/recognize`, `PATCH /v1/problem-sessions/:sessionId/problem`을 추가했다.
- 세션 store: Recognition까지 필요한 data URL을 TTL 메모리 세션에만 보관하고, 부모가 확정한 문제 문장을 세션 내부에 남긴다.
- 모바일: 업로드 완료 후 실제 Recognition API 호출, 인식 중/확인/수정/안전 실패/서버 오류 화면을 연결했다.
- 평가: `evals/fixtures/recognition-cases.json`와 `evals/runners/recognition-contract-eval.mjs`를 추가해 M3 상태 fixture가 계약 스키마와 기대 status를 통과하는지 실행 가능하게 했다.

### 10. Verification evidence

2026-06-20에 아래 명령을 확인했다. 샌드박스에서 `pnpm`이 node_modules를 자동 재구성하며 네트워크 제한에 걸려, 검증은 동일한 로컬 바이너리를 직접 실행했다.

- `CI=true ./node_modules/.bin/vitest run` → 10 files / 40 tests pass
- `./node_modules/.bin/tsc --noEmit -p packages/contracts/tsconfig.json`
- `./node_modules/.bin/tsc --noEmit -p apps/api/tsconfig.json`
- `./node_modules/.bin/tsc --noEmit -p apps/mobile/tsconfig.json`
- `./node_modules/.bin/eslint . --max-warnings=0`
- `./node_modules/.bin/prettier --check .`
- `./node_modules/.bin/tsx evals/runners/recognition-contract-eval.mjs` → 5 cases / 0 failed

수동/API QA:

- API 서버를 `http://127.0.0.1:3001`에 띄워 실제 HTTP 요청으로 확인했다.
- 세션 생성 후 JPEG multipart 업로드가 `201`, `imageStatus: uploaded`, `retained: false`를 반환했다.
- OpenAI 키가 없는 환경에서 `POST /recognize`는 fake 성공을 만들지 않고 `503`, `OPENAI_NOT_CONFIGURED`, `retryable: false`를 반환했다.
- `PATCH /problem`은 부모가 확정한 문제 문장을 `200`과 `sourceRecognitionStatus`, `userEdited`, `confirmedAt`으로 반환했다.

제품 불변조건 검토:

- 부모 확인 전에는 코칭 화면으로 넘어가지 않는다.
- Recognition은 풀이·정답을 생성하지 않고 문제 문장 확인만 수행한다.
- OpenAI 키는 서버 환경 변수에만 있으며 모바일 번들에는 추가하지 않았다.
- 이미지 원본은 영구 저장하지 않고 TTL 메모리 세션에만 data URL로 존재한다.
- 실제 OpenAI 호출 smoke test는 `OPENAI_API_KEY`가 있는 환경에서 별도로 수행해야 한다.

## M2 실행 계획

### 1. Goal

실제 문제 사진 한 장을 카메라 또는 사진 보관함에서 가져와, 사용자가 확인 가능한 전처리 상태로 만든 뒤, 임시 문제 세션 API에 안전하게 업로드하는 흐름을 구현한다.

M2는 촬영/선택 권한, 한 문제 촬영 가이드, 편집 가능한 시스템 crop UI, 회전/리사이즈 전처리, 파일 형식·크기 검증, 임시 세션 생성, multipart 업로드, 취소·재시도, TTL 삭제 경로를 다룬다. 실제 AI 인식, OCR, 코칭 생성, 장기 저장소, 계정, 원본 이미지 영구 저장은 만들지 않는다.

### 2. Product constraints

- 부모가 주 사용자다. 촬영 화면 문구는 부모에게 “문제 하나만 안전하게 담기”를 안내한다.
- 사진에서 읽은 문제를 사용자가 확인·수정하기 전에는 코칭을 확정하지 않는다.
- 여러 문제를 임의 선택하지 않는다. 사용자가 문제 하나만 crop하도록 안내한다.
- 이름, 학교, 얼굴, 위치 정보 같은 개인정보는 가능하면 제외하도록 안내한다.
- 모바일 번들에는 OpenAI/API 비밀키를 넣지 않는다.
- 서버는 업로드된 원본 이미지를 운영 로그에 남기지 않고, 이번 M2에서는 파일 bytes를 영구 보관하지 않는다.
- AI 인식 실패/지원 불가 분기는 M3에서 구현하며, M2에서는 업로드 성공 후 기존 mock 인식 확인 흐름으로 연결한다.

### 3. Proposed implementation

- `packages/contracts`에 임시 문제 세션, 이미지 업로드, 삭제, 오류 응답 스키마를 추가한다.
- `apps/api`에 인메모리 임시 세션 store를 추가한다.
  - `POST /v1/problem-sessions`: 임시 세션 생성
  - `POST /v1/problem-sessions/:sessionId/image`: multipart 이미지 수신, MIME/크기 검증, metadata만 기록
  - `DELETE /v1/problem-sessions/:sessionId`: 세션 삭제
  - TTL이 지난 세션은 조회/업로드 시 삭제하고 만료 오류를 반환한다.
- `apps/mobile`에 Expo 이미지 intake 계층을 추가한다.
  - `expo-image-picker`: 카메라/사진 권한, 촬영, 사진 선택, 시스템 편집 UI
  - `expo-image-manipulator`: 최대 긴 변 기준 리사이즈, JPEG 저장, 새 파일 생성으로 EXIF 위치 제거 성격의 전처리
  - `expo-file-system/legacy`: multipart 업로드
- `ParentCoachFlow`에 M2 intake stage를 추가한다. 업로드 성공 뒤에는 M3 전까지 기존 mock recognition 화면으로 연결한다.
- `DESIGN.md`와 `README.md`에 M2 intake/upload 상태와 실행 조건을 반영한다.

### 4. Testing

- 계약 테스트
  - 임시 세션 응답, 업로드 응답, 삭제 응답, 오류 응답이 schema를 통과한다.
  - 허용 MIME과 크기 상수가 계약에 고정된다.
- API 테스트
  - 세션 생성 → multipart 이미지 업로드 → metadata 응답
  - unsupported MIME 거부
  - size limit 초과 거부
  - 삭제 후 업로드 거부
  - TTL 만료 후 업로드 거부
- 모바일 순수 로직 테스트
  - 이미지 MIME 정규화와 확장자 fallback
  - 큰 이미지는 긴 변 기준 리사이즈 계획을 만든다.
  - 허용되지 않은 파일 형식/크기를 사용자 문구로 변환한다.

### 5. Verification commands

```bash
CI=true pnpm format:check
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm test
CI=true pnpm eval
CI=true pnpm --filter @parent-coach/mobile exec expo install --check
CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web
```

수동 QA:

- API는 로컬 서버에서 `POST /v1/problem-sessions`, multipart image upload, `DELETE /v1/problem-sessions/:id`를 실제 HTTP 표면으로 확인한다.
- 모바일 UI는 Expo web export를 열어 375px, 768px, 1280px에서 홈 → 촬영/업로드 안내 화면 → 권한/오류/재시도 상태가 깨지지 않는지 확인한다.
- 실제 iOS/Android 기기 카메라 권한과 native file upload는 로컬 기기 연결이 가능할 때 추가 확인한다. 이번 자동 QA에서는 브라우저와 API 표면으로 대체한다.

### 6. Risks and mitigations

- **네이티브 카메라 QA 제약:** 이 환경은 실제 휴대폰 권한 UI를 직접 확인하기 어렵다.
  - 대응: Expo web export로 화면 상태를 검증하고, native-only 권한/업로드는 코드 경로와 타입 검증으로 고정한다.
- **원본 이미지 보관 위험:** 업로드 bytes를 서버에 저장하면 개인정보 처리 범위가 커진다.
  - 대응: M2 API는 metadata만 저장하고 bytes는 요청 처리 중 검증 후 버린다.
- **기기별 localhost 문제:** 실제 휴대폰에서 `localhost`는 기기 자신을 가리킨다.
  - 대응: `EXPO_PUBLIC_API_BASE_URL`로 API base URL을 바꿀 수 있게 한다.
- **M3 범위 침범:** 업로드 성공 후 OCR/AI를 만들고 싶어질 수 있다.
  - 대응: 업로드 성공 뒤 기존 mock recognition으로만 이동한다.

### 7. Done when

- [x] 카메라/사진 선택 진입 화면이 실제 앱 흐름에 연결된다.
- [x] 권한 거부, 선택 취소, 전처리 실패, 업로드 실패, 재시도 상태가 보인다.
- [x] 업로드 전 이미지 MIME/크기/리사이즈 규칙이 테스트로 고정된다.
- [x] API가 임시 세션 생성, multipart 업로드, 삭제, TTL 만료를 처리한다.
- [x] 서버는 원본 이미지 bytes를 영구 저장하지 않는다.
- [x] 업로드 성공 뒤 M3 전까지 mock recognition 확인 화면으로 연결된다.
- [x] 모바일 번들에 비밀키가 추가되지 않는다.
- [x] 검증 명령과 브라우저/API QA가 통과한다.
- [x] 제품 불변조건과 충돌이 없음을 검토한다.

### 8. Result

- 계약: `packages/contracts`에 임시 문제 세션, 이미지 업로드 metadata, 삭제, 오류 응답 스키마를 추가했다.
- API: `apps/api`에 인메모리 TTL 세션 store와 `POST /v1/problem-sessions`, `POST /v1/problem-sessions/:sessionId/image`, `DELETE /v1/problem-sessions/:sessionId`를 추가했다.
- 모바일: `apps/mobile`에 촬영/사진 선택, 시스템 편집 UI, 리사이즈/전처리, multipart 업로드 client, 촬영/업로드 상태 화면을 연결했다.
- UX: 업로드 성공 뒤에는 M3 전까지 기존 mock recognition 확인 화면으로 이어진다.
- 문서: `README.md`, `DESIGN.md`, `.env.example`에 M2 실행·상태·공개 API base URL을 반영했다.

### 9. Verification evidence

2026-06-20에 아래 명령을 fresh run으로 확인했다.

- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test` → 7 files / 28 tests pass
- `CI=true pnpm eval`
- `CI=true pnpm --filter @parent-coach/mobile exec expo install --check`
- `CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web`

수동/표면 QA:

- API 서버를 `http://127.0.0.1:3001`에 띄워 실제 HTTP 요청으로 확인했다.
- `POST /v1/problem-sessions`가 `201`과 `ps_...` 세션을 반환했다.
- `multipart/form-data`의 `image` 필드로 JPEG를 업로드했고 `201`, `imageStatus: uploaded`, `retained: false`를 확인했다.
- `DELETE /v1/problem-sessions/:sessionId`가 `200`, `imageStatus: deleted`를 반환했다.
- Expo web export를 `http://127.0.0.1:4173/`로 열어 홈 → 촬영/업로드 안내 화면 이동을 확인했다.
- 375px, 768px, 1280px 폭에서 홈과 M2 intake 화면의 수평 overflow가 없었다.
- 브라우저 console error는 0건이었다.

미확인:

- 실제 iOS/Android 기기의 native 카메라 권한 다이얼로그와 `expo-file-system/legacy` native upload는 이 환경에서 직접 조작하지 못했다. 해당 경로는 타입검사, Expo export, API multipart 표면 검증으로 대체했다.

### 10. Product invariant review

- 충돌 없음: 부모가 주 사용자이며, 촬영 안내는 부모가 문제 하나를 안전하게 담도록 안내한다.
- 충돌 없음: 업로드 성공 뒤에도 바로 정답이나 코칭 확정을 만들지 않고 인식 확인 화면으로 이어진다.
- 충돌 없음: OpenAI/API 비밀키를 모바일 번들에 추가하지 않았다.
- 충돌 없음: 서버는 M2에서 원본 image bytes를 영구 저장하지 않고 metadata만 임시 세션에 기록한다.
- 충돌 없음: AI 인식, OCR, 장기 저장, 계정, 코칭 생성은 M3 이후로 남겼다.

### 11. QA follow-up

2026-06-20 M2 QA에서 아래 두 가지를 수정했다.

- 실제 휴대폰 원본 사진은 5MB를 넘을 수 있으므로, 전처리 전에는 MIME과 이미지 크기만 확인하고 리사이즈 저장 후 실제 파일 size를 읽어 최종 5MB 제한을 적용하도록 바꿨다.
- 375px 모바일 폭에서 CJK 제목 줄바꿈이 어색한 문구를 짧게 다듬었다.

재검증:

- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test` → 7 files / 29 tests pass
- `CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web`
- Browser snapshot에서 375px, 768px, 1280px 홈 → intake 진입과 수정 문구 노출을 확인했다.

## M1 실행 계획

### 1. Goal

AI 없이 mock 데이터로 부모 코칭 앱의 핵심 제품 경험을 실제 모바일 화면에서 검증한다.

M1은 홈 → 촬영 placeholder → 인식 결과 확인/수정 → 부모용 빠른 이해 → 아이에게 할 첫 질문 → 힌트 1~3 점진 공개 → 명시적 최종 풀이 → 비슷한 문제와 접힌 답 → 오류 상태 mock까지 포함한다. 실제 OpenAI 호출, 카메라/이미지 업로드, 데이터베이스, 계정, 장기 기록은 만들지 않는다.

### 2. Product constraints

- 부모가 주 사용자다. 화면 문구는 부모에게 말한다.
- 첫 화면, 부모용 빠른 이해, 역질문, 힌트 1·2에는 최종 답 `6컵`을 노출하지 않는다.
- 사용자가 인식 결과를 확인하기 전에는 코칭 화면으로 넘어가지 않는다.
- mock 문제는 대한민국 초등 5~6학년 수학 한 문제로 제한한다.
- 실제 AI/API 호출과 서버 비밀키는 추가하지 않는다.
- 오류 상태에서는 임의 풀이나 정답을 만들지 않는다.

### 3. Proposed implementation

- `packages/contracts`에 M1 mock flow에 필요한 Recognition/Coaching 논리 계약을 Zod schema와 readonly TypeScript type으로 추가한다.
- `apps/mobile/src/mock-parent-coach.ts`에 문서 예시 기반 mock recognition, mock coaching, mock error state를 둔다.
- `apps/mobile/src/flow-rules.ts`에 답 누출 방지용 순수 함수와 초기 visible state 계산을 둔다.
- `apps/mobile/app/index.tsx`는 단일 화면 state machine으로 M1 흐름을 시연한다.
- 반복 카드와 버튼 UI는 같은 파일 안의 작은 컴포넌트로 시작하되, 250 pure LOC를 넘기면 책임별 파일로 분리한다.
- `DESIGN.md`에는 M1에서 새로 반복되는 버튼, 단계 표시, 코칭 카드 패턴을 추가한다.

### 4. Testing

- `packages/contracts/test/coaching.test.ts`
  - mock recognition/coaching shape가 schema를 통과한다.
  - 힌트 1·2에 forbidden answer leak이 없음을 확인한다.
- `apps/mobile/test/flow-rules.test.ts`
  - 초기 coaching preview에 최종 답이 노출되지 않는다.
  - 힌트는 사용자 행동으로 한 단계씩 열린다.
  - 최종 풀이와 비슷한 문제 답은 명시적 공개 뒤에만 visible이 된다.
  - 오류 상태는 풀이/답 대신 다음 행동을 노출한다.

### 5. Verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
pnpm --filter @parent-coach/mobile exec expo export --platform web
pnpm --filter @parent-coach/mobile dev
```

수동 QA에서는 Expo/Metro를 띄우고 정상 흐름과 오류 상태를 화면에서 직접 확인한다. 가능하면 web export 또는 Expo web으로 스크린샷 기반 visual QA를 수행한다.

### 6. Risks and mitigations

- **M2 범위 침범:** 촬영/업로드를 실제 구현하지 않는다.
  - 대응: 촬영은 placeholder 행동으로 mock recognition 화면으로 이동한다.
- **답 누출:** mock copy에 최종 답이 초반 화면에 섞일 수 있다.
  - 대응: flow rule test에서 힌트 1·2와 초기 preview의 금지 문자열을 검사한다.
- **단일 화면 비대화:** M1 state machine이 커질 수 있다.
  - 대응: 테스트 가능한 flow/model은 `src`로 분리하고 UI는 작은 컴포넌트로 쪼갠다.
- **시각 QA 제약:** Expo native 화면은 이 환경에서 실제 기기 확인이 어려울 수 있다.
  - 대응: Expo web/Metro로 가능한 범위를 확인하고, 실제 기기 미확인 여부는 결과에 명시한다.

### 7. Done when

- [x] 홈에서 mock 촬영 placeholder를 통해 인식 확인 화면으로 이동한다.
- [x] 인식 결과를 수정하고 `맞아요`를 눌러야 코칭 화면으로 이동한다.
- [x] 부모용 빠른 이해와 첫 질문이 먼저 보인다.
- [x] 힌트 1~3이 버튼 행동으로 점진 공개된다.
- [x] 최종 풀이와 비슷한 문제 답은 명시적 공개 뒤에만 보인다.
- [x] 오류 상태 mock이 풀이 대신 재시도/다시 찍기 행동을 보여 준다.
- [x] 첫 화면과 힌트 1·2에 최종 답이 없음을 테스트로 고정한다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm eval`이 통과한다.
- [x] 제품 불변조건과 충돌이 없음을 검토한다.

### 8. Result

- 계약: `packages/contracts`에 recognition/coaching Zod schema와 readonly TypeScript type을 추가했다.
- 모바일: `apps/mobile`에 mock 데이터, 답 노출 visibility rule, 부모 코칭 화면 state machine, M1 UI 컴포넌트를 추가했다.
- 문서: `README.md`와 `DESIGN.md`에 M1 mock vertical flow와 반복 UI 패턴을 반영했다.
- 도구: Expo web export 산출물이 lint 대상에 섞이지 않도록 ESLint ignore를 보강했다.

### 9. Verification evidence

2026-06-20에 아래 명령을 fresh run으로 확인했다.

- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test` → 4 files / 13 tests pass
- `CI=true pnpm eval`
- `CI=true pnpm --filter @parent-coach/mobile exec expo install --check`
- `CI=true pnpm --filter @parent-coach/mobile exec expo export --platform web`

수동/브라우저 QA:

- `apps/mobile/dist`를 `http://127.0.0.1:4173/`로 서빙해 확인했다.
- 375px, 768px, 1280px 폭에서 홈 화면 수평 overflow가 없었다.
- 인식 확인 화면에서 `직접 고칠게요`는 수정 안내만 켜고, `맞아요`만 코칭 화면으로 이동했다.
- 코칭 첫 화면과 힌트 1·2에서는 `6컵`과 `10컵`이 노출되지 않았다.
- `최종 풀이 보기`는 힌트 3개를 모두 보기 전에는 비활성화되고, 힌트 3개 뒤에 활성화됐다.
- 최종 풀이 공개 뒤에만 `6컵`, 비슷한 문제 풀이 공개 뒤에만 `10컵`이 노출됐다.
- 오류 상태는 답/풀이 없이 재시도 행동만 보여 줬다.
- 브라우저 console error는 0건이었다.

### 10. Product invariant review

- 충돌 없음: 부모가 주 사용자이며, 문구는 부모가 아이에게 설명하기 전 준비하는 흐름으로 작성됐다.
- 충돌 없음: 정답은 단계적 힌트 이후 명시적 클릭 전까지 숨긴다.
- 충돌 없음: 인식 결과 확인 전에는 코칭으로 넘어가지 않는다.
- 충돌 없음: mock 범위는 초등 5~6학년 수학 한 문제에 머문다.
- 충돌 없음: 실제 OpenAI 호출, 카메라/업로드, DB, 계정, 장기 기록, 서버 비밀키를 추가하지 않았다.

## M0 완료 기록

## 1. Goal

이 저장소의 제품 문서를 기준으로 MVP 개발 저장소의 M0 기반을 만든다.

M0의 목표는 후속 작업이 같은 규칙, 폴더 구조, 타입 기준, 테스트 명령, CI 기준으로 진행되도록 하는 것이다. 이번 단계에서는 저장소 스캐폴딩과 개발 확인용 health route/빈 Expo 화면까지만 만들며, 제품 기능 코드, 실제 AI 호출, 데이터베이스는 만들지 않는다.

## 2. User outcome

부모 사용자가 직접 보는 기능은 아직 만들지 않는다. 대신 후속 M1~M8 작업자가 같은 개발 기반 위에서 부모 코칭 앱을 안정적으로 구현할 수 있게 한다.

M0가 끝나면 새 개발자 또는 Codex 작업자는 README만 보고 다음을 할 수 있어야 한다.

- 의존성을 설치한다.
- 빈 모바일 앱과 API health endpoint를 실행한다.
- 루트에서 lint, typecheck, test를 실행한다.
- 공유 계약 패키지를 기준으로 모바일과 API 타입을 맞춘다.
- 클라이언트에 비밀키를 넣지 않는 구조로 다음 작업을 시작한다.

## 3. Context

읽은 파일과 반영한 제약:

- `AGENTS.md`: 부모 우선, 정답보다 코칭, 인식 확인, 개인정보 최소화, TypeScript strict, 서버 전용 OpenAI 키, 검증 명령 원칙
- `README.md`: 문서 우선순위, 첫 작업 안내, `PLANS.md` 사용 방식
- `PLANS.md`: 복잡한 작업 전 실행 계획 기록 양식
- `docs/00_PRODUCT_CHARTER.md`: 제품 목적, 핵심 사용 상황, 성공 지표, 비목표
- `docs/01_MVP_PRD.md`: P0 기능 요구사항, 화면 목록, 출시 제외 조건
- `docs/02_UX_AND_CONTENT.md`: 부모용 UX 흐름, 답 노출 금지, 문구 원칙
- `docs/03_AI_BEHAVIOR_SPEC.md`: Recognition/Coaching 계약, 구조화 출력, 검증 전략
- `docs/04_TECHNICAL_DIRECTION.md`: Expo + TypeScript 서버, `pnpm` workspace, 공유 계약, 서버 전용 OpenAI, 테스트 전략
- `docs/05_ACCEPTANCE_AND_EVALS.md`: 수용 기준, 평가 기준, 답 누출 0건, 개인정보 기준
- `docs/06_MVP_BACKLOG.md`: M0 저장소와 개발 기반 작업 목록
- `docs/07_DECISIONS.md`: 부모 사용자, 수학 한정, 구조화 스키마, 별도 검증, Expo + TypeScript 서버 결정

이번 계획은 `docs/06_MVP_BACKLOG.md`의 M0만 대상으로 한다. M1 mock 흐름, M2 촬영/업로드, M3 AI 인식, M4+ 코칭 생성은 구현하지 않는다.

## 4. Product constraints

M0는 기능을 만들지 않지만, 이후 제품 방향을 망치지 않도록 아래 제약을 구조에 반영한다.

- 부모가 주 사용자다. 학생용 자동 풀이 앱으로 보이는 홈/기능 화면은 만들지 않는다.
- 첫 결과에 정답을 노출하는 흐름을 만들지 않는다.
- 인식 확인 전 코칭 생성 흐름을 만들지 않는다.
- MVP 범위는 대한민국 초등학교 5~6학년 수학, 한국어, 한 번에 한 문제다.
- 모바일 앱은 OpenAI API를 직접 호출하지 않는다.
- OpenAI/API 비밀키는 서버 환경 변수에만 둔다.
- 원본 이미지와 문제 전문을 기본 로그에 남기는 구조를 만들지 않는다.
- 회원가입, 아이 프로필, 장기 학습 기록, 결제, 광고, 학부모 리포트는 만들지 않는다.

## 5. Proposed changes

### 5.1 선택 기술

- 패키지 관리: `pnpm` workspace
- 언어: TypeScript strict
- 모바일: Expo React Native + Expo Router
- API: Node.js Active LTS + Hono
- 런타임 스키마: Zod
- 테스트: Vitest
- 린트/포맷: ESLint + Prettier
- CI: GitHub Actions

Hono를 선택한다. 이유는 M0에서 필요한 API가 health endpoint와 계약 테스트뿐이고, 서버리스 전환 가능성이 높으며, Fastify보다 초기 표면적이 작기 때문이다. 이 선택이 구현 중 배포 환경 또는 Expo 개발 흐름과 충돌하면 코드부터 바꾸지 않고 `docs/07_DECISIONS.md`에 새 결정 초안을 추가한 뒤 사용자 승인을 받는다.

### 5.2 권장 구조와 M0 축소안

`docs/04_TECHNICAL_DIRECTION.md`의 권장 구조에는 `packages/ai`, `packages/math-validation`, `packages/curriculum`, `packages/ui`가 포함된다. M0에서는 아직 실제 AI 호출, 수학 검증, 커리큘럼 fixture, 공유 UI가 없으므로 이 패키지들을 만들지 않는다.

M0에서는 다음 최소 구조만 만든다.

```text
/
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── src/
│   │   │   └── design-tokens.ts
│   │   ├── app.json
│   │   ├── expo-env.d.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── api/
│       ├── src/
│       │   ├── index.ts
│       │   └── server.ts
│       ├── test/
│       │   └── health.test.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── contracts/
│       ├── src/
│       │   ├── health.ts
│       │   └── index.ts
│       ├── test/
│       │   └── health.test.ts
│       ├── package.json
│       └── tsconfig.json
├── evals/
│   ├── fixtures/
│   │   └── README.md
│   └── runners/
│       └── README.md
├── .env.example
├── .gitignore
├── DESIGN.md
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.cjs
├── tsconfig.json
├── tsconfig.base.json
└── vitest.config.ts
```

후속 마일스톤에서 추가할 항목:

- `packages/ai`: M3/M4에서 실제 AI adapter와 prompt 버전이 필요해질 때 추가
- `packages/math-validation`: M5에서 검산 로직이 필요해질 때 추가
- `packages/curriculum`: 평가 fixture와 지원 skill 분류가 쌓일 때 추가
- `packages/ui`: 모바일 외 공유 UI 요구가 실제로 생길 때 추가

### 5.3 M0 작업 순서

1. 루트 workspace 설정
   - `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.cjs`를 만든다.
   - TypeScript `strict`를 켠다.
   - `.gitignore`에 `node_modules`, Expo 산출물, build/cache, `.env*`를 추가하되 `.env.example`은 추적한다.

2. 공유 계약 패키지 생성
   - `packages/contracts`를 만든다.
   - M0에서는 health check 계약만 정의한다.
   - Recognition/Coaching 전체 스키마는 M3/M4 전까지 만들지 않는다.
   - Zod schema와 TypeScript type을 같은 파일에서 export한다.

3. API 앱 생성
   - `apps/api`를 만든다.
   - Hono 서버를 구성한다.
   - `GET /health`가 공유 계약을 만족하는 JSON을 반환한다.
   - 서버 시작 포트는 `PORT` 환경 변수를 우선하고 기본값은 `3001`로 둔다.
   - OpenAI SDK, 데이터베이스, 이미지 업로드, 세션 저장소는 추가하지 않는다.

4. 모바일 앱 생성
   - `apps/mobile`을 Expo 기반으로 만든다.
   - 첫 화면은 기능 UX가 아니라 개발 확인용 최소 화면만 둔다.
   - 권장 문구: `Parent Coach 개발 빌드`
   - 촬영, 업로드, 인식 확인, mock 코칭 UI는 M1/M2 전까지 만들지 않는다.

5. 평가 폴더 생성
   - `evals/fixtures/README.md`에 fixture 원칙을 적는다.
   - `evals/runners/README.md`에 M3 이후 평가 runner를 추가한다는 기준을 적는다.
   - 실제 출판 교재 문항을 대량 복제하지 않는다는 원칙을 명시한다.

6. 환경 변수 문서화
   - `.env.example`에 아래 값을 둔다.

```text
PORT=3001
OPENAI_API_KEY=
OPENAI_MODEL_RECOGNITION=
OPENAI_MODEL_COACHING=
OPENAI_REASONING_EFFORT=
SESSION_TTL_MINUTES=60
MAX_UPLOAD_MB=10
IMAGE_STORAGE_BUCKET=
```

- 실제 `.env`는 커밋하지 않는다고 README와 `.gitignore`에 반영한다.
- M0에서는 OpenAI SDK를 설치하거나 호출하지 않는다.

7. CI 설정
   - `.github/workflows/ci.yml`을 만든다.
   - Node Active LTS와 pnpm을 설정한다.
   - `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`를 실행한다.
   - `pnpm eval`은 M0에서는 로컬 명령으로만 유지한다. AI 실호출 평가가 생기기 전까지 CI 필수 단계에 넣지 않는다.

8. README와 디자인 기반 갱신
   - 설치, 실행, 검증 명령을 실제 스크립트와 일치시킨다.
   - M0는 기능 앱이 아니라 개발 기반이라고 명시한다.
   - 다음 단계는 `docs/08_CODEX_START_PROMPTS.md`의 Prompt 2 실행 후 M1 mock 수직 흐름이라고 적는다.
   - `DESIGN.md`에는 M0 개발 화면에 필요한 최소 색상, 간격, 타입 토큰과 향후 UI 원칙을 둔다.

## 6. Data and API contract

M0에서 실제 문제 이미지, OCR 결과, 코칭 결과, 사용자 세션 데이터는 처리하지 않는다.

M0에서 새로 정의하는 계약은 health check뿐이다.

```ts
type HealthResponse = {
  status: "ok"
  service: "parent-coach-api"
  schemaVersion: "1.0"
}
```

예상 JSON:

```json
{
  "status": "ok",
  "service": "parent-coach-api",
  "schemaVersion": "1.0"
}
```

M3/M4에서 추가할 Recognition/Coaching 스키마는 `docs/03_AI_BEHAVIOR_SPEC.md`의 논리 계약을 기준으로 `packages/contracts`에 추가한다.

## 7. Verification

### 단위 테스트

- `packages/contracts/test/health.test.ts`
  - `healthResponseSchema`가 정상 health 응답을 통과시키는지 확인한다.
  - 잘못된 `status`, 누락된 `service`, 잘못된 `schemaVersion`을 거부하는지 확인한다.
- `apps/api/test/health.test.ts`
  - `GET /health`가 200을 반환하는지 확인한다.
  - 응답 JSON이 `healthResponseSchema`를 통과하는지 확인한다.

### 통합 테스트

M0에서는 full user flow 통합 테스트를 만들지 않는다. 최소 통합 확인은 API health route까지로 제한한다.

### 수동 확인

- `pnpm dev`로 모바일 개발 서버와 API 개발 서버가 시작되는지 확인한다.
- 브라우저 또는 `curl`로 `GET /health` 응답을 확인한다.
- 모바일 개발 빌드 첫 화면에 기능 UX가 아닌 개발 확인용 문구만 보이는지 확인한다.
- README의 설치/실행 명령을 새 개발자 관점에서 따라 할 수 있는지 확인한다.

### 실행 명령

M0 구현 완료 후 아래 명령을 확인한다.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
```

`pnpm eval`은 M0 기준에서 "평가 fixture와 runner가 아직 준비되지 않았음"을 명확히 안내하고 성공해야 한다. 실제 AI 평가 실행은 M3 이후로 미룬다.

## 8. Risks and mitigations

- **과도한 초기 구조:** 권장 구조를 그대로 만들면 사용하지 않는 빈 패키지가 늘어난다.
  - 대응: M0는 `apps/mobile`, `apps/api`, `packages/contracts`까지만 만든다.

- **기능 구현으로 범위가 번짐:** 홈, 촬영, 코칭 UI를 만들기 시작하면 M1/M2 범위를 침범한다.
  - 대응: 모바일 첫 화면은 개발 빌드 확인용 최소 화면만 만든다.

- **비밀키 노출:** 편의를 위해 모바일에서 OpenAI를 직접 호출할 위험이 있다.
  - 대응: M0에서는 OpenAI SDK를 설치하지 않고, `.env.example`과 README에 서버 전용 비밀 원칙을 적는다.

- **문서와 실제 명령 불일치:** README의 명령이 구현된 scripts와 어긋날 수 있다.
  - 대응: M0 완료 조건에 README 명령 실행 확인을 포함한다.

- **Expo와 Node 서버 설정 충돌:** React Native와 Node가 같은 TypeScript/ESLint 설정을 공유하면서 런타임 차이가 생길 수 있다.
  - 대응: 루트 설정은 공통 strict 규칙만 두고, 앱별 `tsconfig.json`에서 런타임 차이를 분리한다.

- **CI가 초기부터 무거워짐:** Expo 빌드나 모바일 시뮬레이터 검사를 CI에 넣으면 M0가 불필요하게 느려진다.
  - 대응: CI는 install, lint, typecheck, unit/contract test까지만 둔다.

- **평가 명령이 빈 껍데기가 됨:** `pnpm eval`이 아무 의미 없이 성공하면 후속 작업자가 오해할 수 있다.
  - 대응: M0의 `pnpm eval`은 아직 fixture가 없음을 명확히 출력하고, M3 이후 실제 runner로 교체할 위치를 안내한다.

## 9. Done when

### Prompt 1 계획 작성 완료 조건

- [x] `AGENTS.md`, `README.md`, `PLANS.md`, `docs/00_PRODUCT_CHARTER.md`부터 `docs/07_DECISIONS.md`까지 읽었다.
- [x] `docs/06_MVP_BACKLOG.md`의 M0만 대상으로 계획을 작성했다.
- [x] 폴더 구조, 선택 기술, 실행 명령, 테스트 전략, CI, 위험, 완료 조건을 구체적으로 기록했다.
- [x] 권장 구조 중 M0에 과도한 패키지를 제외하고 이유를 적었다.
- [x] 기능 코드, 앱 화면, 실제 AI 호출을 만들지 않았다.
- [x] 제품 불변조건과의 충돌 여부를 검토했다.

### M0 구현 완료 조건

- [x] `pnpm install`이 성공한다.
- [x] `pnpm dev`로 빈 모바일 개발 서버와 API health 서버를 실행할 수 있다.
- [x] `GET /health`가 공유 계약에 맞는 응답을 반환한다.
- [x] `pnpm lint`가 성공한다.
- [x] `pnpm typecheck`가 성공한다.
- [x] `pnpm test`가 성공한다.
- [x] `pnpm eval`이 M0 기준으로 성공한다.
- [x] CI에서 install, lint, typecheck, test가 실행된다.
- [x] README의 설치와 실행 방법이 실제 명령과 일치한다.
- [x] 클라이언트 번들에 OpenAI/API 비밀키가 없다.
- [x] M1 기능 화면, 촬영/업로드, 실제 AI 호출, 데이터베이스가 포함되지 않았다.

## 10. Progress log

- 2026-06-19: Prompt 1 실행. 기존 제품/기술/평가 문서를 읽고 M0 전용 저장소 스캐폴딩 계획을 작성했다.
- 2026-06-19: `docs/04_TECHNICAL_DIRECTION.md`의 권장 구조 중 M0에 과도한 `ai`, `math-validation`, `curriculum`, `ui` 패키지는 제외하기로 했다.
- 2026-06-19: API 서버는 Hono로 계획했다. 충돌이 발견되면 결정 로그 초안을 추가하고 사용자 승인을 받는다.
- 2026-06-19: Prompt 2 실행. `apps/mobile`, `apps/api`, `packages/contracts`, `evals`, 루트 TypeScript/ESLint/Prettier/Vitest/pnpm/CI 기반을 만들었다.
- 2026-06-19: Expo SDK 56 호환성 확인 결과 React 19.2.3, React Native 0.85.3, Reanimated 4.3.1, Worklets 0.8.3 조합으로 고정했다.
- 2026-06-19: `pnpm install`, `pnpm peers check`, `expo install --check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm eval`을 통과했다.
- 2026-06-19: `pnpm dev`를 승인된 외부 실행으로 띄워 API `http://localhost:3001`과 Expo Metro `http://localhost:8081` 기동을 확인했고, `GET /health`가 공유 계약 JSON을 반환함을 확인했다.

## 11. Product invariant review

충돌 없음.

- 부모 우선: M0는 기능 UX를 만들지 않으므로 학생용 풀이 앱으로 흐르지 않는다.
- 정답보다 코칭: M0는 코칭 결과와 정답 렌더링을 만들지 않는다.
- 필수 핵심 흐름: M0는 흐름 구현 전 개발 기반만 만든다. M1 이후에도 역질문 → 힌트 → 최종 풀이 → 비슷한 문제 순서를 지킬 수 있도록 문서와 계약 중심 구조를 유지한다.
- 인식 확인: M0는 Recognition을 만들지 않으며, M3에서 사용자 확인 흐름을 별도로 구현한다.
- 지원 범위: M0는 과목/학년 확장 UI나 범용 튜터 기능을 만들지 않는다.
- 정확성 우선: M0는 AI 결과를 생성하지 않으며, 후속 검증 계층을 위한 `evals` 폴더와 계약 패키지 기반만 만든다.
- 부모의 말로 변환: M0는 문구 생성 기능을 만들지 않지만, 후속 코칭 결과가 구조화 계약을 통해 UI로 전달될 수 있게 기반을 둔다.
- 개인정보 최소화: M0는 이미지 업로드와 세션 저장을 만들지 않으며, `.env.example`과 README에 비밀 관리 원칙을 둔다.

## 12. Result

M0 저장소 스캐폴딩을 구현했다.

- 루트 workspace: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `prettier.config.cjs`, `vitest.config.ts`
- 앱: Expo Router 기반 `apps/mobile`, Hono 기반 `apps/api`
- 공유 계약: `packages/contracts`의 health schema/type/factory
- 평가 자리: `evals/fixtures`, `evals/runners`
- 보안 기준: `.env.example`만 추적하고 실제 `.env*`는 `.gitignore`로 제외
- CI: GitHub Actions에서 install, lint, typecheck, test 실행
- 문서: README 실행 안내와 M0용 `DESIGN.md` 추가

검증 결과:

- `pnpm install`: 성공
- `pnpm peers check`: 성공, peer dependency issue 없음
- `pnpm --filter @parent-coach/mobile exec expo install --check`: 성공, Expo 의존성 최신
- `pnpm lint`: 성공
- `pnpm typecheck`: 성공
- `pnpm test`: 성공, 2개 test file / 5개 test
- `pnpm eval`: 성공, M0 placeholder 안내 출력
- `pnpm dev`: 승인된 외부 실행에서 API와 Expo Metro 기동 확인
- `curl http://localhost:3001/health`: `{"status":"ok","service":"parent-coach-api","schemaVersion":"1.0"}` 반환
