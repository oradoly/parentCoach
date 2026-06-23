// allow: SIZE_OK — internal alpha rehearsal keeps its portable fixture and API runner together.
import {
  coachingResponseSchema,
  confirmedProblemResponseSchema,
  feedbackResponseSchema,
  imageUploadResponseSchema,
  problemImageIdSchema,
  problemSessionErrorResponseSchema,
  problemSessionIdSchema,
  recognitionResponseSchema,
  temporaryProblemSessionResponseSchema,
  type CoachingProviderResponse,
  type CoachingResponse,
  type FeedbackChoice,
  type OperationEvent,
  type OperationStage,
  type ProblemImageId,
  type ProblemSessionId,
  type RecognitionResponse,
} from "../../packages/contracts/src/index"

import { createMemoryOperationLogger } from "../../apps/api/src/observability"
import { createProblemSessionStore } from "../../apps/api/src/problem-session-store"
import { createDisabledRateLimiter } from "../../apps/api/src/rate-limit"
import { createApp } from "../../apps/api/src/server"

const START_MS = Date.parse("2026-06-20T00:00:00.000Z")
const SESSION_ID: ProblemSessionId = problemSessionIdSchema.parse(
  "ps_123e4567-e89b-42d3-a456-426614174500",
)
const IMAGE_ID: ProblemImageId = problemImageIdSchema.parse(
  "img_123e4567-e89b-42d3-a456-426614174501",
)
const REHEARSAL_PROBLEM_TEXT =
  "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?"
const FEEDBACK_CHOICE: FeedbackChoice = "helpful"

type RehearsalApp = ReturnType<typeof createApp>
type RuntimeSchema<Output> = Readonly<{
  parse: (value: unknown) => Output
}>

type InternalAlphaRehearsalStatus = "ready" | "blocked"
type RedactionCheck = "passed" | "failed"

export type InternalAlphaRehearsalStages = Readonly<{
  sessionCreated: boolean
  imageUploaded: boolean
  recognized: boolean
  problemConfirmed: boolean
  coachingReady: boolean
  feedbackSubmitted: boolean
}>

export type InternalAlphaRehearsalSummary = Readonly<{
  status: InternalAlphaRehearsalStatus
  stages: InternalAlphaRehearsalStages
  firstQuestionReady: boolean
  earlyHintAnswerLeakCount: number
  similarProblemStatus: CoachingResponse["similarProblem"]["status"]
  feedbackChoice: FeedbackChoice
  redactionCheck: RedactionCheck
  observedStages: readonly OperationStage[]
  requestIds: readonly string[]
}>

export type InternalAlphaRehearsalInput = Readonly<{
  coachingFixture?: CoachingProviderResponse
}>

class RehearsalRequestError extends Error {
  readonly name = "RehearsalRequestError"

  constructor(
    readonly stage: OperationStage,
    readonly expectedStatus: number,
    readonly actualStatus: number,
    readonly responseBody: string,
  ) {
    super(
      `Internal alpha rehearsal ${stage} request expected ${expectedStatus.toString()} but received ${actualStatus.toString()}`,
    )
  }
}

const RECOGNITION_FIXTURE = {
  schemaVersion: "1.0",
  status: "ok",
  problemText: REHEARSAL_PROBLEM_TEXT,
  normalizedText: REHEARSAL_PROBLEM_TEXT,
  latex: "\\frac{3}{4} \\div \\frac{1}{8}",
  confidence: 0.98,
  containsMultipleProblems: false,
  requiresDiagram: false,
  ambiguities: [],
  suggestedAction: "문제 문장을 확인한 뒤 코칭을 생성하세요.",
} as const satisfies RecognitionResponse

export const INTERNAL_ALPHA_REHEARSAL_COACHING_FIXTURE = {
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

const hasVisibleText = (value: string): boolean => value.trim().length > 0

const readExpectedJson = async <Output>(
  response: Response,
  expectedStatus: number,
  stage: OperationStage,
  schema: RuntimeSchema<Output>,
): Promise<Output> => {
  if (response.status !== expectedStatus) {
    throw new RehearsalRequestError(stage, expectedStatus, response.status, await response.text())
  }
  const body: unknown = await response.json()
  return schema.parse(body)
}

const readAnswerLeakBlockedSummary = async (
  response: Response,
  operationSink: ReturnType<typeof createMemoryOperationLogger>,
): Promise<InternalAlphaRehearsalSummary | null> => {
  if (response.status !== 502) {
    return null
  }

  const body: unknown = await response.json()
  const parsed = problemSessionErrorResponseSchema.parse(body)
  if (parsed.error.code !== "ANSWER_LEAK_DETECTED") {
    return null
  }

  return {
    status: "blocked",
    stages: {
      sessionCreated: true,
      imageUploaded: true,
      recognized: true,
      problemConfirmed: true,
      coachingReady: false,
      feedbackSubmitted: false,
    },
    firstQuestionReady: false,
    earlyHintAnswerLeakCount: 1,
    similarProblemStatus: "unavailable",
    feedbackChoice: FEEDBACK_CHOICE,
    redactionCheck: checkRedaction(operationSink.events),
    observedStages: collectStages(operationSink.events),
    requestIds: collectRequestIds(operationSink.events),
  }
}

const createTestSurface = (coachingFixture: CoachingProviderResponse) => {
  const operationSink = createMemoryOperationLogger()
  const app = createApp({
    coachingAdapter: {
      metadata: { model: "fixture-coaching", promptVersion: "coaching-v1.0" },
      coach: () => Promise.resolve(coachingFixture),
    },
    operationLogger: operationSink.logger,
    rateLimiter: createDisabledRateLimiter(),
    recognitionAdapter: {
      metadata: { model: "fixture-recognition", promptVersion: "recognition-v1.0" },
      recognize: () => Promise.resolve(RECOGNITION_FIXTURE),
    },
    sessionStore: createProblemSessionStore({
      now: () => new Date(START_MS),
      sessionIdFactory: () => SESSION_ID,
      imageIdFactory: () => IMAGE_ID,
    }),
  })
  return { app, operationSink }
}

const postJson = (app: RehearsalApp, path: string, body: unknown) =>
  app.request(path, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

const createImageFormData = (): FormData => {
  const formData = new FormData()
  formData.append(
    "image",
    new File([new Uint8Array([1, 2, 3, 4])], "internal-alpha-problem.jpg", {
      type: "image/jpeg",
    }),
  )
  formData.append("width", "1600")
  formData.append("height", "1200")
  formData.append("source", "sample")
  return formData
}

const countEarlyHintLeaks = (coaching: CoachingResponse): number => {
  const normalizedAnswer = coaching.finalSolution.answer.replace(/\s+/gu, "")
  const numericAnswer = /^-?\d+(?:\.\d+)?(?:\/\d+)?/u.exec(normalizedAnswer)?.[0]
  const needles =
    numericAnswer === undefined ? [normalizedAnswer] : [normalizedAnswer, numericAnswer]

  return coaching.hints.filter((hint) => {
    if (hint.level > 2) {
      return false
    }
    const copy = [
      hint.title,
      hint.parentScript,
      hint.goal,
      hint.expectedChildResponse,
      hint.ifStuck,
    ].join("\n")
    return needles.some((needle) => copy.replace(/\s+/gu, "").includes(needle))
  }).length
}

const collectStages = (events: readonly OperationEvent[]): readonly OperationStage[] =>
  Array.from(new Set(events.map((event) => event.stage)))

const collectRequestIds = (events: readonly OperationEvent[]): readonly string[] =>
  Array.from(new Set(events.map((event) => event.requestId)))

const checkRedaction = (events: readonly OperationEvent[]): RedactionCheck => {
  const serializedEvents = JSON.stringify(events)
  const forbiddenFragments = [
    REHEARSAL_PROBLEM_TEXT,
    "3/4L",
    "data:image",
    "imageDataUrl",
    "rawResponse",
  ] as const
  return forbiddenFragments.some((fragment) => serializedEvents.includes(fragment))
    ? "failed"
    : "passed"
}

export const runInternalAlphaRehearsal = async ({
  coachingFixture = INTERNAL_ALPHA_REHEARSAL_COACHING_FIXTURE,
}: InternalAlphaRehearsalInput = {}): Promise<InternalAlphaRehearsalSummary> => {
  const { app, operationSink } = createTestSurface(coachingFixture)

  const session = await readExpectedJson(
    await app.request("/v1/problem-sessions", { method: "POST" }),
    201,
    "session",
    temporaryProblemSessionResponseSchema,
  )
  const upload = await readExpectedJson(
    await app.request(`/v1/problem-sessions/${session.sessionId}/image`, {
      body: createImageFormData(),
      method: "POST",
    }),
    201,
    "upload",
    imageUploadResponseSchema,
  )
  const recognition = await readExpectedJson(
    await app.request(`/v1/problem-sessions/${session.sessionId}/recognize`, { method: "POST" }),
    200,
    "recognition",
    recognitionResponseSchema,
  )
  const confirmation = await readExpectedJson(
    await app.request(`/v1/problem-sessions/${session.sessionId}/problem`, {
      body: JSON.stringify({
        latex: recognition.latex,
        normalizedText: recognition.normalizedText,
        problemText: recognition.problemText,
        recognitionStatus: recognition.status,
        userEdited: false,
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    }),
    200,
    "confirmation",
    confirmedProblemResponseSchema,
  )
  const coachingResponse = await app.request(`/v1/problem-sessions/${session.sessionId}/coach`, {
    method: "POST",
  })
  const blockedSummary = await readAnswerLeakBlockedSummary(coachingResponse, operationSink)
  if (blockedSummary !== null) {
    return blockedSummary
  }
  const coaching = await readExpectedJson(coachingResponse, 200, "coaching", coachingResponseSchema)
  const feedback = await readExpectedJson(
    await postJson(app, `/v1/problem-sessions/${session.sessionId}/feedback`, {
      choice: FEEDBACK_CHOICE,
      coachingVerificationStatus: coaching.verification.status,
      similarProblemStatus: coaching.similarProblem.status,
    }),
    201,
    "feedback",
    feedbackResponseSchema,
  )

  const stages: InternalAlphaRehearsalStages = {
    sessionCreated: session.sessionId === SESSION_ID,
    imageUploaded: upload.image.imageId === IMAGE_ID && upload.image.byteSize > 0,
    recognized: recognition.confidence >= 0.9,
    problemConfirmed: confirmation.sourceRecognitionStatus === recognition.status,
    coachingReady: coaching.hints.length === 3,
    feedbackSubmitted: feedback.choice === FEEDBACK_CHOICE,
  }
  const firstQuestionReady = hasVisibleText(coaching.openingQuestion.parentScript)
  const earlyHintAnswerLeakCount = countEarlyHintLeaks(coaching)
  const redactionCheck = checkRedaction(operationSink.events)
  const allStagesReady = Object.values(stages).every((stageReady) => stageReady)
  const status: InternalAlphaRehearsalStatus =
    allStagesReady &&
    firstQuestionReady &&
    earlyHintAnswerLeakCount === 0 &&
    coaching.similarProblem.status === "ok" &&
    redactionCheck === "passed"
      ? "ready"
      : "blocked"

  return {
    status,
    stages,
    firstQuestionReady,
    earlyHintAnswerLeakCount,
    similarProblemStatus: coaching.similarProblem.status,
    feedbackChoice: feedback.choice,
    redactionCheck,
    observedStages: collectStages(operationSink.events),
    requestIds: collectRequestIds(operationSink.events),
  }
}

const isMain = process.argv[1]?.endsWith("internal-alpha-rehearsal.ts") === true

if (isMain) {
  const summary = await runInternalAlphaRehearsal()
  console.log(JSON.stringify(summary, null, 2))
  if (summary.status !== "ready") {
    process.exitCode = 1
  }
}
