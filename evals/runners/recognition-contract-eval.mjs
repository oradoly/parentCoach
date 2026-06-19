import { readFile } from "node:fs/promises"

import { recognitionResponseSchema } from "../../packages/contracts/src/index.ts"

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value)

const parseCase = (value) => {
  if (!isRecord(value)) {
    throw new Error("recognition eval case must be an object")
  }
  if (typeof value.name !== "string") {
    throw new Error("recognition eval case requires name")
  }
  if (typeof value.expectedStatus !== "string") {
    throw new Error(`recognition eval case ${value.name} requires expectedStatus`)
  }
  return {
    name: value.name,
    expectedStatus: value.expectedStatus,
    response: value.response,
  }
}

const runRecognitionContractEval = async () => {
  const raw = await readFile("evals/fixtures/recognition-cases.json", "utf8")
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error("recognition eval fixture must be an array")
  }

  let failed = 0
  for (const value of parsed) {
    const evalCase = parseCase(value)
    const response = recognitionResponseSchema.parse(evalCase.response)
    if (response.status !== evalCase.expectedStatus) {
      failed += 1
      console.error(
        `${evalCase.name}: expected ${evalCase.expectedStatus}, received ${response.status}`,
      )
    }
  }

  return { checked: parsed.length, failed }
}

const result = await runRecognitionContractEval()
if (result.failed > 0) {
  process.exitCode = 1
}

console.log(
  `Recognition contract eval checked ${result.checked.toString()} cases; ${result.failed.toString()} failed.`,
)
