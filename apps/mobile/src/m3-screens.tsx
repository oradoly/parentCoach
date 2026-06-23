import { StyleSheet, Text, TextInput, View } from "react-native"

import type { RecognitionResponse } from "@parent-coach/contracts"

import { colors, radius, spacing, typography } from "./design-tokens"
import {
  createRecognitionReviewNote,
  summarizeRecognitionAmbiguities,
} from "./recognition-flow-rules"
import { ActionButton, BodyText, Card, HelperText, KeyValueRow } from "./m1-components"

type RecognitionProgressScreenProps = Readonly<{
  onBack: () => void
}>

export function RecognitionProgressScreen({ onBack }: RecognitionProgressScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>인식 중</Text>
        <Text style={styles.screenTitle}>문제를 읽고 있어요</Text>
        <Text style={styles.screenSubtitle}>수식과 조건만 짧게 확인합니다.</Text>
      </View>
      <Card title="잠시만 기다려 주세요" tone="accent">
        <BodyText>코칭이나 풀이를 만들기 전에 문제 문장을 먼저 확인합니다.</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label="다시 찍기" onPress={onBack} variant="ghost" />
      </View>
    </View>
  )
}

type RecognitionReviewScreenProps = Readonly<{
  canConfirm: boolean
  isConfirming: boolean
  isEditing: boolean
  problemDraft: string
  recognition: RecognitionResponse
  onBack: () => void
  onChangeProblem: (value: string) => void
  onConfirm: () => void
  onEdit: () => void
}>

export function RecognitionReviewScreen({
  canConfirm,
  isConfirming,
  isEditing,
  problemDraft,
  recognition,
  onBack,
  onChangeProblem,
  onConfirm,
  onEdit,
}: RecognitionReviewScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>인식 결과 확인</Text>
        <Text style={styles.screenTitle}>제가 이렇게 읽었어요</Text>
        <Text style={styles.screenSubtitle}>숫자, 기호, 단위가 맞는지만 확인해 주세요.</Text>
      </View>

      <Card eyebrow="확인할 문제" title="이 문장을 기준으로 코칭해요" tone="accent">
        <TextInput
          accessibilityLabel="인식된 문제"
          multiline
          onChangeText={onChangeProblem}
          style={[styles.problemInput, isEditing ? styles.problemInputEditing : undefined]}
          textAlignVertical="top"
          value={problemDraft}
        />
        <KeyValueRow label="인식 상태" value={recognition.status} />
        <HelperText>
          {isEditing
            ? "고친 뒤 맞아요를 눌러 주세요."
            : summarizeRecognitionAmbiguities(recognition)}
        </HelperText>
        <HelperText>{createRecognitionReviewNote(recognition)}</HelperText>
      </Card>
      <View style={styles.actions}>
        <ActionButton
          label={isConfirming ? "저장 중이에요" : "맞아요"}
          onPress={onConfirm}
          disabled={!canConfirm || isConfirming}
        />
        <ActionButton
          label={isEditing ? "수정 중이에요" : "직접 고칠게요"}
          onPress={onEdit}
          variant="secondary"
          disabled={isEditing || isConfirming}
        />
        <ActionButton label="다시 찍기" onPress={onBack} variant="ghost" disabled={isConfirming} />
      </View>
    </View>
  )
}

type RecognitionRecoveryScreenProps = Readonly<{
  title: string
  message: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  onReset: () => void
}>

export function RecognitionRecoveryScreen({
  title,
  message,
  primaryActionLabel,
  onPrimaryAction,
  onReset,
}: RecognitionRecoveryScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.screenHeader}>
        <Text style={styles.stepPill}>다시 확인</Text>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>풀이를 만들기 전에 조건을 먼저 맞춰야 해요.</Text>
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
  actions: {
    gap: spacing.sm,
  },
  problemInput: {
    minHeight: 180,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
    color: colors.textPrimary,
    backgroundColor: colors.surfacePrimary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
  problemInputEditing: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
  },
})
