import { readFile } from "node:fs/promises"

const REQUIRED_TOTAL = 40

const REQUIRED_DOMAIN_COUNTS = {
  number_and_operations: 12,
  change_and_relationships: 8,
  geometry_and_measurement: 10,
  data_and_possibility: 6,
  intentional_failure_or_unsupported: 4,
} as const satisfies Readonly<Record<string, number>>

export type AlphaReadinessStatus = "ready" | "not_ready"

export type AlphaReadinessInput = Readonly<{
  recognitionPath?: string
  coachingPath?: string
  targetTotal?: number
}>

export type AlphaReadinessSummary = Readonly<{
  status: AlphaReadinessStatus
  totalCases: number
  targetTotal: number
  missingTotal: number
  domainCounts: Readonly<Record<string, number>>
  missingDomainCounts: Readonly<Record<string, number>>
  missingMetadata: number
}>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readJsonArray = async (path: string): Promise<readonly unknown[]> => {
  const raw = await readFile(path, "utf8")
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON array`)
  }
  return Array.from<unknown>(parsed)
}

const extractDomain = (value: unknown): string => {
  if (!isRecord(value)) {
    return "unknown"
  }
  if (typeof value["domain"] === "string") {
    return value["domain"]
  }
  const response = value["response"]
  if (isRecord(response)) {
    const classification = response["classification"]
    if (isRecord(classification) && typeof classification["domain"] === "string") {
      return classification["domain"]
    }
  }
  return "unknown"
}

const hasSkill = (value: Readonly<Record<string, unknown>>): boolean => {
  if (typeof value["skill"] === "string") {
    return true
  }
  const response = value["response"]
  if (!isRecord(response)) {
    return false
  }
  const classification = response["classification"]
  return isRecord(classification) && typeof classification["skill"] === "string"
}

const hasMetadata = (value: unknown): boolean =>
  isRecord(value) &&
  (typeof value["id"] === "string" || typeof value["name"] === "string") &&
  extractDomain(value) !== "unknown" &&
  hasSkill(value) &&
  (typeof value["source"] === "string" || typeof value["sourceProblemText"] === "string")

const countByDomain = (cases: readonly unknown[]): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {
    unknown: 0,
  }
  for (const value of cases) {
    const domain = extractDomain(value)
    counts[domain] = (counts[domain] ?? 0) + 1
  }
  return counts
}

export const summarizeAlphaReadiness = async ({
  recognitionPath = "evals/fixtures/recognition-cases.json",
  coachingPath = "evals/fixtures/coaching-cases.json",
  targetTotal = REQUIRED_TOTAL,
}: AlphaReadinessInput = {}): Promise<AlphaReadinessSummary> => {
  const recognitionCases = await readJsonArray(recognitionPath)
  const coachingCases = await readJsonArray(coachingPath)
  const allCases = [...recognitionCases, ...coachingCases]
  const domainCounts = countByDomain(allCases)
  const missingMetadata = allCases.filter((value) => !hasMetadata(value)).length
  const totalCases = allCases.length
  const missingTotal = Math.max(targetTotal - totalCases, 0)
  const missingDomainCounts = Object.fromEntries(
    Object.entries(REQUIRED_DOMAIN_COUNTS).map(([domain, required]) => [
      domain,
      Math.max(required - (domainCounts[domain] ?? 0), 0),
    ]),
  )
  const hasMissingDomain = Object.values(missingDomainCounts).some((count) => count > 0)
  const status: AlphaReadinessStatus =
    missingTotal === 0 && missingMetadata === 0 && !hasMissingDomain ? "ready" : "not_ready"

  return {
    status,
    totalCases,
    targetTotal,
    missingTotal,
    domainCounts,
    missingDomainCounts,
    missingMetadata,
  }
}

const isMain = process.argv[1]?.endsWith("alpha-readiness-eval.ts") === true

if (isMain) {
  const summary = await summarizeAlphaReadiness()
  console.log(JSON.stringify(summary, null, 2))
}
