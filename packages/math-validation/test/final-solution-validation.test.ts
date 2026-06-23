import { describe, expect, it } from "vitest"

import {
  evaluateArithmeticExpression,
  extractNumericAnswer,
  validateFinalSolutionArithmetic,
  validateSimilarProblemCandidate,
} from "../src/index"

describe("M5 exact arithmetic validation", () => {
  it("evaluates fraction division with exact rational arithmetic", () => {
    const result = evaluateArithmeticExpression("3/4 ÷ 1/8")

    expect(result.kind).toBe("ok")
    if (result.kind === "ok") {
      expect(result.value.display).toBe("6")
    }
  })

  it("evaluates decimal addition without floating point drift", () => {
    const result = evaluateArithmeticExpression("1.5 + 2.25")

    expect(result.kind).toBe("ok")
    if (result.kind === "ok") {
      expect(result.value.display).toBe("15/4")
    }
  })

  it("extracts the numeric value and suffix unit from a final answer", () => {
    const result = extractNumericAnswer("6컵")

    expect(result.kind).toBe("ok")
    if (result.kind === "ok") {
      expect(result.value.display).toBe("6")
      expect(result.unit).toBe("컵")
    }
  })

  it("verifies a final answer when the answer matches a checkable step expression", () => {
    const result = validateFinalSolutionArithmetic({
      answer: "6컵",
      steps: [{ expression: "3/4 ÷ 1/8" }],
    })

    expect(result.kind).toBe("verified")
  })

  it("detects a mismatch between the final answer and generated step expression", () => {
    const result = validateFinalSolutionArithmetic({
      answer: "7컵",
      steps: [{ expression: "3/4 ÷ 1/8" }],
    })

    expect(result.kind).toBe("mismatch")
  })

  it("leaves unsupported expressions unverified instead of guessing", () => {
    const result = validateFinalSolutionArithmetic({
      answer: "6컵",
      steps: [{ expression: "문제의 조건을 보고 알맞게 계산합니다." }],
    })

    expect(result.kind).toBe("unverified")
  })

  it("verifies a similar problem candidate when its answer matches solution steps", () => {
    const result = validateSimilarProblemCandidate({
      originalProblemText:
        "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
      candidateProblemText: "2/3L의 주스를 한 컵에 1/6L씩 담으면 모두 몇 컵인가요?",
      answer: "4컵",
      solutionSteps: ["2/3 ÷ 1/6", "2/3 × 6", "4"],
    })

    expect(result.kind).toBe("verified")
  })

  it("rejects a similar problem candidate that duplicates the source problem", () => {
    const source = "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?"
    const result = validateSimilarProblemCandidate({
      originalProblemText: source,
      candidateProblemText: source,
      answer: "6컵",
      solutionSteps: ["3/4 ÷ 1/8", "6"],
    })

    expect(result.kind).toBe("duplicate_source")
  })

  it("rejects a similar problem candidate when the answer and solution steps disagree", () => {
    const result = validateSimilarProblemCandidate({
      originalProblemText:
        "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
      candidateProblemText: "2/3L의 주스를 한 컵에 1/6L씩 담으면 모두 몇 컵인가요?",
      answer: "5컵",
      solutionSteps: ["2/3 ÷ 1/6", "4"],
    })

    expect(result.kind).toBe("mismatch")
  })

  it("leaves an uncheckable similar problem candidate unavailable", () => {
    const result = validateSimilarProblemCandidate({
      originalProblemText:
        "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다. 모두 몇 컵에 담을 수 있나요?",
      candidateProblemText: "다른 숫자로 같은 방법을 연습해 봅니다.",
      answer: "4컵",
      solutionSteps: ["조건을 보고 계산합니다."],
    })

    expect(result.kind).toBe("unsupported_validation")
  })
})
