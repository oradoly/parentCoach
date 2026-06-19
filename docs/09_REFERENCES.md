# 09. References

이 문서는 제품 범위를 정하거나 구현 도구를 선택할 때 참고한 공식 자료를 기록한다. 링크와 정책은 변경될 수 있으므로 출시 및 주요 업그레이드 전에 다시 확인한다.

## Codex

- OpenAI, Custom instructions with AGENTS.md  
  https://developers.openai.com/codex/guides/agents-md
- OpenAI, Codex best practices  
  https://developers.openai.com/codex/learn/best-practices

핵심 적용:

- 저장소 루트의 `AGENTS.md`를 지속적인 작업 규칙으로 사용한다.
- 긴 제품·기술 상세를 `AGENTS.md`에 모두 넣지 않고 별도 문서로 분리한다.
- 복잡한 작업은 Goal, Context, Constraints, Done when이 있는 계획을 먼저 만든다.

## OpenAI API

- Images and vision  
  https://developers.openai.com/api/docs/guides/images-vision
- Structured model outputs  
  https://developers.openai.com/api/docs/guides/structured-outputs
- Responses API migration/overview  
  https://developers.openai.com/api/docs/guides/migrate-to-responses
- Reasoning best practices  
  https://developers.openai.com/api/docs/guides/reasoning-best-practices
- Safety best practices  
  https://developers.openai.com/api/docs/guides/safety-best-practices

핵심 적용:

- 이미지 입력은 서버 측 모델 호출로 처리한다.
- 사용자에게 전달할 AI 결과는 JSON Schema 기반 구조화 출력으로 받는다.
- 모델 이름은 설정으로 분리하고 평가를 통해 교체한다.
- 수학적 정확성은 모델 단독 출력이 아니라 별도 검산과 평가로 관리한다.

## 대한민국 교육과정

- 교육부 고시: 2022 개정 교육과정 시행 일정  
  https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=0404&opType=N&s=moe&statusYN=W
- 국가교육과정정보센터(NCIC), 2022 개정 초등학교 수학 성취기준  
  https://ncic.go.kr/
- 교육부, 2022 개정 교육과정 수학과 안내  
  https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=340&boardSeq=93073&lev=0&m=020201&opType=N&s=moe&statusYN=W

핵심 적용:

- 2026학년도 초등학교 5·6학년에는 2022 개정 교육과정이 적용된다.
- 수학 영역 분류를 수와 연산, 변화와 관계, 도형과 측정, 자료와 가능성에 맞춰 확장 가능하게 설계한다.
- 실제 지원 단원은 평가를 통과한 범위만 공개한다.

## 개인정보와 아동 보호

- 국가법령정보센터, 개인정보 보호법의 아동 개인정보 보호 조항  
  https://www.law.go.kr/LSW/lsRvsDocListP.do?chrClsCd=010102&lsId=011357
- 개인정보보호위원회, 맞춤형 광고 관련 아동 보호 권고  
  https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9888

핵심 적용:

- MVP는 부모가 사용하는 서비스로 설계하고 아이의 개인정보 수집을 최소화한다.
- 아이 계정과 식별 정보를 요구하지 않는다.
- 이미지와 세션은 짧게 보관하고 처리 목적 외 활용을 기본값으로 삼지 않는다.
- 실제 출시 전 변호사 또는 개인정보 전문가의 검토가 필요하다.
