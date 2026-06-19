import { useState } from "react"

import type {
  ConfirmedProblemResponse,
  ProblemSessionId,
  RecognitionResponse,
} from "@parent-coach/contracts"

import {
  DEFAULT_API_BASE_URL,
  ProblemSessionRequestError,
  createProblemSessionClient,
} from "./problem-session-client"
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
  const configured = process.env["EXPO_PUBLIC_API_BASE_URL"]?.trim()
  return configured === undefined || configured === "" ? DEFAULT_API_BASE_URL : configured
}

export const useProblemRecognition = () => {
  const [state, setState] = useState<ProblemRecognitionState>({ kind: "idle" })
  const client = createProblemSessionClient({ baseUrl: configuredApiBaseUrl() })

  const recognizeImage = async (
    sessionId: ProblemSessionId,
  ): Promise<RecognitionResponse | null> => {
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
      if (error instanceof ProblemSessionRequestError) {
        setState({
          kind: "error",
          message: error.response.error.message,
          retryable: error.response.error.retryable,
          title: "문제를 읽지 못했어요",
        })
        return null
      }
      if (error instanceof Error) {
        setState({
          kind: "error",
          message: "API 서버에 연결하지 못했어요. 서버 주소와 네트워크를 확인해 주세요.",
          retryable: true,
          title: "문제를 읽지 못했어요",
        })
        return null
      }
      throw error
    }
  }

  const confirmProblem = async (
    sessionId: ProblemSessionId,
    recognition: RecognitionResponse,
    problemText: string,
    userEdited: boolean,
  ): Promise<ConfirmedProblemResponse | null> => {
    setState({ kind: "confirming", recognition })
    try {
      const confirmation = await client.confirmProblem(sessionId, {
        problemText,
        recognitionStatus: recognition.status,
        userEdited,
        ...(recognition.normalizedText.trim() === ""
          ? {}
          : { normalizedText: recognition.normalizedText }),
        ...(recognition.latex.trim() === "" ? {} : { latex: recognition.latex }),
      })
      setState({ kind: "confirmed", confirmation })
      return confirmation
    } catch (error) {
      if (error instanceof ProblemSessionRequestError) {
        setState({
          kind: "error",
          message: error.response.error.message,
          retryable: error.response.error.retryable,
          title: "문제 문장을 저장하지 못했어요",
        })
        return null
      }
      if (error instanceof Error) {
        setState({
          kind: "error",
          message: "API 서버에 연결하지 못했어요. 서버 주소와 네트워크를 확인해 주세요.",
          retryable: true,
          title: "문제 문장을 저장하지 못했어요",
        })
        return null
      }
      throw error
    }
  }

  return {
    confirmProblem,
    recognizeImage,
    resetRecognition: () => {
      setState({ kind: "idle" })
    },
    state,
  } as const
}
