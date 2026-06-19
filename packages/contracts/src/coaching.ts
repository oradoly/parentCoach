import { z } from "zod"

const schemaVersionSchema = z.literal("1.0")

export const recognitionStatusSchema = z.union([
  z.literal("ok"),
  z.literal("uncertain"),
  z.literal("needs_crop"),
  z.literal("needs_retake"),
  z.literal("missing_diagram"),
  z.literal("unsupported"),
])

export const recognitionAmbiguitySchema = z.object({
  segment: z.string().min(1),
  reason: z.string().min(1),
  options: z.array(z.string().min(1)),
})

export const recognitionResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  status: recognitionStatusSchema,
  problemText: z.string().min(1),
  normalizedText: z.string().min(1),
  latex: z.string().optional(),
  confidence: z.number().min(0).max(1),
  containsMultipleProblems: z.boolean(),
  requiresDiagram: z.boolean(),
  ambiguities: z.array(recognitionAmbiguitySchema),
  suggestedAction: z.string().min(1),
})

const classificationSchema = z.object({
  curriculum: z.string().min(1),
  gradeBand: z.literal("5-6"),
  domain: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.union([z.literal("easy"), z.literal("medium"), z.literal("hard")]),
})

const verificationSchema = z.object({
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
  problemText: z.string().min(1),
  whySimilar: z.string().min(1),
  firstHint: z.string().min(1),
  answer: z.string().min(1),
  solutionSteps: z.array(z.string().min(1)).min(1),
})

export const coachingResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  status: z.literal("ok"),
  classification: classificationSchema,
  verification: verificationSchema,
  parentBriefing: parentBriefingSchema,
  openingQuestion: openingQuestionSchema,
  hints: z.array(coachingHintSchema).length(3),
  finalSolution: finalSolutionSchema,
  similarProblem: similarProblemSchema,
  warnings: z.array(z.string()),
})

export type RecognitionResponse = Readonly<z.infer<typeof recognitionResponseSchema>>
export type CoachingHint = Readonly<z.infer<typeof coachingHintSchema>>
export type CoachingResponse = Readonly<z.infer<typeof coachingResponseSchema>>
