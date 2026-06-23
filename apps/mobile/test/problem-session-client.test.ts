import { describe, expect, it } from "vitest"

import type { RecognitionResponse } from "@parent-coach/contracts"

import { DEFAULT_API_BASE_URL, resolveProblemSessionApiBaseUrl } from "../src/api-base-url"
import { createImageUploadFormData } from "../src/image-upload-form-data"
import {
  getProblemSessionErrorResponse,
  readProblemSessionErrorResponse,
} from "../src/problem-session-errors"
import {
  PROBLEM_SESSION_COACHING_TIMEOUT_MS as CLIENT_COACHING_TIMEOUT_MS,
  PROBLEM_SESSION_REQUEST_TIMEOUT_MS as CLIENT_REQUEST_TIMEOUT_MS,
} from "../src/problem-session-timeouts"
import { createConfirmProblemRequest } from "../src/recognition-confirmation-rules"

describe("M8 web image upload helpers", () => {
  it("keeps coaching requests longer than the default API timeout", () => {
    expect(CLIENT_REQUEST_TIMEOUT_MS).toBe(10_000)
    expect(CLIENT_COACHING_TIMEOUT_MS).toBe(45_000)
    expect(CLIENT_COACHING_TIMEOUT_MS).toBeGreaterThan(CLIENT_REQUEST_TIMEOUT_MS)
  })

  it("resolves the configured public API base URL when provided", () => {
    const baseUrl = resolveProblemSessionApiBaseUrl(" http://192.168.3.23:3001 ")

    expect(baseUrl).toBe("http://192.168.3.23:3001")
  })

  it("falls back to the local API base URL when public config is blank", () => {
    expect(resolveProblemSessionApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL)
    expect(resolveProblemSessionApiBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL)
  })

  it("builds multipart fields expected by the problem image API", () => {
    const image = new Blob(["fixture"], { type: "image/jpeg" })
    const formData = createImageUploadFormData(
      {
        byteSize: image.size,
        fileName: "problem-image.jpg",
        height: 900,
        mimeType: "image/jpeg",
        uri: "blob:http://localhost/problem",
        width: 1200,
      },
      "library",
      image,
    )

    expect(formData.get("height")).toBe("900")
    expect(formData.get("source")).toBe("library")
    expect(formData.get("width")).toBe("1200")
    expect(formData.get("image")).toBeInstanceOf(Blob)
  })

  it("reads structured server errors across bundle boundaries", () => {
    const response = getProblemSessionErrorResponse({
      response: {
        error: {
          code: "MODEL_DISABLED",
          message: "문제 인식 모델을 잠시 꺼 두었어요. 나중에 다시 시도해 주세요.",
          requestId: "req_123e4567-e89b-12d3-a456-426614174000",
          retryable: false,
        },
      },
    })

    expect(response?.error.code).toBe("MODEL_DISABLED")
    expect(response?.error.retryable).toBe(false)
  })

  it("reads structured server errors from response body readers", async () => {
    const response = await readProblemSessionErrorResponse({
      response: {
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                code: "MODEL_DISABLED",
                message: "문제 인식 모델을 잠시 꺼 두었어요. 나중에 다시 시도해 주세요.",
                requestId: "req_123e4567-e89b-12d3-a456-426614174000",
                retryable: false,
              },
            }),
          ),
      },
    })

    expect(response?.error.code).toBe("MODEL_DISABLED")
    expect(response?.error.message).toContain("문제 인식 모델")
  })

  it("drops stale normalized OCR fields when the parent edits the recognized problem", () => {
    const recognition = {
      schemaVersion: "1.0",
      status: "ok",
      problemText: "3/4L를 1/8L씩 담으면?",
      normalizedText: "3/4L ÷ 1/8L 컵 수",
      latex: "\\frac{3}{4}\\div\\frac{1}{8}",
      confidence: 0.94,
      containsMultipleProblems: false,
      requiresDiagram: false,
      ambiguities: [],
      suggestedAction: "문장을 확인해 주세요.",
    } satisfies RecognitionResponse

    const request = createConfirmProblemRequest(
      recognition,
      "3/4L의 주스를 한 컵에 1/8L씩 담으면 모두 몇 컵인가요?",
      true,
    )

    expect(request.problemText).toContain("모두 몇 컵")
    expect(request.userEdited).toBe(true)
    expect("normalizedText" in request).toBe(false)
    expect("latex" in request).toBe(false)
  })

  it("keeps OCR normalized fields when the parent confirms without editing", () => {
    const recognition = {
      schemaVersion: "1.0",
      status: "ok",
      problemText: "3/4L를 1/8L씩 담으면?",
      normalizedText: "3/4L ÷ 1/8L 컵 수",
      latex: "\\frac{3}{4}\\div\\frac{1}{8}",
      confidence: 0.94,
      containsMultipleProblems: false,
      requiresDiagram: false,
      ambiguities: [],
      suggestedAction: "문장을 확인해 주세요.",
    } satisfies RecognitionResponse

    const request = createConfirmProblemRequest(recognition, recognition.problemText, false)

    expect(request.normalizedText).toBe(recognition.normalizedText)
    expect(request.latex).toBe(recognition.latex)
  })
})
