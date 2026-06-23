import type { CoachingProviderResponse, RecognitionResponse } from "@parent-coach/contracts"

import type { CoachingAdapter } from "./coaching-adapter"
import type { RecognitionAdapter } from "./recognition-adapter"

export const LOCAL_AI_FIXTURE_ENV = "ENABLE_LOCAL_AI_FIXTURES"

const LOCAL_FIXTURE_PROBLEM_TEXT =
  "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?"

const localRecognitionFixture = {
  schemaVersion: "1.0",
  status: "ok",
  problemText: LOCAL_FIXTURE_PROBLEM_TEXT,
  normalizedText: LOCAL_FIXTURE_PROBLEM_TEXT,
  latex: "\\frac{3}{4} \\div \\frac{1}{8}",
  confidence: 0.98,
  containsMultipleProblems: false,
  requiresDiagram: false,
  ambiguities: [],
  suggestedAction: "문제 문장을 확인한 뒤 코칭을 생성하세요.",
} as const satisfies RecognitionResponse

const localCoachingFixture = {
  schemaVersion: "1.0",
  status: "ok",
  classification: {
    curriculum: "KR-2022",
    gradeBand: "5-6",
    domain: "number_and_operations",
    skill: "fraction_division",
    difficulty: "medium",
  },
  verification: {
    status: "unverified",
    method: "provider_generation_only",
    notes: [],
  },
  parentBriefing: {
    oneLine: "전체 양 안에 한 컵의 양이 몇 번 들어가는지 구하는 문제예요.",
    whatToFind: "만들 수 있는 컵의 수",
    whyThisMethod: "한 컵의 양이 전체에 몇 번 들어가는지 묻기 때문에 나눗셈을 사용해요.",
    prerequisite: "분수의 나눗셈을 곱셈으로 바꾸는 방법",
    watchOut: "나누는 수만 뒤집어요.",
  },
  openingQuestion: {
    parentScript: "전체 양과 한 컵의 양 중 무엇을 기준으로 컵 수를 구하면 좋을까?",
    intent: "구해야 하는 양을 확인한다.",
    expectedSignals: ["컵 수", "몇 번 들어가는지"],
    ifCorrect: "맞아. 그러면 전체 안에 한 컵이 몇 번 들어가는지 생각해 보자.",
    ifStuck: "문제의 마지막 문장에서 무엇을 묻는지 다시 읽어 볼까?",
  },
  hints: [
    {
      level: 1,
      title: "포함 관계 보기",
      parentScript: "전체 양 안에 한 컵의 양이 몇 번 들어가는지 생각해 보자.",
      goal: "문제를 포함 관계로 이해한다.",
      expectedChildResponse: "몇 번 들어가는지 구해요.",
      ifStuck: "작은 컵을 하나씩 넣는다고 생각해 보자.",
    },
    {
      level: 2,
      title: "연산 고르기",
      parentScript: "몇 번 들어가는지 구할 때 어떤 계산을 쓰면 좋을까?",
      goal: "나눗셈을 선택한다.",
      expectedChildResponse: "나눗셈이요.",
      ifStuck: "전체 양을 한 컵의 양으로 나누면 돼.",
    },
    {
      level: 3,
      title: "식 세우기",
      parentScript: "전체 양 ÷ 한 컵의 양으로 식을 세워 보자.",
      goal: "다음 행동을 정한다.",
      expectedChildResponse: "3/4 ÷ 1/8",
      ifStuck: "먼저 문제에 있는 두 양을 식에 옮겨 보자.",
    },
  ],
  finalSolution: {
    answer: "6컵",
    steps: [
      {
        expression: "3/4 ÷ 1/8",
        explanation: "전체 양을 한 컵의 양으로 나눠 컵 수를 구합니다.",
      },
    ],
    check: "3/4에 1/8이 6번 들어가므로 맞습니다.",
    closingQuestion: "왜 나눗셈을 썼는지 설명해 볼래?",
  },
  similarProblem: {
    problemText: "2/3L의 음료를 한 병에 1/6L씩 나누어 담으면 모두 몇 병인가요?",
    whySimilar: "전체 양 안에 한 단위가 몇 번 들어가는지 보는 문제예요.",
    firstHint: "전체 양 ÷ 한 병의 양으로 식을 세워 보세요.",
    answer: "4병",
    solutionSteps: ["2/3 ÷ 1/6", "4"],
  },
  warnings: [],
} as const satisfies CoachingProviderResponse

export const isLocalAiFixtureModeEnabled = (): boolean => {
  if (process.env[LOCAL_AI_FIXTURE_ENV]?.trim() !== "true") {
    return false
  }
  return process.env["NODE_ENV"]?.trim() !== "production"
}

export const createLocalFixtureRecognitionAdapter = (): RecognitionAdapter => ({
  metadata: {
    model: "local-fixture-recognition",
    promptVersion: "recognition-v1.0",
  },
  recognize: () => Promise.resolve(localRecognitionFixture),
})

export const createLocalFixtureCoachingAdapter = (): CoachingAdapter => ({
  metadata: {
    model: "local-fixture-coaching",
    promptVersion: "coaching-v1.0",
  },
  coach: () => Promise.resolve(localCoachingFixture),
})
