import { describe, expect, it } from 'vitest'
import type { StudentMonthlyAssessmentsPayload } from './studentProfileApi'
import {
  buildMonthlyAssessmentsView,
  monthlyTestKeyNumber,
  toNumber,
} from './monthlyAssessmentsModel'

const arabic = { id: 3, name: 'اللغة العربية', code: 'AR' }
const math = { id: 1, name: 'الرياضيات', code: 'MATH' }

function payload(
  overrides: Partial<StudentMonthlyAssessmentsPayload> = {},
): Partial<StudentMonthlyAssessmentsPayload> {
  return { summary: {}, months: [], ...overrides }
}

const test1 = { key: 'monthly_1', name: 'اختبار شهري 1', score: 17, max: 20 }
const test2 = { key: 'monthly_2', name: 'اختبار شهري 2', score: 9, max: 10 }

const full = payload({
  months: [
    {
      month: 'october',
      term: 'first',
      academic_year: '2026/2027',
      subject: arabic,
      sessions: 3,
      score: 66,
      max: 75,
      percentage: 88,
      average_percentage: 88,
      monthly_test: test1,
    },
    {
      month: 'october',
      term: 'first',
      academic_year: '2026/2027',
      subject: math,
      sessions: 4,
      score: 30,
      max: 40,
      percentage: 75,
      average_percentage: 75,
      monthly_test: null,
    },
    {
      month: 'november',
      term: 'first',
      academic_year: '2026/2027',
      subject: arabic,
      sessions: 0,
      score: 0,
      max: 0,
      percentage: undefined,
      average_percentage: null,
      monthly_test: test2,
    },
  ],
  by_month: [
    {
      month: 'october',
      term: 'first',
      academic_year: '2026/2027',
      sessions: 7,
      score: 96,
      max: 115,
      average_percentage: 83.5,
      tests: [{ subject: arabic, ...test1 }],
    },
    {
      month: 'november',
      term: 'first',
      academic_year: '2026/2027',
      sessions: 0,
      score: 0,
      max: 0,
      average_percentage: null,
      tests: [{ subject: arabic, ...test2 }],
    },
  ],
  unplaced_tests: [
    { academic_year: '2026/2027', term: 'first', subject: math, key: 'monthly_2', name: 'اختبار شهري 2', score: 8, max: 10 },
  ],
})

describe('toNumber', () => {
  it('accepts finite numbers and numeric strings', () => {
    expect(toNumber(0)).toBe(0)
    expect(toNumber(12.5)).toBe(12.5)
    expect(toNumber('88.0')).toBe(88)
  })
  it.each([[null], [undefined], [''], ['  '], ['abc'], [NaN], [Infinity], [{}], [[]]])(
    'returns null for %s (never 0)',
    (value) => {
      expect(toNumber(value)).toBeNull()
    },
  )
})

describe('buildMonthlyAssessmentsView', () => {
  it('builds one card per month from by_month, with its average, in order', () => {
    const view = buildMonthlyAssessmentsView(full)
    expect(view.groups).toHaveLength(1)
    const [october, november] = view.groups[0].cards
    expect(october.month).toBe('october')
    expect(october.average).toBe(83.5)
    expect(november.month).toBe('november')
  })

  it('shows test 1 only in its own month and test 2 only in its own month', () => {
    const [october, november] = buildMonthlyAssessmentsView(full).groups[0].cards
    expect(october.tests.map((t) => t.key)).toEqual(['monthly_1'])
    expect(november.tests.map((t) => t.key)).toEqual(['monthly_2'])
    expect(october.tests[0]).toMatchObject({ score: 17, max: 20, subjectName: 'اللغة العربية' })
  })

  it('keeps a month that has a test but no weekly sheets, with a null average', () => {
    const november = buildMonthlyAssessmentsView(full).groups[0].cards[1]
    expect(november.average).toBeNull()
    expect(november.hasWeeklySheets).toBe(false)
    expect(november.tests).toHaveLength(1)
    expect(november.rows[0]).toMatchObject({
      sessions: 0,
      average: null,
      hasWeeklySheets: false,
      test: { key: 'monthly_2', score: 9, max: 10 },
    })
  })

  it('gives a subject without a test a null test (no mark shown)', () => {
    const october = buildMonthlyAssessmentsView(full).groups[0].cards[0]
    const mathRow = october.rows.find((r) => r.subjectName === 'الرياضيات')
    expect(mathRow?.test).toBeNull()
    expect(mathRow?.average).toBe(75)
  })

  it('sorts subject rows by name', () => {
    const october = buildMonthlyAssessmentsView(full).groups[0].cards[0]
    expect(october.rows.map((r) => r.subjectName)).toEqual(['الرياضيات', 'اللغة العربية'])
  })

  it('uses average_percentage as sent and does not recompute it', () => {
    const october = buildMonthlyAssessmentsView(full).groups[0].cards[0]
    // 96/115 would be 83.478…; the API says 83.5 and that wins.
    expect(october.average).toBe(83.5)
    expect(october.score).toBe(96)
    expect(october.max).toBe(115)
  })

  it('lists unplaced tests separately and never inside a month', () => {
    const view = buildMonthlyAssessmentsView(full)
    expect(view.unplacedTests).toHaveLength(1)
    expect(view.unplacedTests[0]).toMatchObject({ key: 'monthly_2', score: 8, subjectName: 'الرياضيات' })
    const inCards = view.groups.flatMap((g) => g.cards.flatMap((c) => c.tests))
    expect(inCards.some((t) => t.score === 8)).toBe(false)
  })

  describe('missing or old payloads', () => {
    it.each([[null], [undefined], [{}]])('does not break on %s', (value) => {
      const view = buildMonthlyAssessmentsView(value as never)
      expect(view.groups).toEqual([])
      expect(view.unplacedTests).toEqual([])
      expect(view.isEmpty).toBe(true)
    })

    it('treats null by_month / unplaced_tests / months as []', () => {
      const view = buildMonthlyAssessmentsView({
        summary: {},
        months: null as never,
        by_month: null,
        unplaced_tests: null,
      })
      expect(view.isEmpty).toBe(true)
    })

    it('still lists months from months[] when by_month is missing, without inventing an average', () => {
      const view = buildMonthlyAssessmentsView(payload({ months: full.months }))
      const cards = view.groups[0].cards
      expect(cards.map((c) => c.month)).toEqual(['october', 'november'])
      expect(cards.every((c) => c.average === null)).toBe(true)
      // Tests fall back to the rows' own monthly_test, still in their own month.
      expect(cards[0].tests.map((t) => t.key)).toEqual(['monthly_1'])
      expect(cards[1].tests.map((t) => t.key)).toEqual(['monthly_2'])
      expect(view.unplacedTests).toEqual([])
    })

    it('does not invent months that the response does not contain', () => {
      const view = buildMonthlyAssessmentsView(full)
      const months = view.groups.flatMap((g) => g.cards.map((c) => c.month))
      expect(months).toEqual(['october', 'november'])
    })

    it('falls back to legacy total/max_total and percentage when score/average are absent', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          months: [
            { month: 'september', term: 'first', subject: math, total: 10, max_total: 20, percentage: 50 },
          ],
        }),
      )
      expect(view.groups[0].cards[0].rows[0]).toMatchObject({ score: 10, max: 20, average: 50 })
    })

    it('does not fall back to percentage when average_percentage is an explicit null', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          months: [
            {
              month: 'september',
              term: 'first',
              subject: math,
              sessions: 0,
              percentage: 0,
              average_percentage: null,
            },
          ],
        }),
      )
      expect(view.groups[0].cards[0].rows[0].average).toBeNull()
    })
  })

  describe('tests without a saved mark', () => {
    it('drops a test whose score is null/blank — never a fake 0', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          months: [
            {
              month: 'october',
              term: 'first',
              subject: math,
              sessions: 1,
              score: 5,
              max: 10,
              average_percentage: 50,
              monthly_test: { key: 'monthly_1', name: 'x', score: null, max: 20 },
            },
          ],
          by_month: [
            {
              month: 'october',
              term: 'first',
              sessions: 1,
              average_percentage: 50,
              tests: [
                { subject: math, key: 'monthly_1', name: 'x', score: null, max: 20 },
                { subject: arabic, key: 'monthly_1', name: 'y', score: '' as never, max: 20 },
              ],
            },
          ],
          unplaced_tests: [{ subject: math, key: 'monthly_2', name: 'z', score: null, max: 10 }],
        }),
      )
      const card = view.groups[0].cards[0]
      expect(card.rows[0].test).toBeNull()
      expect(card.tests).toEqual([])
      expect(view.unplacedTests).toEqual([])
    })

    it('keeps a real mark of 0', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          by_month: [
            {
              month: 'october',
              term: 'first',
              sessions: 1,
              average_percentage: 0,
              tests: [{ subject: math, key: 'monthly_1', name: 'x', score: 0, max: 20 }],
            },
          ],
        }),
      )
      const card = view.groups[0].cards[0]
      expect(card.tests[0].score).toBe(0)
      expect(card.average).toBe(0)
    })

    it('ignores null entries inside arrays', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          months: [null as never],
          by_month: [null as never],
          unplaced_tests: [null as never],
        }),
      )
      expect(view.isEmpty).toBe(true)
    })
  })

  describe('terms and years', () => {
    const twoTerms = payload({
      by_month: [
        { month: 'january', term: 'second', academic_year: '2026/2027', sessions: 1, average_percentage: 70, tests: [] },
        { month: 'october', term: 'first', academic_year: '2026/2027', sessions: 1, average_percentage: 80, tests: [] },
        { month: 'september', term: 'first', academic_year: '2026/2027', sessions: 1, average_percentage: 90, tests: [] },
      ],
    })

    it('groups cards by term, first before second, months in academic order', () => {
      const view = buildMonthlyAssessmentsView(twoTerms)
      expect(view.groups.map((g) => g.term)).toEqual(['first', 'second'])
      expect(view.groups[0].cards.map((c) => c.month)).toEqual(['september', 'october'])
      expect(view.groups[1].cards.map((c) => c.month)).toEqual(['january'])
    })

    it('normalizes case and whitespace of month and term', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          by_month: [{ month: ' October ', term: 'FIRST', sessions: 1, average_percentage: 1, tests: [] }],
          months: [{ month: 'october', term: 'first', subject: math, sessions: 1, score: 1, max: 1, average_percentage: 1 }],
        }),
      )
      expect(view.groups[0].cards).toHaveLength(1)
      expect(view.groups[0].cards[0].rows).toHaveLength(1)
    })

    it('keeps the same month of different academic years apart and flags multiple years', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          by_month: [
            { month: 'october', term: 'first', academic_year: '2025/2026', sessions: 1, average_percentage: 60, tests: [] },
            { month: 'october', term: 'first', academic_year: '2026/2027', sessions: 1, average_percentage: 80, tests: [] },
          ],
        }),
      )
      expect(view.groups).toHaveLength(2)
      expect(view.multipleYears).toBe(true)
      expect(buildMonthlyAssessmentsView(twoTerms).multipleYears).toBe(false)
    })

    it('shows only the open term when the response has a single term', () => {
      const view = buildMonthlyAssessmentsView(
        payload({
          by_month: [{ month: 'october', term: 'second', sessions: 1, average_percentage: 80, tests: [] }],
        }),
      )
      expect(view.groups.map((g) => g.term)).toEqual(['second'])
    })

    it('does not double-count a repeated (year, term, month)', () => {
      const entry = { month: 'october', term: 'first', sessions: 1, average_percentage: 80, tests: [] }
      const view = buildMonthlyAssessmentsView(payload({ by_month: [entry, entry] }))
      expect(view.groups[0].cards).toHaveLength(1)
    })
  })

  it('reports unplaced-only responses as non-empty', () => {
    const view = buildMonthlyAssessmentsView(
      payload({ unplaced_tests: [{ subject: math, key: 'monthly_1', name: 'x', score: 3, max: 10 }] }),
    )
    expect(view.groups).toEqual([])
    expect(view.isEmpty).toBe(false)
  })
})

describe('monthlyTestKeyNumber', () => {
  it('extracts the test number', () => {
    expect(monthlyTestKeyNumber('monthly_1')).toBe('1')
    expect(monthlyTestKeyNumber('monthly_2')).toBe('2')
    expect(monthlyTestKeyNumber('final')).toBeNull()
  })
})
