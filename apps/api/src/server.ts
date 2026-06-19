import {
  MAX_IMAGE_UPLOAD_BYTES,
  acceptedImageMimeTypeSchema,
  createHealthResponse,
  healthResponseSchema,
  problemImageSourceSchema,
  problemSessionErrorResponseSchema,
  problemSessionIdSchema,
} from "@parent-coach/contracts"
import { Hono } from "hono"

import { createProblemSessionStore, type ProblemSessionStore } from "./problem-session-store"

type AppDependencies = Readonly<{
  sessionStore: ProblemSessionStore
}>

type ProblemSessionErrorInput = Readonly<{
  code:
    | "SESSION_NOT_FOUND"
    | "SESSION_EXPIRED"
    | "IMAGE_REQUIRED"
    | "UNSUPPORTED_IMAGE_TYPE"
    | "IMAGE_TOO_LARGE"
    | "IMAGE_DIMENSIONS_REQUIRED"
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

export const createApp = (
  dependencies: AppDependencies = { sessionStore: createProblemSessionStore() },
) => {
  const app = new Hono()

  app.get("/health", (context) => {
    const response = healthResponseSchema.parse(createHealthResponse())
    return context.json(response)
  })

  app.post("/v1/problem-sessions", (context) => {
    return context.json(dependencies.sessionStore.create(), 201)
  })

  app.post("/v1/problem-sessions/:sessionId/image", async (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const lookup = dependencies.sessionStore.getActive(sessionId)
    switch (lookup.kind) {
      case "not_found": {
        const error = createProblemSessionError({
          code: "SESSION_NOT_FOUND",
          message: "임시 세션을 찾을 수 없어요. 처음부터 다시 시도해 주세요.",
          retryable: true,
        })
        return context.json(error, 404)
      }
      case "expired": {
        const error = createProblemSessionError({
          code: "SESSION_EXPIRED",
          message: "임시 세션 시간이 지났어요. 사진을 다시 올려 주세요.",
          retryable: true,
        })
        return context.json(error, 410)
      }
      case "found":
        break
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
    const response = dependencies.sessionStore.recordUpload({
      sessionId,
      mimeType: mimeTypeResult.data,
      byteSize: image.size,
      width,
      height,
      source,
    })

    return context.json(response, 201)
  })

  app.delete("/v1/problem-sessions/:sessionId", (context) => {
    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    return context.json(dependencies.sessionStore.delete(sessionId))
  })

  return app
}

export const app = createApp()
