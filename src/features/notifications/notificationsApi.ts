import { apiDelete, apiGet, apiPost, apiPut, unwrapData } from '@/lib/api'

export type StudentNotificationType = 'attendance' | 'student_profile' | 'chat_message' | string

export type StudentNotification = {
  id: number
  type: StudentNotificationType
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export type NotificationsMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type NotificationsPage = {
  items: StudentNotification[]
  meta: NotificationsMeta
}

type RawNotification = {
  id?: number | string
  type?: string | null
  title?: string | null
  body?: string | null
  isRead?: boolean
  is_read?: boolean
  createdAt?: string | null
  created_at?: string | null
}

type PaginatedEnvelope = {
  data?: RawNotification[]
  meta?: Partial<NotificationsMeta>
  links?: { next?: string | null }
}

const defaultMeta: NotificationsMeta = {
  total: 0,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

export function normalizeNotification(raw: RawNotification): StudentNotification {
  return {
    id: Number(raw.id),
    type: String(raw.type || 'generic'),
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    isRead: Boolean(raw.isRead ?? raw.is_read),
    createdAt: String(raw.createdAt || raw.created_at || ''),
  }
}

function unwrapPaginated(payload: unknown): NotificationsPage {
  const data = unwrapData(payload as { data?: unknown })

  if (Array.isArray(data)) {
    const items = data.map((item) => normalizeNotification(item as RawNotification))
    return {
      items,
      meta: {
        ...defaultMeta,
        total: items.length,
        per_page: items.length || defaultMeta.per_page,
      },
    }
  }

  const page = (data && typeof data === 'object' ? data : {}) as PaginatedEnvelope
  const items = Array.isArray(page.data)
    ? page.data.map((item) => normalizeNotification(item))
    : []

  return {
    items,
    meta: {
      total: Number(page.meta?.total ?? items.length),
      per_page: Number(page.meta?.per_page ?? defaultMeta.per_page),
      current_page: Number(page.meta?.current_page ?? 1),
      last_page: Number(page.meta?.last_page ?? 1),
    },
  }
}

function parseNotificationDate(value: string) {
  if (!value) return null
  const isoish = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(isoish)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatNotificationDate(value: string, language: string) {
  const date = parseNotificationDate(value)
  if (!date) return value
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatNotificationRelative(value: string, language: string) {
  const date = parseNotificationDate(value)
  if (!date) return value

  const locale = language.startsWith('ar') ? 'ar' : 'en'
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (abs < 60) return formatter.format(diffSeconds, 'second')
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour')
  if (abs < 604800) return formatter.format(Math.round(diffSeconds / 86400), 'day')
  return formatNotificationDate(value, language)
}

export function getNotificationPath(type: string) {
  if (type === 'attendance') return '/profile/attendance'
  if (type === 'student_profile') return '/profile'
  return null
}

export async function registerDeviceToken(deviceToken: string) {
  await apiPost(
    '/v1/notifications/token',
    {
      device_token: deviceToken,
      device_type: 'web',
    },
    { requiresAuth: true },
  )
}

export async function getNotifications(params?: { page?: number; per_page?: number }) {
  const response = await apiGet<PaginatedEnvelope>('/v1/notifications', {
    requiresAuth: true,
    params: {
      page: params?.page ?? 1,
      per_page: params?.per_page ?? 10,
    },
  })
  return unwrapPaginated(response)
}

export async function getUnreadCount() {
  const response = await apiGet<{ count?: number }>('/v1/notifications/unread-count', {
    requiresAuth: true,
  })
  const data = unwrapData(response)
  return Number(data?.count ?? 0)
}

export async function markNotificationRead(id: number) {
  await apiPut(`/v1/notifications/${id}/read`, undefined, { requiresAuth: true })
}

export async function markAllNotificationsRead() {
  await apiPut('/v1/notifications/read-all', undefined, { requiresAuth: true })
}

export async function deleteNotification(id: number) {
  await apiDelete(`/v1/notifications/${id}`, { requiresAuth: true })
}
