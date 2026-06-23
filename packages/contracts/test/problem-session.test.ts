import { describe, expect, it } from "vitest"

import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  feedbackRequestSchema,
  feedbackResponseSchema,
  imageUploadResponseSchema,
  operationEventSchema,
  problemSessionDeletedResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
} from "../src/index"

const sessionFixture = {
  schemaVersion: "1.0",
  sessionId: "ps_123e4567-e89b-12d3-a456-426614174000",
  expiresAt: "2026-06-20T00:15:00.000Z",
  imageStatus: "empty",
} as const

const uploadFixture = {
  schemaVersion: "1.0",
  sessionId: sessionFixture.sessionId,
  imageStatus: "uploaded",
  image: {
    imageId: "img_123e4567-e89b-12d3-a456-426614174001",
    receivedAt: "2026-06-20T00:01:00.000Z",
    mimeType: "image/jpeg",
    byteSize: 1024,
    width: 1600,
    height: 1200,
    retained: false,
  },
} as const

describe("M2 problem session contracts", () => {
  it("accepts temporary problem session responses", () => {
    expect(temporaryProblemSessionResponseSchema.parse(sessionFixture)).toStrictEqual(
      sessionFixture,
    )
  })

  it("accepts image upload metadata without retaining the original bytes", () => {
    const parsed = imageUploadResponseSchema.parse(uploadFixture)

    expect(parsed.image.retained).toBe(false)
    expect(parsed.image.mimeType).toBe("image/jpeg")
  })

  it("accepts deletion responses", () => {
    const deleted = {
      schemaVersion: "1.0",
      sessionId: sessionFixture.sessionId,
      imageStatus: "deleted",
      deletedAt: "2026-06-20T00:02:00.000Z",
    } as const

    expect(problemSessionDeletedResponseSchema.parse(deleted)).toStrictEqual(deleted)
  })

  it("fixes the accepted image formats and upload size limit", () => {
    expect(ACCEPTED_IMAGE_MIME_TYPES).toStrictEqual(["image/jpeg", "image/png", "image/webp"])
    expect(MAX_IMAGE_UPLOAD_BYTES).toBe(5_000_000)
  })

  it("accepts structured upload error responses", () => {
    const errorFixture = {
      error: {
        code: "UNSUPPORTED_IMAGE_TYPE",
        message: "JPG, PNG, WebP 형식의 사진만 올릴 수 있어요.",
        requestId: "req_123e4567-e89b-12d3-a456-426614174010",
        retryable: true,
      },
    } as const

    expect(problemSessionErrorResponseSchema.parse(errorFixture)).toStrictEqual(errorFixture)
  })

  it("accepts operational safety error codes with request ids", () => {
    const errorFixture = {
      error: {
        code: "RATE_LIMITED",
        message: "요청이 잠시 많아요. 조금 뒤에 다시 시도해 주세요.",
        requestId: "req_123e4567-e89b-12d3-a456-426614174011",
        retryable: true,
      },
    } as const

    expect(problemSessionErrorResponseSchema.parse(errorFixture)).toStrictEqual(errorFixture)
  })

  it("accepts redacted operation events", () => {
    const eventFixture = {
      schemaVersion: "1.0",
      requestId: "req_123e4567-e89b-12d3-a456-426614174012",
      route: "POST /v1/problem-sessions/:sessionId/coach",
      stage: "coaching",
      outcome: "success",
      statusCode: 200,
      latencyMs: 42,
      responseSchemaVersion: "1.0",
      verificationStatus: "verified",
    } as const

    expect(operationEventSchema.parse(eventFixture)).toStrictEqual(eventFixture)
  })

  it("rejects operation events that include problem or image content", () => {
    const eventFixture = {
      schemaVersion: "1.0",
      requestId: "req_123e4567-e89b-12d3-a456-426614174013",
      route: "POST /v1/problem-sessions/:sessionId/recognize",
      stage: "recognition",
      outcome: "success",
      statusCode: 200,
      latencyMs: 42,
      imageDataUrl: "data:image/jpeg;base64,secret",
    } as const

    expect(operationEventSchema.safeParse(eventFixture).success).toBe(false)
  })

  it("accepts minimal alpha feedback without problem content", () => {
    const requestFixture = {
      choice: "wrong_solution",
      coachingVerificationStatus: "verified",
      similarProblemStatus: "ok",
    } as const
    const responseFixture = {
      schemaVersion: "1.0",
      sessionId: sessionFixture.sessionId,
      requestId: "req_123e4567-e89b-12d3-a456-426614174014",
      choice: "wrong_solution",
      submittedAt: "2026-06-22T00:03:00.000Z",
    } as const

    expect(feedbackRequestSchema.parse(requestFixture)).toStrictEqual(requestFixture)
    expect(feedbackResponseSchema.parse(responseFixture)).toStrictEqual(responseFixture)
  })

  it("rejects feedback requests that include problem text or freeform content", () => {
    const requestFixture = {
      choice: "misread_problem",
      problemText: "3/4 ÷ 1/8",
      comment: "문제를 잘못 읽었어요.",
    } as const

    expect(feedbackRequestSchema.safeParse(requestFixture).success).toBe(false)
  })

  it("accepts redacted feedback operation events", () => {
    const eventFixture = {
      schemaVersion: "1.0",
      requestId: "req_123e4567-e89b-12d3-a456-426614174015",
      route: "POST /v1/problem-sessions/:sessionId/feedback",
      stage: "feedback",
      outcome: "success",
      statusCode: 201,
      latencyMs: 4,
      responseSchemaVersion: "1.0",
    } as const

    expect(operationEventSchema.parse(eventFixture)).toStrictEqual(eventFixture)
  })
})
