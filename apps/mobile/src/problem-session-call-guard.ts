export type SharedInFlightCall<T, TKey extends string> = Readonly<{
  reset: () => void
  run: (key: TKey, task: () => Promise<T>) => Promise<T>
}>

export const createSharedInFlightCall = <T, TKey extends string = string>(): SharedInFlightCall<
  T,
  TKey
> => {
  let activeCall: Readonly<{ key: TKey; promise: Promise<T> }> | null = null

  return {
    reset: () => {
      activeCall = null
    },
    run: (key, task) => {
      if (activeCall !== null && activeCall.key === key) {
        return activeCall.promise
      }

      const promise = Promise.resolve().then(task)
      activeCall = { key, promise }

      return promise.finally(() => {
        if (activeCall !== null && activeCall.promise === promise) {
          activeCall = null
        }
      })
    },
  }
}
