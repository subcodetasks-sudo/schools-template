import { useCallback, useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import { formatEventDate, getEvent, type SchoolEventEntry } from '@/features/events/eventsApi'
import { ApiError, getErrorMessage } from '@/lib/api'

export function EventDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [entry, setEntry] = useState<SchoolEventEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    return getEvent(id)
      .then(setEntry)
      .catch((err) => {
        setEntry(null)
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(getErrorMessage(err))
        }
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (notFound) {
    return <Navigate to="/events" replace />
  }

  if (isLoading || !entry) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className={error ? 'text-sm text-destructive' : 'text-sm text-brand-dark/55'}>
          {error ?? t('state.loading')}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
          >
            {t('state.retry')}
          </button>
        ) : null}
      </div>
    )
  }

  const dateLabel = formatEventDate(entry.event_date, i18n.language)

  return (
    <DetailPageLayout
      bannerTitle={t('detail.event')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.events'), to: '/events' },
        { label: entry.title },
      ]}
      image={entry.image_url ?? ''}
      imageAlt={entry.title}
      title={entry.title}
      imageBadge={
        <span className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm">
          <span className="inline-flex size-7 items-center justify-center rounded bg-white/15">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          {dateLabel}
        </span>
      }
      sidebarMeta={
        <p className="text-sm text-brand-dark/55">
          {t('detail.eventDate', { date: dateLabel })}
        </p>
      }
      sections={[{ title: t('detail.sections.overview'), body: entry.description }]}
    />
  )
}
