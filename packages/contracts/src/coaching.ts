import { z } from "zod"

const schemaVersionSchema = z.literal("1.0")

const classificationSchema = z.object({
  curriculum: z.string().min(1),
  gradeBand: z.literal("5-6"),
  domain: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.union([z.literal("easy"), z.literal("medium"), z.literal("hard")]),
})

export const coachingVerificationSchema = z.object({
  status: z.union([
    z.literal("verified"),
    z.literal("partially_verified"),
    z.literal("unverified"),
  ]),
  method: z.string().min(1),
  notes: z.array(z.string()),
})

const parentBriefingSchema = z.object({
  oneLine: z.string().min(1),
  whatToFind: z.string().min(1),
  whyThisMethod: z.string().min(1),
  prerequisite: z.string().min(1),
  watchOut: z.string().min(1),
})

const openingQuestionSchema = z.object({
  parentScript: z.string().min(1),
  intent: z.string().min(1),
  expectedSignals: z.array(z.string().min(1)),
  ifCorrect: z.string().min(1),
  ifStuck: z.string().min(1),
})

export const coachingHintSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  parentScript: z.string().min(1),
  goal: z.string().min(1),
  expectedChildResponse: z.string().min(1),
  ifStuck: z.string().min(1),
})

const finalSolutionStepSchema = z.object({
  expression: z.string().min(1),
  explanation: z.string().min(1),
})

const finalSolutionSchema = z.object({
  answer: z.string().min(1),
  steps: z.array(finalSolutionStepSchema).min(1),
  check: z.string().min(1),
  closingQuestion: z.string().min(1),
})

const similarProblemSchema = z.object({
  status: z.literal("ok"),
  problemText: z.string().min(1),
  whySimilar: z.string().min(1),
  firstHint: z.string().min(1),
  answer: z.string().min(1),
  solutionSteps: z.array(z.string().min(1)).min(1),
  verification: coachingVerificationSchema,
})

const unavailableSimilarProblemSchema = z.object({
  status: z.literal("unavailable"),
  reasonCode: z.union([
    z.literal("validation_failed"),
    z.literal("duplicate_source"),
    z.literal("unsupported_validation"),
  ]),
  message: z.string().min(1),
})

export const legacySimilarProblemCandidateSchema = z.object({
  problemText: z.string().min(1),
  whySimilar: z.string().min(1),
  firstHint: z.string().min(1),
  answer: z.string().min(1),
  solutionSteps: z.array(z.string().min(1)).min(1),
})

const coachingBaseResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  status: z.literal("ok"),
  classification: classificationSchema,
  verification: coachingVerificationSchema,
  parentBriefing: parentBriefingSchema,
  openingQuestion: openingQuestionSchema,
  hints: z.array(coachingHintSchema).length(3),
  finalSolution: finalSolutionSchema,
  warnings: z.array(z.string()),
})

export const coachingProviderResponseSchema = coachingBaseResponseSchema.extend({
  similarProblem: legacySimilarProblemCandidateSchema,
})

export const coachingResponseSchema = coachingBaseResponseSchema.extend({
  similarProblem: z.discriminatedUnion("status", [
    similarProblemSchema,
    unavailableSimilarProblemSchema,
  ]),
})

export type CoachingHint = Readonly<z.infer<typeof coachingHintSchema>>
export type CoachingProviderResponse = Readonly<z.infer<typeof coachingProviderResponseSchema>>
export type CoachingResponse = Readonly<z.infer<typeof coachingResponseSchema>>
export type LegacySimilarProblemCandidate = Readonly<
  z.infer<typeof legacySimilarProblemCandidateSchema>
>
