import {
  problemSessionErrorResponseSchema,
  recognitionResponseSchema,
  temporaryProblemSessionResponseSchema,
  type RecognitionResponse,
} from "@parent-coach/contracts"
import { describe, expect, it, vi } from "vitest"

import { createMemoryOperationLogger } from "../src/observability"
import { createInMemoryRateLimiter } from "../src/rate-limit"
import { createProblemSessionStore } from "../src/problem-session-store"
import { RecognitionProviderError } from "../src/recognition-adapter"
import { createApp } from "../src/server"

const START_MS = Date.parse("2026-06-22T00:00:00.000Z")
const SESSION_ID = "ps_123e4567-e89b-12d3-a456-426614174100"
const IMAGE_ID = "img_123e4567-e89b-12d3-a456-426614174101"
const REQUEST_ID = "req_123e4567-e89b-12d3-a456-426614174102"

const recognitionFixture = {
  schemaVersion: "1.0",
  status: "ok",
  problemText: "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
  normalizedText: "3/4L ÷ 1/8L 컵 수 구하기",
  latex: "\\frac{3}{4} \\div \\frac{1}{8}",
  confidence: 0.94,
  containsMultipleProblems: false,
  requiresDiagram: false,
  ambiguities: [],
  suggestedAction: "confirm",
} as const satisfies RecognitionResponse

const createImageForm = (): FormData => {
  const formData = new FormData()
  formData.append(
    "image",
    new File([new Uint8Array([1, 2, 3])], "problem.jpg", { type: "image/jpeg" }),
  )
  formData.append("width", "1600")
  formData.append("height", "1200")
  formData.append("source", "library")
  return formData
}

const createTestStore = () =>
  createProblemSessionStore({
    now: () => new Date(START_MS),
    sessionIdFactory: () => SESSION_ID,
    imageIdFactory: () => IMAGE_ID,
  })

const createSession = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const response = await app.request("/v1/problem-sessions", { method: "POST" })
  const body: unknown = await response.json()
  const parsed = temporaryProblemSessionResponseSchema.parse(body)
  return parsed.sessionId
}

const uploadImage = async (app: ReturnType<typeof createApp>, sessionId: string): Promise<void> => {
  const response = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
    method: "POST",
    body: createImageForm(),
  })

  expect(response.status).toBe(201)
}

const confirmProblem = async (
  app: ReturnType<typeof createApp>,
  sessionId: string,
): Promise<void> => {
  const response = await app.request(`/v1/problem-sessions/${sessionId}/problem`, {
    method: "PATCH",
    body: JSON.stringify({
      problemText: recognitionFixture.problemText,
      normalizedText: recognitionFixture.normalizedText,
      recognitionStatus: "ok",
      userEdited: false,
    }),
    headers: { "content-type": "application/json" },
  })

  expect(response.status).toBe(200)
}

describe("M7 operational safety API", () => {
  it("returns request ids and logs blocked events when route rate limits are exceeded", async () => {
    const sink = createMemoryOperationLogger()
    const app = createApp({
      operationLogger: sink.logger,
      rateLimiter: createInMemoryRateLimiter({
        now: () => new Date(START_MS),
        rules: {
          session: { limit: 1, windowMs: 60_000 },
        },
      }),
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })

    await createSession(app)
    const response = await app.request("/v1/problem-sessions", { method: "POST" })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(429)
    expect(parsed.error.code).toBe("RATE_LIMITED")
    expect(parsed.error.requestId).toBe(REQUEST_ID)
    expect(sink.events.some((event) => event.outcome === "blocked")).toBe(true)
  })

  it("logs recognition success without raw problem text or image bytes", async () => {
    const sink = createMemoryOperationLogger()
    const app = createApp({
      operationLogger: sink.logger,
      recognitionAdapter: {
        recognize: () => Promise.resolve(recognitionFixture),
      },
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(recognitionResponseSchema.parse(body).status).toBe("ok")
    expect(JSON.stringify(sink.events)).not.toContain(recognitionFixture.problemText)
    expect(JSON.stringify(sink.events)).not.toContain("data:image/jpeg")
    expect(sink.events.some((event) => event.stage === "recognition")).toBe(true)
  })

  it("logs development recognition provider diagnostics without raw problem text or image bytes", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const providerCause = new Error("Model access failed for request")
    Object.defineProperty(providerCause, "status", {
      value: 404,
    })
    Object.defineProperty(providerCause, "code", {
      value: "model_not_found",
    })
    const app = createApp({
      recognitionAdapter: {
        metadata: {
          model: "model-for-test",
          promptVersion: "recognition-v-test",
        },
        recognize: () => Promise.reject(new RecognitionProviderError(providerCause)),
      },
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })

    expect(response.status).toBe(502)
    expect(consoleError).toHaveBeenCalledOnce()
    const logged = consoleError.mock.calls.flat().join("\n")
    expect(logged).toContain("recognition_provider_error")
    expect(logged).toContain("model_not_found")
    expect(logged).not.toContain(recognitionFixture.problemText)
    expect(logged).not.toContain("data:image/jpeg")
    consoleError.mockRestore()
    vi.unstubAllEnvs()
  })

  it("returns model disabled errors without calling recognition providers", async () => {
    vi.stubEnv("DISABLE_RECOGNITION_MODEL", "true")
    vi.stubEnv("OPENAI_API_KEY", "test-key")
    const app = createApp({
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(503)
    expect(parsed.error.code).toBe("MODEL_DISABLED")
    expect(parsed.error.requestId).toBe(REQUEST_ID)
    vi.unstubAllEnvs()
  })

  it("returns model disabled errors without calling coaching providers", async () => {
    vi.stubEnv("DISABLE_COACHING_MODEL", "true")
    vi.stubEnv("OPENAI_API_KEY", "test-key")
    const app = createApp({
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)
    await confirmProblem(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(503)
    expect(parsed.error.code).toBe("MODEL_DISABLED")
    expect(parsed.error.requestId).toBe(REQUEST_ID)
    vi.unstubAllEnvs()
  })
})
