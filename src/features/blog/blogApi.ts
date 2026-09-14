import { apiGet, unwrapData, unwrapList } from '@/lib/api'

export type BlogArticle = {
  id: string
  slug: string
  title: string
  content: string
  status: string
  is_active: boolean
  published_at: string | null
  author_name?: string | null
  thumbnail_url?: string | null
  author_photo_url?: string | null
  image_urls?: string[]
  created_at?: string
  updated_at?: string
}

export async function getBlogArticles() {
  const response = await apiGet<BlogArticle[]>('/v1/blog', {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapList<BlogArticle>(response)
}

export async function getBlogArticle(slug: string) {
  const response = await apiGet<BlogArticle>(`/v1/blog/${slug}`, {
    requiresAuth: false,
    skipAuth: true,
  })
  return unwrapData(response)
}

export function formatPublishedDate(isoDate: string | null | undefined, language: string) {
  if (!isoDate) return null
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
