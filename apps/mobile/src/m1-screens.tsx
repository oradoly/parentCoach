import { StyleSheet, Text, TextInput, View } from "react-native"

import { colors, radius, spacing, typography } from "./design-tokens"
import type { CoachingVisibility } from "./flow-rules"
import { ActionButton, BodyText, Card, HelperText, KeyValueRow, Pill } from "./m1-components"
import { mockCoachingResponse, mockErrorState } from "./mock-parent-coach"

type HomeScreenProps = Readonly<{
  onStart: () => void
  onShowError: () => void
}>

export function HomeScreen({ onStart, onShowError }: HomeScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Pill>초등 5~6학년 수학 · 한 번에 한 문제</Pill>
        <Text style={styles.title}>아이에게 어떻게 설명할지 같이 준비해 볼까요?</Text>
        <Text style={styles.subtitle}>
          문제를 확인한 뒤, 부모님이 바로 말할 질문과 힌트를 차례로 보여 드립니다.
        </Text>
      </View>
      <View style={styles.actions}>
        <ActionButton label="수학 문제 찍기" onPress={onStart} />
        <ActionButton label="사진에서 가져오기" onPress={onStart} variant="secondary" />
        <ActionButton label="다시 찍기 안내 보기" onPress={onShowError} variant="ghost" />
      </View>
    </View>
  )
}

type RecognitionScreenProps = Readonly<{
  canConfirm: boolean
  isEditing: boolean
  problemDraft: string
  onBack: () => void
  onChangeProblem: (value: string) => void
  onConfirm: () => void
  onEdit: () => void
}>

export function RecognitionScreen({
  canConfirm,
  isEditing,
  problemDraft,
  onBack,
  onChangeProblem,
  onConfirm,
  onEdit,
}: RecognitionScreenProps) {
  return (
    <View style={styles.stack}>
      <Card eyebrow="인식 결과 확인" title="제가 이렇게 읽었어요">
        <TextInput
          accessibilityLabel="인식된 문제"
          multiline
          onChangeText={onChangeProblem}
          style={styles.problemInput}
          textAlignVertical="top"
          value={problemDraft}
        />
        <KeyValueRow label="다시 확인이 필요한 부분" value="1/8L의 분모가 작게 보여요." />
        <HelperText>
          {isEditing
            ? "문제를 고친 뒤 맞아요를 눌러 주세요."
            : "사용자가 확인한 문장이 이후 코칭의 기준이 됩니다."}
        </HelperText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label="맞아요" onPress={onConfirm} disabled={!canConfirm} />
        <ActionButton
          label={isEditing ? "수정 중이에요" : "직접 고칠게요"}
          onPress={onEdit}
          variant="secondary"
          disabled={isEditing}
        />
        <ActionButton label="다시 찍기" onPress={onBack} variant="ghost" />
      </View>
    </View>
  )
}

type CoachingScreenProps = Readonly<{
  visibility: CoachingVisibility
  visibleHints: typeof mockCoachingResponse.hints
  onRevealHint: () => void
  onRevealFinal: () => void
  onRevealSimilarAnswer: () => void
  onReset: () => void
}>

export function CoachingScreen({
  visibility,
  visibleHints,
  onRevealHint,
  onRevealFinal,
  onRevealSimilarAnswer,
  onReset,
}: CoachingScreenProps) {
  const hasMoreHints = visibility.revealedHintCount < mockCoachingResponse.hints.length
  const canRevealFinal = !hasMoreHints && !visibility.finalSolutionVisible

  return (
    <View style={styles.stack}>
      <Card eyebrow="부모님 빠른 이해" title="먼저 이렇게 이해하면 좋아요">
        <KeyValueRow label="이 문제의 핵심" value={mockCoachingResponse.parentBriefing.oneLine} />
        <KeyValueRow
          label="구해야 하는 것"
          value={mockCoachingResponse.parentBriefing.whatToFind}
        />
        <KeyValueRow label="설명 방향" value={mockCoachingResponse.parentBriefing.whyThisMethod} />
        <KeyValueRow label="주의할 점" value={mockCoachingResponse.parentBriefing.watchOut} />
      </Card>
      <Card
        eyebrow="아이에게 먼저 물어볼 질문"
        title={mockCoachingResponse.openingQuestion.parentScript}
      >
        <KeyValueRow label="질문 의도" value={mockCoachingResponse.openingQuestion.intent} />
        <KeyValueRow
          label="맞게 말했을 때"
          value={mockCoachingResponse.openingQuestion.ifCorrect}
        />
        <KeyValueRow label="막혔을 때" value={mockCoachingResponse.openingQuestion.ifStuck} />
      </Card>
      {visibleHints.map((hint) => (
        <Card key={hint.level} eyebrow={`힌트 ${hint.level.toString()}`} title={hint.title}>
          <BodyText>{hint.parentScript}</BodyText>
          <KeyValueRow label="이 단계의 목적" value={hint.goal} />
          <KeyValueRow label="막히면 이어 할 말" value={hint.ifStuck} />
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
        <ActionButton label="여기까지 이해했어요" onPress={onReset} variant="ghost" />
      </View>
      {visibility.finalSolutionVisible ? (
        <FinalAndSimilar
          similarAnswerVisible={visibility.similarProblemSolutionVisible}
          onRevealSimilarAnswer={onRevealSimilarAnswer}
        />
      ) : null}
    </View>
  )
}

type FinalAndSimilarProps = Readonly<{
  similarAnswerVisible: boolean
  onRevealSimilarAnswer: () => void
}>

function FinalAndSimilar({ similarAnswerVisible, onRevealSimilarAnswer }: FinalAndSimilarProps) {
  return (
    <View style={styles.stack}>
      <Card eyebrow="최종 풀이" title={mockCoachingResponse.finalSolution.answer} tone="success">
        {mockCoachingResponse.finalSolution.steps.map((step) => (
          <KeyValueRow key={step.expression} label={step.expression} value={step.explanation} />
        ))}
        <KeyValueRow label="검산" value={mockCoachingResponse.finalSolution.check} />
        <KeyValueRow
          label="마무리 질문"
          value={mockCoachingResponse.finalSolution.closingQuestion}
        />
      </Card>
      <Card eyebrow="비슷한 문제" title={mockCoachingResponse.similarProblem.problemText}>
        <KeyValueRow label="왜 비슷한가요" value={mockCoachingResponse.similarProblem.whySimilar} />
        <KeyValueRow label="첫 힌트" value={mockCoachingResponse.similarProblem.firstHint} />
        {similarAnswerVisible ? (
          <KeyValueRow
            label={mockCoachingResponse.similarProblem.answer}
            value={mockCoachingResponse.similarProblem.solutionSteps.join(" → ")}
          />
        ) : (
          <ActionButton
            label="비슷한 문제 풀이 보기"
            onPress={onRevealSimilarAnswer}
            variant="secondary"
          />
        )}
      </Card>
    </View>
  )
}

type ErrorScreenProps = Readonly<{
  onRetry: () => void
  onReset: () => void
}>

export function ErrorScreen({ onRetry, onReset }: ErrorScreenProps) {
  return (
    <View style={styles.stack}>
      <Card eyebrow="다시 확인이 필요해요" title={mockErrorState.title} tone="warning">
        <BodyText>{mockErrorState.message}</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label={mockErrorState.primaryActionLabel} onPress={onRetry} />
        <ActionButton
          label={mockErrorState.secondaryActionLabel}
          onPress={onReset}
          variant="secondary"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: "700",
    lineHeight: typography.titleLineHeight,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
  actions: {
    gap: spacing.sm,
  },
  problemInput: {
    minHeight: 132,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfacePrimary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
})
