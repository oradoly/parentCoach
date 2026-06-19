import {
  MAX_IMAGE_UPLOAD_BYTES,
  acceptedImageMimeTypeSchema,
  confirmProblemRequestSchema,
  problemImageSourceSchema,
  problemSessionErrorResponseSchema,
  problemSessionIdSchema,
  recognitionResponseSchema,
  type ProblemSessionErrorCode,
} from "@parent-coach/contracts"
import { Hono } from "hono"

import type { ProblemSessionStore } from "./problem-session-store"
import {
  RecognitionNotConfiguredError,
  RecognitionProviderError,
  RecognitionSchemaError,
  type RecognitionAdapter,
} from "./recognition-adapter"

type ProblemSessionRoutesDependencies = Readonly<{
  recognitionAdapter: RecognitionAdapter
  sessionStore: ProblemSessionStore
}>

type ProblemSessionErrorInput = Readonly<{
  code: ProblemSessionErrorCode
  message: string
  retryable: boolean
}>

const createProblemSessionError = ({ code, message, retryable }: ProblemSessionErrorInput) =>
  problemSessionErrorResponseSchema.parse({
    error: {
      code,
      message,
      retryable,
    },
  })

const parsePositiveIntegerField = (formData: FormData, fieldName: string): number | null => {
  const value = formData.get(fieldName)
  if (typeof value !== "string") {
    return null
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const isFile = (value: FormDataEntryValue | null): value is File => value instanceof File

const createImageDataUrl = async (image: File, mimeType: string): Promise<string> => {
  const bytes = Buffer.from(await image.arrayBuffer())
  return `data:${mimeType};base64,${bytes.toString("base64")}`
}

const rejectInactiveSession = (lookup: ReturnType<ProblemSessionStore["getActive"]>) => {
  switch (lookup.kind) {
    case "not_found":
      return {
        body: createProblemSessionError({
          code: "SESSION_NOT_FOUND",
          message: "임시 세션을 찾을 수 없어요. 처음부터 다시 시도해 주세요.",
          retryable: true,
        }),
        status: 404,
      } as const
    case "expired":
      return {
        body: createProblemSessionError({
          code: "SESSION_EXPIRED",
          message: "임시 세션 시간이 지났어요. 사진을 다시 올려 주세요.",
          retryable: true,
        }),
        status: 410,
      } as const
    case "found":
      return null
  }
}

export const createProblemSessionRoutes = ({
  recognitionAdapter,
  sessionStore,
}: ProblemSessionRoutesDependencies) => {
  const routes = new Hono()

  routes.post("/", (context) => {
    return context.json(sessionStore.create(), 201)
  })

  routes.post("/:sessionId/image", async (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId))
    if (inactiveSession !== null) {
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const formData = await context.req.raw.formData()
    const image = formData.get("image")
    if (!isFile(image)) {
      const error = createProblemSessionError({
        code: "IMAGE_REQUIRED",
        message: "업로드할 문제 사진이 필요해요.",
        retryable: true,
      })
      return context.json(error, 400)
    }

    const mimeTypeResult = acceptedImageMimeTypeSchema.safeParse(image.type)
    if (!mimeTypeResult.success) {
      const error = createProblemSessionError({
        code: "UNSUPPORTED_IMAGE_TYPE",
        message: "JPG, PNG, WebP 형식의 사진만 올릴 수 있어요.",
        retryable: true,
      })
      return context.json(error, 415)
    }

    if (image.size > MAX_IMAGE_UPLOAD_BYTES) {
      const error = createProblemSessionError({
        code: "IMAGE_TOO_LARGE",
        message: "사진이 5MB보다 커요. 문제 부분만 잘라 다시 시도해 주세요.",
        retryable: true,
      })
      return context.json(error, 413)
    }

    const width = parsePositiveIntegerField(formData, "width")
    const height = parsePositiveIntegerField(formData, "height")
    if (width === null || height === null) {
      const error = createProblemSessionError({
        code: "IMAGE_DIMENSIONS_REQUIRED",
        message: "사진 크기 정보를 확인할 수 없어요. 다시 시도해 주세요.",
        retryable: true,
      })
      return context.json(error, 400)
    }

    const sourceResult = problemImageSourceSchema.safeParse(formData.get("source"))
    const source = sourceResult.success ? sourceResult.data : "library"
    const response = sessionStore.recordUpload({
      sessionId,
      mimeType: mimeTypeResult.data,
      byteSize: image.size,
      width,
      height,
      source,
      dataUrl: await createImageDataUrl(image, mimeTypeResult.data),
    })

    return context.json(response, 201)
  })

  routes.post("/:sessionId/recognize", async (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId))
    if (inactiveSession !== null) {
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const image = sessionStore.getUploadedImage(sessionId)
    if (image === null) {
      const error = createProblemSessionError({
        code: "IMAGE_NOT_UPLOADED",
        message: "인식할 문제 사진이 아직 없어요. 사진을 먼저 올려 주세요.",
        retryable: true,
      })
      return context.json(error, 409)
    }

    try {
      const response = await recognitionAdapter.recognize({
        imageDataUrl: image.dataUrl,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
      })
      return context.json(recognitionResponseSchema.parse(response), 200)
    } catch (error) {
      if (error instanceof RecognitionNotConfiguredError) {
        return context.json(
          createProblemSessionError({
            code: "OPENAI_NOT_CONFIGURED",
            message: "문제 인식 서버 설정이 아직 준비되지 않았어요.",
            retryable: false,
          }),
          503,
        )
      }
      if (error instanceof RecognitionSchemaError) {
        return context.json(
          createProblemSessionError({
            code: "RECOGNITION_SCHEMA_INVALID",
            message: "문제 인식 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
            retryable: true,
          }),
          502,
        )
      }
      if (error instanceof RecognitionProviderError) {
        return context.json(
          createProblemSessionError({
            code: "RECOGNITION_FAILED",
            message: "문제 인식 중 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
            retryable: true,
          }),
          502,
        )
      }
      throw error
    }
  })

  routes.patch("/:sessionId/problem", async (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId))
    if (inactiveSession !== null) {
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const body: unknown = await context.req.json()
    const input = confirmProblemRequestSchema.safeParse(body)
    if (!input.success) {
      const error = createProblemSessionError({
        code: "PROBLEM_TEXT_REQUIRED",
        message: "확인한 문제 문장이 필요해요.",
        retryable: true,
      })
      return context.json(error, 400)
    }

    return context.json(sessionStore.confirmProblem(sessionId, input.data), 200)
  })

  routes.delete("/:sessionId", (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    return context.json(sessionStore.delete(sessionId))
  })

  return routes
}
