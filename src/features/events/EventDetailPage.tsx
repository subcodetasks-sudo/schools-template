import { CalendarDays } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import {
  formatEventDate,
  getEventEntry,
  isEventSlug,
} from '@/features/events/data'

export function EventDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()

  if (!isEventSlug(id)) {
    return <Navigate to="/events" replace />
  }

  const entry = getEventEntry(id)!
  const title = t(`events.items.${id}.title`)
  const body = t(`events.items.${id}.body`)
  const dateLabel = formatEventDate(entry.date, i18n.language)

  return (
    <DetailPageLayout
      bannerTitle={t('detail.event')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.events'), to: '/events' },
        { label: title },
      ]}
      image={entry.image}
      imageAlt={title}
      title={title}
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
      sections={[
        { title: t('detail.sections.overview'), body },
        {
          title: t('detail.sections.agenda'),
          body: t('detail.eventAgenda'),
        },
        {
          title: t('detail.sections.notes'),
          body: t('detail.eventNotes'),
        },
      ]}
    />
  )
}
