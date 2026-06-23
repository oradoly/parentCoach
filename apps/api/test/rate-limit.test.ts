import { describe, expect, it } from "vitest"

import { createInMemoryRateLimiter } from "../src/rate-limit"

describe("M7 in-memory rate limiter", () => {
  it("blocks requests after the scope limit within a fixed window", () => {
    const limiter = createInMemoryRateLimiter({
      now: () => new Date("2026-06-22T00:00:00.000Z"),
      rules: {
        coaching: { limit: 1, windowMs: 60_000 },
      },
    })

    const first = limiter.check({ key: "anonymous-local", scope: "coaching" })
    const second = limiter.check({ key: "anonymous-local", scope: "coaching" })

    expect(first.kind).toBe("allowed")
    expect(second.kind).toBe("blocked")
  })

  it("allows requests again after the fixed window expires", () => {
    let nowMs = Date.parse("2026-06-22T00:00:00.000Z")
    const limiter = createInMemoryRateLimiter({
      now: () => new Date(nowMs),
      rules: {
        recognition: { limit: 1, windowMs: 60_000 },
      },
    })

    const first = limiter.check({ key: "anonymous-local", scope: "recognition" })
    nowMs += 60_001
    const second = limiter.check({ key: "anonymous-local", scope: "recognition" })

    expect(first.kind).toBe("allowed")
    expect(second.kind).toBe("allowed")
  })

  it("keeps route scopes independent", () => {
    const limiter = createInMemoryRateLimiter({
      now: () => new Date("2026-06-22T00:00:00.000Z"),
      rules: {
        recognition: { limit: 1, windowMs: 60_000 },
        coaching: { limit: 1, windowMs: 60_000 },
      },
    })

    limiter.check({ key: "anonymous-local", scope: "recognition" })
    const coachResult = limiter.check({ key: "anonymous-local", scope: "coaching" })

    expect(coachResult.kind).toBe("allowed")
  })
})
