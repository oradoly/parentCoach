# Parent Coach

초등학교 5~6학년 자녀의 수학 질문을 부모가 코칭하도록 돕는 모바일 앱입니다. 이 저장소는 제품 문서를 기준으로 MVP를 구현하기 위한 Expo 모바일 앱, TypeScript API, 공유 계약 패키지를 담습니다.

현재 앱은 M8 closeout 기준의 핵심 MVP 흐름을 기준으로 구성되어 있습니다. 사진 업로드, 문제 인식 확인, 코칭 생성, 검산 정책, 비슷한 문제 검증, redacted 운영 이벤트, 요청 제한, 모델 비활성화 플래그, 개인정보-safe 피드백 경로가 포함되어 있으며, 내부 알파용 40문제 평가 fixture 분포, API 리허설 게이트, Expo web surface QA 근거를 갖췄습니다. M8 판정은 내부 알파 **제한 진행**이며 공개 베타 승인이 아닙니다.

## 문서

- `AGENTS.md`: Codex 작업 규칙과 제품 불변조건
- `DESIGN.md`: 모바일 디자인 시스템과 visual direction 기준
- `PLANS.md`: 현재 작업 계획과 진행 기록
- `docs/00_PRODUCT_CHARTER.md`: 제품 목적과 성공 기준
- `docs/01_MVP_PRD.md`: MVP 기능 요구사항
- `docs/02_UX_AND_CONTENT.md`: 부모용 UX와 문구 원칙
- `docs/03_AI_BEHAVIOR_SPEC.md`: AI 출력 계약과 안전 원칙
- `docs/04_TECHNICAL_DIRECTION.md`: 기술 방향과 보안 기준
- `docs/05_ACCEPTANCE_AND_EVALS.md`: 수용 기준과 평가 방식
- `docs/06_MVP_BACKLOG.md`: 마일스톤 백로그
- `docs/07_DECISIONS.md`: 확정된 제품/기술 결정
- `docs/08_CODEX_START_PROMPTS.md`: 단계별 Codex 시작 프롬프트
- `docs/09_REFERENCES.md`: 참고 자료
- `docs/10_PRIVACY_AND_BETA_NOTICE.md`: 개인정보·베타 안내 초안
- `docs/11_INTERNAL_ALPHA_READINESS.md`: 내부 알파 준비 게이트
- `docs/12_M8_CLOSEOUT.md`: M8 closeout 판정과 남은 차단 항목
- `docs/13_INTERNAL_ALPHA_RUNBOOK.md`: 폰 smoke와 부모 파일럿 운영 절차
- `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`: 개인정보-safe 내부 알파 관찰 템플릿
- `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`: 부모 파일럿 3~5회 집계와 판정 기준
- `docs/16_TESTFLIGHT_DISTRIBUTION.md`: TestFlight 내부 테스트 빌드 배포 절차
- `docs/17_RENDER_API_DEPLOYMENT.md`: TestFlight용 Render HTTPS API 배포 절차

## 구조

```text
apps/
  api/        Hono 기반 TypeScript API
  mobile/     Expo React Native 앱
packages/
  contracts/  런타임 검증 가능한 공유 API 계약
  math-validation/ 결정적 산술 검산
evals/
  fixtures/   Recognition/Coaching 평가 fixture
  runners/    계약·알파 readiness 평가 runner
```

아직 `packages/ai`, `packages/curriculum`, `packages/ui`는 만들지 않습니다. 실제 필요가 생기는 마일스톤에서 추가합니다.

## 준비

Node.js 24 이상과 `pnpm` 11.8.0을 사용합니다.

```bash
corepack prepare pnpm@11.8.0 --activate
pnpm install
```

비밀값은 서버 환경에만 둡니다. 실제 `.env`는 커밋하지 않고, 필요한 키 이름만 `.env.example`에 남깁니다. 모바일 앱에 `OPENAI_API_KEY`나 서버 비밀을 넣지 않습니다.

모바일 앱에서 로컬 API 주소를 바꾸려면 비밀이 아닌 공개 값만 사용합니다.

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
```

Expo web이나 정적 web surface에서 로컬 API를 호출하려면 API 서버의 origin allowlist에 해당 origin을 명시합니다.

```bash
ALLOWED_WEB_ORIGINS=http://127.0.0.1:8081,http://127.0.0.1:4173
```

모델 키 없이 내부 알파 surface QA를 반복할 때만 local fixture mode를 켭니다. 이 값은 production에서 동작하지 않습니다. Fixture mode는 실제 사진 인식이 아니라 고정 샘플 응답입니다. 어떤 사진을 올려도 같은 샘플 문제와 코칭이 반환되므로, 사진별 AI 동작 검증으로 해석하지 않습니다.

```bash
ENABLE_LOCAL_AI_FIXTURES=true
```

실제 사진별 AI 인식과 코칭을 확인할 때는 서버 환경에만 `OPENAI_API_KEY`를 두고, `ENABLE_LOCAL_AI_FIXTURES` 없이 API를 시작합니다. 모바일 클라이언트나 Expo 공개 환경 변수에는 비밀키를 넣지 않습니다.

## 실행

```bash
pnpm dev
```

`pnpm dev`는 API와 Expo 모바일 개발 서버를 함께 시작합니다. API 기본 포트는 `3001`입니다.

```bash
curl http://localhost:3001/health
```

예상 응답:

```json
{
  "status": "ok",
  "service": "parent-coach-api",
  "schemaVersion": "1.0"
}
```

M2 임시 세션 API:

```bash
curl -X POST http://localhost:3001/v1/problem-sessions
curl -X POST http://localhost:3001/v1/problem-sessions/{sessionId}/image
curl -X DELETE http://localhost:3001/v1/problem-sessions/{sessionId}
```

이미지 업로드는 `multipart/form-data`의 `image` 필드를 사용합니다. 서버는 JPG, PNG, WebP만 받고 5MB를 넘는 파일은 거부합니다. 원본 bytes는 영구 저장하지 않고 임시 세션에서만 처리합니다.

M8-0 피드백 API:

```bash
curl -X POST http://localhost:3001/v1/problem-sessions/{sessionId}/feedback \
  -H 'content-type: application/json' \
  -d '{"choice":"helpful"}'
```

피드백은 `helpful`, `hard_to_explain`, `misread_problem`, `wrong_solution` 선택지만 받습니다. 문제 전문, 이미지, 자유 텍스트는 받지 않습니다.

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
```

`pnpm eval`은 Recognition/Coaching 계약 평가, alpha readiness 요약, internal alpha rehearsal을 실행합니다. Alpha readiness의 `ready`는 내부 알파 평가셋 40문제 분포와 metadata가 준비되었다는 뜻입니다. Internal alpha rehearsal의 `ready`는 fake adapter로 실제 API surface의 세션 생성 → 업로드 → 인식 → 확인 → 코칭 → 피드백 경로가 통과하고, 1·2단계 힌트 답 누출과 운영 이벤트 redaction 위반이 없다는 뜻입니다. 둘 다 공개 베타 승인으로 해석하지 않습니다. M8 closeout 판정과 남은 차단 항목은 `docs/12_M8_CLOSEOUT.md`를 기준으로 봅니다.

## 내부 알파 운영

핸드폰에서 샘플 앱을 먼저 확인하려면 `docs/13_INTERNAL_ALPHA_RUNBOOK.md`의 폰 smoke 절차를 따릅니다. 실제 부모 3~5회 파일럿을 진행할 때는 같은 runbook의 중단 조건, `docs/14_INTERNAL_ALPHA_OBSERVATION_TEMPLATE.md`의 1회 기록 양식, `docs/15_INTERNAL_ALPHA_PILOT_LOG.md`의 집계/판정 기준을 사용합니다. 이 단계도 공개 베타 승인이 아니며, 문제 전문·원본 이미지·아이 식별 정보는 기록하지 않습니다.

LAN 기반 static web surface를 반복 확인할 때는 아래 helper를 사용할 수 있습니다.

```bash
pnpm phone:smoke
pnpm phone:smoke -- --skip-export
```

TestFlight로 실제 iPhone에 내부 테스트 빌드를 올릴 때는 `docs/16_TESTFLIGHT_DISTRIBUTION.md`를 따릅니다. TestFlight 빌드는 `EXPO_PUBLIC_API_BASE_URL`에 iPhone에서 접근 가능한 HTTPS API 주소가 들어가야 하며, OpenAI 키 같은 서버 비밀은 모바일 번들에 넣지 않습니다.

TestFlight용 공개 HTTPS API는 `docs/17_RENDER_API_DEPLOYMENT.md`의 Render 배포 절차를 따릅니다. 현재 API 세션 저장소는 인메모리이므로 내부 테스트 단일 인스턴스에만 적합합니다.

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

사용자가 명시적으로 방향 변경을 승인하면 관련 문서를 먼저 수정하고 코드에 반영합니다.
