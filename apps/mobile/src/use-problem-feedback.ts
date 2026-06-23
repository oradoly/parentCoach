import { useRef, useState } from "react"

import type { CoachingResponse, FeedbackChoice, ProblemSessionId } from "@parent-coach/contracts"

import { resolveProblemSessionApiBaseUrl } from "./api-base-url"
import { createSharedInFlightCall } from "./problem-session-call-guard"
import { ProblemSessionRequestError, createProblemSessionClient } from "./problem-session-client"

export type ProblemFeedbackState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting"; readonly choice: FeedbackChoice }
  | { readonly kind: "submitted"; readonly choice: FeedbackChoice; readonly message: string }
  | {
      readonly kind: "error"
      readonly choice: FeedbackChoice
      readonly message: string
      readonly retryable: boolean
    }

const configuredApiBaseUrl = (): string => {
  return resolveProblemSessionApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
}

export const useProblemFeedback = () => {
  const [state, setState] = useState<ProblemFeedbackState>({ kind: "idle" })
  const feedbackCall = useRef(createSharedInFlightCall<null>()).current
  const client = createProblemSessionClient({ baseUrl: configuredApiBaseUrl() })

  const submitFeedback = async (
    sessionId: ProblemSessionId,
    choice: FeedbackChoice,
    coaching: CoachingResponse,
  ): Promise<void> => {
    await feedbackCall.run(`feedback:${sessionId}:${choice}`, async () => {
      setState({ kind: "submitting", choice })
      try {
        await client.submitFeedback(sessionId, {
          choice,
          coachingVerificationStatus: coaching.verification.status,
          similarProblemStatus: coaching.similarProblem.status,
        })
        setState({
          kind: "submitted",
          choice,
          message: "피드백을 기록했어요. 내부 알파 개선에만 사용할게요.",
        })
        return null
      } catch (error) {
        if (error instanceof ProblemSessionRequestError) {
          setState({
            kind: "error",
            choice,
            message: error.response.error.message,
            retryable: error.response.error.retryable,
          })
          return null
        }
        if (error instanceof Error) {
          setState({
            kind: "error",
            choice,
            message: "피드백을 보내지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.",
            retryable: true,
          })
          return null
        }
        throw error
      }
    })
  }

  return {
    resetFeedback: () => {
      feedbackCall.reset()
      setState({ kind: "idle" })
    },
    state,
    submitFeedback,
  } as const
}
