import { readFile } from "node:fs/promises"

import { coachingResponseSchema } from "../../packages/contracts/src/index.ts"

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value)

const isVerificationStatus = (value) =>
  value === "verified" || value === "partially_verified" || value === "unverified"

const normalizeProblemText = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/gu, "")
    .replace(/[.,!?;:'"“”‘’()[\]{}·]/gu, "")

const stripNumbers = (value) => normalizeProblemText(value).replace(/[0-9/]+/gu, "#")

const isDuplicateProblem = (sourceProblemText, candidateProblemText) => {
  const normalizedSource = normalizeProblemText(sourceProblemText)
  const normalizedCandidate = normalizeProblemText(candidateProblemText)
  return (
    normalizedSource === normalizedCandidate ||
    normalizedSource.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedSource) ||
    stripNumbers(sourceProblemText) === stripNumbers(candidateProblemText)
  )
}

const parseCase = (value) => {
  if (!isRecord(value)) {
    throw new Error("coaching eval case must be an object")
  }
  if (typeof value.name !== "string") {
    throw new Error("coaching eval case requires name")
  }
  if (!Array.isArray(value.forbiddenEarlyHintLeaks)) {
    throw new Error(`coaching eval case ${value.name} requires forbiddenEarlyHintLeaks`)
  }
  if (
    value.expectedVerification !== undefined &&
    !isVerificationStatus(value.expectedVerification)
  ) {
    throw new Error(`coaching eval case ${value.name} has invalid expectedVerification`)
  }
  if (value.similarProblemConstraints !== undefined && !isRecord(value.similarProblemConstraints)) {
    throw new Error(`coaching eval case ${value.name} has invalid similarProblemConstraints`)
  }
  if (
    value.similarProblemConstraints?.expectedVerification !== undefined &&
    !isVerificationStatus(value.similarProblemConstraints.expectedVerification)
  ) {
    throw new Error(`coaching eval case ${value.name} has invalid similar expectedVerification`)
  }
  if (
    value.similarProblemConstraints?.notDuplicate === true &&
    typeof value.sourceProblemText !== "string"
  ) {
    throw new Error(`coaching eval case ${value.name} requires sourceProblemText`)
  }
  return {
    name: value.name,
    sourceProblemText: value.sourceProblemText,
    expectedVerification: value.expectedVerification,
    forbiddenEarlyHintLeaks: value.forbiddenEarlyHintLeaks,
    similarProblemConstraints: value.similarProblemConstraints,
    response: value.response,
  }
}

const earlyHintCopy = (response) =>
  response.hints
    .filter((hint) => hint.level === 1 || hint.level === 2)
    .flatMap((hint) => [
      hint.title,
      hint.parentScript,
      hint.goal,
      hint.expectedChildResponse,
      hint.ifStuck,
    ])
    .join("\n")

const runCoachingContractEval = async () => {
  const raw = await readFile("evals/fixtures/coaching-cases.json", "utf8")
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error("coaching eval fixture must be an array")
  }

  let failed = 0
  for (const value of parsed) {
    const evalCase = parseCase(value)
    const response = coachingResponseSchema.parse(evalCase.response)
    if (
      evalCase.expectedVerification !== undefined &&
      response.verification.status !== evalCase.expectedVerification
    ) {
      failed += 1
      console.error(
        `${evalCase.name}: expected verification ${evalCase.expectedVerification}, got ${response.verification.status}`,
      )
    }

    const visibleEarlyHints = earlyHintCopy(response)
    for (const leak of evalCase.forbiddenEarlyHintLeaks) {
      if (typeof leak === "string" && leak !== "" && visibleEarlyHints.includes(leak)) {
        failed += 1
        console.error(`${evalCase.name}: early hints leaked forbidden answer ${leak}`)
      }
    }

    const similarConstraints = evalCase.similarProblemConstraints
    if (similarConstraints !== undefined) {
      if (response.similarProblem.status !== "ok") {
        failed += 1
        console.error(`${evalCase.name}: expected available similar problem`)
      } else {
        if (
          similarConstraints.expectedVerification !== undefined &&
          response.similarProblem.verification.status !== similarConstraints.expectedVerification
        ) {
          failed += 1
          console.error(
            `${evalCase.name}: expected similar verification ${similarConstraints.expectedVerification}, got ${response.similarProblem.verification.status}`,
          )
        }
        if (
          similarConstraints.notDuplicate === true &&
          isDuplicateProblem(evalCase.sourceProblemText, response.similarProblem.problemText)
        ) {
          failed += 1
          console.error(`${evalCase.name}: similar problem duplicates the source problem`)
        }
      }
    }
  }

  return { checked: parsed.length, failed }
}

const result = await runCoachingContractEval()
if (result.failed > 0) {
  process.exitCode = 1
}

console.log(
  `Coaching contract eval checked ${result.checked.toString()} cases; ${result.failed.toString()} failed.`,
)
