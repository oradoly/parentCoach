import type { RecognitionResponse } from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import {
  canConfirmRecognition,
  createRecognitionRecoveryCopy,
  createRecognitionReviewNote,
  summarizeRecognitionAmbiguities,
} from "../src/recognition-flow-rules"

const baseRecognition = {
  schemaVersion: "1.0",
  status: "ok",
  problemText: "사과 12개를 3명에게 똑같이 나누면 한 명은 몇 개씩 받나요?",
  normalizedText: "사과 12개를 3명에게 똑같이 나누면 한 명은 몇 개씩 받나요?",
  latex: "",
  confidence: 0.92,
  containsMultipleProblems: false,
  requiresDiagram: false,
  ambiguities: [],
  suggestedAction: "confirm",
} satisfies RecognitionResponse

describe("M3 recognition flow rules", () => {
  it("allows parent confirmation only for readable recognition states", () => {
    expect(canConfirmRecognition(baseRecognition)).toBe(true)
    expect(canConfirmRecognition({ ...baseRecognition, status: "uncertain" })).toBe(true)
    expect(canConfirmRecognition({ ...baseRecognition, status: "needs_retake" })).toBe(false)
  })

  it("surfaces ambiguity copy without solving the problem", () => {
    const recognition = {
      ...baseRecognition,
      status: "uncertain",
      ambiguities: [
        {
          segment: "1/8L",
          reason: "분모가 흐리게 보여요.",
          options: ["1/8L", "1/6L"],
        },
      ],
    } satisfies RecognitionResponse

    expect(createRecognitionReviewNote(recognition)).toContain("확인")
    expect(summarizeRecognitionAmbiguities(recognition)).toContain("1/8L")
    expect(summarizeRecognitionAmbiguities(recognition)).not.toContain("정답")
  })

  it("uses safe recovery copy for missing visual conditions", () => {
    const copy = createRecognitionRecoveryCopy("missing_diagram")

    expect(copy.title).toContain("조건")
    expect(copy.message).toContain("그림")
    expect(copy.primaryActionLabel).toContain("다시")
  })
})
