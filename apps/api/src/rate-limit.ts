export type RateLimitScope =
  | "session"
  | "upload"
  | "recognition"
  | "confirmation"
  | "coaching"
  | "feedback"
  | "delete"

export type RateLimitRule = Readonly<{
  limit: number
  windowMs: number
}>

export type RateLimitCheckInput = Readonly<{
  key: string
  scope: RateLimitScope
}>

export type RateLimitResult =
  | Readonly<{ kind: "allowed" }>
  | Readonly<{ kind: "blocked"; retryAfterMs: number }>

export type RateLimiter = Readonly<{
  check: (input: RateLimitCheckInput) => RateLimitResult
}>

export type RateLimiterConfig = Readonly<{
  now: () => Date
  rules: Partial<Record<RateLimitScope, RateLimitRule>>
}>

type WindowCounter = Readonly<{
  count: number
  resetAtMs: number
}>

export const createDisabledRateLimiter = (): RateLimiter => ({
  check: () => ({ kind: "allowed" }),
})

export const createInMemoryRateLimiter = ({ now, rules }: RateLimiterConfig): RateLimiter => {
  const counters = new Map<string, WindowCounter>()

  return {
    check: ({ key, scope }) => {
      const rule = rules[scope]
      if (rule === undefined) {
        return { kind: "allowed" }
      }

      const nowMs = now().getTime()
      const counterKey = `${scope}:${key}`
      const current = counters.get(counterKey)
      if (current === undefined || current.resetAtMs <= nowMs) {
        counters.set(counterKey, {
          count: 1,
          resetAtMs: nowMs + rule.windowMs,
        })
        return { kind: "allowed" }
      }

      if (current.count >= rule.limit) {
        return {
          kind: "blocked",
          retryAfterMs: current.resetAtMs - nowMs,
        }
      }

      counters.set(counterKey, {
        count: current.count + 1,
        resetAtMs: current.resetAtMs,
      })
      return { kind: "allowed" }
    },
  }
}

const parsePositiveIntegerEnv = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === "") {
    return null
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const createRateLimiterFromEnv = (): RateLimiter => {
  const windowMs = parsePositiveIntegerEnv(process.env["RATE_LIMIT_WINDOW_MS"]) ?? 60_000
  const rules: Partial<Record<RateLimitScope, RateLimitRule>> = {
    session: {
      limit: parsePositiveIntegerEnv(process.env["RATE_LIMIT_SESSION_CREATE"]) ?? 20,
      windowMs,
    },
    upload: {
      limit: parsePositiveIntegerEnv(process.env["RATE_LIMIT_IMAGE_UPLOAD"]) ?? 20,
      windowMs,
    },
    recognition: {
      limit: parsePositiveIntegerEnv(process.env["RATE_LIMIT_RECOGNIZE"]) ?? 10,
      windowMs,
    },
    coaching: {
      limit: parsePositiveIntegerEnv(process.env["RATE_LIMIT_COACH"]) ?? 10,
      windowMs,
    },
    feedback: {
      limit: parsePositiveIntegerEnv(process.env["RATE_LIMIT_FEEDBACK"]) ?? 20,
      windowMs,
    },
  }

  return createInMemoryRateLimiter({
    now: () => new Date(),
    rules,
  })
}
