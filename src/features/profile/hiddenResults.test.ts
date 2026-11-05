// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ token: 'token-a' as string | null }))
vi.mock('@/features/auth/userStore', () => ({
  useUserStore: { getState: () => ({ token: session.token }) },
}))

import i18n from '@/lib/i18n'
import { ApiError, getHiddenInfo } from '@/lib/api'
import {
  guardHidden,
  guardHiddenTerm,
  hiddenScope,
  lockedTerms,
  resetHiddenResults,
} from '@/features/profile/hiddenResults'

const hiddenError = (message = 'closed', resource = 'weekly_assessments') =>
  new ApiError(message, { status: 403, data: { hidden: true, resource } })

type Payload = { filters?: { term?: string | null } | null }

describe('getHiddenInfo', () => {
  it('detects 403 with data.hidden', () => {
    expect(getHiddenInfo(hiddenError('x'))).toEqual({ message: 'x', resource: 'weekly_assessments' })
  })

  it('ignores a plain 403, 401 and non-API errors', () => {
    expect(getHiddenInfo(new ApiError('no', { status: 403, data: null }))).toBeNull()
    expect(getHiddenInfo(new ApiError('no', { status: 403, data: { hidden: false } }))).toBeNull()
    expect(getHiddenInfo(new ApiError('no', { status: 403, data: { hidden: 'true' } }))).toBeNull()
    expect(getHiddenInfo(new ApiError('x', { status: 401, data: { hidden: true } }))).toBeNull()
    expect(getHiddenInfo(new Error('x'))).toBeNull()
    expect(getHiddenInfo(null)).toBeNull()
  })
})

describe('guardHidden', () => {
  beforeEach(() => {
    session.token = 'token-a'
    resetHiddenResults()
    void i18n.changeLanguage('ar')
  })

  it('remembers a hidden answer and does not call again', async () => {
    const request = vi.fn().mockRejectedValue(hiddenError('مغلق'))
    await expect(guardHidden('annual_report', '|', request)).rejects.toMatchObject({ status: 403 })
    await expect(guardHidden('annual_report', '|', request)).rejects.toMatchObject({
      message: 'مغلق',
    })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not remember other errors', async () => {
    const request = vi.fn().mockRejectedValue(new ApiError('boom', { status: 500 }))
    await expect(guardHidden('annual_report', '|', request)).rejects.toThrow('boom')
    await expect(guardHidden('annual_report', '|', request)).rejects.toThrow('boom')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('asks again after a language switch to get a localized message', async () => {
    const request = vi.fn().mockRejectedValue(hiddenError('مغلق'))
    await expect(guardHidden('results', '|', request)).rejects.toBeDefined()
    await i18n.changeLanguage('en')
    await expect(guardHidden('results', '|', request)).rejects.toBeDefined()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('forgets everything when the session changes', async () => {
    const request = vi.fn().mockRejectedValue(hiddenError())
    await expect(guardHidden('results', '|', request)).rejects.toBeDefined()
    session.token = 'token-b'
    await expect(guardHidden('results', '|', request)).rejects.toBeDefined()
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('guardHiddenTerm', () => {
  beforeEach(() => {
    session.token = 'token-a'
    resetHiddenResults()
  })

  it('locks only the requested term on 403 and skips repeat calls', async () => {
    const request = vi.fn().mockRejectedValue(hiddenError())
    await expect(guardHiddenTerm('weekly_assessments', undefined, 'first', request)).rejects.toBeDefined()
    expect(lockedTerms('weekly_assessments', undefined)).toEqual(['first'])

    await expect(guardHiddenTerm('weekly_assessments', undefined, 'first', request)).rejects.toBeDefined()
    expect(request).toHaveBeenCalledTimes(1)

    const ok = vi.fn().mockResolvedValue({ filters: { term: 'second' } })
    await expect(guardHiddenTerm('weekly_assessments', undefined, 'second', ok)).resolves.toBeDefined()
    expect(lockedTerms('weekly_assessments', undefined)).toEqual(['first'])
  })

  it('locks both terms when a request without term is hidden', async () => {
    const request = vi.fn().mockRejectedValue(hiddenError())
    await expect(guardHiddenTerm('monthly_assessments', undefined, undefined, request)).rejects.toBeDefined()
    expect(lockedTerms('monthly_assessments', undefined)).toEqual(['first', 'second'])

    await expect(guardHiddenTerm('monthly_assessments', undefined, undefined, request)).rejects.toBeDefined()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('infers the closed term from filters.term when none was asked for', async () => {
    const request = vi.fn().mockResolvedValue({ filters: { term: 'second' } } satisfies Payload)
    await guardHiddenTerm('weekly_assessments', undefined, undefined, request)
    expect(lockedTerms('weekly_assessments', undefined)).toEqual(['first'])

    // Still asks the server without a term while only one term is closed.
    await guardHiddenTerm('weekly_assessments', undefined, undefined, request)
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('unlocks terms when a later response carries both', async () => {
    await guardHiddenTerm('weekly_assessments', undefined, undefined, async () => ({
      filters: { term: 'first' },
    }))
    expect(lockedTerms('weekly_assessments', undefined)).toEqual(['second'])

    await guardHiddenTerm('weekly_assessments', undefined, undefined, async () => ({
      filters: { term: null },
    }))
    expect(lockedTerms('weekly_assessments', undefined)).toEqual([])
  })

  it('keeps years and resources apart', async () => {
    await expect(
      guardHiddenTerm('weekly_assessments', '2025/2026', 'first', async () => {
        throw hiddenError()
      }),
    ).rejects.toBeDefined()
    expect(lockedTerms('weekly_assessments', '2025/2026')).toEqual(['first'])
    expect(lockedTerms('weekly_assessments', '2026/2027')).toEqual([])
    expect(lockedTerms('monthly_assessments', '2025/2026')).toEqual([])
    expect(hiddenScope('2025/2026', 'first')).toBe('2025/2026|first')
  })
})
