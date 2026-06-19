import { describe, expect, it } from "vitest"

import {
  confirmedProblemResponseSchema,
  confirmProblemRequestSchema,
  recognitionResponseSchema,
} from "../src/index"

const okRecognitionFixture = {
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
} as const

describe("M3 recognition contracts", () => {
  it("accepts a structured recognition success", () => {
    expect(recognitionResponseSchema.parse(okRecognitionFixture)).toStrictEqual(
      okRecognitionFixture,
    )
  })

  it("requires ambiguity details for uncertain recognition", () => {
    const result = recognitionResponseSchema.safeParse({
      ...okRecognitionFixture,
      status: "uncertain",
      confidence: 0.62,
      ambiguities: [],
      suggestedAction: "review_ambiguity",
    })

    expect(result.success).toBe(false)
  })

  it("accepts safe failure states without inventing a confident answer", () => {
    const result = recognitionResponseSchema.parse({
      ...okRecognitionFixture,
      status: "missing_diagram",
      problemText: "도형의 일부가 잘려 있어요.",
      normalizedText: "도형 조건 누락",
      confidence: 0.2,
      requiresDiagram: true,
      suggestedAction: "retake_with_full_diagram",
    })

    expect(result.status).toBe("missing_diagram")
    expect(result.requiresDiagram).toBe(true)
  })

  it("rejects empty confirmed problem text", () => {
    const result = confirmProblemRequestSchema.safeParse({
      problemText: "   ",
      recognitionStatus: "ok",
      userEdited: true,
    })

    expect(result.success).toBe(false)
  })

  it("accepts a confirmed problem response", () => {
    expect(
      confirmedProblemResponseSchema.parse({
        schemaVersion: "1.0",
        sessionId: "ps_123e4567-e89b-12d3-a456-426614174000",
        problemText: okRecognitionFixture.problemText,
        normalizedText: okRecognitionFixture.normalizedText,
        latex: okRecognitionFixture.latex,
        sourceRecognitionStatus: "ok",
        userEdited: false,
        confirmedAt: "2026-06-20T00:00:00.000Z",
      }),
    ).toMatchObject({
      problemText: okRecognitionFixture.problemText,
      sourceRecognitionStatus: "ok",
    })
  })
})
