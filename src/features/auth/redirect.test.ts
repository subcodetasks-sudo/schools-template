// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getPostLoginRedirect, toSafeInternalPath } from '@/features/auth/redirect'
import type { Location } from 'react-router-dom'

function makeLocation(partial: Partial<Location> & { state?: unknown }): Location {
  return { pathname: '/', search: '', hash: '', key: 'k', state: null, ...partial } as Location
}

describe('toSafeInternalPath', () => {
  it('keeps same-origin app paths, search and hash', () => {
    expect(toSafeInternalPath('/profile/fees?month=3#top')).toBe('/profile/fees?month=3#top')
  })

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    'profile',
    '/login',
    '/Register/',
    42,
    null,
  ])('rejects %j', (value) => {
    expect(toSafeInternalPath(value)).toBeNull()
  })
})

describe('toSafeInternalPath dot-segment tricks', () => {
  it('never yields a protocol-relative or cross-origin result', () => {
    const result = toSafeInternalPath('/.//evil.com')
    expect(result === null || (result.startsWith('/') && !result.startsWith('//'))).toBe(true)
  })
})

describe('getPostLoginRedirect', () => {
  it('prefers the page the user came from', () => {
    const location = makeLocation({ state: { from: { pathname: '/events', search: '?p=2' } } })
    expect(getPostLoginRedirect(location)).toBe('/events?p=2')
  })

  it('falls back to a safe ?redirect= param, then the profile', () => {
    expect(getPostLoginRedirect(makeLocation({ search: '?redirect=/blog' }))).toBe('/blog')
    expect(getPostLoginRedirect(makeLocation({ search: '?redirect=https://evil.com' }))).toBe(
      '/profile',
    )
  })
})
