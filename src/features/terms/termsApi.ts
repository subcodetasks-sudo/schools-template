import { apiGet, unwrapList } from '@/lib/api'

export type ApplicationTerm = {
  id: string
  title: string
  slug: string
  description: string
  icon_url: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export async function getApplicationTerms() {
  const response = await apiGet<ApplicationTerm[]>('/v1/terms-of-applying', {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapList<ApplicationTerm>(response)
}
