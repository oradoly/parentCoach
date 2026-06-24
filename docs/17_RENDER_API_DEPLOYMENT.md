# 17. Render API Deployment Runbook

이 문서는 TestFlight 앱이 호출할 공개 HTTPS API를 Render Web Service로 올리는 절차다. 목적은 내부 테스트용 API surface를 만드는 것이며, 공개 베타 운영환경 완성으로 보지 않는다.

## 1. 현재 배포 대상

- Service name: `parent-coach-api`
- Runtime: Node
- Region: `singapore`
- Health check: `/health`
- Blueprint file: `render.yaml`
- Start command: `pnpm --filter @parent-coach/api start`

`render.yaml`의 기본 plan은 비용 사고를 피하려고 `free`로 둔다. TestFlight에서 cold start 때문에 첫 요청이 자주 실패하면 Render Dashboard에서 `starter` 이상으로 올린다.

## 2. 배포 전 확인

Render는 GitHub/GitLab 저장소의 브랜치를 기준으로 빌드한다. 배포하려는 변경사항이 원격 저장소에 push되어 있어야 한다.

로컬에서 먼저 확인한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## 3. Render Blueprint 생성

1. Render Dashboard에서 New > Blueprint를 선택한다.
2. 이 저장소를 연결한다.
3. 루트의 `render.yaml`을 선택한다.
4. secret 입력 단계에서 `OPENAI_API_KEY`를 입력한다.
5. 첫 deploy를 실행한다.

배포가 끝나면 Render가 `https://parent-coach-api-....onrender.com` 형태의 URL을 제공한다.

## 4. 환경 변수

`render.yaml`에 기본값이 들어간다.

필수 secret:

- `OPENAI_API_KEY`: Render service 환경 변수에만 둔다. 모바일/EAS/Expo 공개 환경 변수에 넣지 않는다.

선택 설정:

- `OPENAI_MODEL_RECOGNITION`: 기본값을 바꿀 때만 Render Dashboard에서 추가한다.
- `OPENAI_MODEL_COACHING`: 기본값을 바꿀 때만 Render Dashboard에서 추가한다.
- `ALLOWED_WEB_ORIGINS`: Expo web/static web에서 이 API를 호출해야 할 때만 origin을 쉼표로 넣는다. TestFlight 네이티브 앱에는 보통 필요 없다.

production에서는 아래 값을 유지한다.

- `ENABLE_LOCAL_AI_FIXTURES=false`
- `DISABLE_RECOGNITION_MODEL=false`
- `DISABLE_COACHING_MODEL=false`

## 5. 배포 후 smoke

Render URL을 확인한다.

```bash
curl https://YOUR_RENDER_SERVICE.onrender.com/health
```

예상 응답:

```json
{
  "status": "ok",
  "service": "parent-coach-api",
  "schemaVersion": "1.0"
}
```

TestFlight 전에 최소 API surface를 확인한다.

```bash
curl -X POST https://YOUR_RENDER_SERVICE.onrender.com/v1/problem-sessions
```

성공하면 `sessionId`, `expiresAt`, `imageStatus`가 포함된 JSON이 반환된다.

## 6. TestFlight 연결

Render URL을 EAS production 환경 변수로 등록한다.

```bash
cd apps/mobile
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value https://YOUR_RENDER_SERVICE.onrender.com \
  --environment production \
  --visibility plaintext
```

그 다음 iOS production build와 submit을 진행한다. 자세한 절차는 `docs/16_TESTFLIGHT_DISTRIBUTION.md`를 따른다.

## 7. 현재 한계

- 세션과 업로드 이미지는 현재 Render 인스턴스 메모리에만 있다.
- Render service가 재시작되면 진행 중인 문제 세션은 사라질 수 있다.
- scale-out을 켜면 요청이 다른 인스턴스로 갈 수 있어 현재 인메모리 세션 구조와 맞지 않는다.
- 문제 이미지 data URL은 recognition을 위해 짧게 메모리에 보관된다. 운영 로그에는 남기지 않는다.
- 공개 베타 전에는 TTL 저장소, 이미지 보관/삭제 재시도, 공유 rate limit, 외부 법률 검토가 필요하다.

## 8. 차단 조건

아래가 하나라도 있으면 TestFlight 빌드에 연결하지 않는다.

- `/health`가 200을 반환하지 않는다.
- `OPENAI_API_KEY`가 모바일/EAS 공개 환경 변수에 들어갔다.
- Render logs에 원본 이미지, 문제 전문, prompt 전문, raw AI 응답 전문이 출력된다.
- `ENABLE_LOCAL_AI_FIXTURES=true`인 상태로 production API를 열었다.
- 업로드 이후 인식 실패 시 임의 풀이가 노출된다.
