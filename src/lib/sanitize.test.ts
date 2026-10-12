// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeHtml, toSafeHttpUrl } from '@/lib/sanitize'

describe('toSafeHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(toSafeHttpUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf')
    expect(toSafeHttpUrl('  http://example.com/x ')).toBe('http://example.com/x')
  })

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com/x',
    '/relative/path',
    '',
    '   ',
  ])('rejects %j', (value) => {
    expect(toSafeHttpUrl(value)).toBeNull()
  })

  it('rejects non-strings', () => {
    expect(toSafeHttpUrl(null)).toBeNull()
    expect(toSafeHttpUrl(undefined)).toBeNull()
    expect(toSafeHttpUrl(42)).toBeNull()
  })
})

describe('sanitizeHtml', () => {
  it('removes script tags and inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="x()">Hi</p><script>alert(1)</script><img src=x onerror="alert(1)">')
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/onclick|onerror/i)
    expect(out).toContain('Hi')
  })

  it('removes javascript: links but keeps safe formatting', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">bad</a><strong>ok</strong>')
    expect(out).not.toMatch(/javascript:/i)
    expect(out).toContain('<strong>ok</strong>')
  })

  it('forces safe link attributes on anchors', () => {
    const out = sanitizeHtml('<a href="https://example.com">site</a>')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })
})
