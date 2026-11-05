import i18n from '@/lib/i18n'
import { useUserStore } from '@/features/auth/userStore'
import { ApiError, getHiddenInfo } from '@/lib/api'

/** Student endpoints the school can close (the `data.resource` of the 403). */
export type HiddenResource = 'weekly_assessments' | 'monthly_assessments' | 'results' | 'annual_report'

export const HIDDEN_TERMS = ['first', 'second'] as const
export type HiddenTerm = (typeof HIDDEN_TERMS)[number]

type Entry = {
  /** Localized text from the API; empty when inferred from a partial response. */
  message: string
  lang: string
}

/**
 * What answered "hidden" during this page session. Held in memory only, so a reload
 * (or a different login) asks the server again: closing is decided by the school,
 * and retrying changes nothing until it opens the results.
 */
const hidden = new Map<string, Entry>()
let owner: string | null = null

function currentLang() {
  return i18n.language?.startsWith('ar') ? 'ar' : 'en'
}

/** Drops everything remembered for another session so one student's locks never leak to the next. */
function syncOwner() {
  const token = useUserStore.getState().token
  if (token !== owner) {
    hidden.clear()
    owner = token
  }
}

export function hiddenScope(year: string | null | undefined, part: string | null | undefined = '') {
  return `${year ?? ''}|${part ?? ''}`
}

function keyOf(resource: HiddenResource, scope: string) {
  return `${resource}::${scope}`
}

export function markHidden(resource: HiddenResource, scope: string, message = '') {
  syncOwner()
  hidden.set(keyOf(resource, scope), { message, lang: currentLang() })
}

export function clearHidden(resource: HiddenResource, scope: string) {
  syncOwner()
  hidden.delete(keyOf(resource, scope))
}

export function isMarkedHidden(resource: HiddenResource, scope: string) {
  syncOwner()
  return hidden.has(keyOf(resource, scope))
}

/**
 * The remembered entry, unless it holds a message in another language than the UI now
 * uses: then the caller asks the server again to get a correctly localized message.
 */
function readFresh(resource: HiddenResource, scope: string) {
  syncOwner()
  const entry = hidden.get(keyOf(resource, scope))
  if (!entry) return null
  if (entry.message && entry.lang !== currentLang()) return null
  return entry
}

function hiddenError(resource: HiddenResource, message: string) {
  return new ApiError(message, { status: 403, data: { hidden: true, resource } })
}

/**
 * Runs `request`, remembering a "hidden" answer. A scope already known to be hidden
 * rejects with the same 403 error without calling the server again.
 */
export async function guardHidden<T>(
  resource: HiddenResource,
  scope: string,
  request: () => Promise<T>,
): Promise<T> {
  const known = readFresh(resource, scope)
  if (known) throw hiddenError(resource, known.message)

  try {
    return await request()
  } catch (error) {
    const info = getHiddenInfo(error)
    if (info) markHidden(resource, scope, info.message)
    throw error
  }
}

function isTerm(value: unknown): value is HiddenTerm {
  return value === 'first' || value === 'second'
}

/** Terms known to be closed for this resource/year. */
export function lockedTerms(resource: HiddenResource, year: string | null | undefined) {
  return HIDDEN_TERMS.filter((term) => isMarkedHidden(resource, hiddenScope(year, term)))
}

/**
 * Like `guardHidden`, for the endpoints that take `?term=first|second`.
 * - `term` given: that term alone is remembered as hidden on a 403.
 * - no `term`: a 403 means both terms are hidden. A response carries `filters.term` (the
 *   term the backend picked); that says nothing about the other term, which is only found
 *   closed when the student asks for it and gets a 403.
 */
export async function guardHiddenTerm<T extends { filters?: { term?: string | null } | null }>(
  resource: HiddenResource,
  year: string | null | undefined,
  term: string | null | undefined,
  request: () => Promise<T>,
): Promise<T> {
  const termScope = (value: HiddenTerm) => hiddenScope(year, value)

  if (isTerm(term)) {
    const result = await guardHidden(resource, termScope(term), request)
    clearHidden(resource, termScope(term))
    return result
  }

  const known = HIDDEN_TERMS.map((value) => readFresh(resource, termScope(value)))
  const [first, second] = known
  if (first && second) throw hiddenError(resource, first.message || second.message)

  try {
    const result = await request()
    // The backend opens on one term (the running one) even when both are visible, so the
    // other term is NOT known to be closed. Only the term that answered is known to be open.
    const returned = result?.filters?.term
    if (isTerm(returned)) clearHidden(resource, termScope(returned))
    return result
  } catch (error) {
    const info = getHiddenInfo(error)
    if (info) for (const value of HIDDEN_TERMS) markHidden(resource, termScope(value), info.message)
    throw error
  }
}

/** Test seam: forget everything remembered. */
export function resetHiddenResults() {
  hidden.clear()
  owner = null
}
