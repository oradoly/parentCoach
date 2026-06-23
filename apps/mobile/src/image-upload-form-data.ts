import type { ProblemImageSource } from "@parent-coach/contracts"

import type { PreparedImageCandidate } from "./image-intake-rules"

export const createImageUploadFormData = (
  image: PreparedImageCandidate,
  source: ProblemImageSource,
  imageBlob: Blob,
): FormData => {
  const formData = new FormData()
  formData.append("height", image.height.toString())
  formData.append("source", source)
  formData.append("width", image.width.toString())
  formData.append("image", imageBlob, image.fileName)
  return formData
}
