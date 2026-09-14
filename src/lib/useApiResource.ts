import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/lib/api'

export function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)

    return fetcher()
      .then((result) => setData(result))
      .catch((err) => {
        setData(null)
        setError(getErrorMessage(err))
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, error, reload: load }
}
