import type { CoachingResponse } from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import {
  containsForbiddenAnswer,
  createVerificationNotice,
  FEEDBACK_CHOICES,
  getErrorVisibleCopy,
  getFeedbackVisibleCopy,
  getSessionCompletionActions,
  getUploadedProblemSessionId,
  getVisibleCoachingCopy,
  INITIAL_COACHING_VISIBILITY,
  NEW_PROBLEM_ACTION_LABEL,
  revealFinalSolution,
  revealNextHint,
  revealSimilarProblemSolution,
} from "../src/flow-rules"
import { mockCoachingResponse, mockErrorState } from "../src/mock-parent-coach"
import type { ImageIntakeState } from "../src/use-image-intake"

const forbiddenAnswers = [mockCoachingResponse.finalSolution.answer] as const

describe("M1 coaching flow visibility rules", () => {
  it("shows the opening question and first hint while hiding the final answer", () => {
    const visibleCopy = getVisibleCoachingCopy(mockCoachingResponse, INITIAL_COACHING_VISIBILITY)

    expect(INITIAL_COACHING_VISIBILITY.revealedHintCount).toBe(1)
    expect(containsForbiddenAnswer(visibleCopy, forbiddenAnswers)).toBe(false)
    expect(visibleCopy.join("\n")).toContain(mockCoachingResponse.openingQuestion.parentScript)
    expect(visibleCopy.join("\n")).toContain(mockCoachingResponse.hints[0]?.parentScript)
  })

  it("reveals later hint levels one at a time without leaking the answer in levels 1 and 2", () => {
    const secondHintVisibility = revealNextHint(
      INITIAL_COACHING_VISIBILITY,
      mockCoachingResponse.hints.length,
    )
    const secondHintCopy = getVisibleCoachingCopy(mockCoachingResponse, secondHintVisibility)

    expect(secondHintVisibility.revealedHintCount).toBe(2)
    expect(secondHintCopy.join("\n")).toContain(mockCoachingResponse.hints[1]?.parentScript)
    expect(containsForbiddenAnswer(secondHintCopy, forbiddenAnswers)).toBe(false)

    const thirdHintVisibility = revealNextHint(
      secondHintVisibility,
      mockCoachingResponse.hints.length,
    )
    const thirdHintCopy = getVisibleCoachingCopy(mockCoachingResponse, thirdHintVisibility)

    expect(thirdHintVisibility.revealedHintCount).toBe(3)
    expect(thirdHintCopy.join("\n")).toContain(mockCoachingResponse.hints[2]?.parentScript)
  })

  it("shows the final answer only after final solution reveal", () => {
    const visibility = revealFinalSolution(INITIAL_COACHING_VISIBILITY)
    const visibleCopy = getVisibleCoachingCopy(mockCoachingResponse, visibility)

    expect(visibleCopy.join("\n")).toContain(mockCoachingResponse.finalSolution.answer)
  })

  it("shows verified copy only when M5 arithmetic validation verified the result", () => {
    const notice = createVerificationNotice({
      ...mockCoachingResponse,
      verification: {
        method: "exact_rational_arithmetic",
        notes: ["최종 풀이식을 정확한 유리수 계산으로 확인했어요."],
        status: "verified",
      },
    })

    expect(notice).toContain("계산으로 확인했어요")
  })

  it("does not show verified copy for unverified coaching", () => {
    const notice = createVerificationNotice({
      ...mockCoachingResponse,
      verification: {
        method: "m5_validation_unavailable",
        notes: [],
        status: "unverified",
      },
    })

    expect(notice).toContain("자동 검산이 어려운 문제예요")
    expect(notice).not.toContain("계산으로 확인했어요")
  })

  it("keeps the similar problem answer folded until explicitly revealed", () => {
    const availableCoaching: CoachingResponse = mockCoachingResponse
    const finalOnlyVisibility = revealFinalSolution(INITIAL_COACHING_VISIBILITY)
    const hiddenCopy = getVisibleCoachingCopy(availableCoaching, finalOnlyVisibility)
    const shownCopy = getVisibleCoachingCopy(
      availableCoaching,
      revealSimilarProblemSolution(finalOnlyVisibility),
    )

    expect(availableCoaching.similarProblem.status).toBe("ok")
    if (availableCoaching.similarProblem.status !== "ok") {
      throw new Error("mock similar problem must be available")
    }
    expect(hiddenCopy.join("\n")).toContain(availableCoaching.similarProblem.problemText)
    expect(hiddenCopy.join("\n")).not.toContain(availableCoaching.similarProblem.answer)
    expect(shownCopy.join("\n")).toContain(availableCoaching.similarProblem.answer)
  })

  it("does not leak unavailable similar problem answer copy even after reveal", () => {
    const unavailableCoaching = {
      ...mockCoachingResponse,
      similarProblem: {
        status: "unavailable",
        reasonCode: "validation_failed",
        message: "비슷한 문제를 안전하게 만들지 못했어요.",
      },
    } satisfies CoachingResponse
    const shownCopy = getVisibleCoachingCopy(
      unavailableCoaching,
      revealSimilarProblemSolution(revealFinalSolution(INITIAL_COACHING_VISIBILITY)),
    )

    expect(shownCopy.join("\n")).toContain("비슷한 문제를 안전하게 만들지 못했어요")
    expect(shownCopy.join("\n")).not.toContain("10컵")
    expect(shownCopy.join("\n")).not.toContain("5/6 ÷ 1/12")
  })

  it("shows error recovery copy instead of solution content", () => {
    const visibleCopy = getErrorVisibleCopy(mockErrorState)

    expect(visibleCopy.join("\n")).toContain(mockErrorState.primaryActionLabel)
    expect(containsForbiddenAnswer(visibleCopy, forbiddenAnswers)).toBe(false)
  })

  it("exposes alpha feedback choices without changing reveal state", () => {
    const visibleCopy = getFeedbackVisibleCopy(FEEDBACK_CHOICES)
    const visibility = revealFinalSolution(INITIAL_COACHING_VISIBILITY)

    expect(visibleCopy).toStrictEqual([
      "도움이 됐어요",
      "설명이 어려워요",
      "문제를 잘못 읽었어요",
      "풀이 또는 답이 틀린 것 같아요",
    ])
    expect(visibility.similarProblemSolutionVisible).toBe(false)
  })

  it("exposes a clear new problem action after a completed coaching session", () => {
    expect(getSessionCompletionActions()).toStrictEqual([NEW_PROBLEM_ACTION_LABEL])
    expect(NEW_PROBLEM_ACTION_LABEL).toBe("새 문제 시작")
  })

  it("returns the uploaded session id that reset should dispose", () => {
    const uploadedState = {
      kind: "uploaded",
      image: {
        byteSize: 12,
        fileName: "problem-image.jpg",
        height: 900,
        mimeType: "image/jpeg",
        uri: "file:///tmp/problem.jpg",
        width: 1200,
      },
      upload: {
        schemaVersion: "1.0",
        sessionId: "ps_123e4567-e89b-12d3-a456-426614174000",
        imageStatus: "uploaded",
        image: {
          imageId: "img_123e4567-e89b-12d3-a456-426614174001",
          receivedAt: "2026-06-22T00:00:00.000Z",
          mimeType: "image/jpeg",
          byteSize: 12,
          width: 1200,
          height: 900,
          retained: false,
        },
      },
    } satisfies ImageIntakeState

    expect(getUploadedProblemSessionId(uploadedState)).toBe(
      "ps_123e4567-e89b-12d3-a456-426614174000",
    )
    expect(getUploadedProblemSessionId({ kind: "idle" })).toBeNull()
  })
})
