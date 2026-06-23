import { createHealthResponse, healthResponseSchema } from "@parent-coach/contracts"
import { Hono, type MiddlewareHandler } from "hono"

import { createFeedbackStore, type FeedbackStore } from "./feedback-store"
import {
  createConsoleOperationLogger,
  createRequestId,
  type OperationLogger,
} from "./observability"
import { createProblemSessionStore, type ProblemSessionStore } from "./problem-session-store"
import { createProblemSessionRoutes } from "./problem-session-routes"
import { createCoachingAdapterFromEnv, type CoachingAdapter } from "./coaching-adapter"
import { createRecognitionAdapterFromEnv, type RecognitionAdapter } from "./recognition-adapter"
import { createRateLimiterFromEnv, type RateLimiter } from "./rate-limit"

type AppDependencies = Readonly<{
  corsAllowedOrigins?: readonly string[]
  coachingAdapter?: CoachingAdapter
  feedbackStore?: FeedbackStore
  operationLogger?: OperationLogger
  rateLimiter?: RateLimiter
  recognitionAdapter?: RecognitionAdapter
  requestIdFactory?: typeof createRequestId
  sessionStore?: ProblemSessionStore
}>

export const parseCorsAllowedOrigins = (value: string | undefined): readonly string[] => {
  if (value === undefined || value.trim() === "") {
    return []
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "")
}

const createCorsMiddleware = (allowedOrigins: readonly string[]): MiddlewareHandler => {
  const allowedOriginSet = new Set(allowedOrigins)

  return async (context, next) => {
    const origin = context.req.header("Origin")
    if (origin !== undefined && allowedOriginSet.has(origin)) {
      context.header("Access-Control-Allow-Headers", "Content-Type")
      context.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
      context.header("Access-Control-Allow-Origin", origin)
      context.header("Vary", "Origin")
    }

    if (context.req.method === "OPTIONS") {
      return context.body(null, 204)
    }

    await next()
  }
}

export const createApp = (dependencies: AppDependencies = {}) => {
  const sessionStore = dependencies.sessionStore ?? createProblemSessionStore()
  const coachingAdapter = dependencies.coachingAdapter ?? createCoachingAdapterFromEnv()
  const feedbackStore = dependencies.feedbackStore ?? createFeedbackStore()
  const operationLogger = dependencies.operationLogger ?? createConsoleOperationLogger()
  const rateLimiter = dependencies.rateLimiter ?? createRateLimiterFromEnv()
  const recognitionAdapter = dependencies.recognitionAdapter ?? createRecognitionAdapterFromEnv()
  const requestIdFactory = dependencies.requestIdFactory ?? createRequestId
  const corsAllowedOrigins =
    dependencies.corsAllowedOrigins ?? parseCorsAllowedOrigins(process.env["ALLOWED_WEB_ORIGINS"])
  const app = new Hono()

  if (corsAllowedOrigins.length > 0) {
    app.use("*", createCorsMiddleware(corsAllowedOrigins))
  }

  app.get("/health", (context) => {
    const response = healthResponseSchema.parse(createHealthResponse())
    return context.json(response)
  })

  app.route(
    "/v1/problem-sessions",
    createProblemSessionRoutes({
      coachingAdapter,
      feedbackStore,
      operationLogger,
      rateLimiter,
      recognitionAdapter,
      requestIdFactory,
      sessionStore,
    }),
  )

  return app
}

export const app = createApp()
