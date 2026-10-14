// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import type {
  TelegramFollower,
  TelegramFollowUpStatus,
  TelegramLink,
} from '@/features/profile/telegramApi'
import { useTelegramFollowUp } from '@/features/profile/useTelegramFollowUp'

const mocks = vi.hoisted(() => ({
  getTelegramFollowUp: vi.fn(),
  createTelegramLink: vi.fn(),
  removeTelegramFollower: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

// The real client pulls in i18n; the hook only needs the error class from it.
vi.mock('@/lib/api', async () => {
  const errors = await vi.importActual<typeof import('@/lib/api/errors')>('@/lib/api/errors')
  return {
    ApiError: errors.ApiError,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiDelete: vi.fn(),
    unwrapData: vi.fn(),
  }
})

vi.mock('@/features/profile/telegramApi', async () => {
  const actual = await vi.importActual<typeof import('@/features/profile/telegramApi')>(
    '@/features/profile/telegramApi',
  )
  return {
    ...actual,
    getTelegramFollowUp: mocks.getTelegramFollowUp,
    createTelegramLink: mocks.createTelegramLink,
    removeTelegramFollower: mocks.removeTelegramFollower,
  }
})

vi.mock('sonner', () => ({ toast: mocks.toast }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

type HookResult = ReturnType<typeof useTelegramFollowUp>

const GENERIC_429 = 'Request failed with status code 429'
const NOW = new Date('2026-01-01T12:00:00Z').getTime()

let current: HookResult
let root: Root | null = null
let container: HTMLDivElement | null = null

function Harness() {
  current = useTelegramFollowUp()
  return null
}

function follower(id: string, overrides: Partial<TelegramFollower> = {}): TelegramFollower {
  return { id, name: `Parent ${id}`, isActive: true, linkedAt: '2026-01-01', ...overrides }
}

function makeStatus(
  followers: TelegramFollower[] = [],
  configured = true,
): TelegramFollowUpStatus {
  return { configured, botUsername: 'school_bot', followers }
}

function makeLink(inMs = 30 * 60_000): TelegramLink {
  return { url: 'https://t.me/school_bot?start=abc', expiresAtMs: Date.now() + inMs }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function apiError(status: number, message = `Request failed with status code ${status}`) {
  return new ApiError(message, { status })
}

/** Lets pending promise callbacks (and any due fake timers) run inside `act`. */
async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(<Harness />)
  })
  await flush()
}

async function unmount() {
  if (!root) return
  const r = root
  root = null
  await act(async () => {
    r.unmount()
  })
  container?.remove()
  container = null
}

function stubVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

/** Mounts with a loaded status and creates a live link. */
async function mountWithLink(status = makeStatus([follower('a')]), link = makeLink()) {
  mocks.getTelegramFollowUp.mockResolvedValue(status)
  mocks.createTelegramLink.mockResolvedValue(link)
  await mount()
  let created: TelegramLink | null = null
  await act(async () => {
    created = await current.createLink()
  })
  await flush()
  return { link, created: created as TelegramLink | null }
}

describe('useTelegramFollowUp', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    })
    vi.setSystemTime(NOW)
    Object.values(mocks.toast).forEach((fn) => fn.mockReset())
    mocks.getTelegramFollowUp.mockReset()
    mocks.createTelegramLink.mockReset()
    mocks.removeTelegramFollower.mockReset()
  })

  afterEach(async () => {
    await unmount()
    delete (document as unknown as Record<string, unknown>).visibilityState
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads the status on mount (isLoading true -> false, followers set)', async () => {
    const pending = deferred<TelegramFollowUpStatus>()
    mocks.getTelegramFollowUp.mockReturnValue(pending.promise)

    await mount()
    expect(current.isLoading).toBe(true)
    expect(current.followers).toEqual([])

    await act(async () => {
      pending.resolve(makeStatus([follower('a'), follower('b')]))
    })
    await flush()

    expect(current.isLoading).toBe(false)
    expect(current.failure).toBeNull()
    expect(current.isAvailable).toBe(true)
    expect(current.botUsername).toBe('school_bot')
    expect(current.followers.map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('maps a 503 on the initial load to failure.kind "unavailable"', async () => {
    mocks.getTelegramFollowUp.mockRejectedValue(apiError(503))
    await mount()

    expect(current.isLoading).toBe(false)
    expect(current.failure).toEqual({ kind: 'unavailable', message: '' })
    expect(current.isAvailable).toBe(false)
  })

  it('maps a 403 on the initial load to failure.kind "forbidden"', async () => {
    mocks.getTelegramFollowUp.mockRejectedValue(apiError(403))
    await mount()

    expect(current.failure?.kind).toBe('forbidden')
    expect(current.isLoading).toBe(false)
  })

  it('maps a 404 on the initial load to failure.kind "notFound"', async () => {
    mocks.getTelegramFollowUp.mockRejectedValue(apiError(404))
    await mount()

    expect(current.failure?.kind).toBe('notFound')
  })

  it('maps a network error to failure.kind "generic" with an empty message', async () => {
    mocks.getTelegramFollowUp.mockRejectedValue(new Error('Network Error'))
    await mount()

    expect(current.failure).toEqual({ kind: 'generic', message: '' })
  })

  it('keeps a localized server message on the failure', async () => {
    mocks.getTelegramFollowUp.mockRejectedValue(apiError(503, 'الخدمة غير متاحة'))
    await mount()

    expect(current.failure).toEqual({ kind: 'unavailable', message: 'الخدمة غير متاحة' })
  })

  it('reports the feature as unavailable when the server says configured:false', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([], false))
    await mount()

    expect(current.failure).toBeNull()
    expect(current.status).not.toBeNull()
    expect(current.isAvailable).toBe(false)
  })

  it('createLink success returns the link and exposes it as `link`', async () => {
    const { link, created } = await mountWithLink()

    expect(created).toEqual(link)
    expect(current.link).toEqual(link)
    expect(current.isCreating).toBe(false)
    expect(current.linkExpired).toBe(false)
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('createLink 429 toasts the rateLimited key when the message is generic', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus())
    mocks.createTelegramLink.mockRejectedValue(apiError(429, GENERIC_429))
    await mount()

    let result: TelegramLink | null = makeLink()
    await act(async () => {
      result = await current.createLink()
    })

    expect(result).toBeNull()
    expect(current.link).toBeNull()
    expect(mocks.toast.error).toHaveBeenCalledTimes(1)
    expect(mocks.toast.error).toHaveBeenCalledWith('profile.telegram.rateLimited')
  })

  it('createLink prefers a real server message over the fallback', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus())
    mocks.createTelegramLink.mockRejectedValue(apiError(429, 'Slow down please'))
    await mount()

    await act(async () => {
      await current.createLink()
    })

    expect(mocks.toast.error).toHaveBeenCalledWith('Slow down please')
  })

  it('createLink 503 marks the feature unavailable', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a')]))
    mocks.createTelegramLink.mockRejectedValue(apiError(503))
    await mount()
    expect(current.isAvailable).toBe(true)

    await act(async () => {
      await current.createLink()
    })

    expect(current.isAvailable).toBe(false)
    expect(current.link).toBeNull()
    expect(mocks.toast.error).toHaveBeenCalledWith('profile.telegram.linkError')
  })

  it('createLink with a null result toasts linkInvalid', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus())
    mocks.createTelegramLink.mockResolvedValue(null)
    await mount()

    let result: TelegramLink | null = makeLink()
    await act(async () => {
      result = await current.createLink()
    })

    expect(result).toBeNull()
    expect(current.link).toBeNull()
    expect(mocks.toast.error).toHaveBeenCalledWith('profile.telegram.linkInvalid')
  })

  it('a second createLink while one is in flight does not hit the API again', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus())
    const pending = deferred<TelegramLink | null>()
    mocks.createTelegramLink.mockReturnValue(pending.promise)
    await mount()

    const link = makeLink()
    let first!: Promise<TelegramLink | null>
    let second!: Promise<TelegramLink | null>
    await act(async () => {
      first = current.createLink()
      second = current.createLink()
    })
    expect(current.isCreating).toBe(true)
    expect(mocks.createTelegramLink).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve(link)
      await Promise.all([first, second])
    })

    expect(await first).toEqual(link)
    expect(await second).toBeNull()
    expect(mocks.createTelegramLink).toHaveBeenCalledTimes(1)
    expect(current.isCreating).toBe(false)
    expect(current.link).toEqual(link)
  })

  it('polls every 4s while a link is live', async () => {
    await mountWithLink()
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(1)

    await flush(4_000)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)

    await flush(4_000)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(3)
  })

  it('does not poll while the document is hidden and resumes when shown', async () => {
    await mountWithLink()
    stubVisibility('hidden')

    await flush(12_000)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(1)

    stubVisibility('visible')
    await flush(4_000)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)
  })

  it('does not poll when there is no link', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a')]))
    await mount()

    await flush(20_000)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(1)
  })

  it('a new active follower on a refresh retires the live link and toasts linkedSuccess', async () => {
    await mountWithLink(makeStatus([follower('a')]))
    expect(current.link).not.toBeNull()

    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a'), follower('b')]))
    await flush(4_000)

    expect(current.link).toBeNull()
    expect(current.linkExpired).toBe(false)
    expect(current.followers.map((f) => f.id)).toEqual(['a', 'b'])
    expect(mocks.toast.success).toHaveBeenCalledTimes(1)
    expect(mocks.toast.success).toHaveBeenCalledWith('profile.telegram.linkedSuccess')
  })

  it('does not retire the link for a new but inactive follower', async () => {
    const { link } = await mountWithLink(makeStatus([follower('a')]))

    mocks.getTelegramFollowUp.mockResolvedValue(
      makeStatus([follower('a'), follower('b', { isActive: false })]),
    )
    await flush(4_000)

    expect(current.link).toEqual(link)
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('expires the link after a final silent refresh when nobody linked', async () => {
    // Expires before the first 4s poll so the final refresh is the only extra call.
    await mountWithLink(makeStatus([follower('a')]), makeLink(3_000))
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(1)

    await flush(2_900)
    expect(current.link).not.toBeNull()
    expect(current.linkExpired).toBe(false)

    await flush(200)
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)
    expect(current.linkExpired).toBe(true)
    expect(current.link).toBeNull()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })

  it('does not report expiry when the final refresh shows the parent linked', async () => {
    await mountWithLink(makeStatus([follower('a')]), makeLink(3_000))

    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a'), follower('b')]))
    await flush(3_100)

    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)
    expect(current.link).toBeNull()
    expect(current.linkExpired).toBe(false)
    expect(mocks.toast.success).toHaveBeenCalledWith('profile.telegram.linkedSuccess')
  })

  it('createLink clears a previous expiry flag', async () => {
    await mountWithLink(makeStatus([follower('a')]), makeLink(3_000))
    await flush(3_100)
    expect(current.linkExpired).toBe(true)

    mocks.createTelegramLink.mockResolvedValue(makeLink())
    await act(async () => {
      await current.createLink()
    })

    expect(current.linkExpired).toBe(false)
    expect(current.link).not.toBeNull()
  })

  it('removeFollower applies the returned list and toasts success', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a'), follower('b')]))
    mocks.removeTelegramFollower.mockResolvedValue(makeStatus([follower('b')]))
    await mount()

    await act(async () => {
      await current.removeFollower('a')
    })

    expect(mocks.removeTelegramFollower).toHaveBeenCalledWith('a', expect.any(AbortSignal))
    expect(current.followers.map((f) => f.id)).toEqual(['b'])
    expect(current.removingIds.size).toBe(0)
    expect(mocks.toast.success).toHaveBeenCalledWith('profile.telegram.stopSuccess')
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(1)
  })

  it('removeFollower marks the row as removing while in flight and ignores repeats', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a')]))
    const pending = deferred<TelegramFollowUpStatus | null>()
    mocks.removeTelegramFollower.mockReturnValue(pending.promise)
    await mount()

    let first!: Promise<void>
    await act(async () => {
      first = current.removeFollower('a')
      void current.removeFollower('a')
    })
    expect(current.removingIds.has('a')).toBe(true)
    expect(mocks.removeTelegramFollower).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve(makeStatus([]))
      await first
    })
    expect(current.removingIds.size).toBe(0)
  })

  it('removeFollower 404 toasts followerGone and refreshes the list', async () => {
    mocks.getTelegramFollowUp.mockResolvedValueOnce(makeStatus([follower('a'), follower('b')]))
    mocks.removeTelegramFollower.mockRejectedValue(apiError(404))
    await mount()

    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('b')]))
    await act(async () => {
      await current.removeFollower('a')
    })
    await flush()

    expect(mocks.toast.info).toHaveBeenCalledWith('profile.telegram.followerGone')
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)
    expect(current.followers.map((f) => f.id)).toEqual(['b'])
  })

  it('removeFollower other errors toast stopError', async () => {
    mocks.getTelegramFollowUp.mockResolvedValue(makeStatus([follower('a')]))
    mocks.removeTelegramFollower.mockRejectedValue(new Error('Network Error'))
    await mount()

    await act(async () => {
      await current.removeFollower('a')
    })

    expect(mocks.toast.error).toHaveBeenCalledWith('profile.telegram.stopError')
    expect(current.followers.map((f) => f.id)).toEqual(['a'])
    expect(current.removingIds.size).toBe(0)
  })

  it('removeFollower with a null list drops the row locally and re-syncs', async () => {
    mocks.getTelegramFollowUp.mockResolvedValueOnce(makeStatus([follower('a'), follower('b')]))
    mocks.removeTelegramFollower.mockResolvedValue(null)
    await mount()

    const resync = deferred<TelegramFollowUpStatus | null>()
    mocks.getTelegramFollowUp.mockReturnValue(resync.promise)

    await act(async () => {
      await current.removeFollower('a')
    })

    // The row is gone before the re-sync answers.
    expect(current.followers.map((f) => f.id)).toEqual(['b'])
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(2)
    expect(mocks.toast.success).toHaveBeenCalledWith('profile.telegram.stopSuccess')

    await act(async () => {
      resync.resolve(makeStatus([follower('b')]))
    })
    await flush()
    expect(current.followers.map((f) => f.id)).toEqual(['b'])
  })

  it('drops a slow, older response that resolves after a newer one', async () => {
    mocks.getTelegramFollowUp.mockResolvedValueOnce(makeStatus([follower('a')]))
    await mount()

    const slow = deferred<TelegramFollowUpStatus | null>()
    const fast = deferred<TelegramFollowUpStatus | null>()
    mocks.getTelegramFollowUp
      .mockReturnValueOnce(slow.promise)
      .mockReturnValueOnce(fast.promise)

    await act(async () => {
      current.reload() // older
      current.reload() // newer
    })
    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(3)

    await act(async () => {
      fast.resolve(makeStatus([follower('a'), follower('new')]))
    })
    await flush()
    expect(current.followers.map((f) => f.id)).toEqual(['a', 'new'])

    await act(async () => {
      slow.resolve(makeStatus([follower('stale')]))
    })
    await flush()

    expect(current.followers.map((f) => f.id)).toEqual(['a', 'new'])
    expect(current.isLoading).toBe(false)
  })

  it('aborts the in-flight load on unmount and ignores its late result', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pending = deferred<TelegramFollowUpStatus | null>()
    mocks.getTelegramFollowUp.mockReturnValue(pending.promise)
    await mount()

    const signal = mocks.getTelegramFollowUp.mock.calls[0][0] as AbortSignal
    expect(signal.aborted).toBe(false)

    await unmount()
    expect(signal.aborted).toBe(true)

    await act(async () => {
      pending.resolve(makeStatus([follower('a')], true))
    })
    await flush()

    expect(errorSpy).not.toHaveBeenCalled()
    expect(mocks.toast.success).not.toHaveBeenCalled()
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('stops polling and expiry timers after unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountWithLink(makeStatus([follower('a')]), makeLink(10_000))
    const callsBefore = mocks.getTelegramFollowUp.mock.calls.length

    await unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(mocks.getTelegramFollowUp).toHaveBeenCalledTimes(callsBefore)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
