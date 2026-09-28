import type { Location } from 'react-router-dom'

export const DEFAULT_AUTHENTICATED_PATH = '/profile'

/** Pages only guests may see; never redirect back to them after logging in. */
const GUEST_ONLY_PATHS = ['/login', '/register']

export type AuthRedirectState = {
  from?: Partial<Pick<Location, 'pathname' | 'search' | 'hash'>>
  /** Pre-fills the login form (e.g. after registering). */
  code?: string
}

/**
 * Returns `value` as a same-origin app path, or null when it's unsafe or pointless:
 * absolute / protocol-relative URLs (open redirects) and guest-only pages (redirect loops).
 */
export function toSafeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null

  let url: URL
  try {
    url = new URL(path, window.location.origin)
  } catch {
    return null
  }
  if (url.origin !== window.location.origin) return null

  // Routes match case-insensitively and ignore a trailing slash.
  const normalized = url.pathname.replace(/\/+$/, '').toLowerCase()
  if (GUEST_ONLY_PATHS.includes(normalized)) return null

  // Validate the normalized result too: "/.//evil.com" resolves to "//evil.com".
  const result = `${url.pathname}${url.search}${url.hash}`
  if (/^[\\/]{2}/.test(result)) return null

  return result
}

/** Where to send a user once they're authenticated: where they came from, else the profile. */
export function getPostLoginRedirect(location: Location): string {
  const from = (location.state as AuthRedirectState | null)?.from
  const fromPath = from?.pathname ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : null

  return (
    toSafeInternalPath(fromPath) ??
    toSafeInternalPath(new URLSearchParams(location.search).get('redirect')) ??
    DEFAULT_AUTHENTICATED_PATH
  )
}
