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
export const problemSessionImageStatusSchema = z.union([
  z.literal("empty"),
  z.literal("uploaded"),
  z.literal("deleted"),
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
])

export const problemSessionErrorResponseSchema = z.object({
  error: z.object({
    code: problemSessionErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
})

export type AcceptedImageMimeType = z.infer<typeof acceptedImageMimeTypeSchema>
export type ProblemImageSource = z.infer<typeof problemImageSourceSchema>
export type ProblemSessionId = z.infer<typeof problemSessionIdSchema>
export type ProblemImageId = z.infer<typeof problemImageIdSchema>
export type ProblemSessionImageStatus = z.infer<typeof problemSessionImageStatusSchema>
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
