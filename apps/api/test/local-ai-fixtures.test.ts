import {
  coachingResponseSchema,
  problemSessionErrorResponseSchema,
  recognitionResponseSchema,
  temporaryProblemSessionResponseSchema,
} from "@parent-coach/contracts"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../src/server"

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

const createUploadedSession = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const sessionResponse = await app.request("/v1/problem-sessions", { method: "POST" })
  const sessionBody: unknown = await sessionResponse.json()
  const session = temporaryProblemSessionResponseSchema.parse(sessionBody)

  const uploadResponse = await app.request(`/v1/problem-sessions/${session.sessionId}/image`, {
    method: "POST",
    body: createImageForm(),
  })
  expect(uploadResponse.status).toBe(201)

  return session.sessionId
}

describe("local AI fixture mode", () => {
  it("drives recognition and coaching without OpenAI credentials when explicitly enabled outside production", async () => {
    vi.stubEnv("ENABLE_LOCAL_AI_FIXTURES", "true")
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("OPENAI_API_KEY", "")
    const app = createApp()
    const sessionId = await createUploadedSession(app)

    const recognitionResponse = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    expect(recognitionResponse.status).toBe(200)
    const recognitionBody: unknown = await recognitionResponse.json()
    const recognition = recognitionResponseSchema.parse(recognitionBody)

    const confirmationResponse = await app.request(`/v1/problem-sessions/${sessionId}/problem`, {
      method: "PATCH",
      body: JSON.stringify({
        latex: recognition.latex,
        normalizedText: recognition.normalizedText,
        problemText: recognition.problemText,
        recognitionStatus: recognition.status,
        userEdited: false,
      }),
      headers: { "content-type": "application/json" },
    })
    expect(confirmationResponse.status).toBe(200)

    const coachingResponse = await app.request(`/v1/problem-sessions/${sessionId}/coach`, {
      method: "POST",
    })
    const coachingBody: unknown = await coachingResponse.json()
    const coaching = coachingResponseSchema.parse(coachingBody)

    expect(coachingResponse.status).toBe(200)
    expect(coaching.verification.status).toBe("verified")
    expect(coaching.similarProblem.status).toBe("ok")
    vi.unstubAllEnvs()
  })

  it("does not enable local fixture responses in production", async () => {
    vi.stubEnv("ENABLE_LOCAL_AI_FIXTURES", "true")
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("OPENAI_API_KEY", "")
    const app = createApp()
    const sessionId = await createUploadedSession(app)

    const response = await app.request(`/v1/problem-sessions/${sessionId}/recognize`, {
      method: "POST",
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(503)
    expect(parsed.error.code).toBe("OPENAI_NOT_CONFIGURED")
    vi.unstubAllEnvs()
  })
})
