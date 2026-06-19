import { Image, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "./design-tokens"
import type { ImageIntakeState } from "./use-image-intake"
import { ActionButton, BodyText, Card, HelperText, KeyValueRow, Pill } from "./m1-components"

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
        <Pill>사진은 임시 세션으로만 처리해요</Pill>
        <Text style={styles.title}>문제 하나만 선명하게 담아 주세요</Text>
        <Text style={styles.subtitle}>
          이름, 학교, 얼굴은 가능하면 빼고, 그림이나 표가 문제 조건이면 함께 넣어 주세요.
        </Text>
      </View>

      <Card eyebrow="촬영 가이드" title="업로드 전에 이렇게 확인해 주세요">
        <KeyValueRow label="문제 수" value="한 번에 한 문제만 보이게 자르기" />
        <KeyValueRow label="포함할 것" value="보기, 단위, 그림, 표가 조건이면 함께 넣기" />
        <KeyValueRow label="개인정보" value="이름, 학교명, 얼굴은 가능한 한 제외하기" />
      </Card>

      <StateCard state={state} onContinue={onContinue} onReset={onReset} onUpload={onUpload} />

      <View style={styles.actions}>
        <ActionButton
          label="카메라로 찍기"
          onPress={onCapture}
          disabled={state.kind === "working" || state.kind === "uploading"}
        />
        <ActionButton
          label="사진에서 가져오기"
          onPress={onPickLibrary}
          variant="secondary"
          disabled={state.kind === "working" || state.kind === "uploading"}
        />
        <ActionButton label="홈으로 돌아가기" onPress={onBack} variant="ghost" />
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
        <Card eyebrow="준비" title="사진을 선택하면 업로드 전에 한 번 더 보여 드릴게요">
          <BodyText>촬영하거나 보관함에서 문제 사진을 골라 주세요.</BodyText>
        </Card>
      )
    case "working":
      return (
        <Card eyebrow="준비 중" title={state.message} tone="accent">
          <BodyText>문제 판독성을 유지하도록 사진을 준비하고 있어요.</BodyText>
        </Card>
      )
    case "cancelled":
      return (
        <Card eyebrow="취소됨" title={state.message}>
          <HelperText>다른 사진을 고르거나 카메라로 다시 찍을 수 있어요.</HelperText>
        </Card>
      )
    case "error":
      return (
        <Card eyebrow="확인이 필요해요" title={state.title} tone="warning">
          <BodyText>{state.message}</BodyText>
          {state.retryable ? (
            <HelperText>다시 촬영하거나 다른 사진을 선택해 주세요.</HelperText>
          ) : null}
        </Card>
      )
    case "ready":
      return (
        <Card eyebrow="업로드 전 확인" title="이 사진으로 문제를 읽을게요" tone="accent">
          <ImagePreview uri={state.image.uri} />
          <KeyValueRow
            label="이미지 정보"
            value={`${state.image.width.toString()}×${state.image.height.toString()} · ${state.image.mimeType}`}
          />
          <HelperText>
            업로드하면 서버는 원본 파일을 영구 저장하지 않고 metadata만 남깁니다.
          </HelperText>
          <View style={styles.inlineActions}>
            <ActionButton label="임시 업로드 시작" onPress={onUpload} />
            <ActionButton label="다른 사진 고르기" onPress={onReset} variant="secondary" />
          </View>
        </Card>
      )
    case "uploading":
      return (
        <Card eyebrow="업로드 중" title="임시 세션으로 보내고 있어요" tone="accent">
          <ImagePreview uri={state.image.uri} />
          <BodyText>업로드가 끝나면 인식 결과 확인 화면으로 이어집니다.</BodyText>
        </Card>
      )
    case "uploaded":
      return (
        <Card eyebrow="업로드 완료" title="사진이 임시 세션에 전달됐어요" tone="success">
          <ImagePreview uri={state.image.uri} />
          <KeyValueRow label="세션" value={state.upload.sessionId} />
          <KeyValueRow label="서버 보관" value="원본 bytes는 영구 저장하지 않음" />
          <ActionButton label="인식 결과 확인으로 이동" onPress={onContinue} />
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
})
