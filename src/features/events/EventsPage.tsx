import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import { EventCard, type SchoolEvent } from '@/features/home/components/EventCard'
import { formatEventDate, getEvents } from '@/features/events/eventsApi'
import { useApiResource } from '@/lib/useApiResource'
import { usePagination } from '@/lib/usePagination'

export function EventsPage() {
  const { t, i18n } = useTranslation()
  const { data, isLoading, error, reload } = useApiResource(() => getEvents(), [])

  const events = useMemo<SchoolEvent[]>(
    () =>
      (data ?? []).map((item) => ({
        id: item.slug,
        image: item.image_url ?? '',
        dateLabel: formatEventDate(item.event_date, i18n.language),
        title: item.title,
        body: item.description,
        href: `/events/${item.slug}`,
      })),
    [data, i18n.language],
  )

  const { page, setPage, pageCount, current } = usePagination(events, 9)

  return (
    <section className="pb-16">
      <PageBanner
        title={t('events.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.events') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-brand-dark/55">{t('state.loading')}</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
            >
              {t('state.retry')}
            </button>
          </div>
        ) : events.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-dark/55">{t('state.empty')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {current.map((event) => (
                <EventCard key={event.id} event={event} dense />
              ))}
            </div>

            <Pagination
              className="mt-12"
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </section>
  )
}
