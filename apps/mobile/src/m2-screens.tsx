import { Image, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "./design-tokens"
import type { ImageIntakeState } from "./use-image-intake"
import { ActionButton, BodyText, Card, HelperText, KeyValueRow } from "./m1-components"

type ImageIntakeScreenProps = Readonly<{
  state: ImageIntakeState
  onBack: () => void
  onCapture: () => void
  onPickLibrary: () => void
  onReset: () => void
  onUpload: () => void
  onContinue: () => void
}>

export function ImageIntakeScreen({
  state,
  onBack,
  onCapture,
  onContinue,
  onPickLibrary,
  onReset,
  onUpload,
}: ImageIntakeScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Text style={styles.title}>문제 하나</Text>
        <Text style={styles.subtitle}>이름·학교·얼굴은 빼고 찍어 주세요.</Text>
      </View>

      <StateCard state={state} onContinue={onContinue} onReset={onReset} onUpload={onUpload} />

      <View style={styles.actions}>
        <ActionButton
          label="카메라"
          onPress={onCapture}
          disabled={state.kind === "working" || state.kind === "uploading"}
        />
        <ActionButton
          label="사진"
          onPress={onPickLibrary}
          variant="secondary"
          disabled={state.kind === "working" || state.kind === "uploading"}
        />
        <ActionButton label="뒤로" onPress={onBack} variant="ghost" />
      </View>
    </View>
  )
}

type StateCardProps = Readonly<{
  state: ImageIntakeState
  onContinue: () => void
  onReset: () => void
  onUpload: () => void
}>

function StateCard({ state, onContinue, onReset, onUpload }: StateCardProps) {
  switch (state.kind) {
    case "idle":
      return (
        <Card title="촬영 영역">
          <View style={styles.emptyFrame}>
            <Text style={styles.emptyFrameText}>문제를 여기에 담기</Text>
          </View>
        </Card>
      )
    case "working":
      return (
        <Card title={state.message} tone="accent">
          <BodyText>준비 중</BodyText>
        </Card>
      )
    case "cancelled":
      return (
        <Card title={state.message}>
          <HelperText>다시 고를 수 있어요.</HelperText>
        </Card>
      )
    case "error":
      return (
        <Card title={state.title} tone="warning">
          <BodyText>{state.message}</BodyText>
          {state.retryable ? <HelperText>다시 선택해 주세요.</HelperText> : null}
        </Card>
      )
    case "ready":
      return (
        <Card title="이 사진으로 읽기" tone="accent">
          <ImagePreview uri={state.image.uri} />
          <KeyValueRow
            label="사진"
            value={`${state.image.width.toString()}×${state.image.height.toString()}`}
          />
          <View style={styles.inlineActions}>
            <ActionButton label="업로드" onPress={onUpload} />
            <ActionButton label="다시" onPress={onReset} variant="secondary" />
          </View>
        </Card>
      )
    case "uploading":
      return (
        <Card title="업로드 중" tone="accent">
          <ImagePreview uri={state.image.uri} />
        </Card>
      )
    case "uploaded":
      return (
        <Card title="업로드 완료" tone="success">
          <ImagePreview uri={state.image.uri} />
          <ActionButton label="문제 확인" onPress={onContinue} />
        </Card>
      )
  }
}

function ImagePreview({ uri }: Readonly<{ uri: string }>) {
  return (
    <Image accessibilityLabel="선택한 문제 사진 미리보기" source={{ uri }} style={styles.preview} />
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
  inlineActions: {
    gap: spacing.sm,
  },
  preview: {
    width: "100%",
    minHeight: 180,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    resizeMode: "cover",
  },
  emptyFrame: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    backgroundColor: colors.surfacePrimary,
  },
  emptyFrameText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
})
