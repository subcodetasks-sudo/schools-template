import { describe, expect, it } from 'vitest'
import {
  STUDENT_PASSWORD_PATTERN,
  sanitizeStudentPassword,
  toAsciiDigits,
  validateStudentPassword,
} from './studentPassword'

describe('validateStudentPassword', () => {
  it.each(['1234', '0000', '987654321', '0123', '9'.repeat(100)])('accepts %s', (value) => {
    expect(validateStudentPassword(value)).toBeNull()
    expect(STUDENT_PASSWORD_PATTERN.test(value)).toBe(true)
  })

  it('refuses bad values with the right reason', () => {
    expect(validateStudentPassword('')).toBe('required')
    expect(validateStudentPassword('123')).toBe('tooShort')
    expect(validateStudentPassword('abcd')).toBe('digitsOnly')
    expect(validateStudentPassword('12a4')).toBe('digitsOnly')
    expect(validateStudentPassword('12 34')).toBe('digitsOnly')
    expect(validateStudentPassword('1234\n')).toBe('digitsOnly')
    expect(validateStudentPassword('١٢٣٤')).toBe('digitsOnly')
    expect(validateStudentPassword('1'.repeat(101))).toBe('tooLong')
  })
})

describe('sanitizeStudentPassword', () => {
  it('drops non-digits and keeps leading zeros', () => {
    expect(sanitizeStudentPassword('0a1 2-3+e4')).toBe('01234')
    expect(sanitizeStudentPassword('  0012  ')).toBe('0012')
    expect(sanitizeStudentPassword('abc')).toBe('')
  })

  it('converts Arabic-Indic, Persian and full-width digits', () => {
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
    expect(sanitizeStudentPassword('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
    expect(sanitizeStudentPassword('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
    expect(sanitizeStudentPassword('０１２３')).toBe('0123')
    expect(sanitizeStudentPassword('١2٣4')).toBe('1234')
  })

  it('drops zero-width and bidi marks that pasting often adds', () => {
    expect(sanitizeStudentPassword('‏12‎34‬')).toBe('1234')
  })

  it('caps the length at 100', () => {
    expect(sanitizeStudentPassword('7'.repeat(250))).toHaveLength(100)
  })

  it('tolerates non-string input', () => {
    expect(sanitizeStudentPassword(undefined)).toBe('')
    expect(sanitizeStudentPassword(1234)).toBe('')
  })
})
