import {
  feedbackResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
} from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import { createMemoryOperationLogger } from "../src/observability"
import { createProblemSessionStore } from "../src/problem-session-store"
import { createApp } from "../src/server"

const START_MS = Date.parse("2026-06-22T00:00:00.000Z")
const SESSION_ID = "ps_123e4567-e89b-12d3-a456-426614174200"
const IMAGE_ID = "img_123e4567-e89b-12d3-a456-426614174201"
const REQUEST_ID = "req_123e4567-e89b-42d3-a456-426614174202"

const createTestStore = () =>
  createProblemSessionStore({
    now: () => new Date(START_MS),
    sessionIdFactory: () => SESSION_ID,
    imageIdFactory: () => IMAGE_ID,
  })

const createSession = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const response = await app.request("/v1/problem-sessions", { method: "POST" })
  const body: unknown = await response.json()
  return temporaryProblemSessionResponseSchema.parse(body).sessionId
}

describe("M8 alpha feedback API", () => {
  it("records redacted feedback for an active session", async () => {
    const sink = createMemoryOperationLogger()
    const app = createApp({
      operationLogger: sink.logger,
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/feedback`, {
      body: JSON.stringify({
        choice: "helpful",
        coachingVerificationStatus: "verified",
        similarProblemStatus: "ok",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = feedbackResponseSchema.parse(body)
    const serializedEvents = JSON.stringify(sink.events)

    expect(response.status).toBe(201)
    expect(parsed.choice).toBe("helpful")
    expect(parsed.requestId).toBe(REQUEST_ID)
    expect(sink.events.some((event) => event.stage === "feedback")).toBe(true)
    expect(serializedEvents).not.toContain("problemText")
    expect(serializedEvents).not.toContain("data:image")
  })

  it("rejects feedback bodies that include raw problem content", async () => {
    const app = createApp({
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })
    const sessionId = await createSession(app)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/feedback`, {
      body: JSON.stringify({
        choice: "misread_problem",
        problemText: "3/4 ÷ 1/8",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(400)
    expect(parsed.error.code).toBe("FEEDBACK_INVALID")
    expect(parsed.error.requestId).toBe(REQUEST_ID)
  })

  it("rejects feedback for missing sessions with request ids", async () => {
    const app = createApp({
      requestIdFactory: () => REQUEST_ID,
      sessionStore: createTestStore(),
    })

    const response = await app.request(
      "/v1/problem-sessions/ps_123e4567-e89b-12d3-a456-426614174299/feedback",
      {
        body: JSON.stringify({ choice: "hard_to_explain" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    )
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(404)
    expect(parsed.error.code).toBe("SESSION_NOT_FOUND")
    expect(parsed.error.requestId).toBe(REQUEST_ID)
  })
})
