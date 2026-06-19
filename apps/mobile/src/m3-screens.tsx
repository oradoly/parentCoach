import { StyleSheet, TextInput, View } from "react-native"

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
      <Card eyebrow="문제 인식 중" title="사진에서 문제 문장만 읽고 있어요" tone="accent">
        <BodyText>풀이와 정답은 아직 만들지 않고, 부모님이 확인할 문장만 준비합니다.</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label="다시 고르기" onPress={onBack} variant="ghost" />
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
      <Card eyebrow="인식 결과 확인" title="제가 이렇게 읽었어요">
        <TextInput
          accessibilityLabel="인식된 문제"
          multiline
          onChangeText={onChangeProblem}
          style={styles.problemInput}
          textAlignVertical="top"
          value={problemDraft}
        />
        <KeyValueRow label="인식 상태" value={recognition.status} />
        <KeyValueRow
          label="다시 확인이 필요한 부분"
          value={summarizeRecognitionAmbiguities(recognition)}
        />
        <HelperText>
          {isEditing
            ? "문제를 고친 뒤 맞아요를 눌러 주세요."
            : createRecognitionReviewNote(recognition)}
        </HelperText>
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
      <Card eyebrow="다시 확인이 필요해요" title={title} tone="warning">
        <BodyText>{message}</BodyText>
      </Card>
      <View style={styles.actions}>
        <ActionButton label={primaryActionLabel} onPress={onPrimaryAction} />
        <ActionButton label="홈으로 돌아가기" onPress={onReset} variant="secondary" />
      </View>
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
