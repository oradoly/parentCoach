import { createHealthResponse, healthResponseSchema } from "@parent-coach/contracts"
import { Hono } from "hono"

import { createProblemSessionStore, type ProblemSessionStore } from "./problem-session-store"
import { createProblemSessionRoutes } from "./problem-session-routes"
import { createRecognitionAdapterFromEnv, type RecognitionAdapter } from "./recognition-adapter"

type AppDependencies = Readonly<{
  recognitionAdapter?: RecognitionAdapter
  sessionStore?: ProblemSessionStore
}>

export const createApp = (dependencies: AppDependencies = {}) => {
  const sessionStore = dependencies.sessionStore ?? createProblemSessionStore()
  const recognitionAdapter = dependencies.recognitionAdapter ?? createRecognitionAdapterFromEnv()
  const app = new Hono()

  app.get("/health", (context) => {
    const response = healthResponseSchema.parse(createHealthResponse())
    return context.json(response)
  })

  app.route(
    "/v1/problem-sessions",
    createProblemSessionRoutes({
      recognitionAdapter,
      sessionStore,
    }),
  )

  return app
}

export const app = createApp()
