# 16. TestFlight Distribution Runbook

이 문서는 사용자의 iPhone에 TestFlight로 Parent Coach 내부 테스트 빌드를 설치하기 위한 절차다. 이 단계는 공개 베타 승인이 아니며, 부모 파일럿 전에 실제 기기에서 앱 표면을 확인하기 위한 내부 배포다.

## 1. 현재 repo 준비 상태

- iOS bundle identifier: `com.oradoly.parentcoach`
- EAS build profile: `production`
- EAS submit profile: `production`
- 앱 버전: `0.1.0`

App Store Connect에서 bundle identifier가 이미 사용 중이면 앱 record를 만들기 전에 `apps/mobile/app.json`의 `ios.bundleIdentifier`를 바꾼다. 한 번 App Store Connect 앱과 연결한 뒤에는 바꾸기 번거롭다.

## 2. 먼저 결정할 것

TestFlight 앱은 Expo web smoke처럼 `127.0.0.1`이나 임시 LAN 주소를 쓰면 안 된다. iPhone에서 접근 가능한 HTTPS API가 필요하다.

필수:

- API base URL: 예) `https://api.parent-coach.example.com`
- Apple Developer Program 가입된 Apple ID
- App Store Connect 접근 권한
- Expo 계정

서버가 아직 공개 HTTPS 환경에 없으면 TestFlight 앱 설치와 홈 화면 확인은 가능하지만, 사진 업로드 이후 실제 인식·코칭 흐름은 실패한다.

Render로 공개 HTTPS API를 먼저 올릴 때는 `docs/17_RENDER_API_DEPLOYMENT.md`를 따른다.

## 3. EAS CLI 로그인

전역 설치 대신 최신 CLI를 일회성으로 써도 된다.

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest whoami
```

## 4. EAS production 환경 변수 등록

`EXPO_PUBLIC_API_BASE_URL`은 클라이언트 번들에 포함되는 공개 설정이다. 비밀값이 아니므로 plain text로 등록한다. `OPENAI_API_KEY`는 여기에 넣지 않는다. OpenAI 키는 API 서버 환경에만 둔다.

```bash
cd apps/mobile
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value https://YOUR_PUBLIC_API_HOST \
  --environment production \
  --visibility plaintext
```

등록 후 Expo dashboard의 project environment variables에서 `production` 값이 보이는지 확인한다.

## 5. App Store Connect 앱 record 생성

App Store Connect에서 새 앱을 만든다.

- Platform: iOS
- Name: Parent Coach 또는 내부 테스트용 이름
- Primary language: Korean
- Bundle ID: `com.oradoly.parentcoach`
- SKU: `com.oradoly.parentcoach`

처음 생성할 때 Apple 약관 또는 세금/계약 안내가 뜨면 먼저 처리해야 submit이 진행된다.

## 6. iOS production build

Expo 앱 디렉터리에서 실행한다. repo 루트에서 실행하면 EAS가 루트를 Expo 앱으로 착각해 `expo` 패키지 설치를 요구할 수 있다.

```bash
cd apps/mobile
npx eas-cli@latest build --platform ios --profile production
```

처음 실행하면 EAS가 Apple 계정 로그인, certificate, provisioning profile 생성을 안내할 수 있다. 내부 테스트 목적이면 EAS가 관리하는 credentials를 선택하는 편이 가장 빠르다.

## 7. TestFlight 제출

build가 성공하면 최신 iOS build를 App Store Connect에 제출한다.

```bash
cd apps/mobile
npx eas-cli@latest submit \
  --platform ios \
  --profile production \
  --latest \
  --what-to-test "부모용 수학 코칭 MVP 내부 테스트: 촬영, 인식 확인, 역질문, 단계별 힌트, 최종 풀이 공개 흐름 확인"
```

제출 후 Apple processing이 끝날 때까지 기다린다. 처리 완료 후 App Store Connect의 TestFlight 탭에서 internal tester로 본인 Apple ID를 추가한다.

## 8. iPhone 설치

1. iPhone에 TestFlight 앱을 설치한다.
2. App Store Connect에서 초대한 Apple ID로 TestFlight 초대 메일을 연다.
3. Parent Coach build를 설치한다.
4. 아래 smoke만 먼저 확인한다.

확인 항목:

- 홈이 뜬다.
- 카메라 권한 문구가 자연스럽다.
- 사진 선택 권한 문구가 자연스럽다.
- 사진 업로드 후 API 연결이 된다.
- 인식 확인 전에는 코칭이 나오지 않는다.
- 첫 코칭 화면과 힌트 1·2에 최종 답이 나오지 않는다.
- 최종 풀이와 비슷한 문제 답은 명시적 행동 뒤에만 보인다.

## 9. 차단 조건

아래가 하나라도 발생하면 부모 파일럿으로 넘어가지 않는다.

- TestFlight 앱이 `127.0.0.1` API로 요청한다.
- 모바일 번들에 `OPENAI_API_KEY` 또는 서버 비밀이 들어간다.
- iPhone에서 업로드 후 API 연결이 되지 않는다.
- 인식 확인 전에 코칭이 보인다.
- 힌트 1·2에 최종 답이 보인다.
- 오류 상태에서 임의 풀이가 보인다.

## 10. 관련 공식 문서

- Expo EAS Build: `https://docs.expo.dev/build/setup/`
- Expo EAS Submit iOS: `https://docs.expo.dev/submit/ios/`
- Expo EAS environment variables: `https://docs.expo.dev/eas/environment-variables/`
- Apple TestFlight: `https://developer.apple.com/testflight/`
