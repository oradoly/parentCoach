import { useRef, useState } from "react"

import type { CoachingResponse, ProblemSessionId } from "@parent-coach/contracts"

import { resolveProblemSessionApiBaseUrl } from "./api-base-url"
import { createSharedInFlightCall } from "./problem-session-call-guard"
import { createProblemSessionClient } from "./problem-session-client"
import { readProblemSessionErrorResponse } from "./problem-session-errors"

export type ProblemCoachingState =
  | { readonly kind: "idle" }
  | { readonly kind: "coaching" }
  | { readonly kind: "ready"; readonly coaching: CoachingResponse }
  | {
      readonly kind: "error"
      readonly title: string
      readonly message: string
      readonly retryable: boolean
    }

const configuredApiBaseUrl = (): string => {
  return resolveProblemSessionApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
}

export const useProblemCoaching = () => {
  const [state, setState] = useState<ProblemCoachingState>({ kind: "idle" })
  const coachingCall = useRef(createSharedInFlightCall<CoachingResponse | null>()).current
  const client = createProblemSessionClient({ baseUrl: configuredApiBaseUrl() })

  const coachProblem = async (sessionId: ProblemSessionId): Promise<CoachingResponse | null> => {
    return coachingCall.run(`coaching:${sessionId}`, async () => {
      setState({ kind: "coaching" })
      try {
        const coaching = await client.coachProblem(sessionId)
        setState({ kind: "ready", coaching })
        return coaching
      } catch (error) {
        const errorResponse = await readProblemSessionErrorResponse(error)
        if (errorResponse !== null) {
          setState({
            kind: "error",
            message: errorResponse.error.message,
            retryable: errorResponse.error.retryable,
            title: "코칭을 만들지 못했어요",
          })
          return null
        }
        if (error instanceof Error) {
          setState({
            kind: "error",
            message: "코칭 모델 또는 API 서버를 잠시 사용할 수 없어요. 나중에 다시 시도해 주세요.",
            retryable: true,
            title: "코칭을 만들지 못했어요",
          })
          return null
        }
        throw error
      }
    })
  }

  return {
    coachProblem,
    resetCoaching: () => {
      coachingCall.reset()
      setState({ kind: "idle" })
    },
    state,
  } as const
}
