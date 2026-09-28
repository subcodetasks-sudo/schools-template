import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Inbox } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatGroupDateTime, type PaginatedResult } from '@/features/groups/groupsApi'
import { GroupsEmptyState } from '@/features/groups/components/GroupsShared'
import {
  COMPLAINT_TICKETS_PAGE_SIZE,
  complaintTicketPath,
  getMyComplaintTickets,
  type ComplaintTicket,
} from '@/features/complaint-tickets/complaintTicketsApi'
import {
  ComplaintTicketsErrorState,
  ComplaintTypeBadge,
  TicketNumberBadge,
} from '@/features/complaint-tickets/components/ComplaintTicketsShared'

/**
 * The result is tagged with the request key it belongs to (page + refresh/retry tokens + language).
 * A result whose key differs from the current one is treated as "still loading", so changing page
 * resets the view instantly and a late response from a previous request is never shown.
 */
type Keyed<T> = { key: string; data: T | null; error: unknown }

function parsePageParam(value: string | null) {
  if (!value || !/^\d+$/.test(value.trim())) return 1
  const page = Number(value.trim())
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function formatCount(value: number, language: string) {
  return new Intl.NumberFormat(language.startsWith('ar') ? 'ar-EG' : 'en-US').format(value)
}

/* ------------------------------------------------------------------ */
/* Tickets table                                                       */
/* ------------------------------------------------------------------ */

const cellClass = 'border-t border-brand-dark/8 px-4 py-3 align-middle'

function TicketsTable({ tickets, isLoading }: { tickets: ComplaintTicket[]; isLoading: boolean }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const backTo = location.pathname + location.search

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-brand-dark">
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.complaintTickets.ticket.number')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.complaintTickets.ticket.type')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.complaintTickets.ticket.title')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.complaintTickets.ticket.createdAt')}
              </th>
              <th scope="col" className="px-4 py-3 text-center font-bold">
                {t('profile.complaintTickets.list.columns.details')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                    <td className={cellClass}>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="mt-2 h-3 w-36" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className={cn(cellClass, 'text-center')}>
                      <Skeleton className="mx-auto h-8 w-24 rounded-xl" />
                    </td>
                  </tr>
                ))
              : tickets.map((ticket, index) => {
                  const title = ticket.title || t('profile.complaintTickets.ticket.untitled')
                  return (
                    <tr key={ticket.id} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                      <td className={cellClass}>
                        {ticket.number ? (
                          <TicketNumberBadge number={ticket.number} />
                        ) : (
                          <span className="text-brand-dark/45">—</span>
                        )}
                      </td>
                      <td className={cn(cellClass, 'max-w-56')}>
                        <ComplaintTypeBadge type={ticket.complaintType} />
                      </td>
                      <td className={cn(cellClass, 'max-w-80')}>
                        <p className="font-semibold wrap-break-word text-brand-primary" dir="auto">
                          {title}
                        </p>
                        {ticket.body ? (
                          <p className="mt-1 line-clamp-1 text-xs text-brand-dark/55" dir="auto">
                            {ticket.body}
                          </p>
                        ) : null}
                      </td>
                      <td className={cn(cellClass, 'whitespace-nowrap text-brand-dark')}>
                        {ticket.createdAt ? (
                          <time dateTime={ticket.createdAt.replace(' ', 'T')}>
                            {formatGroupDateTime(ticket.createdAt, i18n.language)}
                          </time>
                        ) : (
                          <span className="text-brand-dark/45">—</span>
                        )}
                      </td>
                      <td className={cn(cellClass, 'text-center')}>
                        <Link
                          to={complaintTicketPath(ticket.id)}
                          state={{ backTo }}
                          aria-label={t('profile.complaintTickets.list.viewDetailsFor', { title })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-dark/15 bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-brand-dark transition-colors hover:border-brand-primary/40 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          {t('profile.complaintTickets.list.viewDetails')}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function MyComplaintTicketsList({ refreshKey }: { refreshKey: number }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePageParam(searchParams.get('page'))

  const headingId = useId()
  const sectionRef = useRef<HTMLElement | null>(null)

  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Keyed<PaginatedResult<ComplaintTicket>> | null>(null)

  // Type names are localized by the server, so a language switch refetches too.
  const requestKey = `${page}#${refreshKey}#${reload}#${language}`

  useEffect(() => {
    let ignore = false
    const key = `${page}#${refreshKey}#${reload}#${language}`
    getMyComplaintTickets({ page, per_page: COMPLAINT_TICKETS_PAGE_SIZE })
      .then((data) => {
        if (!ignore) setResult({ key, data, error: null })
      })
      .catch((error: unknown) => {
        if (!ignore) setResult({ key, data: null, error })
      })
    return () => {
      ignore = true
    }
  }, [page, refreshKey, reload, language])

  const current = result?.key === requestKey ? result : null
  const data = current?.data ?? null

  // Out-of-range page (e.g. tickets were removed): jump to the last available page.
  const outOfRangeLastPage =
    data && data.items.length === 0 && data.meta.last_page < page ? data.meta.last_page : null

  useEffect(() => {
    if (outOfRangeLastPage === null) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (outOfRangeLastPage <= 1) next.delete('page')
        else next.set('page', String(outOfRangeLastPage))
        return next
      },
      { replace: true },
    )
  }, [outOfRangeLastPage, setSearchParams])

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (nextPage <= 1) next.delete('page')
        else next.set('page', String(nextPage))
        return next
      })
      sectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [setSearchParams],
  )

  const retry = useCallback(() => setReload((value) => value + 1), [])

  const isLoading = current === null || outOfRangeLastPage !== null
  const hasError = Boolean(current?.error)
  const tickets = data?.items ?? []

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      aria-busy={isLoading}
      className="scroll-mt-24"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-bold text-brand-dark">
            {t('profile.complaintTickets.list.title')}
          </h2>
          <p className="mt-1 text-sm text-brand-dark/55">
            {t('profile.complaintTickets.list.subtitle')}
          </p>
        </div>
        {data && !isLoading ? (
          <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold whitespace-nowrap text-brand-primary">
            {t('profile.complaintTickets.list.total', {
              count: formatCount(data.meta.total, language),
            })}
          </span>
        ) : null}
      </div>

      {hasError ? (
        <ComplaintTicketsErrorState
          kind="generic"
          message={getErrorMessage(current?.error, t('profile.complaintTickets.list.loadError'))}
          onRetry={retry}
        />
      ) : !isLoading && tickets.length === 0 ? (
        <GroupsEmptyState
          compact
          icon={Inbox}
          title={t('profile.complaintTickets.list.emptyTitle')}
          description={t('profile.complaintTickets.list.emptyDescription')}
        />
      ) : (
        <>
          <TicketsTable tickets={tickets} isLoading={isLoading} />
          {data && !isLoading ? (
            <Pagination
              className="mt-6"
              page={data.meta.current_page}
              pageCount={data.meta.last_page}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
