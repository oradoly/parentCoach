import { StatusBar } from "expo-status-bar"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "../src/design-tokens"

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.caption}>M0 development build</Text>
        <Text style={styles.title}>Parent Coach 개발 빌드</Text>
        <Text style={styles.body}>
          저장소 기반과 API health check를 확인하기 위한 최소 화면입니다.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfacePrimary,
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceSecondary,
  },
  caption: {
    color: colors.accentPrimary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.titleSize,
    fontWeight: "700",
    lineHeight: typography.titleLineHeight,
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
})
