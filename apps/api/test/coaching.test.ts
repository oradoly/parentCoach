import {
  coachingResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
  type CoachingProviderResponse,
} from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import { createProblemSessionStore } from "../src/problem-session-store"
import { createApp } from "../src/server"

const START_MS = Date.parse("2026-06-20T00:00:00.000Z")
const SESSION_ID = "ps_123e4567-e89b-12d3-a456-426614174000"
const IMAGE_ID = "img_123e4567-e89b-12d3-a456-426614174001"

const correctCoachingFixture = {
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
    problemText: "2/3L를 한 컵에 1/6L씩 담으면 몇 컵인가요?",
    whySimilar: "전체 양 안에 한 단위가 몇 번 들어가는지 보는 문제예요.",
    firstHint: "전체 양 ÷ 한 컵의 양으로 식을 세워 보세요.",
    answer: "4컵",
    solutionSteps: ["2/3 ÷ 1/6"],
  },
  warnings: [],
} as const satisfies CoachingProviderResponse

const createTestSurface = (coaching: CoachingProviderResponse = correctCoachingFixture) => {
  const store = createProblemSessionStore({
    now: () => new Date(START_MS),
    sessionIdFactory: () => SESSION_ID,
    imageIdFactory: () => IMAGE_ID,
  })
  const app = createApp({
    sessionStore: store,
    coachingAdapter: {
      coach: () => Promise.resolve(coaching),
    },
  })

  return { app }
}

const createSession = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const response = await app.request("/v1/problem-sessions", { method: "POST" })
  const body: unknown = await response.json()
  const parsed = temporaryProblemSessionResponseSchema.parse(body)
  return parsed.sessionId
}

const uploadImage = async (app: ReturnType<typeof createApp>, sessionId: string): Promise<void> => {
  const formData = new FormData()
  formData.append(
    "image",
    new File([new Uint8Array([1, 2, 3])], "problem.jpg", { type: "image/jpeg" }),
  )
  formData.append("width", "1600")
  formData.append("height", "1200")
  formData.append("source", "library")

  const response = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
    method: "POST",
    body: formData,
  })

  expect(response.status).toBe(201)
}

const confirmProblem = async (
  app: ReturnType<typeof createApp>,
  sessionId: string,
  problemText = "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
) => {
  const response = await app.request(`/v1/problem-sessions/${sessionId}/problem`, {
    method: "PATCH",
    body: JSON.stringify({
      problemText,
      normalizedText: "3/4L ÷ 1/8L 컵 수 구하기",
      recognitionStatus: "ok",
      userEdited: false,
    }),
    headers: { "content-type": "application/json" },
  })

  expect(response.status).toBe(200)
}

describe("M5 coaching API", () => {
  it("refuses coaching before the parent confirms the recognized problem", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(409)
    expect(parsed.error.code).toBe("PROBLEM_NOT_CONFIRMED")
  })

  it("marks checkable correct final solution as verified with server-side arithmetic validation", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = coachingResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.verification.status).toBe("verified")
    expect(parsed.verification.method).toBe("exact_rational_arithmetic")
    expect(parsed.verification.notes.join("\n")).toContain("최종 풀이식")
    expect(parsed.similarProblem.status).toBe("ok")
    if (parsed.similarProblem.status === "ok") {
      expect(parsed.similarProblem.verification.status).toBe("verified")
      expect(parsed.similarProblem.verification.notes.join("\n")).toContain("비슷한 문제")
    }
  })

  it("keeps coaching output but marks duplicate similar problem candidates unavailable", async () => {
    const duplicateSimilarCoaching = {
      ...correctCoachingFixture,
      similarProblem: {
        ...correctCoachingFixture.similarProblem,
        problemText: "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
        answer: "6컵",
        solutionSteps: ["3/4 ÷ 1/8"],
      },
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(duplicateSimilarCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = coachingResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.verification.status).toBe("verified")
    expect(parsed.similarProblem.status).toBe("unavailable")
    if (parsed.similarProblem.status === "unavailable") {
      expect(parsed.similarProblem.reasonCode).toBe("duplicate_source")
      expect(JSON.stringify(parsed.similarProblem)).not.toContain("answer")
    }
  })

  it("keeps coaching output but marks wrong similar problem answers unavailable", async () => {
    const wrongSimilarCoaching = {
      ...correctCoachingFixture,
      similarProblem: {
        ...correctCoachingFixture.similarProblem,
        answer: "5컵",
      },
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(wrongSimilarCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = coachingResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.verification.status).toBe("verified")
    expect(parsed.similarProblem.status).toBe("unavailable")
    if (parsed.similarProblem.status === "unavailable") {
      expect(parsed.similarProblem.reasonCode).toBe("validation_failed")
      expect(JSON.stringify(parsed.similarProblem)).not.toContain("5컵")
    }
  })

  it("blocks final solution output when arithmetic validation finds a mismatch", async () => {
    const wrongCoaching = {
      ...correctCoachingFixture,
      finalSolution: {
        ...correctCoachingFixture.finalSolution,
        answer: "7컵",
      },
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(wrongCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(409)
    expect(parsed.error.code).toBe("VERIFICATION_FAILED")
    expect(JSON.stringify(parsed)).not.toContain("finalSolution")
  })

  it("blocks nonsensical digit-sum final solutions when the problem does not ask for digit sums", async () => {
    const digitSumCoaching = {
      ...correctCoachingFixture,
      classification: {
        curriculum: "KR-2022",
        gradeBand: "5-6",
        domain: "measurement",
        skill: "trapezoid_height",
        difficulty: "medium",
      },
      finalSolution: {
        answer: "5cm",
        steps: [
          {
            expression: "4, 1, 8",
            explanation: "가장 먼저 4 1/8의 숫자 4, 1, 8을 모두 더하면 13입니다.",
          },
          {
            expression: "2 + 1 + 2 = 5",
            explanation: "검산하면 높이는 5cm입니다.",
          },
        ],
        check: "2 + 1 + 2 = 5이므로 맞습니다.",
        closingQuestion: "왜 숫자를 더했는지 설명해 볼래?",
      },
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(digitSumCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(
      app,
      sessionId,
      "넓이가 20cm²이고 윗변이 3cm, 아랫변이 5cm인 사다리꼴의 높이는 몇 cm인가요?",
    )

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(409)
    expect(parsed.error.code).toBe("VERIFICATION_FAILED")
    expect(JSON.stringify(parsed)).not.toContain("4, 1, 8")
  })

  it("allows digit-sum final solutions when the problem asks for digit sums", async () => {
    const digitSumCoaching = {
      ...correctCoachingFixture,
      finalSolution: {
        answer: "13",
        steps: [
          {
            expression: "4 + 1 + 8 = 13",
            explanation: "4 1 8의 각 자리 숫자를 모두 더하면 13입니다.",
          },
        ],
        check: "4 + 1 + 8 = 13이므로 맞습니다.",
        closingQuestion: "각 자리 숫자를 어떻게 찾았는지 말해 볼래?",
      },
      similarProblem: {
        ...correctCoachingFixture.similarProblem,
        problemText: "352의 각 자리 숫자의 합은 얼마인가요?",
        answer: "10",
        solutionSteps: ["3 + 5 + 2 = 10"],
      },
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(digitSumCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId, "418의 각 자리 숫자의 합은 얼마인가요?")

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = coachingResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.finalSolution.answer).toBe("13")
  })

  it("blocks coaching output when early parent-facing copy leaks the final answer", async () => {
    const answerLeakingCoaching = {
      ...correctCoachingFixture,
      hints: [
        {
          ...correctCoachingFixture.hints[0],
          parentScript: "정답은 6컵이지만, 왜 그런지 말해 볼까?",
        },
        correctCoachingFixture.hints[1],
        correctCoachingFixture.hints[2],
      ],
    } satisfies CoachingProviderResponse
    const { app } = createTestSurface(answerLeakingCoaching)
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(502)
    expect(parsed.error.code).toBe("ANSWER_LEAK_DETECTED")
    expect(JSON.stringify(parsed)).not.toContain("finalSolution")
  })
})
