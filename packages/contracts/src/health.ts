import { z } from "zod"

export const HEALTH_SCHEMA_VERSION = "1.0" as const
export const HEALTH_SERVICE_NAME = "parent-coach-api" as const

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal(HEALTH_SERVICE_NAME),
  schemaVersion: z.literal(HEALTH_SCHEMA_VERSION),
})

export type HealthResponse = Readonly<z.infer<typeof healthResponseSchema>>

export const createHealthResponse = (): HealthResponse => ({
  status: "ok",
  service: HEALTH_SERVICE_NAME,
  schemaVersion: HEALTH_SCHEMA_VERSION,
})
