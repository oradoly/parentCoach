import {
  problemSessionErrorResponseSchema,
  type ProblemSessionErrorCode,
  type RequestId,
} from "@parent-coach/contracts"

import type { ProblemSessionStore } from "./problem-session-store"

type ProblemSessionErrorInput = Readonly<{
  code: ProblemSessionErrorCode
  message: string
  requestId: RequestId
  retryable: boolean
}>

export const createProblemSessionError = ({
  code,
  message,
  requestId,
  retryable,
}: ProblemSessionErrorInput) =>
  problemSessionErrorResponseSchema.parse({
    error: {
      code,
      message,
      requestId,
      retryable,
    },
  })

export const rejectInactiveSession = (
  lookup: ReturnType<ProblemSessionStore["getActive"]>,
  requestId: RequestId,
) => {
  switch (lookup.kind) {
    case "not_found":
      return {
        body: createProblemSessionError({
          code: "SESSION_NOT_FOUND",
          message: "임시 세션을 찾을 수 없어요. 처음부터 다시 시도해 주세요.",
          requestId,
          retryable: true,
        }),
        status: 404,
      } as const
    case "expired":
      return {
        body: createProblemSessionError({
          code: "SESSION_EXPIRED",
          message: "임시 세션 시간이 지났어요. 사진을 다시 올려 주세요.",
          requestId,
          retryable: true,
        }),
        status: 410,
      } as const
    case "found":
      return null
  }
}
