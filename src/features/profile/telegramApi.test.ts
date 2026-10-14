// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TelegramFollower } from './telegramApi'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  unwrapData: vi.fn(),
}))

vi.mock('@/lib/api', () => mocks)

import {
  createTelegramLink,
  getTelegramFollowUp,
  hasNewActiveFollower,
  isTelegramUrl,
  normalizeTelegramLink,
  normalizeTelegramStatus,
  removeTelegramFollower,
  secondsUntilExpiry,
} from './telegramApi'

const BASE_PATH = '/v1/auth/student/profile/telegram'

function follower(overrides: Partial<TelegramFollower> = {}): TelegramFollower {
  return { id: '1', name: 'Parent', isActive: true, linkedAt: '2026-01-01T10:00:00Z', ...overrides }
}

describe('normalizeTelegramStatus', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'telegram'],
    ['a number', 42],
    ['a boolean', true],
    ['an array', []],
    ['an array of links', [{ id: '1' }]],
  ])('returns null for %s payloads', (_label, payload) => {
    expect(normalizeTelegramStatus(payload)).toBeNull()
  })

  it('returns null for an object that is neither configured nor has links', () => {
    expect(normalizeTelegramStatus({})).toBeNull()
    expect(normalizeTelegramStatus({ foo: 'bar', bot_username: 'x' })).toBeNull()
    expect(normalizeTelegramStatus({ configured: 'maybe' })).toBeNull()
  })

  it('handles configured:false with no links', () => {
    expect(normalizeTelegramStatus({ configured: false })).toEqual({
      configured: false,
      botUsername: null,
      followers: [],
    })
  })

  it('reads string flags for configured', () => {
    expect(normalizeTelegramStatus({ configured: '0' })?.configured).toBe(false)
    expect(normalizeTelegramStatus({ configured: '1' })?.configured).toBe(true)
    expect(normalizeTelegramStatus({ configured: 0 })?.configured).toBe(false)
  })

  it('treats a missing configured flag with a links list as configured', () => {
    expect(normalizeTelegramStatus({ links: [] })).toEqual({
      configured: true,
      botUsername: null,
      followers: [],
    })
  })

  it('tolerates a missing or non-array links when configured is present', () => {
    expect(normalizeTelegramStatus({ configured: true })?.followers).toEqual([])
    expect(normalizeTelegramStatus({ configured: true, links: 'nope' })?.followers).toEqual([])
    expect(normalizeTelegramStatus({ configured: true, links: { id: '1' } })?.followers).toEqual([])
  })

  it('maps a full payload', () => {
    expect(
      normalizeTelegramStatus({
        configured: true,
        bot_username: 'school_bot',
        links: [{ id: 'a1', name: 'Mona', is_active: true, linked_at: '2026-02-03T08:00:00Z' }],
      }),
    ).toEqual({
      configured: true,
      botUsername: 'school_bot',
      followers: [{ id: 'a1', name: 'Mona', isActive: true, linkedAt: '2026-02-03T08:00:00Z' }],
    })
  })

  it('drops links without a usable id', () => {
    const status = normalizeTelegramStatus({
      configured: true,
      links: [
        { name: 'no id' },
        { id: null, name: 'null id' },
        { id: '', name: 'empty id' },
        { id: '   ', name: 'blank id' },
        { id: 'null', name: 'string null id' },
        null,
        'text',
        7,
        [],
        { id: 'ok' },
      ],
    })
    expect(status?.followers.map((f) => f.id)).toEqual(['ok'])
  })

  it('accepts numeric ids and stringifies them', () => {
    const status = normalizeTelegramStatus({ configured: true, links: [{ id: 15 }, { id: 0 }] })
    expect(status?.followers.map((f) => f.id)).toEqual(['15', '0'])
  })

  it('dedupes by id and keeps the first occurrence', () => {
    const status = normalizeTelegramStatus({
      configured: true,
      links: [
        { id: '1', name: 'first' },
        { id: '2', name: 'second' },
        { id: '1', name: 'duplicate' },
        { id: 1, name: 'numeric duplicate' },
      ],
    })
    expect(status?.followers).toHaveLength(2)
    expect(status?.followers.map((f) => f.name)).toEqual(['first', 'second'])
  })

  describe('is_active', () => {
    const active = (value: unknown) =>
      normalizeTelegramStatus({ configured: true, links: [{ id: '1', is_active: value }] })
        ?.followers[0]?.isActive

    it('reads booleans', () => {
      expect(active(true)).toBe(true)
      expect(active(false)).toBe(false)
    })

    it('reads numeric and string flags', () => {
      expect(active(1)).toBe(true)
      expect(active(0)).toBe(false)
      expect(active('1')).toBe(true)
      expect(active('0')).toBe(false)
      expect(active('true')).toBe(true)
      expect(active('false')).toBe(false)
    })

    it('defaults to true when missing or unrecognized', () => {
      expect(active(undefined)).toBe(true)
      expect(active(null)).toBe(true)
      expect(active('')).toBe(true)
      expect(active('maybe')).toBe(true)
      const noKey = normalizeTelegramStatus({ configured: true, links: [{ id: '1' }] })
      expect(noKey?.followers[0].isActive).toBe(true)
    })
  })

  describe('name', () => {
    const nameOf = (value: unknown) =>
      normalizeTelegramStatus({ configured: true, links: [{ id: '1', name: value }] })
        ?.followers[0]?.name

    it('trims real names', () => {
      expect(nameOf('  Mona Ali ')).toBe('Mona Ali')
    })

    it('maps null, blank, "null" and missing to null', () => {
      expect(nameOf(null)).toBeNull()
      expect(nameOf(undefined)).toBeNull()
      expect(nameOf('')).toBeNull()
      expect(nameOf('   ')).toBeNull()
      expect(nameOf('null')).toBeNull()
      expect(nameOf(' NULL ')).toBeNull()
      expect(nameOf({})).toBeNull()
    })
  })

  describe('linked_at', () => {
    it('is null when missing or blank', () => {
      const status = normalizeTelegramStatus({
        configured: true,
        links: [{ id: '1' }, { id: '2', linked_at: '' }, { id: '3', linked_at: null }],
      })
      expect(status?.followers.map((f) => f.linkedAt)).toEqual([null, null, null])
    })
  })

  describe('bot_username', () => {
    const bot = (value: unknown) =>
      normalizeTelegramStatus({ configured: true, bot_username: value })?.botUsername

    it('strips a single leading @', () => {
      expect(bot('@school_bot')).toBe('school_bot')
      expect(bot('  @school_bot  ')).toBe('school_bot')
    })

    it('keeps a username without @ unchanged', () => {
      expect(bot('school_bot')).toBe('school_bot')
    })

    it('does not strip @ in the middle', () => {
      expect(bot('school@bot')).toBe('school@bot')
    })

    it('is null when missing, blank or "null"', () => {
      expect(bot(undefined)).toBeNull()
      expect(bot(null)).toBeNull()
      expect(bot('')).toBeNull()
      expect(bot('  ')).toBeNull()
      expect(bot('null')).toBeNull()
    })
  })
})

describe('isTelegramUrl', () => {
  it.each([
    'https://t.me/school_bot?start=abc123',
    'https://telegram.me/school_bot?start=abc123',
    'https://telegram.dog/school_bot',
    'https://T.ME/school_bot',
    'https://t.me/',
  ])('accepts %s', (url) => {
    expect(isTelegramUrl(url)).toBe(true)
  })

  it.each([
    ['http scheme', 'http://t.me/school_bot'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['javascript scheme with t.me in it', 'javascript://t.me/%0Aalert(1)'],
    ['data scheme', 'data:text/html,<script>alert(1)</script>'],
    ['tg deep link scheme', 'tg://resolve?domain=school_bot'],
    ['lookalike subdomain host', 'https://t.me.evil.com/school_bot'],
    ['lookalike prefix host', 'https://nott.me/school_bot'],
    ['subdomain of t.me', 'https://sub.t.me/school_bot'],
    ['t.me only in the path', 'https://evil.com/t.me/school_bot'],
    ['t.me only in the query', 'https://evil.com/?u=https://t.me/x'],
    ['credentials with username', 'https://user@t.me/school_bot'],
    ['credentials with password', 'https://user:pass@t.me/school_bot'],
    ['t.me as username of another host', 'https://t.me@evil.com/school_bot'],
    ['host as password of another host', 'https://t.me:t.me@evil.com/school_bot'],
    ['relative URL', '/school_bot'],
    ['plain text', 'not a url'],
    ['empty string', ''],
  ])('rejects %s', (_label, url) => {
    expect(isTelegramUrl(url)).toBe(false)
  })
})

describe('normalizeTelegramLink', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0)
  const url = 'https://t.me/school_bot?start=token'

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', url],
    ['a number', 5],
    ['an array', [{ url }]],
  ])('returns null for %s payloads', (_label, payload) => {
    expect(normalizeTelegramLink(payload, now)).toBeNull()
  })

  it('returns null when the url is missing, blank or not a string', () => {
    expect(normalizeTelegramLink({}, now)).toBeNull()
    expect(normalizeTelegramLink({ url: null }, now)).toBeNull()
    expect(normalizeTelegramLink({ url: '' }, now)).toBeNull()
    expect(normalizeTelegramLink({ url: '   ' }, now)).toBeNull()
    expect(normalizeTelegramLink({ url: 'null' }, now)).toBeNull()
    expect(normalizeTelegramLink({ url: { href: url } }, now)).toBeNull()
  })

  it.each([
    ['http scheme', 'http://t.me/school_bot'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['lookalike host', 'https://t.me.evil.com/school_bot'],
    ['credentials', 'https://user:pass@t.me/school_bot'],
    ['credentials hiding the real host', 'https://t.me@evil.com/school_bot'],
    ['non-url text', 'open the bot'],
  ])('returns null for an unsafe url (%s)', (_label, badUrl) => {
    expect(normalizeTelegramLink({ url: badUrl, expires_at: '2030-01-01T00:00:00Z' }, now)).toBeNull()
  })

  it('accepts telegram.me links', () => {
    const link = normalizeTelegramLink({ url: 'https://telegram.me/school_bot?start=x' }, now)
    expect(link?.url).toBe('https://telegram.me/school_bot?start=x')
  })

  it('trims the url', () => {
    expect(normalizeTelegramLink({ url: `  ${url}  ` }, now)?.url).toBe(url)
  })

  it('uses a valid absolute expires_at', () => {
    const link = normalizeTelegramLink({ url, expires_at: '2026-01-01T12:10:00Z' }, now)
    expect(link).toEqual({ url, expiresAtMs: Date.UTC(2026, 0, 1, 12, 10, 0) })
  })

  it('prefers expires_in_minutes over expires_at (immune to device clock skew)', () => {
    const link = normalizeTelegramLink(
      { url, expires_at: '2026-01-01T12:10:00Z', expires_in_minutes: 99 },
      now,
    )
    expect(link?.expiresAtMs).toBe(now + 99 * 60_000)
  })

  it('falls through to expires_at when expires_in_minutes is zero, negative or invalid', () => {
    const expiresAt = '2026-01-01T12:10:00Z'
    const expected = Date.UTC(2026, 0, 1, 12, 10, 0)
    for (const minutes of [0, -5, 'abc', '', null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        normalizeTelegramLink({ url, expires_at: expiresAt, expires_in_minutes: minutes }, now)
          ?.expiresAtMs,
      ).toBe(expected)
    }
  })

  it('falls back to expires_in_minutes when expires_at is invalid', () => {
    const link = normalizeTelegramLink({ url, expires_at: 'soon', expires_in_minutes: 10 }, now)
    expect(link?.expiresAtMs).toBe(now + 10 * 60_000)
  })

  it('falls back to expires_in_minutes when expires_at is missing', () => {
    expect(normalizeTelegramLink({ url, expires_in_minutes: 5 }, now)?.expiresAtMs).toBe(
      now + 5 * 60_000,
    )
    expect(normalizeTelegramLink({ url, expires_at: null, expires_in_minutes: 5 }, now)?.expiresAtMs).toBe(
      now + 5 * 60_000,
    )
    expect(normalizeTelegramLink({ url, expires_at: '', expires_in_minutes: 5 }, now)?.expiresAtMs).toBe(
      now + 5 * 60_000,
    )
  })

  it('accepts expires_in_minutes sent as a numeric string', () => {
    expect(normalizeTelegramLink({ url, expires_in_minutes: '15' }, now)?.expiresAtMs).toBe(
      now + 15 * 60_000,
    )
  })

  it('falls back to 30 minutes when nothing usable is sent', () => {
    const expected = now + 30 * 60_000
    expect(normalizeTelegramLink({ url }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_at: 'nope' }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: 0 }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: -5 }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: 'abc' }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: '' }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: null }, now)?.expiresAtMs).toBe(expected)
    expect(normalizeTelegramLink({ url, expires_in_minutes: Number.NaN }, now)?.expiresAtMs).toBe(expected)
    expect(
      normalizeTelegramLink({ url, expires_in_minutes: Number.POSITIVE_INFINITY }, now)?.expiresAtMs,
    ).toBe(expected)
  })

  it('defaults now to the current time', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
      const link = normalizeTelegramLink({ url })
      expect(link?.expiresAtMs).toBe(Date.parse('2026-06-01T00:30:00Z'))
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('secondsUntilExpiry', () => {
  it('returns whole seconds remaining', () => {
    expect(secondsUntilExpiry({ expiresAtMs: 60_000 }, 0)).toBe(60)
  })

  it('ceils partial seconds', () => {
    expect(secondsUntilExpiry({ expiresAtMs: 1_001 }, 0)).toBe(2)
    expect(secondsUntilExpiry({ expiresAtMs: 1_500 }, 0)).toBe(2)
    expect(secondsUntilExpiry({ expiresAtMs: 1 }, 0)).toBe(1)
    expect(secondsUntilExpiry({ expiresAtMs: 1_000 }, 0)).toBe(1)
  })

  it('is zero at and after expiry, never negative', () => {
    expect(secondsUntilExpiry({ expiresAtMs: 5_000 }, 5_000)).toBe(0)
    expect(secondsUntilExpiry({ expiresAtMs: 5_000 }, 5_001)).toBe(0)
    expect(secondsUntilExpiry({ expiresAtMs: 5_000 }, 999_999)).toBe(0)
    expect(Object.is(secondsUntilExpiry({ expiresAtMs: 5_000 }, 5_400), 0)).toBe(true)
  })

  it('defaults now to the current time', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(10_000)
      expect(secondsUntilExpiry({ expiresAtMs: 70_000 })).toBe(60)
      expect(secondsUntilExpiry({ expiresAtMs: 1_000 })).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('hasNewActiveFollower', () => {
  it('is false when both lists are empty', () => {
    expect(hasNewActiveFollower([], [])).toBe(false)
  })

  it('is true for a brand-new active follower', () => {
    expect(hasNewActiveFollower([], [follower()])).toBe(true)
    expect(hasNewActiveFollower([follower({ id: '1' })], [follower({ id: '1' }), follower({ id: '2' })])).toBe(
      true,
    )
  })

  it('is false when nothing changed', () => {
    expect(hasNewActiveFollower([follower()], [follower()])).toBe(false)
  })

  it('is true when a follower re-linked (linked_at changed)', () => {
    const before = follower({ linkedAt: '2026-01-01T10:00:00Z' })
    const after = follower({ linkedAt: '2026-01-05T09:30:00Z' })
    expect(hasNewActiveFollower([before], [after])).toBe(true)
  })

  it('is true when a blocked follower was un-blocked (is_active false -> true)', () => {
    const before = follower({ isActive: false })
    const after = follower({ isActive: true })
    expect(hasNewActiveFollower([before], [after])).toBe(true)
  })

  it('is false when a follower becomes inactive', () => {
    expect(hasNewActiveFollower([follower({ isActive: true })], [follower({ isActive: false })])).toBe(
      false,
    )
  })

  it('is false when a follower was removed', () => {
    expect(hasNewActiveFollower([follower({ id: '1' }), follower({ id: '2' })], [follower({ id: '1' })])).toBe(
      false,
    )
    expect(hasNewActiveFollower([follower()], [])).toBe(false)
  })

  it('is false for a new but inactive follower', () => {
    expect(hasNewActiveFollower([], [follower({ id: '9', isActive: false })])).toBe(false)
    expect(
      hasNewActiveFollower([follower({ id: '1' })], [follower({ id: '1' }), follower({ id: '9', isActive: false })]),
    ).toBe(false)
  })

  it('is true when any one of several followers is new and active', () => {
    const previous = [follower({ id: '1' }), follower({ id: '2' })]
    const next = [follower({ id: '1' }), follower({ id: '2' }), follower({ id: '3', isActive: false }), follower({ id: '4' })]
    expect(hasNewActiveFollower(previous, next)).toBe(true)
  })

  it('treats a null linkedAt as a stable value', () => {
    const a = follower({ linkedAt: null })
    expect(hasNewActiveFollower([a], [{ ...a }])).toBe(false)
    expect(hasNewActiveFollower([a], [follower({ linkedAt: '2026-01-01T00:00:00Z' })])).toBe(true)
  })
})

describe('telegram API calls', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiDelete.mockReset()
    mocks.unwrapData.mockReset()
    mocks.unwrapData.mockImplementation((value: unknown) => value)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTelegramFollowUp', () => {
    it('GETs the telegram path with auth and the abort signal', async () => {
      mocks.apiGet.mockResolvedValue({ configured: true, links: [] })
      const controller = new AbortController()

      await getTelegramFollowUp(controller.signal)

      expect(mocks.apiGet).toHaveBeenCalledTimes(1)
      expect(mocks.apiGet).toHaveBeenCalledWith(BASE_PATH, {
        requiresAuth: true,
        signal: controller.signal,
      })
    })

    it('unwraps the envelope and normalizes the status', async () => {
      const envelope = { success: true, message: '', data: { raw: true } }
      mocks.apiGet.mockResolvedValue(envelope)
      mocks.unwrapData.mockReturnValue({
        configured: true,
        bot_username: '@school_bot',
        links: [{ id: 'a', name: 'Mona', is_active: '0', linked_at: '2026-01-01' }],
      })

      const status = await getTelegramFollowUp()

      expect(mocks.unwrapData).toHaveBeenCalledWith(envelope)
      expect(status).toEqual({
        configured: true,
        botUsername: 'school_bot',
        followers: [{ id: 'a', name: 'Mona', isActive: false, linkedAt: '2026-01-01' }],
      })
    })

    it('resolves null for an unrecognizable payload', async () => {
      mocks.apiGet.mockResolvedValue({ success: true })
      mocks.unwrapData.mockReturnValue(null)
      await expect(getTelegramFollowUp()).resolves.toBeNull()
    })

    it('propagates request errors', async () => {
      mocks.apiGet.mockRejectedValue(new Error('network'))
      await expect(getTelegramFollowUp()).rejects.toThrow('network')
    })
  })

  describe('createTelegramLink', () => {
    it('POSTs to /link with no body, auth and the abort signal', async () => {
      mocks.apiPost.mockResolvedValue({})
      const controller = new AbortController()

      await createTelegramLink(controller.signal)

      expect(mocks.apiPost).toHaveBeenCalledTimes(1)
      expect(mocks.apiPost).toHaveBeenCalledWith(`${BASE_PATH}/link`, undefined, {
        requiresAuth: true,
        signal: controller.signal,
      })
    })

    it('unwraps the envelope and normalizes the link', async () => {
      const envelope = { success: true, message: '', data: { raw: true } }
      mocks.apiPost.mockResolvedValue(envelope)
      mocks.unwrapData.mockReturnValue({
        url: 'https://t.me/school_bot?start=tok',
        expires_at: '2030-01-01T00:00:00Z',
      })

      const link = await createTelegramLink()

      expect(mocks.unwrapData).toHaveBeenCalledWith(envelope)
      expect(link).toEqual({
        url: 'https://t.me/school_bot?start=tok',
        expiresAtMs: Date.parse('2030-01-01T00:00:00Z'),
      })
    })

    it('resolves null when the server returns an untrusted url', async () => {
      mocks.apiPost.mockResolvedValue({})
      mocks.unwrapData.mockReturnValue({ url: 'https://t.me.evil.com/x' })
      await expect(createTelegramLink()).resolves.toBeNull()
    })

    it('propagates request errors', async () => {
      mocks.apiPost.mockRejectedValue(new Error('429'))
      await expect(createTelegramLink()).rejects.toThrow('429')
    })
  })

  describe('removeTelegramFollower', () => {
    it('DELETEs /<id> with auth and the abort signal', async () => {
      mocks.apiDelete.mockResolvedValue({})
      const controller = new AbortController()

      await removeTelegramFollower('abc123', controller.signal)

      expect(mocks.apiDelete).toHaveBeenCalledTimes(1)
      expect(mocks.apiDelete).toHaveBeenCalledWith(`${BASE_PATH}/abc123`, {
        requiresAuth: true,
        signal: controller.signal,
      })
    })

    it('URL-encodes the follower id', async () => {
      mocks.apiDelete.mockResolvedValue({})

      await removeTelegramFollower('a/b c?x=1#frag')
      expect(mocks.apiDelete.mock.calls[0][0]).toBe(
        `${BASE_PATH}/${encodeURIComponent('a/b c?x=1#frag')}`,
      )
      expect(mocks.apiDelete.mock.calls[0][0]).toBe(`${BASE_PATH}/a%2Fb%20c%3Fx%3D1%23frag`)

      mocks.apiDelete.mockClear()
      await removeTelegramFollower('../../admin')
      expect(mocks.apiDelete.mock.calls[0][0]).toBe(`${BASE_PATH}/..%2F..%2Fadmin`)
    })

    it('unwraps the envelope and normalizes the updated status', async () => {
      const envelope = { success: true, message: '', data: { raw: true } }
      mocks.apiDelete.mockResolvedValue(envelope)
      mocks.unwrapData.mockReturnValue({ configured: true, links: [{ id: 'b' }] })

      const status = await removeTelegramFollower('a')

      expect(mocks.unwrapData).toHaveBeenCalledWith(envelope)
      expect(status?.followers.map((f) => f.id)).toEqual(['b'])
    })

    it('resolves null when the API sends no status body', async () => {
      mocks.apiDelete.mockResolvedValue(null)
      mocks.unwrapData.mockReturnValue(null)
      await expect(removeTelegramFollower('a')).resolves.toBeNull()
    })

    it('propagates request errors', async () => {
      mocks.apiDelete.mockRejectedValue(new Error('404'))
      await expect(removeTelegramFollower('a')).rejects.toThrow('404')
    })
  })
})
