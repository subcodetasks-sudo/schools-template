// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { unwrapData, unwrapList } from '@/lib/api/client'

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
