import { apiGet, unwrapData, unwrapList } from '@/lib/api'

export type Achievement = {
  id: string
  title: string
  slug: string
  description: string
  image_url: string | null
  created_at?: string
  updated_at?: string
}

export async function getAchievements(perPage = 50) {
  const response = await apiGet<Achievement[]>('/v1/achievements', {
    requiresAuth: false,
    skipAuth: true,
    params: { per_page: perPage },
  })
  return unwrapList<Achievement>(response)
}

export async function getAchievement(slug: string) {
  const response = await apiGet<Achievement>(`/v1/achievements/${slug}`, {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapData(response)
}
