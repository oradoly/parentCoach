import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { colors, radius, spacing, typography } from "./design-tokens"
import { ActionButton, BodyText, Card, HelperText, KeyValueRow } from "./m1-components"
import { mockErrorState } from "./mock-parent-coach"

type HomeScreenProps = Readonly<{
  onStart: () => void
}>

export function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <View style={styles.stack}>
      <View style={styles.homeHero}>
        <View style={styles.homePill}>
          <Text style={styles.homePillText}>초등 5-6 수학</Text>
        </View>
        <Text style={styles.homeTitle}>
          아이에게 어떻게{"\n"}물어볼지 먼저 준비해요
        </Text>
        <Text style={styles.homeSubtitle}>
          한 문제만 찍으면 질문과 힌트를{"\n"}정답보다 먼저 정리해 드려요.
        </Text>
      </View>
      <Pressable
        accessibilityHint="카메라 또는 사진 선택 화면으로 이동합니다."
        accessibilityLabel="문제 하나 촬영하기"
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [
          styles.captureArea,
          pressed ? styles.captureAreaPressed : undefined,
        ]}
      >
        <CameraGlyph />
        <Text style={styles.captureTitle}>
          문제 하나를 화면 안에{"\n"}맞춰 주세요.
        </Text>
        <Text style={styles.captureHint}>그림이나 표도 함께 넣어 주세요.</Text>
      </Pressable>
      <View style={styles.actions}>
        <ActionButton label="카메라 열기" onPress={onStart} />
        <ActionButton label="사진 선택" onPress={onStart} variant="secondary" />
      </View>
    </View>
  )
}

function CameraGlyph() {
  return (
    <View style={styles.cameraIconShell}>
      <View style={styles.cameraTop} />
      <View style={styles.cameraBody}>
        <View style={styles.cameraLens} />
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
  homeHero: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  homePill: {
    alignSelf: "flex-start",
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  homePillText: {
    color: colors.textSecondary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  homeTitle: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: "800",
    lineHeight: typography.titleLineHeight,
  },
  homeSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
  },
  captureArea: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderDefault,
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
  captureAreaPressed: {
    opacity: 0.82,
  },
  cameraIconShell: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  cameraTop: {
    position: "absolute",
    top: 17,
    width: 20,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.textPrimary,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  cameraBody: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderRadius: radius.md,
  },
  cameraLens: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderRadius: radius.full,
  },
  captureTitle: {
    color: colors.textPrimary,
    fontSize: typography.headlineSize,
    fontWeight: "800",
    lineHeight: typography.headlineLineHeight,
    textAlign: "center",
  },
  captureHint: {
    color: colors.textSecondary,
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
    textAlign: "center",
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
