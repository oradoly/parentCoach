import { MAX_IMAGE_UPLOAD_BYTES } from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import {
  buildImageResizePlan,
  createImageIntakeErrorCopy,
  normalizeImageMimeType,
  validateImageForUpload,
} from "../src/image-intake-rules"

describe("M2 image intake rules", () => {
  it("normalizes image MIME types from explicit metadata or filename fallback", () => {
    expect(normalizeImageMimeType({ mimeType: "image/jpeg", fileName: "problem" })).toBe(
      "image/jpeg",
    )
    expect(normalizeImageMimeType({ fileName: "problem.JPG" })).toBe("image/jpeg")
    expect(normalizeImageMimeType({ fileName: "problem.webp" })).toBe("image/webp")
  })

  it("builds a resize plan that preserves the long-edge ratio", () => {
    expect(buildImageResizePlan({ width: 4032, height: 3024 })).toStrictEqual({
      width: 1600,
      height: 1200,
    })
    expect(buildImageResizePlan({ width: 1200, height: 900 })).toBeNull()
  })

  it("rejects unsupported or oversized images before upload", () => {
    const unsupported = validateImageForUpload({
      uri: "file:///tmp/problem.gif",
      width: 1000,
      height: 800,
      mimeType: "image/gif",
      fileName: "problem.gif",
      fileSize: 1200,
    })
    const oversized = validateImageForUpload({
      uri: "file:///tmp/problem.jpg",
      width: 1000,
      height: 800,
      mimeType: "image/jpeg",
      fileName: "problem.jpg",
      fileSize: MAX_IMAGE_UPLOAD_BYTES + 1,
    })

    expect(unsupported.kind).toBe("invalid")
    expect(createImageIntakeErrorCopy(unsupported)).toContain("JPG, PNG, WebP")
    expect(oversized.kind).toBe("invalid")
    expect(createImageIntakeErrorCopy(oversized)).toContain("5MB")
  })

  it("accepts valid image candidates with a source label", () => {
    const result = validateImageForUpload({
      uri: "file:///tmp/problem.jpg",
      width: 1600,
      height: 1200,
      mimeType: "image/jpeg",
      fileName: "problem.jpg",
      fileSize: 240_000,
    })

    expect(result).toStrictEqual({
      kind: "valid",
      candidate: {
        uri: "file:///tmp/problem.jpg",
        width: 1600,
        height: 1200,
        mimeType: "image/jpeg",
        fileName: "problem.jpg",
        byteSize: 240_000,
      },
    })
  })
})
