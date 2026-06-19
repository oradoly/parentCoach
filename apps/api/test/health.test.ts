import { createHealthResponse, healthResponseSchema } from "@parent-coach/contracts"
import { describe, expect, it } from "vitest"

import { app } from "../src/server"

describe("GET /health", () => {
  it("returns the shared health response contract", async () => {
    const response = await app.request("/health")
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(healthResponseSchema.parse(body)).toStrictEqual(createHealthResponse())
  })
})
