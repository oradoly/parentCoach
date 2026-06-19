import {
  MAX_IMAGE_UPLOAD_BYTES,
  imageUploadResponseSchema,
  problemSessionDeletedResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
} from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import { createProblemSessionStore } from "../src/problem-session-store"
import { createApp } from "../src/server"

const START_MS = Date.parse("2026-06-20T00:00:00.000Z")
const SESSION_ID = "ps_123e4567-e89b-12d3-a456-426614174000"
const IMAGE_ID = "img_123e4567-e89b-12d3-a456-426614174001"

const createTestSurface = () => {
  let nowMs = START_MS
  const store = createProblemSessionStore({
    now: () => new Date(nowMs),
    sessionIdFactory: () => SESSION_ID,
    imageIdFactory: () => IMAGE_ID,
  })
  const app = createApp({ sessionStore: store })

  return {
    app,
    advancePastTtl: () => {
      nowMs += 15 * 60 * 1000 + 1
    },
  }
}

const createImageForm = (file: File): FormData => {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("width", "1600")
  formData.append("height", "1200")
  formData.append("source", "library")
  return formData
}

const createSession = async (app: ReturnType<typeof createApp>): Promise<string> => {
  const response = await app.request("/v1/problem-sessions", { method: "POST" })
  const body: unknown = await response.json()
  const parsed = temporaryProblemSessionResponseSchema.parse(body)

  expect(response.status).toBe(201)
  return parsed.sessionId
}

describe("M2 problem session API", () => {
  it("creates a temporary problem session", async () => {
    const { app } = createTestSurface()

    const sessionId = await createSession(app)

    expect(sessionId).toBe(SESSION_ID)
  })

  it("receives one multipart image and stores only upload metadata", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    const image = new File([new Uint8Array([1, 2, 3])], "problem.jpg", { type: "image/jpeg" })

    const response = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
      method: "POST",
      body: createImageForm(image),
    })
    const body: unknown = await response.json()
    const parsed = imageUploadResponseSchema.parse(body)

    expect(response.status).toBe(201)
    expect(parsed.image.imageId).toBe(IMAGE_ID)
    expect(parsed.image.byteSize).toBe(3)
    expect(parsed.image.retained).toBe(false)
  })

  it("rejects unsupported image MIME types", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    const image = new File([new Uint8Array([1])], "problem.gif", { type: "image/gif" })

    const response = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
      method: "POST",
      body: createImageForm(image),
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(415)
    expect(parsed.error.code).toBe("UNSUPPORTED_IMAGE_TYPE")
  })

  it("rejects images over the upload size limit", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)
    const oversizedBytes = new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1)
    const image = new File([oversizedBytes], "problem.jpg", { type: "image/jpeg" })

    const response = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
      method: "POST",
      body: createImageForm(image),
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(413)
    expect(parsed.error.code).toBe("IMAGE_TOO_LARGE")
  })

  it("deletes temporary sessions and refuses later uploads", async () => {
    const { app } = createTestSurface()
    const sessionId = await createSession(app)

    const deleteResponse = await app.request(`/v1/problem-sessions/${sessionId}`, {
      method: "DELETE",
    })
    const deleteBody: unknown = await deleteResponse.json()
    const deleted = problemSessionDeletedResponseSchema.parse(deleteBody)

    const uploadResponse = await app.request(`/v1/problem-sessions/${sessionId}/image`, {
      method: "POST",
      body: createImageForm(new File([new Uint8Array([1])], "problem.jpg", { type: "image/jpeg" })),
    })
    const uploadBody: unknown = await uploadResponse.json()
    const uploadError = problemSessionErrorResponseSchema.parse(uploadBody)

    expect(deleteResponse.status).toBe(200)
    expect(deleted.imageStatus).toBe("deleted")
    expect(uploadResponse.status).toBe(404)
    expect(uploadError.error.code).toBe("SESSION_NOT_FOUND")
  })

  it("expires temporary sessions by TTL before upload", async () => {
    const surface = createTestSurface()
    const sessionId = await createSession(surface.app)
    surface.advancePastTtl()

    const response = await surface.app.request(`/v1/problem-sessions/${sessionId}/image`, {
      method: "POST",
      body: createImageForm(new File([new Uint8Array([1])], "problem.jpg", { type: "image/jpeg" })),
    })
    const body: unknown = await response.json()
    const parsed = problemSessionErrorResponseSchema.parse(body)

    expect(response.status).toBe(410)
    expect(parsed.error.code).toBe("SESSION_EXPIRED")
  })
})
