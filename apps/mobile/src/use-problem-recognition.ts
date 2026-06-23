import { useRef, useState } from "react"

import type {
  ConfirmedProblemResponse,
  ProblemSessionId,
  RecognitionResponse,
} from "@parent-coach/contracts"

import { resolveProblemSessionApiBaseUrl } from "./api-base-url"
import { createSharedInFlightCall } from "./problem-session-call-guard"
import { createProblemSessionClient } from "./problem-session-client"
import { createConfirmProblemRequest } from "./recognition-confirmation-rules"
import { readProblemSessionErrorResponse } from "./problem-session-errors"
import { canConfirmRecognition, createRecognitionRecoveryCopy } from "./recognition-flow-rules"

export type ProblemRecognitionState =
  | { readonly kind: "idle" }
  | { readonly kind: "recognizing" }
  | { readonly kind: "ready"; readonly recognition: RecognitionResponse }
  | {
      readonly kind: "safe_failure"
      readonly recognition: RecognitionResponse
      readonly title: string
      readonly message: string
      readonly primaryActionLabel: string
    }
  | { readonly kind: "confirming"; readonly recognition: RecognitionResponse }
  | { readonly kind: "confirmed"; readonly confirmation: ConfirmedProblemResponse }
  | {
      readonly kind: "error"
      readonly title: string
      readonly message: string
      readonly retryable: boolean
    }

const configuredApiBaseUrl = (): string => {
  return resolveProblemSessionApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL)
}

export const useProblemRecognition = () => {
  const [state, setState] = useState<ProblemRecognitionState>({ kind: "idle" })
  const confirmationCall = useRef(
    createSharedInFlightCall<ConfirmedProblemResponse | null>(),
  ).current
  const recognitionCall = useRef(createSharedInFlightCall<RecognitionResponse | null>()).current
  const client = createProblemSessionClient({ baseUrl: configuredApiBaseUrl() })

  const recognizeImage = async (
    sessionId: ProblemSessionId,
  ): Promise<RecognitionResponse | null> => {
    return recognitionCall.run(`recognition:${sessionId}`, async () => {
      setState({ kind: "recognizing" })
      try {
        const recognition = await client.recognizeImage(sessionId)
        if (canConfirmRecognition(recognition)) {
          setState({ kind: "ready", recognition })
          return recognition
        }

        const copy = createRecognitionRecoveryCopy(recognition.status)
        setState({
          kind: "safe_failure",
          recognition,
          message: copy.message,
          primaryActionLabel: copy.primaryActionLabel,
          title: copy.title,
        })
        return recognition
      } catch (error) {
        const errorResponse = await readProblemSessionErrorResponse(error)
        if (errorResponse !== null) {
          setState({
            kind: "error",
            message: errorResponse.error.message,
            retryable: errorResponse.error.retryable,
            title: "문제를 읽지 못했어요",
          })
          return null
        }
        if (error instanceof Error) {
          setState({
            kind: "error",
            message:
              "문제 인식 모델 또는 API 서버를 잠시 사용할 수 없어요. 나중에 다시 시도해 주세요.",
            retryable: true,
            title: "문제를 읽지 못했어요",
          })
          return null
        }
        throw error
      }
    })
  }

  const confirmProblem = async (
    sessionId: ProblemSessionId,
    recognition: RecognitionResponse,
    problemText: string,
    userEdited: boolean,
  ): Promise<ConfirmedProblemResponse | null> => {
    return confirmationCall.run(`confirmation:${sessionId}`, async () => {
      setState({ kind: "confirming", recognition })
      try {
        const confirmation = await client.confirmProblem(
          sessionId,
          createConfirmProblemRequest(recognition, problemText, userEdited),
        )
        setState({ kind: "confirmed", confirmation })
        return confirmation
      } catch (error) {
        const errorResponse = await readProblemSessionErrorResponse(error)
        if (errorResponse !== null) {
          setState({
            kind: "error",
            message: errorResponse.error.message,
            retryable: errorResponse.error.retryable,
            title: "문제 문장을 저장하지 못했어요",
          })
          return null
        }
        if (error instanceof Error) {
          setState({
            kind: "error",
            message: "문제 저장 API를 잠시 사용할 수 없어요. 나중에 다시 시도해 주세요.",
            retryable: true,
            title: "문제 문장을 저장하지 못했어요",
          })
          return null
        }
        throw error
      }
    })
  }

  return {
    confirmProblem,
    recognizeImage,
    resetRecognition: () => {
      confirmationCall.reset()
      recognitionCall.reset()
      setState({ kind: "idle" })
    },
    state,
  } as const
}
