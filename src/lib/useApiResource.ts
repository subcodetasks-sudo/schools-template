import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getErrorMessage, getHiddenInfo, type HiddenInfo } from '@/lib/api'

/**
 * Loads a resource on mount and whenever `deps` change.
 * Only the latest request may update state, so a slow earlier response can't
 * overwrite a newer one, and nothing is set after unmount.
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  /** Message shown when the failed request carries none (pass a translated string). */
  fallbackError?: string,
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** HTTP status of the failed request (e.g. 404), when the API responded. */
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  /**
   * Set when the school closed this resource (403 with `data.hidden`). It is not an
   * error: `error` stays null, and it is kept while reloading so the screen doesn't flash.
   */
  const [hidden, setHidden] = useState<HiddenInfo | null>(null)
  const latestRequest = useRef(0)

  const load = useCallback(() => {
    const requestId = ++latestRequest.current
    const isCurrent = () => requestId === latestRequest.current

    setIsLoading(true)
    setError(null)
    setErrorStatus(null)

    return fetcher()
      .then((result) => {
        if (!isCurrent()) return
        setData(result)
        setHidden(null)
      })
      .catch((err) => {
        if (!isCurrent()) return
        setData(null)
        const hiddenInfo = getHiddenInfo(err)
        if (hiddenInfo) {
          setHidden(hiddenInfo)
          return
        }
        setHidden(null)
        setError(getErrorMessage(err, fallbackError))
        setErrorStatus(err instanceof ApiError ? err.status : null)
      })
      .finally(() => {
        if (isCurrent()) setIsLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void load()
    // Invalidate in-flight requests on unmount or before the next load.
    return () => {
      latestRequest.current++
    }
  }, [load])

  return { data, isLoading, error, errorStatus, hidden, reload: load }
}
