import type { RecognitionResponse, RecognitionStatus } from "@parent-coach/contracts"

export const canConfirmRecognition = (recognition: RecognitionResponse): boolean =>
  recognition.status === "ok" || recognition.status === "uncertain"

export const createRecognitionReviewNote = (recognition: RecognitionResponse): string => {
  if (recognition.status === "uncertain") {
    return "잘 안 보이는 부분이 있어요. 부모님이 문장을 확인하거나 직접 고쳐 주세요."
  }
  return "부모님이 확인한 문장이 이후 코칭의 기준이 됩니다."
}

export const summarizeRecognitionAmbiguities = (recognition: RecognitionResponse): string => {
  if (recognition.ambiguities.length === 0) {
    return "특별히 다시 볼 부분은 없어요."
  }

  return recognition.ambiguities
    .map((ambiguity) => `${ambiguity.segment}: ${ambiguity.reason}`)
    .join("\n")
}

export const createRecognitionRecoveryCopy = (
  status: RecognitionStatus,
): Readonly<{
  title: string
  message: string
  primaryActionLabel: string
}> => {
  switch (status) {
    case "needs_crop":
      return {
        title: "문제가 여러 개 보여요",
        message: "한 번에 한 문제만 보이도록 문제 부분만 잘라 다시 올려 주세요.",
        primaryActionLabel: "다시 고르기",
      }
    case "needs_retake":
      return {
        title: "사진을 다시 확인해야 해요",
        message: "흔들림, 빛 반사, 잘린 조건 때문에 문제를 안정적으로 읽지 못했어요.",
        primaryActionLabel: "다시 찍기",
      }
    case "missing_diagram":
      return {
        title: "조건이 더 필요해요",
        message: "문제 풀이에 필요한 그림, 표, 보기, 단위가 함께 보이도록 다시 올려 주세요.",
        primaryActionLabel: "다시 올리기",
      }
    case "unsupported":
      return {
        title: "지원 범위를 벗어난 문제예요",
        message: "현재 MVP는 초등 5~6학년 수학 한 문제만 안전하게 다룹니다.",
        primaryActionLabel: "다른 문제 올리기",
      }
    case "ok":
    case "uncertain":
      return {
        title: "문장을 확인할 수 있어요",
        message: "인식된 문제 문장을 부모님이 확인해 주세요.",
        primaryActionLabel: "문장 확인하기",
      }
  }
}
