import { apiGet, unwrapData, unwrapList } from '@/lib/api'

export type SchoolEventEntry = {
  id: string
  title: string
  slug: string
  description: string
  image_url: string | null
  event_date: string
  created_at?: string
  updated_at?: string
}

export type EventsFilter = 'upcoming' | 'past'

export async function getEvents(when?: EventsFilter) {
  const response = await apiGet<SchoolEventEntry[]>('/v1/events', {
    requiresAuth: false,
    skipAuth: true,
    params: when ? { when } : undefined,
  })
  return unwrapList<SchoolEventEntry>(response)
}

export async function getEvent(slug: string) {
  const response = await apiGet<SchoolEventEntry>(`/v1/events/${slug}`, {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapData(response)
}

export function formatEventDate(isoDate: string, language: string) {
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-GB'
  const date = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
