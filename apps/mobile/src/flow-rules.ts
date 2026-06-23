import type { CoachingResponse, FeedbackChoice, ProblemSessionId } from "@parent-coach/contracts"

import type { ImageIntakeState } from "./use-image-intake"

export type CoachingVisibility = Readonly<{
  revealedHintCount: number
  finalSolutionVisible: boolean
  similarProblemSolutionVisible: boolean
}>

export const INITIAL_COACHING_VISIBILITY = {
  revealedHintCount: 1,
  finalSolutionVisible: false,
  similarProblemSolutionVisible: false,
} satisfies CoachingVisibility

export const revealNextHint = (
  visibility: CoachingVisibility,
  totalHintCount: number,
): CoachingVisibility => ({
  ...visibility,
  revealedHintCount: Math.min(visibility.revealedHintCount + 1, totalHintCount),
})

export const revealFinalSolution = (visibility: CoachingVisibility): CoachingVisibility => ({
  ...visibility,
  finalSolutionVisible: true,
})

export const revealSimilarProblemSolution = (
  visibility: CoachingVisibility,
): CoachingVisibility => ({
  ...visibility,
  similarProblemSolutionVisible: true,
})

export type FeedbackChoiceOption = Readonly<{
  choice: FeedbackChoice
  label: string
}>

export const FEEDBACK_CHOICES = [
  { choice: "helpful", label: "도움이 됐어요" },
  { choice: "hard_to_explain", label: "설명이 어려워요" },
  { choice: "misread_problem", label: "문제를 잘못 읽었어요" },
  { choice: "wrong_solution", label: "풀이 또는 답이 틀린 것 같아요" },
] as const satisfies readonly FeedbackChoiceOption[]

export const NEW_PROBLEM_ACTION_LABEL = "새 문제 시작"

export const getFeedbackVisibleCopy = (
  choices: readonly FeedbackChoiceOption[],
): readonly string[] => choices.map((choice) => choice.label)

export const getSessionCompletionActions = (): readonly string[] => [NEW_PROBLEM_ACTION_LABEL]

export const getUploadedProblemSessionId = (state: ImageIntakeState): ProblemSessionId | null =>
  state.kind === "uploaded" ? state.upload.sessionId : null

export const createVerificationNotice = (coaching: CoachingResponse): string => {
  const firstNote = coaching.verification.notes[0]
  const notes = firstNote === undefined ? "" : ` ${firstNote}`

  if (coaching.verification.status === "verified") {
    return `계산으로 확인했어요.${notes}`
  }
  if (coaching.verification.status === "partially_verified") {
    return `일부 계산을 확인했어요. 조건은 한 번 더 확인해 주세요.${notes}`
  }
  return `자동 검산이 어려운 문제예요. 조건을 다시 확인해 주세요.${notes}`
}

export const containsForbiddenAnswer = (
  visibleCopy: readonly string[],
  forbiddenAnswers: readonly string[],
): boolean => forbiddenAnswers.some((answer) => visibleCopy.some((copy) => copy.includes(answer)))

export const getVisibleCoachingCopy = (
  coaching: CoachingResponse,
  visibility: CoachingVisibility,
): readonly string[] => {
  const visibleHints = coaching.hints
    .slice(0, visibility.revealedHintCount)
    .flatMap((hint) => [
      hint.title,
      hint.parentScript,
      hint.goal,
      hint.expectedChildResponse,
      hint.ifStuck,
    ])

  const copy = [
    coaching.parentBriefing.oneLine,
    coaching.parentBriefing.whatToFind,
    coaching.parentBriefing.whyThisMethod,
    coaching.parentBriefing.prerequisite,
    coaching.parentBriefing.watchOut,
    coaching.openingQuestion.parentScript,
    coaching.openingQuestion.intent,
    coaching.openingQuestion.ifCorrect,
    coaching.openingQuestion.ifStuck,
    ...visibleHints,
  ]

  if (visibility.finalSolutionVisible) {
    const similarProblemCopy =
      coaching.similarProblem.status === "ok"
        ? [
            coaching.similarProblem.problemText,
            coaching.similarProblem.whySimilar,
            coaching.similarProblem.firstHint,
          ]
        : [coaching.similarProblem.message]

    copy.push(
      coaching.finalSolution.answer,
      createVerificationNotice(coaching),
      coaching.finalSolution.check,
      coaching.finalSolution.closingQuestion,
      ...coaching.finalSolution.steps.flatMap((step) => [step.expression, step.explanation]),
      ...similarProblemCopy,
    )
  }

  if (
    visibility.finalSolutionVisible &&
    visibility.similarProblemSolutionVisible &&
    coaching.similarProblem.status === "ok"
  ) {
    copy.push(coaching.similarProblem.answer, ...coaching.similarProblem.solutionSteps)
  }

  return copy
}

export type RecoverableErrorState = Readonly<{
  title: string
  message: string
  primaryActionLabel: string
  secondaryActionLabel: string
}>

export const getErrorVisibleCopy = (errorState: RecoverableErrorState): readonly string[] => [
  errorState.title,
  errorState.message,
  errorState.primaryActionLabel,
  errorState.secondaryActionLabel,
]
