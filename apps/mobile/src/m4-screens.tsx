import type { CoachingHint, CoachingResponse, FeedbackChoice } from "@parent-coach/contracts"
import { StyleSheet, Text, View } from "react-native"

import type { CoachingVisibility } from "./flow-rules"
import { NEW_PROBLEM_ACTION_LABEL } from "./flow-rules"
import { ActionButton, BodyText, Card, KeyValueRow } from "./m1-components"
import { CoachingResultSections } from "./m4-result-sections"
import { colors, radius, spacing, typography } from "./design-tokens"
import type { ProblemFeedbackState } from "./use-problem-feedback"

type CoachingProgressScreenProps = Readonly<{
  onBack: () => void
}>

export function CoachingProgressScreen({ onBack }: CoachingProgressScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>코칭 준비</Text>
        <Text style={styles.screenTitle}>질문과 첫 힌트를 정리해요</Text>
        <Text style={styles.screenSubtitle}>최종 답은 부모님이 열기 전까지 숨깁니다.</Text>
      </View>
      <Card title="잠시만 기다려 주세요" tone="accent">
        <BodyText>부모님이 아이에게 먼저 물어볼 문장부터 준비합니다.</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label="처음으로" onPress={onBack} variant="ghost" />
      </View>
    </View>
  )
}

type CoachingRecoveryScreenProps = Readonly<{
  title: string
  message: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  onReset: () => void
}>

export function CoachingRecoveryScreen({
  title,
  message,
  primaryActionLabel,
  onPrimaryAction,
  onReset,
}: CoachingRecoveryScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>다시 확인</Text>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>확정 풀이 대신 다시 시도할 수 있게 안내합니다.</Text>
      </View>
      <Card title={title} tone="warning">
        <BodyText>{message}</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label={primaryActionLabel} onPress={onPrimaryAction} />
        <ActionButton label="처음" onPress={onReset} variant="secondary" />
      </View>
    </View>
  )
}

type CoachingScreenProps = Readonly<{
  coaching: CoachingResponse
  visibility: CoachingVisibility
  visibleHints: readonly CoachingHint[]
  onRevealHint: () => void
  onRevealFinal: () => void
  onRevealSimilarAnswer: () => void
  feedbackState: ProblemFeedbackState
  onSubmitFeedback: (choice: FeedbackChoice) => void
  onReset: () => void
}>

export function CoachingScreen({
  coaching,
  visibility,
  visibleHints,
  onRevealHint,
  onRevealFinal,
  onRevealSimilarAnswer,
  feedbackState,
  onSubmitFeedback,
  onReset,
}: CoachingScreenProps) {
  const hasMoreHints = visibility.revealedHintCount < coaching.hints.length
  const canRevealFinal = !hasMoreHints && !visibility.finalSolutionVisible

  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>코칭 준비 완료</Text>
        <Text style={styles.screenTitle}>먼저 이렇게 물어보세요</Text>
        <Text style={styles.screenSubtitle}>
          답을 말하기 전에 아이가 무엇을 이해했는지 확인합니다.
        </Text>
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionEyebrow}>아이에게 할 첫 질문</Text>
        <Text style={styles.questionText}>{coaching.openingQuestion.parentScript}</Text>
        <View style={styles.questionDetails}>
          <KeyValueRow label="질문 의도" value={coaching.openingQuestion.intent} />
          <KeyValueRow label="맞게 말하면" value={coaching.openingQuestion.ifCorrect} />
          <KeyValueRow label="막히면" value={coaching.openingQuestion.ifStuck} />
        </View>
      </View>

      <Card eyebrow="부모님 빠른 이해" title={coaching.parentBriefing.oneLine}>
        <KeyValueRow label="구해야 하는 것" value={coaching.parentBriefing.whatToFind} />
        <KeyValueRow label="설명 방향" value={coaching.parentBriefing.whyThisMethod} />
        <KeyValueRow label="주의할 점" value={coaching.parentBriefing.watchOut} />
      </Card>

      {visibleHints.map((hint) => (
        <Card key={hint.level} eyebrow={`힌트 ${hint.level.toString()}`} title={hint.title}>
          <BodyText>{hint.parentScript}</BodyText>
          <KeyValueRow label="이 단계의 목적" value={hint.goal} />
          <KeyValueRow label="막히면" value={hint.ifStuck} />
        </Card>
      ))}
      <View style={styles.actions}>
        <ActionButton
          label={hasMoreHints ? "아이가 아직 막혀 있어요 · 다음 힌트" : "힌트를 모두 봤어요"}
          onPress={onRevealHint}
          disabled={!hasMoreHints}
        />
        <ActionButton
          label="최종 풀이 보기"
          onPress={onRevealFinal}
          variant="secondary"
          disabled={!canRevealFinal}
        />
        <ActionButton label={NEW_PROBLEM_ACTION_LABEL} onPress={onReset} variant="ghost" />
      </View>
      {visibility.finalSolutionVisible ? (
        <CoachingResultSections
          coaching={coaching}
          similarAnswerVisible={visibility.similarProblemSolutionVisible}
          feedbackState={feedbackState}
          onRevealSimilarAnswer={onRevealSimilarAnswer}
          onStartNewProblem={onReset}
          onSubmitFeedback={onSubmitFeedback}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  screenHeader: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  stepPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: "800",
    lineHeight: typography.titleLineHeight,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
  },
  questionCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    shadowColor: colors.textPrimary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionEyebrow: {
    color: colors.textSecondary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: typography.headlineSize,
    fontWeight: "800",
    lineHeight: typography.headlineLineHeight,
  },
  questionDetails: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.borderDefault,
  },
  actions: {
    gap: spacing.sm,
  },
})
