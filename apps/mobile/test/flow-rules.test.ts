import { describe, expect, it } from "vitest"

import {
  containsForbiddenAnswer,
  getErrorVisibleCopy,
  getVisibleCoachingCopy,
  INITIAL_COACHING_VISIBILITY,
  revealFinalSolution,
  revealNextHint,
  revealSimilarProblemSolution,
} from "../src/flow-rules"
import { mockCoachingResponse, mockErrorState } from "../src/mock-parent-coach"

const forbiddenAnswers = [mockCoachingResponse.finalSolution.answer] as const

describe("M1 coaching flow visibility rules", () => {
  it("hides the final answer before any explicit reveal", () => {
    const visibleCopy = getVisibleCoachingCopy(mockCoachingResponse, INITIAL_COACHING_VISIBILITY)

    expect(containsForbiddenAnswer(visibleCopy, forbiddenAnswers)).toBe(false)
    expect(visibleCopy.join("\n")).toContain(mockCoachingResponse.openingQuestion.parentScript)
  })

  it("reveals hint levels one at a time without leaking the answer in levels 1 and 2", () => {
    const firstHintVisibility = revealNextHint(
      INITIAL_COACHING_VISIBILITY,
      mockCoachingResponse.hints.length,
    )
    const firstHintCopy = getVisibleCoachingCopy(mockCoachingResponse, firstHintVisibility)

    expect(firstHintVisibility.revealedHintCount).toBe(1)
    expect(firstHintCopy.join("\n")).toContain(mockCoachingResponse.hints[0]?.parentScript)
    expect(containsForbiddenAnswer(firstHintCopy, forbiddenAnswers)).toBe(false)

    const secondHintVisibility = revealNextHint(
      firstHintVisibility,
      mockCoachingResponse.hints.length,
    )
    const secondHintCopy = getVisibleCoachingCopy(mockCoachingResponse, secondHintVisibility)

    expect(secondHintVisibility.revealedHintCount).toBe(2)
    expect(secondHintCopy.join("\n")).toContain(mockCoachingResponse.hints[1]?.parentScript)
    expect(containsForbiddenAnswer(secondHintCopy, forbiddenAnswers)).toBe(false)
  })

  it("shows the final answer only after final solution reveal", () => {
    const visibility = revealFinalSolution(INITIAL_COACHING_VISIBILITY)
    const visibleCopy = getVisibleCoachingCopy(mockCoachingResponse, visibility)

    expect(visibleCopy.join("\n")).toContain(mockCoachingResponse.finalSolution.answer)
  })

  it("keeps the similar problem answer folded until explicitly revealed", () => {
    const finalOnlyVisibility = revealFinalSolution(INITIAL_COACHING_VISIBILITY)
    const hiddenCopy = getVisibleCoachingCopy(mockCoachingResponse, finalOnlyVisibility)
    const shownCopy = getVisibleCoachingCopy(
      mockCoachingResponse,
      revealSimilarProblemSolution(finalOnlyVisibility),
    )

    expect(hiddenCopy.join("\n")).toContain(mockCoachingResponse.similarProblem.problemText)
    expect(hiddenCopy.join("\n")).not.toContain(mockCoachingResponse.similarProblem.answer)
    expect(shownCopy.join("\n")).toContain(mockCoachingResponse.similarProblem.answer)
  })

  it("shows error recovery copy instead of solution content", () => {
    const visibleCopy = getErrorVisibleCopy(mockErrorState)

    expect(visibleCopy.join("\n")).toContain(mockErrorState.primaryActionLabel)
    expect(containsForbiddenAnswer(visibleCopy, forbiddenAnswers)).toBe(false)
  })
})
