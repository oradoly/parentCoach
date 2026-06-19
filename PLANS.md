# PLANS.md

이 파일은 여러 파일 또는 계층을 변경하는 작업의 실행 계획을 기록한다. Codex는 복잡한 작업에서 코드를 작성하기 전에 이 양식을 채우고, 구현 중 발견된 사실에 따라 갱신한다.

## 현재 작업

- 상태: M1 구현 완료, 검증 통과
- 작업명: M1 Mock 기반 부모 코칭 수직 흐름
- 담당: Codex
- 관련 백로그: `docs/06_MVP_BACKLOG.md`의 M1
- 작성일: 2026-06-20

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
