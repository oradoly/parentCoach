import { StatusBar } from "expo-status-bar"
import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"

import { colors, spacing } from "./design-tokens"
import {
  INITIAL_COACHING_VISIBILITY,
  revealFinalSolution,
  revealNextHint,
  revealSimilarProblemSolution,
  type CoachingVisibility,
} from "./flow-rules"
import { CoachingScreen, ErrorScreen, HomeScreen, RecognitionScreen } from "./m1-screens"
import { mockCoachingResponse, mockRecognitionResponse } from "./mock-parent-coach"

type FlowStage = "home" | "recognition" | "coaching" | "error"

export function ParentCoachFlow() {
  const [stage, setStage] = useState<FlowStage>("home")
  const [isEditingRecognition, setIsEditingRecognition] = useState(false)
  const [problemDraft, setProblemDraft] = useState(mockRecognitionResponse.problemText)
  const [visibility, setVisibility] = useState<CoachingVisibility>(INITIAL_COACHING_VISIBILITY)

  const canConfirmProblem = problemDraft.trim().length > 0
  const visibleHints = useMemo(
    () => mockCoachingResponse.hints.slice(0, visibility.revealedHintCount),
    [visibility.revealedHintCount],
  )

  const startExampleRecognition = () => {
    setIsEditingRecognition(false)
    setProblemDraft(mockRecognitionResponse.problemText)
    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("recognition")
  }

  const resetFlow = () => {
    setIsEditingRecognition(false)
    setProblemDraft(mockRecognitionResponse.problemText)
    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("home")
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {stage === "home" ? (
          <HomeScreen
            onStart={startExampleRecognition}
            onShowError={() => {
              setStage("error")
            }}
          />
        ) : null}
        {stage === "recognition" ? (
          <RecognitionScreen
            canConfirm={canConfirmProblem}
            isEditing={isEditingRecognition}
            problemDraft={problemDraft}
            onBack={resetFlow}
            onChangeProblem={setProblemDraft}
            onConfirm={() => {
              if (canConfirmProblem) {
                setStage("coaching")
              }
            }}
            onEdit={() => {
              setIsEditingRecognition(true)
            }}
          />
        ) : null}
        {stage === "coaching" ? (
          <CoachingScreen
            visibility={visibility}
            visibleHints={visibleHints}
            onRevealFinal={() => {
              setVisibility(revealFinalSolution)
            }}
            onRevealHint={() => {
              setVisibility((current) => revealNextHint(current, mockCoachingResponse.hints.length))
            }}
            onRevealSimilarAnswer={() => {
              setVisibility(revealSimilarProblemSolution)
            }}
            onReset={resetFlow}
          />
        ) : null}
        {stage === "error" ? (
          <ErrorScreen onReset={resetFlow} onRetry={startExampleRecognition} />
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePrimary,
  },
  content: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
})
