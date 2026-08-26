import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import { EventCard, type SchoolEvent } from '@/features/home/components/EventCard'
import { eventCatalog, formatEventDate } from '@/features/events/data'
import { usePagination } from '@/lib/usePagination'

export function EventsPage() {
  const { t, i18n } = useTranslation()

  const events = useMemo<SchoolEvent[]>(
    () =>
      Array.from({ length: 2 }, (_, copy) =>
        eventCatalog.map((item) => ({
          id: `${item.id}-${copy}`,
          image: item.image,
          dateLabel: formatEventDate(item.date, i18n.language),
          title: t(`events.items.${item.id}.title`),
          body: t(`events.items.${item.id}.body`),
          href: `/events/${item.id}`,
        })),
      ).flat(),
    [t, i18n.language],
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
      </div>
    </section>
  )
}
