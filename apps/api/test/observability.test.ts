import { describe, expect, it } from "vitest"

import {
  RedactedOperationEventError,
  createMemoryOperationLogger,
  createRequestId,
} from "../src/observability"

describe("M7 redacted operation logger", () => {
  it("records operation events without sensitive content", () => {
    const sink = createMemoryOperationLogger()

    sink.logger.record({
      schemaVersion: "1.0",
      requestId: "req_123e4567-e89b-12d3-a456-426614174020",
      route: "POST /v1/problem-sessions/:sessionId/coach",
      stage: "coaching",
      outcome: "success",
      statusCode: 200,
      latencyMs: 10,
      verificationStatus: "verified",
    })

    expect(sink.events).toHaveLength(1)
    expect(JSON.stringify(sink.events)).not.toContain("problemText")
  })

  it("rejects nested raw problem or image fields before logging", () => {
    const sink = createMemoryOperationLogger()

    expect(() => {
      sink.logger.record({
        schemaVersion: "1.0",
        requestId: "req_123e4567-e89b-12d3-a456-426614174021",
        route: "POST /v1/problem-sessions/:sessionId/recognize",
        stage: "recognition",
        outcome: "error",
        statusCode: 502,
        latencyMs: 10,
        metadata: {
          problemText: "3/4L의 주스를 한 컵에 1/8L씩 담으려고 합니다.",
        },
      })
    }).toThrow(RedactedOperationEventError)
  })

  it("creates request ids that are distinct from session ids", () => {
    const requestId = createRequestId()

    expect(requestId.startsWith("req_")).toBe(true)
  })
})
