import { randomUUID } from "node:crypto"

import {
  PROBLEM_SESSION_TTL_MS,
  type AcceptedImageMimeType,
  type ConfirmedProblemResponse,
  type ConfirmProblemRequest,
  type ImageUploadResponse,
  type ProblemImageId,
  type ProblemImageSource,
  type ProblemSessionDeletedResponse,
  type ProblemSessionId,
  type TemporaryProblemSessionResponse,
} from "@parent-coach/contracts"

type ProblemSessionStoreConfig = Readonly<{
  now: () => Date
  sessionIdFactory: () => ProblemSessionId
  imageIdFactory: () => ProblemImageId
}>

type StoredProblemSession = Readonly<{
  sessionId: ProblemSessionId
  expiresAt: Date
  imageStatus: "empty" | "uploaded"
  image?: UploadedProblemImage
  confirmedProblem?: ConfirmedProblemResponse
}>

type UploadedProblemImage = Readonly<{
  imageId: ProblemImageId
  receivedAt: Date
  mimeType: AcceptedImageMimeType
  byteSize: number
  width: number
  height: number
  source: ProblemImageSource
  dataUrl: string
}>

export type UploadedProblemImageForRecognition = Readonly<{
  mimeType: AcceptedImageMimeType
  byteSize: number
  width: number
  height: number
  dataUrl: string
}>

export type ConfirmedProblemForCoaching = Readonly<{
  problemText: string
  normalizedText?: string
  latex?: string
}>

type SessionLookup =
  | { readonly kind: "found"; readonly session: StoredProblemSession }
  | { readonly kind: "not_found" }
  | { readonly kind: "expired"; readonly sessionId: ProblemSessionId }

export type ProblemImageUploadInput = Readonly<{
  sessionId: ProblemSessionId
  mimeType: AcceptedImageMimeType
  byteSize: number
  width: number
  height: number
  source: ProblemImageSource
  dataUrl: string
}>

export type ProblemSessionStore = Readonly<{
  create: () => TemporaryProblemSessionResponse
  getActive: (sessionId: ProblemSessionId) => SessionLookup
  getConfirmedProblem: (sessionId: ProblemSessionId) => ConfirmedProblemForCoaching | null
  getUploadedImage: (sessionId: ProblemSessionId) => UploadedProblemImageForRecognition | null
  recordUpload: (input: ProblemImageUploadInput) => ImageUploadResponse
  confirmProblem: (
    sessionId: ProblemSessionId,
    input: ConfirmProblemRequest,
  ) => ConfirmedProblemResponse
  delete: (sessionId: ProblemSessionId) => ProblemSessionDeletedResponse
}>

const createProblemSessionId = (): ProblemSessionId => `ps_${randomUUID()}`
const createProblemImageId = (): ProblemImageId => `img_${randomUUID()}`

const toIsoString = (date: Date): string => date.toISOString()

export const createProblemSessionStore = (
  config: ProblemSessionStoreConfig = {
    now: () => new Date(),
    sessionIdFactory: createProblemSessionId,
    imageIdFactory: createProblemImageId,
  },
): ProblemSessionStore => {
  const sessions = new Map<ProblemSessionId, StoredProblemSession>()

  const isExpired = (session: StoredProblemSession): boolean =>
    session.expiresAt.getTime() <= config.now().getTime()

  const getActive = (sessionId: ProblemSessionId): SessionLookup => {
    const session = sessions.get(sessionId)
    if (session === undefined) {
      return { kind: "not_found" }
    }
    if (isExpired(session)) {
      sessions.delete(sessionId)
      return { kind: "expired", sessionId }
    }
    return { kind: "found", session }
  }

  return {
    create: () => {
      const createdAt = config.now()
      const session: StoredProblemSession = {
        sessionId: config.sessionIdFactory(),
        expiresAt: new Date(createdAt.getTime() + PROBLEM_SESSION_TTL_MS),
        imageStatus: "empty",
      }
      sessions.set(session.sessionId, session)

      return {
        schemaVersion: "1.0",
        sessionId: session.sessionId,
        expiresAt: toIsoString(session.expiresAt),
        imageStatus: "empty",
      }
    },
    confirmProblem: (sessionId, input) => {
      const confirmedProblem: ConfirmedProblemResponse = {
        schemaVersion: "1.0",
        sessionId,
        problemText: input.problemText,
        ...(input.normalizedText === undefined ? {} : { normalizedText: input.normalizedText }),
        ...(input.latex === undefined ? {} : { latex: input.latex }),
        sourceRecognitionStatus: input.recognitionStatus,
        userEdited: input.userEdited,
        confirmedAt: toIsoString(config.now()),
      }
      const lookup = getActive(sessionId)
      if (lookup.kind === "found") {
        sessions.set(sessionId, {
          ...lookup.session,
          confirmedProblem,
        })
      }

      return confirmedProblem
    },
    delete: (sessionId) => {
      sessions.delete(sessionId)
      return {
        schemaVersion: "1.0",
        sessionId,
        imageStatus: "deleted",
        deletedAt: toIsoString(config.now()),
      }
    },
    getActive,
    getConfirmedProblem: (sessionId) => {
      const lookup = getActive(sessionId)
      if (lookup.kind !== "found" || lookup.session.confirmedProblem === undefined) {
        return null
      }

      return {
        problemText: lookup.session.confirmedProblem.problemText,
        ...(lookup.session.confirmedProblem.normalizedText === undefined
          ? {}
          : { normalizedText: lookup.session.confirmedProblem.normalizedText }),
        ...(lookup.session.confirmedProblem.latex === undefined
          ? {}
          : { latex: lookup.session.confirmedProblem.latex }),
      }
    },
    getUploadedImage: (sessionId) => {
      const lookup = getActive(sessionId)
      if (lookup.kind !== "found" || lookup.session.image === undefined) {
        return null
      }
      return {
        mimeType: lookup.session.image.mimeType,
        byteSize: lookup.session.image.byteSize,
        width: lookup.session.image.width,
        height: lookup.session.image.height,
        dataUrl: lookup.session.image.dataUrl,
      }
    },
    recordUpload: (input) => {
      const uploadedImage: UploadedProblemImage = {
        imageId: config.imageIdFactory(),
        receivedAt: config.now(),
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        width: input.width,
        height: input.height,
        source: input.source,
        dataUrl: input.dataUrl,
      }
      const session = sessions.get(input.sessionId)
      const updatedSession: StoredProblemSession = {
        sessionId: input.sessionId,
        expiresAt: session?.expiresAt ?? new Date(config.now().getTime() + PROBLEM_SESSION_TTL_MS),
        imageStatus: "uploaded",
        image: uploadedImage,
      }
      sessions.set(input.sessionId, updatedSession)

      return {
        schemaVersion: "1.0",
        sessionId: input.sessionId,
        imageStatus: "uploaded",
        image: {
          imageId: uploadedImage.imageId,
          receivedAt: toIsoString(uploadedImage.receivedAt),
          mimeType: uploadedImage.mimeType,
          byteSize: uploadedImage.byteSize,
          width: uploadedImage.width,
          height: uploadedImage.height,
          retained: false,
        },
      }
    },
  }
}
