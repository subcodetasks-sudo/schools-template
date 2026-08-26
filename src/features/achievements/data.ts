import type { AchievementAccent } from '@/features/home/components/AchievementCard'

const images = {
  campus: '/achiv-1.jpg',
  events: '/achiv-2.jpg',
  art: '/achive-3.jpg',
} as const

export const achievementCatalog = [
  { id: 'campusAward', image: images.campus, accent: 'rose' },
  { id: 'artTalents', image: images.art, accent: 'gold' },
  { id: 'nationalEvents', image: images.events, accent: 'emerald' },
  { id: 'campusEnvironment', image: images.campus, accent: 'rose' },
  { id: 'creativePrograms', image: images.art, accent: 'gold' },
  { id: 'studentLife', image: images.events, accent: 'emerald' },
] as const satisfies ReadonlyArray<{
  id: string
  image: string
  accent: AchievementAccent
}>

export type AchievementSlug = (typeof achievementCatalog)[number]['id']

export function isAchievementSlug(value: string): value is AchievementSlug {
  return achievementCatalog.some((item) => item.id === value)
}

export function getAchievementEntry(id: string) {
  return achievementCatalog.find((item) => item.id === id)
}
