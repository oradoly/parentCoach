import {
  problemSessionErrorResponseSchema,
  type ProblemSessionErrorResponse,
} from "@parent-coach/contracts"

export const getProblemSessionErrorResponse = (
  error: unknown,
): ProblemSessionErrorResponse | null => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null
  }

  const response = (error as Readonly<{ response: unknown }>).response
  const parsed = problemSessionErrorResponseSchema.safeParse(response)
  return parsed.success ? parsed.data : null
}

const readErrorResponseBody = async (error: unknown): Promise<string | null> => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null
  }
  const response = (error as Readonly<{ response: unknown }>).response
  if (typeof response !== "object" || response === null || !("text" in response)) {
    return null
  }
  const text = (response as Readonly<{ text: unknown }>).text
  if (typeof text !== "function") {
    return null
  }

  const body: unknown = await text.call(response)
  return typeof body === "string" ? body : null
}

export const readProblemSessionErrorResponse = async (
  error: unknown,
): Promise<ProblemSessionErrorResponse | null> => {
  const directResponse = getProblemSessionErrorResponse(error)
  if (directResponse !== null) {
    return directResponse
  }

  const body = await readErrorResponseBody(error)
  if (body === null) {
    return null
  }

  try {
    const parsedBody: unknown = JSON.parse(body)
    return problemSessionErrorResponseSchema.parse(parsedBody)
  } catch (parseError) {
    if (parseError instanceof Error) {
      return null
    }
    throw parseError
  }
}
