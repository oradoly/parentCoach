import { randomUUID } from "node:crypto"

import { operationEventSchema, type OperationEvent, type RequestId } from "@parent-coach/contracts"

const FORBIDDEN_EVENT_KEYS: ReadonlySet<string> = new Set([
  "problemText",
  "normalizedText",
  "latex",
  "imageDataUrl",
  "prompt",
  "rawResponse",
] as const)

export class RedactedOperationEventError extends Error {
  readonly name = "RedactedOperationEventError"

  constructor(readonly forbiddenKey: string) {
    super(`Operation event contains forbidden key: ${forbiddenKey}`)
  }
}

export type OperationLogger = Readonly<{
  record: (event: unknown) => void
}>

export type MemoryOperationLogger = Readonly<{
  events: readonly OperationEvent[]
  logger: OperationLogger
}>

export const createRequestId = (): RequestId => requestIdFromUuid(randomUUID())

export const requestIdFromUuid = (uuid: string): RequestId =>
  requestIdSchemaForInternal.parse(`req_${uuid}`)

const requestIdSchemaForInternal = operationEventSchema.shape.requestId

const assertRedactedEventValue = (value: unknown): void => {
  if (typeof value !== "object" || value === null) {
    return
  }

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_EVENT_KEYS.has(key)) {
      throw new RedactedOperationEventError(key)
    }
    assertRedactedEventValue(child)
  }
}

export const parseRedactedOperationEvent = (event: unknown): OperationEvent => {
  assertRedactedEventValue(event)
  return operationEventSchema.parse(event)
}

export const createMemoryOperationLogger = (): MemoryOperationLogger => {
  const events: OperationEvent[] = []
  return {
    events,
    logger: {
      record: (event) => {
        events.push(parseRedactedOperationEvent(event))
      },
    },
  }
}

export const createConsoleOperationLogger = (): OperationLogger => ({
  record: (event) => {
    const parsed = parseRedactedOperationEvent(event)
    console.log(JSON.stringify(parsed))
  },
})
