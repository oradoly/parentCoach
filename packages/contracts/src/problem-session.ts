import { z } from "zod"

const schemaVersionSchema = z.literal("1.0")

export const PROBLEM_SESSION_TTL_MS = 15 * 60 * 1000
export const MAX_IMAGE_UPLOAD_BYTES = 5_000_000
export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export const acceptedImageMimeTypeSchema = z.enum(ACCEPTED_IMAGE_MIME_TYPES)
export const problemImageSourceSchema = z.union([
  z.literal("camera"),
  z.literal("library"),
  z.literal("sample"),
])

export const problemSessionIdSchema = z.string().regex(/^ps_[0-9a-f-]{36}$/)
export const problemImageIdSchema = z.string().regex(/^img_[0-9a-f-]{36}$/)
export const requestIdSchema = z.string().regex(/^req_[0-9a-f-]{36}$/)
export const problemSessionImageStatusSchema = z.union([
  z.literal("empty"),
  z.literal("uploaded"),
  z.literal("deleted"),
])
export const feedbackChoiceSchema = z.union([
  z.literal("helpful"),
  z.literal("hard_to_explain"),
  z.literal("misread_problem"),
  z.literal("wrong_solution"),
])
export const feedbackSimilarProblemStatusSchema = z.union([
  z.literal("ok"),
  z.literal("unavailable"),
])

export const temporaryProblemSessionResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  sessionId: problemSessionIdSchema,
  expiresAt: z.iso.datetime(),
  imageStatus: z.literal("empty"),
})

export const uploadedImageMetadataSchema = z.object({
  imageId: problemImageIdSchema,
  receivedAt: z.iso.datetime(),
  mimeType: acceptedImageMimeTypeSchema,
  byteSize: z.number().int().min(1).max(MAX_IMAGE_UPLOAD_BYTES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  retained: z.literal(false),
})

export const imageUploadResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  sessionId: problemSessionIdSchema,
  imageStatus: z.literal("uploaded"),
  image: uploadedImageMetadataSchema,
})

export const problemSessionDeletedResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  sessionId: problemSessionIdSchema,
  imageStatus: z.literal("deleted"),
  deletedAt: z.iso.datetime(),
})

export const problemSessionErrorCodeSchema = z.union([
  z.literal("SESSION_NOT_FOUND"),
  z.literal("SESSION_EXPIRED"),
  z.literal("IMAGE_REQUIRED"),
  z.literal("IMAGE_NOT_UPLOADED"),
  z.literal("UNSUPPORTED_IMAGE_TYPE"),
  z.literal("IMAGE_TOO_LARGE"),
  z.literal("IMAGE_DIMENSIONS_REQUIRED"),
  z.literal("OPENAI_NOT_CONFIGURED"),
  z.literal("RECOGNITION_FAILED"),
  z.literal("RECOGNITION_SCHEMA_INVALID"),
  z.literal("PROBLEM_TEXT_REQUIRED"),
  z.literal("PROBLEM_NOT_CONFIRMED"),
  z.literal("COACHING_FAILED"),
  z.literal("COACHING_SCHEMA_INVALID"),
  z.literal("ANSWER_LEAK_DETECTED"),
  z.literal("VERIFICATION_FAILED"),
  z.literal("RATE_LIMITED"),
  z.literal("MODEL_DISABLED"),
  z.literal("FEEDBACK_INVALID"),
])

export const problemSessionErrorResponseSchema = z.object({
  error: z.object({
    code: problemSessionErrorCodeSchema,
    message: z.string().min(1),
    requestId: requestIdSchema,
    retryable: z.boolean(),
  }),
})

export const operationStageSchema = z.union([
  z.literal("session"),
  z.literal("upload"),
  z.literal("recognition"),
  z.literal("confirmation"),
  z.literal("coaching"),
  z.literal("feedback"),
  z.literal("delete"),
])

export const operationOutcomeSchema = z.union([
  z.literal("success"),
  z.literal("error"),
  z.literal("blocked"),
])

export const operationEventSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    requestId: requestIdSchema,
    route: z.string().min(1),
    stage: operationStageSchema,
    outcome: operationOutcomeSchema,
    statusCode: z.number().int().min(100).max(599),
    latencyMs: z.number().min(0),
    errorCode: problemSessionErrorCodeSchema.optional(),
    model: z.string().min(1).optional(),
    promptVersion: z.string().min(1).optional(),
    responseSchemaVersion: schemaVersionSchema.optional(),
    verificationStatus: z
      .union([z.literal("verified"), z.literal("partially_verified"), z.literal("unverified")])
      .optional(),
    estimatedCostUnits: z.number().min(0).optional(),
  })
  .strict()

export const feedbackRequestSchema = z
  .object({
    choice: feedbackChoiceSchema,
    coachingVerificationStatus: z
      .union([z.literal("verified"), z.literal("partially_verified"), z.literal("unverified")])
      .optional(),
    similarProblemStatus: feedbackSimilarProblemStatusSchema.optional(),
  })
  .strict()

export const feedbackResponseSchema = z.object({
  schemaVersion: schemaVersionSchema,
  sessionId: problemSessionIdSchema,
  requestId: requestIdSchema,
  choice: feedbackChoiceSchema,
  submittedAt: z.iso.datetime(),
})

export type AcceptedImageMimeType = z.infer<typeof acceptedImageMimeTypeSchema>
export type ProblemImageSource = z.infer<typeof problemImageSourceSchema>
export type ProblemSessionId = z.infer<typeof problemSessionIdSchema>
export type ProblemImageId = z.infer<typeof problemImageIdSchema>
export type ProblemSessionImageStatus = z.infer<typeof problemSessionImageStatusSchema>
export type RequestId = z.infer<typeof requestIdSchema>
export type FeedbackChoice = z.infer<typeof feedbackChoiceSchema>
export type FeedbackRequest = Readonly<z.infer<typeof feedbackRequestSchema>>
export type FeedbackResponse = Readonly<z.infer<typeof feedbackResponseSchema>>
export type FeedbackSimilarProblemStatus = z.infer<typeof feedbackSimilarProblemStatusSchema>
export type TemporaryProblemSessionResponse = Readonly<
  z.infer<typeof temporaryProblemSessionResponseSchema>
>
export type UploadedImageMetadata = Readonly<z.infer<typeof uploadedImageMetadataSchema>>
export type ImageUploadResponse = Readonly<z.infer<typeof imageUploadResponseSchema>>
export type ProblemSessionDeletedResponse = Readonly<
  z.infer<typeof problemSessionDeletedResponseSchema>
>
export type ProblemSessionErrorCode = z.infer<typeof problemSessionErrorCodeSchema>
export type ProblemSessionErrorResponse = Readonly<
  z.infer<typeof problemSessionErrorResponseSchema>
>
export type OperationEvent = Readonly<z.infer<typeof operationEventSchema>>
export type OperationOutcome = z.infer<typeof operationOutcomeSchema>
export type OperationStage = z.infer<typeof operationStageSchema>
