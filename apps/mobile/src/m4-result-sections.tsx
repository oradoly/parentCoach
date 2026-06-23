import type { CoachingResponse, FeedbackChoice } from "@parent-coach/contracts"
import { StyleSheet, View } from "react-native"

import { createVerificationNotice, FEEDBACK_CHOICES, NEW_PROBLEM_ACTION_LABEL } from "./flow-rules"
import { ActionButton, BodyText, Card, KeyValueRow } from "./m1-components"
import { spacing } from "./design-tokens"
import type { ProblemFeedbackState } from "./use-problem-feedback"

type CoachingResultSectionsProps = Readonly<{
  coaching: CoachingResponse
  similarAnswerVisible: boolean
  feedbackState: ProblemFeedbackState
  onRevealSimilarAnswer: () => void
  onStartNewProblem: () => void
  onSubmitFeedback: (choice: FeedbackChoice) => void
}>

export function CoachingResultSections({
  coaching,
  similarAnswerVisible,
  feedbackState,
  onRevealSimilarAnswer,
  onStartNewProblem,
  onSubmitFeedback,
}: CoachingResultSectionsProps) {
  return (
    <View style={styles.stack}>
      <FinalAndSimilar
        coaching={coaching}
        similarAnswerVisible={similarAnswerVisible}
        onRevealSimilarAnswer={onRevealSimilarAnswer}
      />
      <FeedbackCard feedbackState={feedbackState} onSubmitFeedback={onSubmitFeedback} />
      <View style={styles.actions}>
        <ActionButton label={NEW_PROBLEM_ACTION_LABEL} onPress={onStartNewProblem} />
      </View>
    </View>
  )
}

type FeedbackCardProps = Readonly<{
  feedbackState: ProblemFeedbackState
  onSubmitFeedback: (choice: FeedbackChoice) => void
}>

function FeedbackCard({ feedbackState, onSubmitFeedback }: FeedbackCardProps) {
  const isSubmitting = feedbackState.kind === "submitting"
  const submittedChoice = feedbackState.kind === "submitted" ? feedbackState.choice : null

  return (
    <Card title="도움됐나요?">
      <View style={styles.actions}>
        {FEEDBACK_CHOICES.map((option) => (
          <ActionButton
            key={option.choice}
            label={option.label}
            onPress={() => {
              onSubmitFeedback(option.choice)
            }}
            variant={submittedChoice === option.choice ? "secondary" : "ghost"}
            disabled={isSubmitting || submittedChoice !== null}
          />
        ))}
      </View>
      {feedbackState.kind === "submitted" || feedbackState.kind === "error" ? (
        <BodyText>{feedbackState.message}</BodyText>
      ) : null}
    </Card>
  )
}

type FinalAndSimilarProps = Readonly<{
  coaching: CoachingResponse
  similarAnswerVisible: boolean
  onRevealSimilarAnswer: () => void
}>

function FinalAndSimilar({
  coaching,
  similarAnswerVisible,
  onRevealSimilarAnswer,
}: FinalAndSimilarProps) {
  return (
    <View style={styles.stack}>
      <Card eyebrow="최종 풀이" title={coaching.finalSolution.answer} tone="warning">
        <KeyValueRow label="검증 상태" value={createVerificationNotice(coaching)} />
        {coaching.finalSolution.steps.map((step) => (
          <KeyValueRow key={step.expression} label={step.expression} value={step.explanation} />
        ))}
        <KeyValueRow label="검산" value={coaching.finalSolution.check} />
        <KeyValueRow label="마무리 질문" value={coaching.finalSolution.closingQuestion} />
      </Card>
      {coaching.similarProblem.status === "ok" ? (
        <Card eyebrow="비슷한 문제" title={coaching.similarProblem.problemText}>
          <KeyValueRow label="첫 힌트" value={coaching.similarProblem.firstHint} />
          {similarAnswerVisible ? (
            <KeyValueRow
              label={coaching.similarProblem.answer}
              value={coaching.similarProblem.solutionSteps.join(" → ")}
            />
          ) : (
            <ActionButton
              label="비슷한 문제 풀이 보기"
              onPress={onRevealSimilarAnswer}
              variant="secondary"
            />
          )}
        </Card>
      ) : (
        <Card eyebrow="비슷한 문제" title="지금은 만들지 않았어요" tone="warning">
          <BodyText>{coaching.similarProblem.message}</BodyText>
        </Card>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
})
