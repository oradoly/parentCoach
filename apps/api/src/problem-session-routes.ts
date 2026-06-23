// allow: SIZE_OK — Hono route table coordinates one temporary problem-session surface.
import {
  MAX_IMAGE_UPLOAD_BYTES,
  acceptedImageMimeTypeSchema,
  confirmProblemRequestSchema,
  feedbackRequestSchema,
  problemImageSourceSchema,
  problemSessionIdSchema,
  coachingProviderResponseSchema,
  recognitionResponseSchema,
  type OperationOutcome,
  type OperationStage,
  type ProblemSessionErrorCode,
  type RequestId,
} from "@parent-coach/contracts"
import { Hono } from "hono"

import type { FeedbackStore } from "./feedback-store"
import {
  CoachingModelDisabledError,
  CoachingNotConfiguredError,
  CoachingProviderError,
  CoachingSchemaError,
  type CoachingAdapter,
} from "./coaching-adapter"
import type { OperationLogger } from "./observability"
import { applyM5VerificationPolicy } from "./coaching-policy"
import { createProblemSessionError, rejectInactiveSession } from "./problem-session-errors"
import type { ProblemSessionStore } from "./problem-session-store"
import type { RateLimiter } from "./rate-limit"
import {
  RecognitionModelDisabledError,
  RecognitionNotConfiguredError,
  RecognitionProviderError,
  RecognitionSchemaError,
  type RecognitionAdapter,
} from "./recognition-adapter"

type ProblemSessionRoutesDependencies = Readonly<{
  coachingAdapter: CoachingAdapter
  feedbackStore: FeedbackStore
  operationLogger: OperationLogger
  rateLimiter: RateLimiter
  recognitionAdapter: RecognitionAdapter
  requestIdFactory: () => RequestId
  sessionStore: ProblemSessionStore
}>

type RouteTelemetry = Readonly<{
  requestId: RequestId
  route: string
  stage: OperationStage
  startedAtMs: number
}>

type OperationRecordInput = Readonly<{
  outcome: OperationOutcome
  statusCode: number
  errorCode?: ProblemSessionErrorCode
  model?: string | undefined
  promptVersion?: string | undefined
  responseSchemaVersion?: "1.0"
  verificationStatus?: "verified" | "partially_verified" | "unverified"
}>

const sanitizeDiagnosticText = (value: string): string =>
  value
    .replace(/data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=_-]+/giu, "[redacted-image]")
    .slice(0, 500)

const readErrorDiagnosticProperty = (error: Error, propertyName: string): string | undefined => {
  const value: unknown = Object.getOwnPropertyDescriptor(error, propertyName)?.value
  if (typeof value === "string") {
    return sanitizeDiagnosticText(value)
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value.toString()
  }
  return undefined
}

const logRecognitionProviderDiagnostic = (
  requestId: RequestId,
  error: RecognitionProviderError,
): void => {
  if (process.env["NODE_ENV"]?.trim() === "production") {
    return
  }

  console.error(
    JSON.stringify({
      event: "recognition_provider_error",
      requestId,
      error: {
        name: error.name,
        message: sanitizeDiagnosticText(error.message),
        causeName: error.cause.name,
        causeMessage: sanitizeDiagnosticText(error.cause.message),
        causeStatus: readErrorDiagnosticProperty(error.cause, "status"),
        causeCode: readErrorDiagnosticProperty(error.cause, "code"),
      },
    }),
  )
}

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

const createRouteTelemetry = ({
  requestId,
  route,
  stage,
}: Omit<RouteTelemetry, "startedAtMs">): RouteTelemetry => ({
  requestId,
  route,
  stage,
  startedAtMs: Date.now(),
})

const recordOperation = (
  operationLogger: OperationLogger,
  telemetry: RouteTelemetry,
  input: OperationRecordInput,
): void => {
  operationLogger.record({
    schemaVersion: "1.0",
    requestId: telemetry.requestId,
    route: telemetry.route,
    stage: telemetry.stage,
    outcome: input.outcome,
    statusCode: input.statusCode,
    latencyMs: Date.now() - telemetry.startedAtMs,
    ...(input.errorCode === undefined ? {} : { errorCode: input.errorCode }),
    ...(input.model === undefined ? {} : { model: input.model }),
    ...(input.promptVersion === undefined ? {} : { promptVersion: input.promptVersion }),
    ...(input.responseSchemaVersion === undefined
      ? {}
      : { responseSchemaVersion: input.responseSchemaVersion }),
    ...(input.verificationStatus === undefined
      ? {}
      : { verificationStatus: input.verificationStatus }),
  })
}

const getRateLimitKey = (headerValue: string | undefined): string => {
  const firstForwardedFor = headerValue?.split(",")[0]?.trim()
  return firstForwardedFor === undefined || firstForwardedFor === ""
    ? "anonymous-local"
    : firstForwardedFor
}

const createRateLimitError = (requestId: RequestId) =>
  createProblemSessionError({
    code: "RATE_LIMITED",
    message: "요청이 잠시 많아요. 조금 뒤에 다시 시도해 주세요.",
    requestId,
    retryable: true,
  })

export const createProblemSessionRoutes = ({
  coachingAdapter,
  feedbackStore,
  operationLogger,
  rateLimiter,
  recognitionAdapter,
  requestIdFactory,
  sessionStore,
}: ProblemSessionRoutesDependencies) => {
  const routes = new Hono()

  routes.post("/", (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "POST /v1/problem-sessions",
      stage: "session",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "session",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const response = sessionStore.create()
    recordOperation(operationLogger, telemetry, {
      outcome: "success",
      responseSchemaVersion: response.schemaVersion,
      statusCode: 201,
    })
    return context.json(response, 201)
  })

  routes.post("/:sessionId/image", async (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "POST /v1/problem-sessions/:sessionId/image",
      stage: "upload",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "upload",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId), requestId)
    if (inactiveSession !== null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: inactiveSession.body.error.code,
        outcome: "error",
        statusCode: inactiveSession.status,
      })
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const formData = await context.req.raw.formData()
    const image = formData.get("image")
    if (!isFile(image)) {
      const error = createProblemSessionError({
        code: "IMAGE_REQUIRED",
        message: "업로드할 문제 사진이 필요해요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "IMAGE_REQUIRED",
        outcome: "error",
        statusCode: 400,
      })
      return context.json(error, 400)
    }

    const mimeTypeResult = acceptedImageMimeTypeSchema.safeParse(image.type)
    if (!mimeTypeResult.success) {
      const error = createProblemSessionError({
        code: "UNSUPPORTED_IMAGE_TYPE",
        message: "JPG, PNG, WebP 형식의 사진만 올릴 수 있어요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "UNSUPPORTED_IMAGE_TYPE",
        outcome: "error",
        statusCode: 415,
      })
      return context.json(error, 415)
    }

    if (image.size > MAX_IMAGE_UPLOAD_BYTES) {
      const error = createProblemSessionError({
        code: "IMAGE_TOO_LARGE",
        message: "사진이 5MB보다 커요. 문제 부분만 잘라 다시 시도해 주세요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "IMAGE_TOO_LARGE",
        outcome: "error",
        statusCode: 413,
      })
      return context.json(error, 413)
    }

    const width = parsePositiveIntegerField(formData, "width")
    const height = parsePositiveIntegerField(formData, "height")
    if (width === null || height === null) {
      const error = createProblemSessionError({
        code: "IMAGE_DIMENSIONS_REQUIRED",
        message: "사진 크기 정보를 확인할 수 없어요. 다시 시도해 주세요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "IMAGE_DIMENSIONS_REQUIRED",
        outcome: "error",
        statusCode: 400,
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

    recordOperation(operationLogger, telemetry, {
      outcome: "success",
      responseSchemaVersion: response.schemaVersion,
      statusCode: 201,
    })
    return context.json(response, 201)
  })

  routes.post("/:sessionId/recognize", async (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "POST /v1/problem-sessions/:sessionId/recognize",
      stage: "recognition",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "recognition",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId), requestId)
    if (inactiveSession !== null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: inactiveSession.body.error.code,
        outcome: "error",
        statusCode: inactiveSession.status,
      })
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const image = sessionStore.getUploadedImage(sessionId)
    if (image === null) {
      const error = createProblemSessionError({
        code: "IMAGE_NOT_UPLOADED",
        message: "인식할 문제 사진이 아직 없어요. 사진을 먼저 올려 주세요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "IMAGE_NOT_UPLOADED",
        outcome: "error",
        statusCode: 409,
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
      const parsed = recognitionResponseSchema.parse(response)
      recordOperation(operationLogger, telemetry, {
        model: recognitionAdapter.metadata?.model,
        outcome: "success",
        promptVersion: recognitionAdapter.metadata?.promptVersion,
        responseSchemaVersion: parsed.schemaVersion,
        statusCode: 200,
      })
      return context.json(parsed, 200)
    } catch (error) {
      if (error instanceof RecognitionModelDisabledError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "MODEL_DISABLED",
          model: recognitionAdapter.metadata?.model,
          outcome: "error",
          promptVersion: recognitionAdapter.metadata?.promptVersion,
          statusCode: 503,
        })
        return context.json(
          createProblemSessionError({
            code: "MODEL_DISABLED",
            message: "문제 인식 모델을 잠시 꺼 두었어요. 나중에 다시 시도해 주세요.",
            requestId,
            retryable: false,
          }),
          503,
        )
      }
      if (error instanceof RecognitionNotConfiguredError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "OPENAI_NOT_CONFIGURED",
          model: recognitionAdapter.metadata?.model,
          outcome: "error",
          promptVersion: recognitionAdapter.metadata?.promptVersion,
          statusCode: 503,
        })
        return context.json(
          createProblemSessionError({
            code: "OPENAI_NOT_CONFIGURED",
            message: "문제 인식 서버 설정이 아직 준비되지 않았어요.",
            requestId,
            retryable: false,
          }),
          503,
        )
      }
      if (error instanceof RecognitionSchemaError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "RECOGNITION_SCHEMA_INVALID",
          model: recognitionAdapter.metadata?.model,
          outcome: "error",
          promptVersion: recognitionAdapter.metadata?.promptVersion,
          statusCode: 502,
        })
        return context.json(
          createProblemSessionError({
            code: "RECOGNITION_SCHEMA_INVALID",
            message: "문제 인식 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
            requestId,
            retryable: true,
          }),
          502,
        )
      }
      if (error instanceof RecognitionProviderError) {
        logRecognitionProviderDiagnostic(requestId, error)
        recordOperation(operationLogger, telemetry, {
          errorCode: "RECOGNITION_FAILED",
          model: recognitionAdapter.metadata?.model,
          outcome: "error",
          promptVersion: recognitionAdapter.metadata?.promptVersion,
          statusCode: 502,
        })
        return context.json(
          createProblemSessionError({
            code: "RECOGNITION_FAILED",
            message: "문제 인식 중 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
            requestId,
            retryable: true,
          }),
          502,
        )
      }
      throw error
    }
  })

  routes.patch("/:sessionId/problem", async (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "PATCH /v1/problem-sessions/:sessionId/problem",
      stage: "confirmation",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "confirmation",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId), requestId)
    if (inactiveSession !== null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: inactiveSession.body.error.code,
        outcome: "error",
        statusCode: inactiveSession.status,
      })
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const body: unknown = await context.req.json()
    const input = confirmProblemRequestSchema.safeParse(body)
    if (!input.success) {
      const error = createProblemSessionError({
        code: "PROBLEM_TEXT_REQUIRED",
        message: "확인한 문제 문장이 필요해요.",
        requestId,
        retryable: true,
      })
      recordOperation(operationLogger, telemetry, {
        errorCode: "PROBLEM_TEXT_REQUIRED",
        outcome: "error",
        statusCode: 400,
      })
      return context.json(error, 400)
    }

    const response = sessionStore.confirmProblem(sessionId, input.data)
    recordOperation(operationLogger, telemetry, {
      outcome: "success",
      responseSchemaVersion: response.schemaVersion,
      statusCode: 200,
    })
    return context.json(response, 200)
  })

  routes.post("/:sessionId/coach", async (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "POST /v1/problem-sessions/:sessionId/coach",
      stage: "coaching",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "coaching",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId), requestId)
    if (inactiveSession !== null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: inactiveSession.body.error.code,
        outcome: "error",
        statusCode: inactiveSession.status,
      })
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const image = sessionStore.getUploadedImage(sessionId)
    if (image === null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: "IMAGE_NOT_UPLOADED",
        outcome: "error",
        statusCode: 409,
      })
      return context.json(
        createProblemSessionError({
          code: "IMAGE_NOT_UPLOADED",
          message: "코칭을 만들 문제 사진이 아직 없어요. 사진을 먼저 올려 주세요.",
          requestId,
          retryable: true,
        }),
        409,
      )
    }

    const confirmedProblem = sessionStore.getConfirmedProblem(sessionId)
    if (confirmedProblem === null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: "PROBLEM_NOT_CONFIRMED",
        outcome: "error",
        statusCode: 409,
      })
      return context.json(
        createProblemSessionError({
          code: "PROBLEM_NOT_CONFIRMED",
          message: "부모님이 확인한 문제 문장이 필요해요.",
          requestId,
          retryable: true,
        }),
        409,
      )
    }

    try {
      const response = await coachingAdapter.coach(confirmedProblem)
      const validation = applyM5VerificationPolicy({
        originalProblemText: confirmedProblem.problemText,
        response: coachingProviderResponseSchema.parse(response),
      })
      if (validation.kind === "answer_leakage") {
        recordOperation(operationLogger, telemetry, {
          errorCode: "ANSWER_LEAK_DETECTED",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 502,
        })
        return context.json(
          createProblemSessionError({
            code: "ANSWER_LEAK_DETECTED",
            message: "코칭 결과가 최종 답을 너무 일찍 포함했어요. 다시 생성이 필요해요.",
            requestId,
            retryable: true,
          }),
          502,
        )
      }
      if (validation.kind === "verification_failed") {
        recordOperation(operationLogger, telemetry, {
          errorCode: "VERIFICATION_FAILED",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 409,
        })
        return context.json(
          createProblemSessionError({
            code: "VERIFICATION_FAILED",
            message:
              "풀이와 검산 결과가 맞지 않아 최종 풀이를 보여 줄 수 없어요. 문제 문장을 다시 확인해 주세요.",
            requestId,
            retryable: true,
          }),
          409,
        )
      }
      recordOperation(operationLogger, telemetry, {
        model: coachingAdapter.metadata?.model,
        outcome: "success",
        promptVersion: coachingAdapter.metadata?.promptVersion,
        responseSchemaVersion: validation.response.schemaVersion,
        statusCode: 200,
        verificationStatus: validation.response.verification.status,
      })
      return context.json(validation.response, 200)
    } catch (error) {
      if (error instanceof CoachingModelDisabledError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "MODEL_DISABLED",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 503,
        })
        return context.json(
          createProblemSessionError({
            code: "MODEL_DISABLED",
            message: "코칭 생성 모델을 잠시 꺼 두었어요. 나중에 다시 시도해 주세요.",
            requestId,
            retryable: false,
          }),
          503,
        )
      }
      if (error instanceof CoachingNotConfiguredError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "OPENAI_NOT_CONFIGURED",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 503,
        })
        return context.json(
          createProblemSessionError({
            code: "OPENAI_NOT_CONFIGURED",
            message: "코칭 생성 서버 설정이 아직 준비되지 않았어요.",
            requestId,
            retryable: false,
          }),
          503,
        )
      }
      if (error instanceof CoachingSchemaError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "COACHING_SCHEMA_INVALID",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 502,
        })
        return context.json(
          createProblemSessionError({
            code: "COACHING_SCHEMA_INVALID",
            message: "코칭 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
            requestId,
            retryable: true,
          }),
          502,
        )
      }
      if (error instanceof CoachingProviderError) {
        recordOperation(operationLogger, telemetry, {
          errorCode: "COACHING_FAILED",
          model: coachingAdapter.metadata?.model,
          outcome: "error",
          promptVersion: coachingAdapter.metadata?.promptVersion,
          statusCode: 502,
        })
        return context.json(
          createProblemSessionError({
            code: "COACHING_FAILED",
            message: "코칭 생성 중 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
            requestId,
            retryable: true,
          }),
          502,
        )
      }
      throw error
    }
  })

  routes.post("/:sessionId/feedback", async (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "POST /v1/problem-sessions/:sessionId/feedback",
      stage: "feedback",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "feedback",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const inactiveSession = rejectInactiveSession(sessionStore.getActive(sessionId), requestId)
    if (inactiveSession !== null) {
      recordOperation(operationLogger, telemetry, {
        errorCode: inactiveSession.body.error.code,
        outcome: "error",
        statusCode: inactiveSession.status,
      })
      return context.json(inactiveSession.body, inactiveSession.status)
    }

    const body: unknown = await context.req.json()
    const feedback = feedbackRequestSchema.safeParse(body)
    if (!feedback.success) {
      recordOperation(operationLogger, telemetry, {
        errorCode: "FEEDBACK_INVALID",
        outcome: "error",
        statusCode: 400,
      })
      return context.json(
        createProblemSessionError({
          code: "FEEDBACK_INVALID",
          message: "피드백 선택지를 확인할 수 없어요. 다시 선택해 주세요.",
          requestId,
          retryable: true,
        }),
        400,
      )
    }

    const response = feedbackStore.record({
      feedback: feedback.data,
      requestId,
      sessionId,
    })
    recordOperation(operationLogger, telemetry, {
      outcome: "success",
      responseSchemaVersion: response.schemaVersion,
      statusCode: 201,
      ...(feedback.data.coachingVerificationStatus === undefined
        ? {}
        : { verificationStatus: feedback.data.coachingVerificationStatus }),
    })
    return context.json(response, 201)
  })

  routes.delete("/:sessionId", (context) => {
    const requestId = requestIdFactory()
    const telemetry = createRouteTelemetry({
      requestId,
      route: "DELETE /v1/problem-sessions/:sessionId",
      stage: "delete",
    })
    const rateLimit = rateLimiter.check({
      key: getRateLimitKey(context.req.header("x-forwarded-for")),
      scope: "delete",
    })
    if (rateLimit.kind === "blocked") {
      recordOperation(operationLogger, telemetry, {
        errorCode: "RATE_LIMITED",
        outcome: "blocked",
        statusCode: 429,
      })
      return context.json(createRateLimitError(requestId), 429)
    }

    const sessionId = problemSessionIdSchema.parse(context.req.param("sessionId"))
    const response = sessionStore.delete(sessionId)
    recordOperation(operationLogger, telemetry, {
      outcome: "success",
      responseSchemaVersion: response.schemaVersion,
      statusCode: 200,
    })
    return context.json(response)
  })

  return routes
}
