import {
  confirmedProblemResponseSchema,
  problemSessionErrorResponseSchema,
  recognitionResponseSchema,
  temporaryProblemSessionResponseSchema,
  type RecognitionResponse,
} from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import { createProblemSessionStore } from "../src/problem-session-store"
import { createApp } from "../src/server"

const START_MS = Date.parse("2026-06-20T00:00:00.000Z")
const SESSION_ID = "ps_123e4567-e89b-12d3-a456-426614174000"
const IMAGE_ID = "img_123e4567-e89b-12d3-a456-426614174001"

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

const createTestSurface = () => {
  const store = createProblemSessionStore({
    now: () => new Date(START_MS),
    sessionIdFactory: () => SESSION_ID,
    imageIdFactory: () => IMAGE_ID,
  })
  const app = createApp({
    sessionStore: store,
    recognitionAdapter: {
      recognize: () => Promise.resolve(recognitionFixture),
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

describe("M3 recognition API", () => {
  it("refuses recognition before an image is uploaded", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(409)
    expect(parsed.error.code).toBe("IMAGE_NOT_UPLOADED")
  })

  it("recognizes an uploaded problem image through an adapter", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    await uploadImage(app, sessionId)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = recognitionResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.problemText).toBe(recognitionFixture.problemText)
  })

  it("stores the user-confirmed problem text", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/problem`, {
      method: "PATCH",
      body: JSON.stringify({
        problemText: "수정된 문제입니다.",
        normalizedText: "수정된 문제",
        recognitionStatus: "ok",
        userEdited: true,
      }),
      headers: { "content-type": "application/json" },
    })
    const body: unknown = await response.json()
    const parsed = confirmedProblemResponseSchema.parse(body)

    expect(response.status).toBe(200)
    expect(parsed.problemText).toBe("수정된 문제입니다.")
    expect(parsed.userEdited).toBe(true)
  })
})
