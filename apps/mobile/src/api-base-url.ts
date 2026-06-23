export const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001"

export const resolveProblemSessionApiBaseUrl = (configured: string | undefined): string => {
  const trimmed = configured?.trim()
  return trimmed === undefined || trimmed === "" ? DEFAULT_API_BASE_URL : trimmed
}
