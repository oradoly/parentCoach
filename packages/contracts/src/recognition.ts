import { z } from "zod"

import { problemSessionIdSchema } from "./problem-session"

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

export const recognitionResponseSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    status: recognitionStatusSchema,
    problemText: z.string().min(1),
    normalizedText: z.string().min(1),
    latex: z.string(),
    confidence: z.number().min(0).max(1),
    containsMultipleProblems: z.boolean(),
    requiresDiagram: z.boolean(),
    ambiguities: z.array(recognitionAmbiguitySchema),
    suggestedAction: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (value.status === "uncertain" && value.ambiguities.length === 0) {
      context.addIssue({
        code: "custom",
        message: "uncertain recognition requires at least one ambiguity",
        path: ["ambiguities"],
      })
    }
    if (value.status === "needs_crop" && !value.containsMultipleProblems) {
      context.addIssue({
        code: "custom",
        message: "needs_crop requires multiple problem detection",
        path: ["containsMultipleProblems"],
      })
    }
    if (value.status === "missing_diagram" && !value.requiresDiagram) {
      context.addIssue({
        code: "custom",
        message: "missing_diagram requires diagram dependency",
        path: ["requiresDiagram"],
      })
    }
  })

export const confirmProblemRequestSchema = z.object({
  problemText: z.string().trim().min(1),
  normalizedText: z.string().trim().min(1).optional(),
  latex: z.string().trim().min(1).optional(),
  recognitionStatus: recognitionStatusSchema,
  userEdited: z.boolean(),
})

export const confirmedProblemResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  sessionId: problemSessionIdSchema,
  problemText: z.string().min(1),
  normalizedText: z.string().min(1).optional(),
  latex: z.string().min(1).optional(),
  sourceRecognitionStatus: recognitionStatusSchema,
  userEdited: z.boolean(),
  confirmedAt: z.iso.datetime(),
})

export type RecognitionStatus = z.infer<typeof recognitionStatusSchema>
export type RecognitionAmbiguity = Readonly<z.infer<typeof recognitionAmbiguitySchema>>
export type RecognitionResponse = Readonly<z.infer<typeof recognitionResponseSchema>>
export type ConfirmProblemRequest = Readonly<z.infer<typeof confirmProblemRequestSchema>>
export type ConfirmedProblemResponse = Readonly<z.infer<typeof confirmedProblemResponseSchema>>
