// allow: SIZE_OK — top-level Expo flow coordinator keeps the MVP state transitions visible.
import { StatusBar } from "expo-status-bar"
import { useMemo, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"

import { colors, spacing } from "./design-tokens"
import {
  getUploadedProblemSessionId,
  INITIAL_COACHING_VISIBILITY,
  revealFinalSolution,
  revealNextHint,
  revealSimilarProblemSolution,
  type CoachingVisibility,
} from "./flow-rules"
import { ImageIntakeScreen } from "./m2-screens"
import { ErrorScreen, HomeScreen } from "./m1-screens"
import {
  RecognitionProgressScreen,
  RecognitionRecoveryScreen,
  RecognitionReviewScreen,
} from "./m3-screens"
import { CoachingProgressScreen, CoachingRecoveryScreen, CoachingScreen } from "./m4-screens"
import { canConfirmRecognition } from "./recognition-flow-rules"
import { useImageIntake } from "./use-image-intake"
import { useProblemFeedback } from "./use-problem-feedback"
import { useProblemCoaching } from "./use-problem-coaching"
import { useProblemRecognition } from "./use-problem-recognition"

type FlowStage =
  | "home"
  | "intake"
  | "recognizing"
  | "recognition"
  | "recovery"
  | "coaching_progress"
  | "coaching"
  | "coaching_recovery"
  | "error"

export function ParentCoachFlow() {
  const [stage, setStage] = useState<FlowStage>("home")
  const [isEditingRecognition, setIsEditingRecognition] = useState(false)
  const [problemDraft, setProblemDraft] = useState("")
  const [visibility, setVisibility] = useState<CoachingVisibility>(INITIAL_COACHING_VISIBILITY)
  const imageIntake = useImageIntake()
  const problemFeedback = useProblemFeedback()
  const problemCoaching = useProblemCoaching()
  const problemRecognition = useProblemRecognition()

  const canConfirmProblem = problemDraft.trim().length > 0
  const readyCoaching =
    problemCoaching.state.kind === "ready" ? problemCoaching.state.coaching : null
  const visibleHints = useMemo(
    () =>
      readyCoaching === null ? [] : readyCoaching.hints.slice(0, visibility.revealedHintCount),
    [readyCoaching, visibility.revealedHintCount],
  )

  const startRecognition = async () => {
    if (imageIntake.state.kind !== "uploaded") {
      return
    }

    setIsEditingRecognition(false)
    setVisibility(INITIAL_COACHING_VISIBILITY)
    problemFeedback.resetFeedback()
    problemCoaching.resetCoaching()
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
    if (confirmation === null) {
      setStage("recovery")
      return
    }

    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("coaching_progress")
    const coaching = await problemCoaching.coachProblem(imageIntake.state.upload.sessionId)
    if (coaching !== null) {
      setStage("coaching")
    } else {
      setStage("coaching_recovery")
    }
  }

  const resetFlow = () => {
    const activeSessionId = getUploadedProblemSessionId(imageIntake.state)
    if (activeSessionId !== null) {
      void imageIntake.deleteUploadedSession(activeSessionId)
    }

    setIsEditingRecognition(false)
    imageIntake.resetImageIntake()
    problemFeedback.resetFeedback()
    problemCoaching.resetCoaching()
    problemRecognition.resetRecognition()
    setProblemDraft("")
    setVisibility(INITIAL_COACHING_VISIBILITY)
    setStage("home")
  }

  const retryCoaching = async () => {
    if (imageIntake.state.kind !== "uploaded") {
      resetFlow()
      return
    }

    setStage("coaching_progress")
    const coaching = await problemCoaching.coachProblem(imageIntake.state.upload.sessionId)
    setStage(coaching === null ? "coaching_recovery" : "coaching")
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
        {stage === "coaching_progress" ? <CoachingProgressScreen onBack={resetFlow} /> : null}
        {stage === "coaching_recovery" && problemCoaching.state.kind === "error" ? (
          <CoachingRecoveryScreen
            title={problemCoaching.state.title}
            message={problemCoaching.state.message}
            primaryActionLabel={problemCoaching.state.retryable ? "다시 시도하기" : "다시 시작하기"}
            onPrimaryAction={() => {
              if (
                imageIntake.state.kind === "uploaded" &&
                problemCoaching.state.kind === "error" &&
                problemCoaching.state.retryable
              ) {
                void retryCoaching()
                return
              }
              resetFlow()
            }}
            onReset={resetFlow}
          />
        ) : null}
        {stage === "coaching" && readyCoaching !== null ? (
          <CoachingScreen
            coaching={readyCoaching}
            visibility={visibility}
            visibleHints={visibleHints}
            onRevealFinal={() => {
              setVisibility(revealFinalSolution)
            }}
            onRevealHint={() => {
              setVisibility((current) => revealNextHint(current, readyCoaching.hints.length))
            }}
            onRevealSimilarAnswer={() => {
              setVisibility(revealSimilarProblemSolution)
            }}
            feedbackState={problemFeedback.state}
            onSubmitFeedback={(choice) => {
              if (imageIntake.state.kind !== "uploaded") {
                return
              }
              void problemFeedback.submitFeedback(
                imageIntake.state.upload.sessionId,
                choice,
                readyCoaching,
              )
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
