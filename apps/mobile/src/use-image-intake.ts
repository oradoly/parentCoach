import * as ImageManipulator from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { useState } from "react"

import type { ImageUploadResponse, ProblemImageSource } from "@parent-coach/contracts"

import {
  DEFAULT_API_BASE_URL,
  ProblemImageUploadError,
  createProblemSessionClient,
} from "./problem-session-client"
import {
  buildImageResizePlan,
  createImageIntakeErrorCopy,
  validateImageForUpload,
  type ImageIntakeValidation,
  type PickedImageCandidate,
  type PreparedImageCandidate,
} from "./image-intake-rules"

type PermissionDeniedReason = "camera" | "library"

type PickProblemImageResult =
  | {
      readonly kind: "ready"
      readonly image: PreparedImageCandidate
      readonly source: ProblemImageSource
    }
  | { readonly kind: "cancelled" }
  | { readonly kind: "permission_denied"; readonly reason: PermissionDeniedReason }
  | { readonly kind: "invalid"; readonly validation: ImageIntakeValidation }

export type ImageIntakeState =
  | { readonly kind: "idle" }
  | { readonly kind: "working"; readonly message: string }
  | {
      readonly kind: "ready"
      readonly image: PreparedImageCandidate
      readonly source: ProblemImageSource
    }
  | {
      readonly kind: "uploading"
      readonly image: PreparedImageCandidate
      readonly source: ProblemImageSource
    }
  | {
      readonly kind: "uploaded"
      readonly image: PreparedImageCandidate
      readonly upload: ImageUploadResponse
    }
  | { readonly kind: "cancelled"; readonly message: string }
  | {
      readonly kind: "error"
      readonly title: string
      readonly message: string
      readonly retryable: boolean
    }

const pickerOptions = {
  allowsEditing: true,
  aspect: [4, 3],
  exif: false,
  mediaTypes: ["images"],
  quality: 1,
} satisfies ImagePicker.ImagePickerOptions

const configuredApiBaseUrl = (): string => {
  const configured = process.env["EXPO_PUBLIC_API_BASE_URL"]?.trim()
  return configured === undefined || configured === "" ? DEFAULT_API_BASE_URL : configured
}

const createPickedImageCandidate = (asset: ImagePicker.ImagePickerAsset): PickedImageCandidate => ({
  height: asset.height,
  uri: asset.uri,
  width: asset.width,
  ...(asset.fileName === undefined ? {} : { fileName: asset.fileName }),
  ...(asset.fileSize === undefined ? {} : { fileSize: asset.fileSize }),
  ...(asset.mimeType === undefined ? {} : { mimeType: asset.mimeType }),
})

const preparePickedImage = async (
  asset: ImagePicker.ImagePickerAsset,
): Promise<ImageIntakeValidation> => {
  const initialValidation = validateImageForUpload(createPickedImageCandidate(asset))
  if (initialValidation.kind === "invalid") {
    return initialValidation
  }

  const context = ImageManipulator.ImageManipulator.manipulate(asset.uri)
  const resizePlan = buildImageResizePlan(initialValidation.candidate)
  if (resizePlan !== null) {
    context.resize(resizePlan)
  }
  const renderedImage = await context.renderAsync()
  const manipulated = await renderedImage.saveAsync({
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  })
  context.release()
  renderedImage.release()

  return validateImageForUpload({
    fileName: "problem-image.jpg",
    fileSize: initialValidation.candidate.byteSize,
    height: manipulated.height,
    mimeType: "image/jpeg",
    uri: manipulated.uri,
    width: manipulated.width,
  })
}

const requestPermission = async (
  source: ProblemImageSource,
): Promise<PermissionDeniedReason | null> => {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    return permission.granted ? null : "camera"
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  return permission.granted ? null : "library"
}

const pickProblemImage = async (source: ProblemImageSource): Promise<PickProblemImageResult> => {
  const deniedReason = await requestPermission(source)
  if (deniedReason !== null) {
    return { kind: "permission_denied", reason: deniedReason }
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions)

  if (result.canceled) {
    return { kind: "cancelled" }
  }

  const asset = result.assets[0]
  if (asset === undefined) {
    return { kind: "invalid", validation: { kind: "invalid", reason: "invalid_size" } }
  }

  const validation = await preparePickedImage(asset)
  if (validation.kind === "invalid") {
    return { kind: "invalid", validation }
  }

  return {
    kind: "ready",
    image: validation.candidate,
    source,
  }
}

const permissionDeniedMessage = (reason: PermissionDeniedReason): string =>
  reason === "camera"
    ? "카메라 권한이 꺼져 있어요. 설정에서 권한을 켜거나 사진에서 가져오기를 사용해 주세요."
    : "사진 접근 권한이 꺼져 있어요. 설정에서 권한을 켜거나 카메라로 촬영해 주세요."

const unknownErrorMessage = "사진을 준비하지 못했어요. 다시 시도해 주세요."

export const useImageIntake = () => {
  const [state, setState] = useState<ImageIntakeState>({ kind: "idle" })
  const client = createProblemSessionClient({ baseUrl: configuredApiBaseUrl() })

  const chooseImage = async (source: ProblemImageSource): Promise<void> => {
    setState({
      kind: "working",
      message: source === "camera" ? "카메라를 준비하고 있어요." : "사진을 불러오고 있어요.",
    })

    try {
      const result = await pickProblemImage(source)
      switch (result.kind) {
        case "ready":
          setState({ kind: "ready", image: result.image, source: result.source })
          return
        case "cancelled":
          setState({ kind: "cancelled", message: "사진 선택을 취소했어요." })
          return
        case "permission_denied":
          setState({
            kind: "error",
            message: permissionDeniedMessage(result.reason),
            retryable: true,
            title: "권한이 필요해요",
          })
          return
        case "invalid":
          setState({
            kind: "error",
            message: createImageIntakeErrorCopy(result.validation),
            retryable: true,
            title: "사진을 올릴 수 없어요",
          })
      }
    } catch (error) {
      if (error instanceof Error) {
        setState({
          kind: "error",
          message: error.message || unknownErrorMessage,
          retryable: true,
          title: "사진 준비 중 문제가 생겼어요",
        })
        return
      }
      throw error
    }
  }

  const uploadReadyImage = async (): Promise<void> => {
    if (state.kind !== "ready") {
      return
    }

    setState({ kind: "uploading", image: state.image, source: state.source })
    try {
      const session = await client.createSession()
      const upload = await client.uploadImage(session.sessionId, state.image, state.source)
      setState({ kind: "uploaded", image: state.image, upload })
    } catch (error) {
      if (error instanceof ProblemImageUploadError) {
        setState({
          kind: "error",
          message: error.response.error.message,
          retryable: error.response.error.retryable,
          title: "업로드하지 못했어요",
        })
        return
      }
      if (error instanceof Error) {
        setState({
          kind: "error",
          message: "API 서버에 연결하지 못했어요. 서버 주소와 네트워크를 확인해 주세요.",
          retryable: true,
          title: "업로드하지 못했어요",
        })
        return
      }
      throw error
    }
  }

  return {
    chooseImage,
    resetImageIntake: () => {
      setState({ kind: "idle" })
    },
    state,
    uploadReadyImage,
  } as const
}
