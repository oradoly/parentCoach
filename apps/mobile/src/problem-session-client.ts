import * as FileSystem from "expo-file-system/legacy"
import ky, { HTTPError } from "ky"
import { Platform } from "react-native"

import {
  coachingResponseSchema,
  confirmedProblemResponseSchema,
  feedbackResponseSchema,
  recognitionResponseSchema,
  imageUploadResponseSchema,
  problemSessionDeletedResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
  type CoachingResponse,
  type ConfirmProblemRequest,
  type ConfirmedProblemResponse,
  type FeedbackRequest,
  type FeedbackResponse,
  type ImageUploadResponse,
  type ProblemImageSource,
  type ProblemSessionDeletedResponse,
  type ProblemSessionErrorResponse,
  type ProblemSessionId,
  type RecognitionResponse,
  type TemporaryProblemSessionResponse,
} from "@parent-coach/contracts"

import type { PreparedImageCandidate } from "./image-intake-rules"
import { createImageUploadFormData } from "./image-upload-form-data"
import {
  PROBLEM_SESSION_COACHING_TIMEOUT_MS,
  PROBLEM_SESSION_REQUEST_TIMEOUT_MS,
} from "./problem-session-timeouts"

export type ProblemSessionClient = Readonly<{
  createSession: () => Promise<TemporaryProblemSessionResponse>
  uploadImage: (
    sessionId: ProblemSessionId,
    image: PreparedImageCandidate,
    source: ProblemImageSource,
  ) => Promise<ImageUploadResponse>
  recognizeImage: (sessionId: ProblemSessionId) => Promise<RecognitionResponse>
  coachProblem: (sessionId: ProblemSessionId) => Promise<CoachingResponse>
  confirmProblem: (
    sessionId: ProblemSessionId,
    input: ConfirmProblemRequest,
  ) => Promise<ConfirmedProblemResponse>
  submitFeedback: (sessionId: ProblemSessionId, input: FeedbackRequest) => Promise<FeedbackResponse>
  deleteSession: (sessionId: ProblemSessionId) => Promise<ProblemSessionDeletedResponse>
}>

type ProblemSessionClientConfig = Readonly<{
  baseUrl: string
}>

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "")

const parseUploadBody = (body: string): ImageUploadResponse => {
  const parsedBody: unknown = JSON.parse(body)
  return imageUploadResponseSchema.parse(parsedBody)
}

const readWebImageBlob = async (image: PreparedImageCandidate): Promise<Blob> => {
  const response = await fetch(image.uri)
  if (!response.ok) {
    throw new ProblemImageUploadStatusError(response.status)
  }
  return response.blob()
}

type ResponseBodyReader = Readonly<{
  text: () => Promise<string>
}>

const getErrorResponseBodyReader = (error: unknown): ResponseBodyReader | null => {
  if (error instanceof HTTPError) {
    return error.response
  }
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null
  }
  const response = (error as Readonly<{ response: unknown }>).response
  if (typeof response !== "object" || response === null || !("text" in response)) {
    return null
  }
  const text = (response as Readonly<{ text: unknown }>).text
  if (typeof text !== "function") {
    return null
  }

  const responseBodyReader = response as ResponseBodyReader
  return { text: () => responseBodyReader.text() }
}

const readStructuredKyError = async (
  error: unknown,
): Promise<ProblemSessionErrorResponse | null> => {
  const response = getErrorResponseBodyReader(error)
  if (response === null) {
    return null
  }

  return parseProblemSessionErrorBody(await response.text())
}

export const parseProblemSessionErrorBody = (body: string): ProblemSessionErrorResponse | null => {
  try {
    const parsedBody: unknown = JSON.parse(body)
    return problemSessionErrorResponseSchema.parse(parsedBody)
  } catch (error) {
    if (error instanceof Error) {
      return null
    }
    throw error
  }
}

export const createProblemSessionClient = ({
  baseUrl,
}: ProblemSessionClientConfig): ProblemSessionClient => {
  const normalizedBaseUrl = trimTrailingSlashes(baseUrl)
  const api = ky.create({
    prefix: normalizedBaseUrl,
    retry: 0,
    timeout: PROBLEM_SESSION_REQUEST_TIMEOUT_MS,
  })

  return {
    createSession: async () => {
      const body: unknown = await api.post("v1/problem-sessions").json()
      return temporaryProblemSessionResponseSchema.parse(body)
    },
    deleteSession: async (sessionId) => {
      const body: unknown = await api.delete(`v1/problem-sessions/${sessionId}`).json()
      return problemSessionDeletedResponseSchema.parse(body)
    },
    recognizeImage: async (sessionId) => {
      try {
        const body: unknown = await api.post(`v1/problem-sessions/${sessionId}/recognize`).json()
        return recognitionResponseSchema.parse(body)
      } catch (error) {
        const structuredError = await readStructuredKyError(error)
        if (structuredError !== null) {
          throw new ProblemSessionRequestError(structuredError)
        }
        throw error
      }
    },
    confirmProblem: async (sessionId, input) => {
      try {
        const body: unknown = await api
          .patch(`v1/problem-sessions/${sessionId}/problem`, {
            json: input,
          })
          .json()
        return confirmedProblemResponseSchema.parse(body)
      } catch (error) {
        const structuredError = await readStructuredKyError(error)
        if (structuredError !== null) {
          throw new ProblemSessionRequestError(structuredError)
        }
        throw error
      }
    },
    submitFeedback: async (sessionId, input) => {
      try {
        const body: unknown = await api
          .post(`v1/problem-sessions/${sessionId}/feedback`, {
            json: input,
          })
          .json()
        return feedbackResponseSchema.parse(body)
      } catch (error) {
        const structuredError = await readStructuredKyError(error)
        if (structuredError !== null) {
          throw new ProblemSessionRequestError(structuredError)
        }
        throw error
      }
    },
    coachProblem: async (sessionId) => {
      try {
        const body: unknown = await api
          .post(`v1/problem-sessions/${sessionId}/coach`, {
            timeout: PROBLEM_SESSION_COACHING_TIMEOUT_MS,
          })
          .json()
        return coachingResponseSchema.parse(body)
      } catch (error) {
        const structuredError = await readStructuredKyError(error)
        if (structuredError !== null) {
          throw new ProblemSessionRequestError(structuredError)
        }
        throw error
      }
    },
    uploadImage: async (sessionId, image, source) => {
      if (Platform.OS === "web") {
        try {
          const imageBlob = await readWebImageBlob(image)
          const body: unknown = await api
            .post(`v1/problem-sessions/${sessionId}/image`, {
              body: createImageUploadFormData(image, source, imageBlob),
            })
            .json()
          return imageUploadResponseSchema.parse(body)
        } catch (error) {
          const structuredError = await readStructuredKyError(error)
          if (structuredError !== null) {
            throw new ProblemImageUploadError(structuredError)
          }
          throw error
        }
      }

      const uploadResult = await FileSystem.uploadAsync(
        `${normalizedBaseUrl}/v1/problem-sessions/${sessionId}/image`,
        image.uri,
        {
          fieldName: "image",
          httpMethod: "POST",
          mimeType: image.mimeType,
          parameters: {
            height: image.height.toString(),
            source,
            width: image.width.toString(),
          },
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        },
      )

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        const structuredError = parseProblemSessionErrorBody(uploadResult.body)
        if (structuredError !== null) {
          throw new ProblemImageUploadError(structuredError)
        }
        throw new ProblemImageUploadStatusError(uploadResult.status)
      }

      return parseUploadBody(uploadResult.body)
    },
  }
}

export class ProblemImageUploadError extends Error {
  readonly name = "ProblemImageUploadError"

  constructor(readonly response: ProblemSessionErrorResponse) {
    super(response.error.message)
  }
}

export class ProblemImageUploadStatusError extends Error {
  readonly name = "ProblemImageUploadStatusError"

  constructor(readonly status: number) {
    super(`image upload failed with status ${status.toString()}`)
  }
}

export class ProblemSessionRequestError extends Error {
  readonly name = "ProblemSessionRequestError"

  constructor(readonly response: ProblemSessionErrorResponse) {
    super(response.error.message)
  }
}
