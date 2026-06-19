import { MAX_IMAGE_UPLOAD_BYTES, type AcceptedImageMimeType } from "@parent-coach/contracts"

export const MAX_IMAGE_LONG_EDGE = 1600

export type PickedImageCandidate = Readonly<{
  uri: string
  width: number
  height: number
  mimeType?: string | null
  fileName?: string | null
  fileSize?: number
}>

export type PreparedImageCandidate = Readonly<{
  uri: string
  width: number
  height: number
  mimeType: AcceptedImageMimeType
  fileName: string
  byteSize: number
}>

export type ImageIntakeValidation =
  | { readonly kind: "valid"; readonly candidate: PreparedImageCandidate }
  | { readonly kind: "invalid"; readonly reason: "unsupported_type" | "too_large" | "invalid_size" }

export type ImageResizePlan = Readonly<{
  width: number
  height: number
}>

type MimeInput = Readonly<{
  mimeType?: string | null
  fileName?: string | null
}>

export const normalizeImageMimeType = ({
  fileName,
  mimeType,
}: MimeInput): AcceptedImageMimeType | null => {
  switch (mimeType?.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "image/jpeg"
    case "image/png":
      return "image/png"
    case "image/webp":
      return "image/webp"
    default:
      break
  }

  const lowerFileName = fileName?.toLowerCase()
  if (lowerFileName?.endsWith(".jpg") || lowerFileName?.endsWith(".jpeg")) {
    return "image/jpeg"
  }
  if (lowerFileName?.endsWith(".png")) {
    return "image/png"
  }
  if (lowerFileName?.endsWith(".webp")) {
    return "image/webp"
  }
  return null
}

export const buildImageResizePlan = ({
  height,
  width,
}: Readonly<{ width: number; height: number }>): ImageResizePlan | null => {
  const longEdge = Math.max(width, height)
  if (longEdge <= MAX_IMAGE_LONG_EDGE) {
    return null
  }

  const ratio = MAX_IMAGE_LONG_EDGE / longEdge
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export const validateImageForUpload = (candidate: PickedImageCandidate): ImageIntakeValidation => {
  const mimeType = normalizeImageMimeType(candidate)
  if (mimeType === null) {
    return { kind: "invalid", reason: "unsupported_type" }
  }

  if (!Number.isInteger(candidate.width) || !Number.isInteger(candidate.height)) {
    return { kind: "invalid", reason: "invalid_size" }
  }
  if (candidate.width <= 0 || candidate.height <= 0) {
    return { kind: "invalid", reason: "invalid_size" }
  }
  if (candidate.fileSize !== undefined && candidate.fileSize > MAX_IMAGE_UPLOAD_BYTES) {
    return { kind: "invalid", reason: "too_large" }
  }

  return {
    kind: "valid",
    candidate: {
      uri: candidate.uri,
      width: candidate.width,
      height: candidate.height,
      mimeType,
      fileName: candidate.fileName ?? "problem-image.jpg",
      byteSize: candidate.fileSize ?? 0,
    },
  }
}

export const createImageIntakeErrorCopy = (validation: ImageIntakeValidation): string => {
  if (validation.kind === "valid") {
    return ""
  }

  switch (validation.reason) {
    case "unsupported_type":
      return "JPG, PNG, WebP 형식의 사진만 올릴 수 있어요."
    case "too_large":
      return "사진이 5MB보다 커요. 문제 부분만 잘라 다시 시도해 주세요."
    case "invalid_size":
      return "사진 크기를 확인할 수 없어요. 다시 찍거나 다른 사진을 선택해 주세요."
  }
}
