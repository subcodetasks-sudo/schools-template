import DOMPurify from 'dompurify'

const SAFE_URL_PROTOCOLS = ['http:', 'https:']

/**
 * Returns `value` as an absolute http(s) URL, or null.
 * API-supplied links must go through this before reaching `href`/`src`, so a
 * `javascript:` or `data:` URL can never be rendered as a clickable link.
 */
export function toSafeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return SAFE_URL_PROTOCOLS.includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

let linkHookInstalled = false

function ensureLinkHook() {
  if (linkHookInstalled) return
  linkHookInstalled = true

  // Links in CMS content open in a new tab without leaking `window.opener`.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

/**
 * Sanitizes untrusted rich-text HTML (CMS/API content) before it is injected with
 * `dangerouslySetInnerHTML`. Strips scripts, inline event handlers and unsafe URLs.
 */
export function sanitizeHtml(html: string): string {
  ensureLinkHook()
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
