# Parent Coach

초등학교 5~6학년 자녀의 수학 질문을 부모가 코칭하도록 돕는 모바일 앱입니다. 이 저장소는 제품 문서를 기준으로 MVP를 구현하기 위한 Expo 모바일 앱, TypeScript API, 공유 계약 패키지를 담습니다.

현재 앱 첫 화면은 M1 mock 기반 부모 코칭 수직 흐름입니다. 홈, 촬영 placeholder, 인식 확인, 부모용 빠른 이해, 역질문, 3단계 힌트, 명시적 최종 풀이, 비슷한 문제, 오류 상태 예시를 실제 AI 없이 시연합니다. 실제 촬영, 업로드, OpenAI 호출, 데이터베이스는 아직 포함하지 않습니다.

## 문서

- `AGENTS.md`: Codex 작업 규칙과 제품 불변조건
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

## 구조

```text
apps/
  api/        Hono 기반 TypeScript API
  mobile/     Expo React Native 앱
packages/
  contracts/  런타임 검증 가능한 공유 API 계약
evals/
  fixtures/   M3 이후 평가 fixture 위치
  runners/    M3 이후 평가 runner 위치
```

아직 `packages/ai`, `packages/math-validation`, `packages/curriculum`, `packages/ui`는 만들지 않습니다. 실제 필요가 생기는 마일스톤에서 추가합니다.

## 준비

Node.js 24 이상과 `pnpm` 11.8.0을 사용합니다.

```bash
corepack prepare pnpm@11.8.0 --activate
pnpm install
```

비밀값은 서버 환경에만 둡니다. 실제 `.env`는 커밋하지 않고, 필요한 키 이름만 `.env.example`에 남깁니다. 모바일 앱에 `OPENAI_API_KEY`나 서버 비밀을 넣지 않습니다.

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

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
```

`pnpm eval`은 아직 평가 fixture와 runner가 자리만 잡혀 있음을 안내하고 성공합니다. 실제 AI 평가 runner는 M3 이후 추가합니다.

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
