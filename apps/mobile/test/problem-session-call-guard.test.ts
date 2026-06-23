import { describe, expect, it } from "vitest"

import { createSharedInFlightCall } from "../src/problem-session-call-guard"

describe("problem session call guard", () => {
  it("shares the in-flight promise for duplicate keys", async () => {
    const guard = createSharedInFlightCall<string>()
    let callCount = 0

    const first = guard.run("coaching:session-1", () => {
      callCount += 1
      return Promise.resolve("coaching-result")
    })
    const second = guard.run("coaching:session-1", () => {
      callCount += 1
      return Promise.resolve("duplicate-result")
    })

    await expect(first).resolves.toBe("coaching-result")
    await expect(second).resolves.toBe("coaching-result")
    expect(callCount).toBe(1)
  })

  it("allows the same key after the previous call settles", async () => {
    const guard = createSharedInFlightCall<string>()
    let callCount = 0

    await guard.run("recognition:session-1", () => {
      callCount += 1
      return Promise.resolve("first")
    })
    const second = await guard.run("recognition:session-1", () => {
      callCount += 1
      return Promise.resolve("second")
    })

    expect(second).toBe("second")
    expect(callCount).toBe(2)
  })

  it("releases the key after a failed call", async () => {
    const guard = createSharedInFlightCall<string>()
    let callCount = 0

    await expect(
      guard.run("upload:image-1", () => {
        callCount += 1
        return Promise.reject(new Error("upload failed"))
      }),
    ).rejects.toThrow("upload failed")

    const retry = await guard.run("upload:image-1", () => {
      callCount += 1
      return Promise.resolve("retry-ok")
    })

    expect(retry).toBe("retry-ok")
    expect(callCount).toBe(2)
  })
})
