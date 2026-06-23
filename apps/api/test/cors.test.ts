import { describe, expect, it } from "vitest"

import { createApp, parseCorsAllowedOrigins } from "../src/server"

describe("M8 API CORS surface", () => {
  it("parses comma-separated allowed web origins from env copy", () => {
    expect(
      parseCorsAllowedOrigins(" http://127.0.0.1:4173, http://localhost:8081 ,,"),
    ).toStrictEqual(["http://127.0.0.1:4173", "http://localhost:8081"])
  })

  it("allows only explicitly configured web origins", async () => {
    const app = createApp({ corsAllowedOrigins: ["http://127.0.0.1:4173"] })

    const allowed = await app.request("/v1/problem-sessions", {
      headers: { Origin: "http://127.0.0.1:4173" },
      method: "OPTIONS",
    })
    const blocked = await app.request("/v1/problem-sessions", {
      headers: { Origin: "http://example.com" },
      method: "OPTIONS",
    })

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("http://127.0.0.1:4173")
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type")
    expect(blocked.status).toBe(204)
    expect(blocked.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
