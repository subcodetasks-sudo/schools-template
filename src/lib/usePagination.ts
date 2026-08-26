import { useEffect, useMemo, useState } from 'react'

export function usePagination<T>(items: readonly T[], pageSize = 9) {
  const [page, setPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items, pageSize])

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const current = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  return { page, setPage, pageCount, current }
}
