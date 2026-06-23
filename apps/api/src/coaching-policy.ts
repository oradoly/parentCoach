import type { CoachingProviderResponse, CoachingResponse } from "@parent-coach/contracts"
import {
  validateFinalSolutionArithmetic,
  validateSimilarProblemCandidate,
} from "@parent-coach/math-validation"

export type CoachingValidationPolicyResult =
  | Readonly<{ kind: "ok"; response: CoachingResponse }>
  | Readonly<{ kind: "answer_leakage"; notes: readonly string[] }>
  | Readonly<{ kind: "verification_failed"; notes: readonly string[] }>

export type CoachingValidationPolicyInput = Readonly<{
  originalProblemText: string
  response: CoachingProviderResponse
}>

const createUnavailableSimilarProblem = (
  reasonCode: "validation_failed" | "duplicate_source" | "unsupported_validation",
): CoachingResponse["similarProblem"] => ({
  status: "unavailable",
  reasonCode,
  message: "비슷한 문제를 안전하게 만들지 못했어요. 원래 문제로 한 번 더 설명을 마무리해 주세요.",
})

const normalizeForLeakScan = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/gu, "").toLowerCase()

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

const extractNumericAnswerToken = (answer: string): string | null => {
  const match = /-?\d+(?:[.,]\d+)?(?:\/\d+)?/u.exec(answer.normalize("NFKC"))
  return match?.[0] ?? null
}

const containsNumericAnswerToken = (text: string, token: string): boolean => {
  const escapedToken = escapeRegExp(token)
  return new RegExp(`(^|[^\\d./-])${escapedToken}([^\\d./-]|$)`, "u").test(text.normalize("NFKC"))
}

const createEarlyCoachingFields = (response: CoachingProviderResponse): readonly string[] => [
  response.parentBriefing.oneLine,
  response.parentBriefing.whatToFind,
  response.parentBriefing.whyThisMethod,
  response.parentBriefing.prerequisite,
  response.parentBriefing.watchOut,
  response.openingQuestion.parentScript,
  response.openingQuestion.intent,
  ...response.openingQuestion.expectedSignals,
  response.openingQuestion.ifCorrect,
  response.openingQuestion.ifStuck,
  ...response.hints
    .filter((hint) => hint.level < 3)
    .flatMap((hint) => [
      hint.title,
      hint.parentScript,
      hint.goal,
      hint.expectedChildResponse,
      hint.ifStuck,
    ]),
]

const DIGIT_SUM_INTENT_PATTERN = /(?:각\s*)?(?:자리\s*)?숫자(?:의)?\s*(?:합|더하|합하)|자릿수/gu
const UNSUPPORTED_DIGIT_SUM_PATTERN =
  /숫자\s*[\d\s,./]+(?:을|를)?\s*(?:모두|전부|다)?\s*(?:더하|합하)|(?:모두|전부|다)\s*(?:더하|합하).*숫자/gu

const createFinalSolutionFields = (response: CoachingProviderResponse): readonly string[] => [
  response.finalSolution.answer,
  response.finalSolution.check,
  response.finalSolution.closingQuestion,
  ...response.finalSolution.steps.flatMap((step) => [step.expression, step.explanation]),
]

export const detectUnsupportedDigitSumSolution = ({
  originalProblemText,
  response,
}: CoachingValidationPolicyInput): readonly string[] => {
  DIGIT_SUM_INTENT_PATTERN.lastIndex = 0
  if (DIGIT_SUM_INTENT_PATTERN.test(originalProblemText.normalize("NFKC"))) {
    return []
  }

  const hasUnsupportedDigitSum = createFinalSolutionFields(response).some((field) => {
    UNSUPPORTED_DIGIT_SUM_PATTERN.lastIndex = 0
    return UNSUPPORTED_DIGIT_SUM_PATTERN.test(field.normalize("NFKC"))
  })

  return hasUnsupportedDigitSum
    ? ["문제가 숫자 자체의 합을 묻지 않는데 최종 풀이가 숫자들을 모두 더한다고 설명했어요."]
    : []
}

export const detectEarlyAnswerLeaks = (response: CoachingProviderResponse): readonly string[] => {
  const normalizedAnswer = normalizeForLeakScan(response.finalSolution.answer)
  const numericAnswer = extractNumericAnswerToken(response.finalSolution.answer)
  const leakedFields = createEarlyCoachingFields(response).filter((field) => {
    const normalizedField = normalizeForLeakScan(field)
    if (normalizedAnswer !== "" && normalizedField.includes(normalizedAnswer)) {
      return true
    }
    return numericAnswer === null ? false : containsNumericAnswerToken(field, numericAnswer)
  })

  if (leakedFields.length === 0) {
    return []
  }

  return ["최종 답이 부모 설명, 첫 질문, 또는 1-2단계 힌트에 너무 일찍 포함됐어요."]
}

export const applyM5VerificationPolicy = ({
  originalProblemText,
  response,
}: CoachingValidationPolicyInput): CoachingValidationPolicyResult => {
  const earlyAnswerLeakNotes = detectEarlyAnswerLeaks(response)
  if (earlyAnswerLeakNotes.length > 0) {
    return {
      kind: "answer_leakage",
      notes: earlyAnswerLeakNotes,
    }
  }

  const validation = validateFinalSolutionArithmetic(response.finalSolution)

  const unsupportedDigitSumNotes = detectUnsupportedDigitSumSolution({
    originalProblemText,
    response,
  })
  if (unsupportedDigitSumNotes.length > 0) {
    return {
      kind: "verification_failed",
      notes: unsupportedDigitSumNotes,
    }
  }

  if (validation.kind === "mismatch") {
    return {
      kind: "verification_failed",
      notes: validation.notes,
    }
  }

  const similarValidation = validateSimilarProblemCandidate({
    originalProblemText,
    candidateProblemText: response.similarProblem.problemText,
    answer: response.similarProblem.answer,
    solutionSteps: response.similarProblem.solutionSteps,
  })

  const similarProblem: CoachingResponse["similarProblem"] =
    similarValidation.kind === "verified"
      ? {
          ...response.similarProblem,
          status: "ok",
          verification: {
            status: "verified",
            method: similarValidation.method,
            notes: [...similarValidation.notes],
          },
        }
      : createUnavailableSimilarProblem(
          similarValidation.kind === "duplicate_source"
            ? "duplicate_source"
            : similarValidation.kind === "unsupported_validation"
              ? "unsupported_validation"
              : "validation_failed",
        )

  const warnings =
    similarValidation.kind === "verified"
      ? response.warnings
      : [...response.warnings, `similar_problem_${similarValidation.kind}`]

  if (validation.kind === "verified") {
    return {
      kind: "ok",
      response: {
        ...response,
        similarProblem,
        warnings,
        verification: {
          status: "verified",
          method: validation.method,
          notes: [...validation.notes],
        },
      },
    }
  }

  return {
    kind: "ok",
    response: {
      ...response,
      similarProblem,
      warnings,
      verification: {
        status: "unverified",
        method: validation.method,
        notes: [...validation.notes],
      },
    },
  }
}
