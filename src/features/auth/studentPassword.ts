/**
 * Student password rules (backend): digits `0-9` only, 4 to 100 characters.
 * Applies to students ONLY and ONLY where a password is being created or changed.
 * Never use this on the login screen: students registered earlier may have letters.
 */
export const STUDENT_PASSWORD_MIN = 4
export const STUDENT_PASSWORD_MAX = 100
export const STUDENT_PASSWORD_PATTERN = /^[0-9]{4,100}$/

export type StudentPasswordIssue = 'required' | 'tooShort' | 'tooLong' | 'digitsOnly'

/** Arabic-Indic (٠-٩), Eastern Arabic-Indic/Persian (۰-۹) and full-width (０-９) digits. */
const NON_ASCII_DIGITS: ReadonlyArray<readonly [number, number]> = [
  [0x0660, 0x0669],
  [0x06f0, 0x06f9],
  [0xff10, 0xff19],
]

/** Converts every non-ASCII digit to its `0-9` equivalent; leaves other characters alone. */
export function toAsciiDigits(value: string): string {
  let out = ''
  for (const char of value) {
    const code = char.codePointAt(0)!
    const range = NON_ASCII_DIGITS.find(([start, end]) => code >= start && code <= end)
    out += range ? String(code - range[0]) : char
  }
  return out
}

/**
 * Turns anything typed or pasted into what we accept: non-ASCII digits are converted,
 * every other non-digit (letters, spaces, symbols, zero-width marks) is dropped, and
 * the result is capped at the maximum length. Always returns a string, so leading
 * zeros survive.
 */
export function sanitizeStudentPassword(value: unknown): string {
  if (typeof value !== 'string') return ''
  return toAsciiDigits(value).replace(/[^0-9]/g, '').slice(0, STUDENT_PASSWORD_MAX)
}

/** Strict check of a raw value (no sanitizing). Returns the first problem, or `null` when valid. */
export function validateStudentPassword(value: string): StudentPasswordIssue | null {
  if (value.length === 0) return 'required'
  if (!/^[0-9]+$/.test(value)) return 'digitsOnly'
  if (value.length < STUDENT_PASSWORD_MIN) return 'tooShort'
  if (value.length > STUDENT_PASSWORD_MAX) return 'tooLong'
  return null
}
