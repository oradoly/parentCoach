# 04. Technical Direction

## 1. 기술 목표

MVP는 빠르게 검증하되 다음 세 가지를 희생하지 않는다.

1. 문제·풀이 계약의 명확성
2. 수학적 검증과 안전한 실패
3. 이미지와 아동 관련 데이터의 최소 처리

기술 선택은 `docs/07_DECISIONS.md`의 승인 결정을 따른다. 다른 선택이 필요하면 코드부터 바꾸지 말고 ADR 형식으로 결정을 추가한다.

## 2. 권장 초기 스택

### 클라이언트

- Expo 기반 React Native
- TypeScript strict mode
- Expo Router
- 서버 상태와 요청 취소·재시도를 지원하는 데이터 패칭 계층
- 네이티브 카메라, 사진 선택, 자르기 기능

### 서버

- Node.js Active LTS와 TypeScript
- 경량 API 서버 또는 서버리스 런타임
- Zod 등 런타임 스키마 검증
- OpenAI 공식 SDK를 서버에서만 사용

### AI

- OpenAI Responses API
- 이미지 입력이 가능한 모델을 인식 단계에 사용
- 복잡한 수학 문제에는 검증 가능한 추론 모델을 설정으로 선택
- Structured Outputs와 JSON Schema를 사용
- 모델명과 추론 수준은 환경별 설정으로 관리

### 저장소

- `pnpm` workspace 기반 monorepo
- MVP는 회원가입 없는 임시 세션을 기본으로 한다.
- 운영에서 임시 세션 저장이 필요하면 TTL을 지원하는 저장소를 사용한다.
- 이미지 저장소는 자동 만료와 삭제 확인 기능을 갖춘다.

## 3. 권장 저장소 구조

```text
/
├── AGENTS.md
├── PLANS.md
├── README.md
├── apps/
│   ├── mobile/                 # Expo React Native
│   └── api/                    # 서버 API
├── packages/
│   ├── contracts/             # 공유 요청/응답 스키마
│   ├── ai/                    # 프롬프트, 모델 어댑터, 스키마 매핑
│   ├── math-validation/       # 정확한 산술과 검산
│   ├── curriculum/            # 지원 기술 분류와 fixture 메타데이터
│   └── ui/                    # 공유 UI가 실제로 필요해진 뒤 생성
├── evals/
│   ├── fixtures/
│   └── runners/
├── docs/
└── package.json
```

초기에는 사용되지 않는 패키지를 미리 만들지 않는다. `ui` 또는 데이터베이스 계층은 실제 요구가 생길 때 추가한다.

## 4. 핵심 아키텍처

```text
Mobile App
  → API: 임시 문제 세션 생성
  → 이미지 업로드/전처리
  → Recognition AI
  → 사용자 확인·수정
  → Coaching AI
  → Math Validator
  → 구조화된 코칭 결과
  → 단계별 UI 공개
  → 세션 종료/자동 삭제
```

### 설계 원칙

- 모바일은 OpenAI API를 직접 호출하지 않는다.
- 인식 결과와 풀이 결과를 하나의 불투명한 자유 텍스트로 합치지 않는다.
- 사용자가 수정한 문제 텍스트는 새 버전으로 저장하고 이전 코칭 결과를 무효화한다.
- 최종 풀이와 비슷한 문제의 답은 UI에서 명시적 행동 전까지 렌더링하지 않는다.
- AI 공급자 교체를 고려해 모델 호출은 어댑터 뒤에 둔다.

## 5. API 초안

정확한 URL은 구현 계획에서 확정하되 책임은 다음처럼 분리한다.

### `POST /v1/problem-sessions`

- 임시 세션 생성
- 이미지 업로드 또는 업로드 URL 발급
- 응답: `sessionId`, `expiresAt`

### `POST /v1/problem-sessions/{id}/recognize`

- 이미지 품질과 문제 인식 수행
- Recognition 스키마 반환

### `PATCH /v1/problem-sessions/{id}/problem`

- 사용자가 확인·수정한 문제 저장
- 이전 코칭 결과 무효화

### `POST /v1/problem-sessions/{id}/coach`

- 코칭 결과 생성·검증
- 첫 응답에는 부모 요약, 역질문, 힌트 메타데이터를 포함
- 최종 풀이가 전송되더라도 클라이언트에서 자동 렌더링하지 않는다. 더 강한 분리가 필요하면 별도 reveal API를 사용한다.

### `POST /v1/problem-sessions/{id}/similar-problem`

- 같은 기술의 새 문제 생성·검증
- 이미 생성된 검증 결과가 있으면 재사용 가능

### `DELETE /v1/problem-sessions/{id}`

- 임시 이미지와 세션 삭제

## 6. 공유 계약

`packages/contracts`는 다음을 단일 소스로 제공한다.

- API 요청·응답 타입
- Recognition 스키마
- Coaching 스키마
- 오류 코드
- 스키마 버전
- 분석 이벤트 이름

모바일과 서버가 서로 복사한 타입을 갖지 않게 한다.

오류 응답 예:

```json
{
  "error": {
    "code": "MISSING_DIAGRAM",
    "message": "풀이에 필요한 그림이 보이지 않아요.",
    "retryable": true,
    "requestId": "req_..."
  }
}
```

## 7. 이미지 처리

- 클라이언트에서 방향 보정과 합리적 리사이즈를 수행한다.
- 수식이 흐려지지 않도록 과도한 압축을 피한다.
- EXIF 위치 정보는 업로드 전에 제거한다.
- 이미지 파일 형식과 크기를 서버에서 다시 검증한다.
- 바이러스·비정상 파일 검사를 고려한다.
- 문제 처리 후 이미지 삭제 작업을 비동기로 미루더라도 TTL과 재시도 큐를 둔다.
- 운영 로그, 오류 추적 도구, 분석 도구에 원본 이미지를 첨부하지 않는다.

## 8. 수학 검증 계층

### 원칙

- LLM이 만든 `answer`와 `steps`를 그대로 신뢰하지 않는다.
- 분수와 소수는 가능한 경우 정확한 유리수로 계산한다.
- 단위가 있는 문제는 값과 단위를 함께 검증한다.
- 비슷한 문제도 사용자에게 보여 주기 전에 동일한 검증을 거친다.

### 권장 모듈

```text
parseProblemFacts()
normalizeNumber()
validateArithmetic()
validateEquation()
validateUnits()
validateFinalAnswer()
validateSimilarProblem()
```

모든 문장제를 완전 자동 검증하려고 무리하지 않는다. 검증 불가능한 경우 명시적으로 `partially_verified` 또는 `unverified`를 반환한다.

## 9. AI 어댑터

`packages/ai`의 책임:

- 모델 설정과 호출
- 이미지 및 확인된 문제 입력 구성
- Structured Output 스키마 적용
- 타임아웃, 재시도, 취소
- 비용·지연 메타데이터 수집
- 프롬프트 버전 기록
- 모델 응답을 도메인 계약으로 변환

금지:

- React 컴포넌트에서 직접 AI 호출
- 프롬프트에 비밀키·개인 데이터 삽입
- JSON 파싱 실패를 빈 문자열로 삼키기
- 모델 오류에서 가짜 성공 결과 만들기

## 10. 보안과 개인정보

- 모든 비밀은 서버 환경 변수 또는 시크릿 관리자에 둔다.
- 업로드 URL은 짧게 만료되고 파일 형식·크기를 제한한다.
- 세션 ID는 예측 불가능하게 생성한다.
- 속도 제한과 요청 크기 제한을 적용한다.
- 민감 로그는 마스킹한다.
- 삭제 작업과 TTL 만료를 테스트한다.
- MVP는 아이의 계정, 실명, 학교, 학년별 성적을 저장하지 않는다.
- 개인정보·저작권 정책은 출시 전 국내 법률 전문가 검토를 거친다.

## 11. 관찰 가능성

기록 가능:

- request ID
- 세션의 익명 ID
- 처리 단계
- 모델·프롬프트·스키마 버전
- 지연 시간
- 토큰·비용 메타데이터
- 오류 코드
- 검증 상태

기본적으로 기록하지 않음:

- 원본 이미지
- 문제 전문
- 아이 이름·학교
- API 키
- 모델의 내부 추론

디버깅을 위해 샘플을 저장할 경우 별도 동의, 비식별화, 짧은 보관 기간, 접근 통제가 필요하다.

## 12. 테스트 전략

### 단위 테스트

- 스키마 파싱
- 힌트 수준 규칙
- 답 누출 검사
- 정확한 분수 계산
- 단위 변환
- 오류 매핑

### 계약 테스트

- 모바일과 API 계약
- 지원 스키마 버전
- 모델 mock 응답
- Structured Output 유효성

### 통합 테스트

- 이미지 fixture → 인식 확인 → 수정 → 코칭
- 낮은 신뢰도 → 재촬영
- 최종 풀이 공개
- 비슷한 문제 검증
- 세션 삭제

### 수동 테스트

- 실제 휴대폰 카메라
- 흔들린 사진, 기울어진 사진, 그림 포함 문제
- 큰 글자 설정과 스크린리더
- 느린 네트워크와 요청 취소

## 13. 기본 명령

스캐폴딩 시 루트에 다음 스크립트를 제공한다.

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
```

CI는 최소한 lint, typecheck, unit/contract tests를 실행한다. AI 실호출 평가는 비용과 변동성을 고려해 별도 수동 또는 제한된 CI 작업으로 둔다.

## 14. 환경 변수 초안

```text
OPENAI_API_KEY=
OPENAI_MODEL_RECOGNITION=
OPENAI_MODEL_COACHING=
OPENAI_REASONING_EFFORT=
SESSION_TTL_MINUTES=60
MAX_UPLOAD_MB=10
IMAGE_STORAGE_BUCKET=
```

실제 `.env`는 커밋하지 않고 `.env.example`만 제공한다.
