// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter } from 'axios'
import { api, registerAuthBridge, unwrapData, unwrapList } from '@/lib/api/client'
import { getHiddenInfo } from '@/lib/api/errors'

describe('unwrapData', () => {
  it('returns the envelope data', () => {
    expect(unwrapData({ success: true, message: '', data: { id: 1 } })).toEqual({ id: 1 })
  })

  it('returns plain payloads unchanged', () => {
    expect(unwrapData([1, 2])).toEqual([1, 2])
    expect(unwrapData(null)).toBeNull()
  })

  it('unwraps a double-wrapped envelope', () => {
    const payload = { success: true, message: '', data: { success: true, message: '', data: 'x' } }
    expect(unwrapData(payload)).toBe('x')
  })
})

describe('unwrapList', () => {
  it('accepts arrays, enveloped arrays and paginated shapes', () => {
    expect(unwrapList([1])).toEqual([1])
    expect(unwrapList({ success: true, message: '', data: [1, 2] })).toEqual([1, 2])
    expect(unwrapList({ success: true, message: '', data: { data: [3] } })).toEqual([3])
  })

  it('returns an empty list for unexpected shapes', () => {
    expect(unwrapList({ success: true, message: '', data: { foo: 1 } } as never)).toEqual([])
  })
})

describe('403 "hidden by the school"', () => {
  function respondWith(status: number, body: unknown) {
    const adapter: AxiosAdapter = (config) =>
      Promise.reject(
        new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
          status,
          statusText: '',
          headers: {},
          config,
          data: body,
        }),
      )
    return adapter
  }

  async function failing(status: number, body: unknown) {
    const onUnauthorized = vi.fn()
    registerAuthBridge({ getToken: () => 'tok', onUnauthorized })
    try {
      await api.get('/v1/auth/student/profile/weekly-assessments', {
        adapter: respondWith(status, body),
      })
    } catch (error) {
      return { error, onUnauthorized }
    }
    throw new Error('expected a rejection')
  }

  it('is detected, keeps the localized message and does not end the session', async () => {
    const { error, onUnauthorized } = await failing(403, {
      success: false,
      message: 'غير متاحة',
      data: { hidden: true, resource: 'weekly_assessments' },
    })
    expect(getHiddenInfo(error)).toEqual({ message: 'غير متاحة', resource: 'weekly_assessments' })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('does not leak the axios status text when the body has no message', async () => {
    const { error } = await failing(403, { data: { hidden: true } })
    expect(getHiddenInfo(error)?.message).toBe('')
  })

  it('leaves a plain 403 alone and still logs out on 401', async () => {
    const plain = await failing(403, { success: false, message: 'forbidden', data: null })
    expect(getHiddenInfo(plain.error)).toBeNull()
    expect(plain.onUnauthorized).not.toHaveBeenCalled()

    const unauthorized = await failing(401, { message: 'Unauthenticated.' })
    expect(unauthorized.onUnauthorized).toHaveBeenCalledWith('tok')
  })
})
