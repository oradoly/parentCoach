import * as FileSystem from "expo-file-system/legacy"
import ky, { HTTPError } from "ky"

import {
  confirmedProblemResponseSchema,
  recognitionResponseSchema,
  imageUploadResponseSchema,
  problemSessionDeletedResponseSchema,
  problemSessionErrorResponseSchema,
  temporaryProblemSessionResponseSchema,
  type ConfirmProblemRequest,
  type ConfirmedProblemResponse,
  type ImageUploadResponse,
  type ProblemImageSource,
  type ProblemSessionDeletedResponse,
  type ProblemSessionErrorResponse,
  type ProblemSessionId,
  type RecognitionResponse,
  type TemporaryProblemSessionResponse,
} from "@parent-coach/contracts"

import type { PreparedImageCandidate } from "./image-intake-rules"

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001"

export type ProblemSessionClient = Readonly<{
  createSession: () => Promise<TemporaryProblemSessionResponse>
  uploadImage: (
    sessionId: ProblemSessionId,
    image: PreparedImageCandidate,
    source: ProblemImageSource,
  ) => Promise<ImageUploadResponse>
  recognizeImage: (sessionId: ProblemSessionId) => Promise<RecognitionResponse>
  confirmProblem: (
    sessionId: ProblemSessionId,
    input: ConfirmProblemRequest,
  ) => Promise<ConfirmedProblemResponse>
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

const readStructuredKyError = async (
  error: unknown,
): Promise<ProblemSessionErrorResponse | null> => {
  if (!(error instanceof HTTPError)) {
    return null
  }

  return parseProblemSessionErrorBody(await error.response.text())
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
    timeout: 10_000,
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
    uploadImage: async (sessionId, image, source) => {
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
