import type {
  FeedbackRequest,
  FeedbackResponse,
  ProblemSessionId,
  RequestId,
} from "@parent-coach/contracts"

type FeedbackStoreConfig = Readonly<{
  now: () => Date
}>

type FeedbackRecordInput = Readonly<{
  sessionId: ProblemSessionId
  requestId: RequestId
  feedback: FeedbackRequest
}>

export type StoredFeedback = FeedbackResponse &
  Readonly<{
    coachingVerificationStatus?: FeedbackRequest["coachingVerificationStatus"]
    similarProblemStatus?: FeedbackRequest["similarProblemStatus"]
  }>

export type FeedbackStore = Readonly<{
  record: (input: FeedbackRecordInput) => FeedbackResponse
  list: () => readonly StoredFeedback[]
}>

export const createFeedbackStore = (
  config: FeedbackStoreConfig = { now: () => new Date() },
): FeedbackStore => {
  const records: StoredFeedback[] = []

  return {
    list: () => records,
    record: ({ sessionId, requestId, feedback }) => {
      const response: FeedbackResponse = {
        schemaVersion: "1.0",
        sessionId,
        requestId,
        choice: feedback.choice,
        submittedAt: config.now().toISOString(),
      }
      records.push({
        ...response,
        ...(feedback.coachingVerificationStatus === undefined
          ? {}
          : { coachingVerificationStatus: feedback.coachingVerificationStatus }),
        ...(feedback.similarProblemStatus === undefined
          ? {}
          : { similarProblemStatus: feedback.similarProblemStatus }),
      })
      return response
    },
  }
}
