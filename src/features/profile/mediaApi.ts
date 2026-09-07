import { apiDelete, apiUpload, unwrapData } from '@/lib/api'

export type MediaUrls = {
  original?: string | null
  thumb?: string | null
  medium?: string | null
  large?: string | null
  webp?: string | null
}

export type MediaResource = {
  id?: number | string
  fileName?: string
  mimeType?: string
  size?: string
  urls?: MediaUrls | null
  createdAt?: string
  avatar?: string | null
  photo_url?: string | null
  image?: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function readUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      // Never rebuild media paths — only use absolute API URLs as returned.
      return value.trim()
    }
  }
  return null
}

/** Prefer exact URLs from the API payload. Never invent /storage or /media paths. */
export function pickMediaUrl(raw: unknown): string | null {
  const data = asRecord(raw) ?? {}
  const urls = asRecord(data.urls)
  const user = asRecord(data.user)
  const personal = asRecord(data.personal)
  const media = asRecord(data.media)

  return readUrl(
    data.avatar,
    data.photo_url,
    data.image,
    urls?.original,
    urls?.thumb,
    urls?.medium,
    urls?.large,
    urls?.webp,
    user?.avatar,
    user?.photo_url,
    user?.image,
    personal?.image,
    personal?.avatar,
    media?.urls && asRecord(media.urls)?.original,
    media?.urls && asRecord(media.urls)?.thumb,
  )
}

const ALLOWED_AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export function assertValidAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('INVALID_AVATAR_TYPE')
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('INVALID_AVATAR_SIZE')
  }
}

export async function uploadProfileAvatar(file: File) {
  assertValidAvatarFile(file)

  const formData = new FormData()
  formData.append('avatar', file)

  const response = await apiUpload<MediaResource | Record<string, unknown>>(
    '/v1/auth/profile/avatar',
    formData,
    { requiresAuth: true },
  )

  return {
    raw: unwrapData(response),
    url: pickMediaUrl(unwrapData(response)),
  }
}

export async function deleteProfileAvatar() {
  const response = await apiDelete<MediaResource | Record<string, unknown>>(
    '/v1/auth/profile/avatar',
    { requiresAuth: true },
  )
  return unwrapData(response)
}
