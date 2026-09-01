export const eventCatalog = [
  { id: 'theater', image: '/event-1.jpg', date: '2026-01-13' },
  { id: 'community', image: '/event-2.jpg', date: '2026-02-08' },
  { id: 'childrensDay', image: '/event-3.jpg', date: '2026-03-21' },
  { id: 'swimming', image: '/event-4.jpg', date: '2026-04-12' },
  { id: 'campusVisit', image: '/school.png', date: '2026-05-18' },
  { id: 'readingWeek', image: '/event-1.jpg', date: '2026-06-09' },
  { id: 'sportsDay', image: '/event-4.jpg', date: '2026-07-15' },
] as const

export type EventSlug = (typeof eventCatalog)[number]['id']

export function isEventSlug(value: string): value is EventSlug {
  return eventCatalog.some((item) => item.id === value)
}

export function getEventEntry(id: string) {
  return eventCatalog.find((item) => item.id === id)
}

export function formatEventDate(isoDate: string, language: string) {
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00`))
}
