export const blogCatalog = [
  { id: 'learningHabits', image: '/event-1.jpg' },
  { id: 'creativeClassroom', image: '/event-3.jpg' },
  { id: 'sportsSpirit', image: '/event-4.jpg' },
  { id: 'communityCare', image: '/event-2.jpg' },
  { id: 'campusLife', image: '/event-5.jpg' },
  { id: 'stageTalent', image: '/event-1.jpg' },
] as const

export type BlogSlug = (typeof blogCatalog)[number]['id']

export function isBlogSlug(value: string): value is BlogSlug {
  return blogCatalog.some((item) => item.id === value)
}

export function getBlogEntry(id: string) {
  return blogCatalog.find((item) => item.id === id)
}
