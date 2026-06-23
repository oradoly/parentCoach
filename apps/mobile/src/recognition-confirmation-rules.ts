import type { ConfirmProblemRequest, RecognitionResponse } from "@parent-coach/contracts"

export const createConfirmProblemRequest = (
  recognition: RecognitionResponse,
  problemText: string,
  userEdited: boolean,
): ConfirmProblemRequest => ({
  problemText,
  recognitionStatus: recognition.status,
  userEdited,
  ...(userEdited || recognition.normalizedText.trim() === ""
    ? {}
    : { normalizedText: recognition.normalizedText }),
  ...(userEdited || recognition.latex.trim() === "" ? {} : { latex: recognition.latex }),
})
