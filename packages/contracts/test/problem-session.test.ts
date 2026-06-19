import { describe, expect, it } from "vitest"

import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  imageUploadResponseSchema,
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
        retryable: true,
      },
    } as const

    expect(problemSessionErrorResponseSchema.parse(errorFixture)).toStrictEqual(errorFixture)
  })
})
