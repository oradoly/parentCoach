import type { PropsWithChildren } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, typography } from "./design-tokens"

type CardTone = "default" | "accent" | "warning" | "success"
type ButtonVariant = "primary" | "secondary" | "ghost"

type CardProps = PropsWithChildren<
  Readonly<{
    eyebrow?: string
    title: string
    tone?: CardTone
  }>
>

type ActionButtonProps = Readonly<{
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
}>

type KeyValueRowProps = Readonly<{
  label: string
  value: string
}>

export function Card({ eyebrow, title, tone = "default", children }: CardProps) {
  return (
    <View style={[styles.card, cardToneStyles[tone]]}>
      {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  )
}

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariantStyles[variant],
        disabled ? styles.buttonDisabled : undefined,
        pressed && !disabled ? styles.buttonPressed : undefined,
      ]}
    >
      <Text style={[styles.buttonText, buttonTextVariantStyles[variant]]}>{label}</Text>
    </Pressable>
  )
}

export function BodyText({ children }: PropsWithChildren) {
  return <Text style={styles.bodyText}>{children}</Text>
}

export function HelperText({ children }: PropsWithChildren) {
  return <Text style={styles.helperText}>{children}</Text>
}

export function KeyValueRow({ label, value }: KeyValueRowProps) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={styles.keyValueText}>{value}</Text>
    </View>
  )
}

export function Pill({ children }: PropsWithChildren) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  )
}

const cardToneStyles = StyleSheet.create({
  default: {
    borderColor: colors.borderDefault,
  },
  accent: {
    borderColor: colors.borderStrong,
  },
  warning: {
    borderColor: colors.borderStrong,
  },
  success: {
    borderColor: colors.borderStrong,
  },
})

const buttonVariantStyles = StyleSheet.create({
  primary: {
    borderColor: colors.surfaceInverse,
    backgroundColor: colors.surfaceInverse,
  },
  secondary: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
  },
  ghost: {
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceSecondary,
  },
})

const buttonTextVariantStyles = StyleSheet.create({
  primary: {
    color: colors.surfaceSecondary,
  },
  secondary: {
    color: colors.textPrimary,
  },
  ghost: {
    color: colors.textPrimary,
  },
})

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  cardBody: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.headlineSize,
    fontWeight: "700",
    lineHeight: typography.headlineLineHeight,
  },
  bodyText: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.smallSize,
    lineHeight: typography.smallLineHeight,
  },
  keyValueRow: {
    gap: spacing.xs,
  },
  keyValueLabel: {
    color: colors.textSecondary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  keyValueText: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: typography.captionSize,
    fontWeight: "700",
    lineHeight: typography.captionLineHeight,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  buttonDisabled: {
    opacity: 0.48,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontSize: typography.bodySize,
    fontWeight: "700",
    lineHeight: typography.bodyLineHeight,
  },
})
