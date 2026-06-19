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
import { ImageIntakeScreen } from "./m2-screens"
import { CoachingScreen, ErrorScreen, HomeScreen } from "./m1-screens"
import {
  RecognitionProgressScreen,
  RecognitionRecoveryScreen,
  RecognitionReviewScreen,
} from "./m3-screens"
import { mockCoachingResponse } from "./mock-parent-coach"
import { canConfirmRecognition } from "./recognition-flow-rules"
import { useImageIntake } from "./use-image-intake"
import { useProblemRecognition } from "./use-problem-recognition"

type FlowStage =
  | "home"
  | "intake"
  | "recognizing"
  | "recognition"
  | "recovery"
  | "coaching"
  | "error"

export function ParentCoachFlow() {
  const [stage, setStage] = useState<FlowStage>("home")
  const [isEditingRecognition, setIsEditingRecognition] = useState(false)
  const [problemDraft, setProblemDraft] = useState("")
  const [visibility, setVisibility] = useState<CoachingVisibility>(INITIAL_COACHING_VISIBILITY)
  const imageIntake = useImageIntake()
  const problemRecognition = useProblemRecognition()

  const canConfirmProblem = problemDraft.trim().length > 0
  const visibleHints = useMemo(
    () => mockCoachingResponse.hints.slice(0, visibility.revealedHintCount),
    [visibility.revealedHintCount],
  )

  const startRecognition = async () => {
    if (imageIntake.state.kind !== "uploaded") {
      return
    }

    setIsEditingRecognition(false)
    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("recognizing")

    const recognition = await problemRecognition.recognizeImage(imageIntake.state.upload.sessionId)
    if (recognition === null) {
      setStage("recovery")
      return
    }
    if (!canConfirmRecognition(recognition)) {
      setStage("recovery")
      return
    }

    setProblemDraft(recognition.problemText)
    setStage("recognition")
  }

  const confirmRecognizedProblem = async () => {
    if (imageIntake.state.kind !== "uploaded" || problemRecognition.state.kind !== "ready") {
      return
    }
    if (!canConfirmProblem) {
      return
    }

    const confirmation = await problemRecognition.confirmProblem(
      imageIntake.state.upload.sessionId,
      problemRecognition.state.recognition,
      problemDraft.trim(),
      problemDraft.trim() !== problemRecognition.state.recognition.problemText.trim(),
    )
    if (confirmation !== null) {
      setStage("coaching")
    } else {
      setStage("recovery")
    }
  }

  const resetFlow = () => {
    setIsEditingRecognition(false)
    imageIntake.resetImageIntake()
    problemRecognition.resetRecognition()
    setProblemDraft("")
    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("home")
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {stage === "home" ? (
          <HomeScreen
            onStart={() => {
              setStage("intake")
            }}
            onShowError={() => {
              setStage("error")
            }}
          />
        ) : null}
        {stage === "intake" ? (
          <ImageIntakeScreen
            state={imageIntake.state}
            onBack={resetFlow}
            onCapture={() => {
              void imageIntake.chooseImage("camera")
            }}
            onContinue={() => {
              void startRecognition()
            }}
            onPickLibrary={() => {
              void imageIntake.chooseImage("library")
            }}
            onReset={imageIntake.resetImageIntake}
            onUpload={() => {
              void imageIntake.uploadReadyImage()
            }}
          />
        ) : null}
        {stage === "recognizing" ? <RecognitionProgressScreen onBack={resetFlow} /> : null}
        {stage === "recognition" && problemRecognition.state.kind !== "idle" ? (
          problemRecognition.state.kind === "ready" ||
          problemRecognition.state.kind === "confirming" ? (
            <RecognitionReviewScreen
              canConfirm={canConfirmProblem}
              isConfirming={problemRecognition.state.kind === "confirming"}
              isEditing={isEditingRecognition}
              problemDraft={problemDraft}
              recognition={problemRecognition.state.recognition}
              onBack={resetFlow}
              onChangeProblem={setProblemDraft}
              onConfirm={() => {
                void confirmRecognizedProblem()
              }}
              onEdit={() => {
                setIsEditingRecognition(true)
              }}
            />
          ) : null
        ) : null}
        {stage === "recovery" ? (
          problemRecognition.state.kind === "safe_failure" ? (
            <RecognitionRecoveryScreen
              title={problemRecognition.state.title}
              message={problemRecognition.state.message}
              primaryActionLabel={problemRecognition.state.primaryActionLabel}
              onPrimaryAction={resetFlow}
              onReset={resetFlow}
            />
          ) : problemRecognition.state.kind === "error" ? (
            <RecognitionRecoveryScreen
              title={problemRecognition.state.title}
              message={problemRecognition.state.message}
              primaryActionLabel={
                problemRecognition.state.retryable ? "다시 시도하기" : "다시 시작하기"
              }
              onPrimaryAction={() => {
                if (
                  problemRecognition.state.kind === "error" &&
                  problemRecognition.state.retryable
                ) {
                  void startRecognition()
                  return
                }
                resetFlow()
              }}
              onReset={resetFlow}
            />
          ) : null
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
          <ErrorScreen
            onReset={resetFlow}
            onRetry={() => {
              setStage("intake")
            }}
          />
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
