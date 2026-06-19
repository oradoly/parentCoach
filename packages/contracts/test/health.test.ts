import { describe, expect, it } from "vitest"

import { createHealthResponse, healthResponseSchema } from "../src/index"

describe("healthResponseSchema", () => {
  it("accepts the M0 health response contract", () => {
    expect(healthResponseSchema.parse(createHealthResponse())).toStrictEqual({
      status: "ok",
      service: "parent-coach-api",
      schemaVersion: "1.0",
    })
  })

  it("rejects an unexpected status", () => {
    expect(() =>
      healthResponseSchema.parse({
        status: "degraded",
        service: "parent-coach-api",
        schemaVersion: "1.0",
      }),
    ).toThrow()
  })

  it("rejects a missing service name", () => {
    expect(() =>
      healthResponseSchema.parse({
        status: "ok",
        schemaVersion: "1.0",
      }),
    ).toThrow()
  })

  it("rejects an unsupported schema version", () => {
    expect(() =>
      healthResponseSchema.parse({
        status: "ok",
        service: "parent-coach-api",
        schemaVersion: "2.0",
      }),
    ).toThrow()
  })
})
