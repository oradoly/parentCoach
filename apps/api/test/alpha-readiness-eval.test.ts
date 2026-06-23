import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { summarizeAlphaReadiness } from "../../../evals/runners/alpha-readiness-eval"

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

describe("alpha readiness eval", () => {
  it("reports not_ready while the 40 problem target is unmet", async () => {
    const directory = await mkdtemp(join(tmpdir(), "parent-coach-alpha-"))
    const recognitionPath = join(directory, "recognition-cases.json")
    const coachingPath = join(directory, "coaching-cases.json")
    await writeJson(recognitionPath, [
      {
        id: "recognition-001",
        domain: "number_and_operations",
        skill: "fraction_division",
        source: "self_authored",
      },
    ])
    await writeJson(coachingPath, [
      {
        name: "coaching-001",
        sourceProblemText: "2/3L를 1/6L씩 나누면 몇 컵인가요?",
        expectedAnswer: "4컵",
        expectedVerification: "verified",
        domain: "number_and_operations",
        skill: "fraction_division",
        source: "self_authored",
        forbiddenEarlyHintLeaks: ["4컵"],
        similarProblemConstraints: {
          expectedVerification: "verified",
          notDuplicate: true,
        },
      },
    ])

    const summary = await summarizeAlphaReadiness({
      coachingPath,
      recognitionPath,
      targetTotal: 40,
    })

    expect(summary.status).toBe("not_ready")
    expect(summary.totalCases).toBe(2)
    expect(summary.missingTotal).toBe(38)
    expect(summary.domainCounts["number_and_operations"]).toBe(2)
  })

  it("reports not_ready when domain targets are unmet even if total and metadata are present", async () => {
    const directory = await mkdtemp(join(tmpdir(), "parent-coach-alpha-"))
    const recognitionPath = join(directory, "recognition-cases.json")
    const coachingPath = join(directory, "coaching-cases.json")
    await writeJson(recognitionPath, [])
    await writeJson(coachingPath, [
      {
        name: "coaching-001",
        sourceProblemText: "2/3L를 1/6L씩 나누면 몇 컵인가요?",
        expectedAnswer: "4컵",
        expectedVerification: "verified",
        domain: "number_and_operations",
        skill: "fraction_division",
        source: "self_authored",
        forbiddenEarlyHintLeaks: ["4컵"],
        similarProblemConstraints: {
          expectedVerification: "verified",
          notDuplicate: true,
        },
      },
      {
        name: "coaching-002",
        sourceProblemText: "3/5L를 1/10L씩 나누면 몇 컵인가요?",
        expectedAnswer: "6컵",
        expectedVerification: "verified",
        domain: "number_and_operations",
        skill: "fraction_division",
        source: "self_authored",
        forbiddenEarlyHintLeaks: ["6컵"],
        similarProblemConstraints: {
          expectedVerification: "verified",
          notDuplicate: true,
        },
      },
    ])

    const summary = await summarizeAlphaReadiness({
      coachingPath,
      recognitionPath,
      targetTotal: 2,
    })

    expect(summary.totalCases).toBe(2)
    expect(summary.missingTotal).toBe(0)
    expect(summary.missingMetadata).toBe(0)
    expect(summary.missingDomainCounts["geometry_and_measurement"]).toBe(10)
    expect(summary.status).toBe("not_ready")
  })
})
