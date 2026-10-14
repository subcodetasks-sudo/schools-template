import { apiDelete, apiGet, apiPost, unwrapData } from '@/lib/api'

const TELEGRAM_PATH = '/v1/auth/student/profile/telegram'

/** Fallbacks for fields the API is documented to send but might omit. */
const DEFAULT_LINK_TTL_MINUTES = 30
/** Telegram only ever hands out deep links on these hosts. */
const TELEGRAM_HOSTS = new Set(['t.me', 'telegram.me', 'telegram.dog'])

export type TelegramFollower = {
  id: string
  /** Telegram display name; `null` when the parent hides it. */
  name: string | null
  /** `false` once the parent blocked the bot. */
  isActive: boolean
  linkedAt: string | null
}

export type TelegramFollowUpStatus = {
  /** `false` = the feature is switched off on the server. */
  configured: boolean
  botUsername: string | null
  followers: TelegramFollower[]
}

export type TelegramLink = {
  url: string
  /** Absolute expiry as epoch milliseconds. */
  expiresAtMs: number
}

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null
}

function readText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null') {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function readBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return null
}

function readPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function mapFollower(raw: unknown): TelegramFollower | null {
  const item = asRecord(raw)
  if (!item) return null
  // Without an id the follower can neither be keyed nor unlinked.
  const id = readText(item.id)
  if (!id) return null
  return {
    id,
    name: readText(item.name),
    // A follower only counts as inactive when the API says so explicitly.
    isActive: readBool(item.is_active) ?? true,
    linkedAt: readText(item.linked_at),
  }
}

/**
 * Maps the `GET /telegram` payload (also returned by `DELETE /telegram/{id}`).
 * Returns `null` when the payload is not recognizable as a status at all.
 */
export function normalizeTelegramStatus(raw: unknown): TelegramFollowUpStatus | null {
  const data = asRecord(raw)
  if (!data) return null

  const configured = readBool(data.configured)
  if (configured === null && !Array.isArray(data.links)) return null

  const seen = new Set<string>()
  const followers: TelegramFollower[] = []
  for (const entry of Array.isArray(data.links) ? data.links : []) {
    const follower = mapFollower(entry)
    if (!follower || seen.has(follower.id)) continue
    seen.add(follower.id)
    followers.push(follower)
  }

  return {
    // Missing flag with a links list: the endpoint answered, so the feature is on.
    configured: configured ?? true,
    botUsername: readText(data.bot_username)?.replace(/^@/, '') || null,
    followers,
  }
}

/** Only real Telegram deep links may ever be opened (no `javascript:`, no lookalike hosts). */
export function isTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      TELEGRAM_HOSTS.has(url.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

/**
 * Maps the `POST /telegram/link` payload. Returns `null` when there is no usable
 * Telegram URL. `now` is injectable for tests.
 */
export function normalizeTelegramLink(raw: unknown, now: number = Date.now()): TelegramLink | null {
  const data = asRecord(raw)
  if (!data) return null

  const url = readText(data.url)
  if (!url || !isTelegramUrl(url)) return null

  // The relative expiry wins: it does not depend on the device clock being right.
  // Then the absolute one, then the documented 30 minutes.
  const minutes = readPositiveNumber(data.expires_in_minutes)
  const absolute = readText(data.expires_at)
  const parsedExpiry = absolute ? Date.parse(absolute) : Number.NaN

  let expiresAtMs = now + DEFAULT_LINK_TTL_MINUTES * 60_000
  if (minutes !== null) expiresAtMs = now + minutes * 60_000
  else if (Number.isFinite(parsedExpiry)) expiresAtMs = parsedExpiry

  return { url, expiresAtMs }
}

/** Whole seconds left before `link` expires (never negative). */
export function secondsUntilExpiry(link: Pick<TelegramLink, 'expiresAtMs'>, now: number = Date.now()) {
  return Math.max(0, Math.ceil((link.expiresAtMs - now) / 1000))
}

/** A follower's identity for change detection: re-linking or un-blocking changes it. */
function followerSignature(follower: TelegramFollower) {
  return `${follower.id}|${follower.isActive ? 1 : 0}|${follower.linkedAt ?? ''}`
}

/**
 * True when `next` contains an active follower that `previous` did not have
 * (a brand-new parent, or an existing one that re-linked / un-blocked).
 */
export function hasNewActiveFollower(
  previous: readonly TelegramFollower[],
  next: readonly TelegramFollower[],
): boolean {
  const known = new Set(previous.map(followerSignature))
  return next.some((follower) => follower.isActive && !known.has(followerSignature(follower)))
}

export async function getTelegramFollowUp(signal?: AbortSignal) {
  const response = await apiGet<unknown>(TELEGRAM_PATH, { requiresAuth: true, signal })
  return normalizeTelegramStatus(unwrapData(response))
}

/** Creates a one-time, 30-minute link. Call it only from a user action. */
export async function createTelegramLink(signal?: AbortSignal) {
  const response = await apiPost<unknown>(TELEGRAM_PATH + '/link', undefined, {
    requiresAuth: true,
    signal,
  })
  return normalizeTelegramLink(unwrapData(response))
}

/** Stops one parent's follow-up. Resolves with the updated list when the API sends it. */
export async function removeTelegramFollower(id: string, signal?: AbortSignal) {
  const response = await apiDelete<unknown>(`${TELEGRAM_PATH}/${encodeURIComponent(id)}`, {
    requiresAuth: true,
    signal,
  })
  return normalizeTelegramStatus(unwrapData(response))
}
