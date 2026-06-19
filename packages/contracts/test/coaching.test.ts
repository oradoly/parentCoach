import { describe, expect, it } from "vitest"

import { coachingResponseSchema, recognitionResponseSchema } from "../src/index"

const recognitionFixture = {
  schemaVersion: "1.0",
  status: "ok",
  problemText: "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
  normalizedText: "3/4L ÷ 1/8L 컵 수 구하기",
  confidence: 0.94,
  containsMultipleProblems: false,
  requiresDiagram: false,
  ambiguities: [],
  suggestedAction: "confirm",
} as const

const coachingFixture = {
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
    status: "verified",
    method: "exact_rational_arithmetic",
    notes: [],
  },
  parentBriefing: {
    oneLine: "전체 양 안에 한 컵의 양이 몇 번 들어가는지 구하는 분수 나눗셈 문제예요.",
    whatToFind: "만들 수 있는 컵의 수",
    whyThisMethod: "한 컵의 양이 전체에 몇 번 들어가는지 묻기 때문에 나눗셈을 사용해요.",
    prerequisite: "분수의 나눗셈을 곱셈으로 바꾸는 방법",
    watchOut: "나누는 수인 1/8만 뒤집어요.",
  },
  openingQuestion: {
    parentScript: "이 문제는 전체 양을 구하는 걸까, 한 컵이 몇 번 들어가는지 묻는 걸까?",
    intent: "구해야 하는 양을 확인한다.",
    expectedSignals: ["컵 수", "몇 번 들어가는지"],
    ifCorrect: "맞아. 그러면 전체 안에 한 컵의 양이 몇 번 들어가는지 생각해 보자.",
    ifStuck: "문제의 마지막 문장에서 무엇을 묻는지 다시 읽어 볼까?",
  },
  hints: [
    {
      level: 1,
      title: "무엇이 몇 번 들어가는지 보기",
      parentScript: "전체 양 안에 한 컵의 양이 몇 번 들어가는지 생각해 보자.",
      goal: "문제를 포함 관계로 바꿔 이해한다.",
      expectedChildResponse: "나눗셈 같아요.",
      ifStuck: "작은 컵을 하나씩 채운다고 상상해 보자.",
    },
    {
      level: 2,
      title: "연산 선택하기",
      parentScript: "몇 번 들어가는지 구하려면 어떤 계산을 쓰면 좋을까?",
      goal: "분수 나눗셈을 선택한다.",
      expectedChildResponse: "전체 양을 한 컵의 양으로 나눠요.",
      ifStuck: "전체 양 ÷ 한 컵의 양으로 나타내 보자.",
    },
    {
      level: 3,
      title: "식을 바꾸기",
      parentScript: "3/4 ÷ 1/8을 쓰고, 나누는 분수만 뒤집어 곱셈으로 바꿔 보자.",
      goal: "계산 가능한 식을 세운다.",
      expectedChildResponse: "3/4 × 8/1",
      ifStuck: "1/8의 역수는 8/1이야.",
    },
  ],
  finalSolution: {
    answer: "6컵",
    steps: [
      {
        expression: "3/4 ÷ 1/8",
        explanation: "전체 양을 한 컵의 양으로 나눠 컵 수를 구합니다.",
      },
      {
        expression: "3/4 × 8/1",
        explanation: "분수의 나눗셈은 나누는 수의 역수를 곱합니다.",
      },
      {
        expression: "6",
        explanation: "약분하고 곱하면 6입니다.",
      },
    ],
    check: "1/8L × 6 = 3/4L이므로 맞습니다.",
    closingQuestion: "왜 1/8을 뒤집었는지 설명해 볼래?",
  },
  similarProblem: {
    problemText: "5/6L의 주스를 한 컵에 1/12L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
    whySimilar: "전체 양 안에 한 단위가 몇 번 들어가는지 분수 나눗셈으로 구하는 문제예요.",
    firstHint: "전체 양 ÷ 한 컵의 양으로 식을 세워 보세요.",
    answer: "10컵",
    solutionSteps: ["5/6 ÷ 1/12", "5/6 × 12", "10"],
  },
  warnings: [],
} as const

describe("M1 parent coaching contracts", () => {
  it("accepts the mock recognition response shape", () => {
    expect(recognitionResponseSchema.parse(recognitionFixture)).toStrictEqual(recognitionFixture)
  })

  it("accepts the mock coaching response shape", () => {
    expect(coachingResponseSchema.parse(coachingFixture)).toStrictEqual(coachingFixture)
  })

  it("keeps the final answer out of hint levels 1 and 2", () => {
    const parsed = coachingResponseSchema.parse(coachingFixture)
    const earlyHintCopy = parsed.hints
      .filter((hint) => hint.level === 1 || hint.level === 2)
      .flatMap((hint) => [
        hint.title,
        hint.parentScript,
        hint.goal,
        hint.expectedChildResponse,
        hint.ifStuck,
      ])

    expect(earlyHintCopy.join("\n")).not.toContain(parsed.finalSolution.answer)
  })
})
