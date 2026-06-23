import { describe, expect, it } from "vitest"

import {
  INTERNAL_ALPHA_REHEARSAL_COACHING_FIXTURE,
  runInternalAlphaRehearsal,
} from "../../../evals/runners/internal-alpha-rehearsal"

describe("internal alpha rehearsal runner", () => {
  it("drives the full internal alpha API rehearsal and reports ready", async () => {
    const summary = await runInternalAlphaRehearsal()

    expect(summary.status).toBe("ready")
    expect(summary.stages.sessionCreated).toBe(true)
    expect(summary.stages.imageUploaded).toBe(true)
    expect(summary.stages.recognized).toBe(true)
    expect(summary.stages.problemConfirmed).toBe(true)
    expect(summary.stages.coachingReady).toBe(true)
    expect(summary.stages.feedbackSubmitted).toBe(true)
    expect(summary.firstQuestionReady).toBe(true)
    expect(summary.earlyHintAnswerLeakCount).toBe(0)
    expect(summary.similarProblemStatus).toBe("ok")
    expect(summary.feedbackChoice).toBe("helpful")
    expect(summary.redactionCheck).toBe("passed")
    expect(summary.observedStages).toEqual(
      expect.arrayContaining([
        "session",
        "upload",
        "recognition",
        "confirmation",
        "coaching",
        "feedback",
      ]),
    )
    expect(JSON.stringify(summary)).not.toContain("3/4L")
    expect(JSON.stringify(summary)).not.toContain("data:image")
  })

  it("blocks the rehearsal if early hints leak the final answer", async () => {
    const leakyFixture = {
      ...INTERNAL_ALPHA_REHEARSAL_COACHING_FIXTURE,
      hints: INTERNAL_ALPHA_REHEARSAL_COACHING_FIXTURE.hints.map((hint) =>
        hint.level === 1 ? { ...hint, parentScript: "답은 6컵이라고 말해 보자." } : hint,
      ),
    }

    const summary = await runInternalAlphaRehearsal({ coachingFixture: leakyFixture })

    expect(summary.status).toBe("blocked")
    expect(summary.earlyHintAnswerLeakCount).toBe(1)
    expect(summary.stages.coachingReady).toBe(false)
    expect(summary.stages.feedbackSubmitted).toBe(false)
    expect(summary.redactionCheck).toBe("passed")
  })
})
