import type { CoachingResponse } from "@parent-coach/contracts"

export type CoachingVisibility = Readonly<{
  revealedHintCount: number
  finalSolutionVisible: boolean
  similarProblemSolutionVisible: boolean
}>

export const INITIAL_COACHING_VISIBILITY = {
  revealedHintCount: 0,
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
    copy.push(
      coaching.finalSolution.answer,
      coaching.finalSolution.check,
      coaching.finalSolution.closingQuestion,
      ...coaching.finalSolution.steps.flatMap((step) => [step.expression, step.explanation]),
      coaching.similarProblem.problemText,
      coaching.similarProblem.whySimilar,
      coaching.similarProblem.firstHint,
    )
  }

  if (visibility.finalSolutionVisible && visibility.similarProblemSolutionVisible) {
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
