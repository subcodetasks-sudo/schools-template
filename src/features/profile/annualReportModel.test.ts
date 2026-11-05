import { describe, expect, it } from 'vitest'
import type {
  StudentAnnualReportPayload,
  StudentAssessmentVisibility,
  StudentWeeklyAssessmentEntry,
} from './studentProfileApi'
import {
  buildAnnualAssessmentsView,
  closedTermsFor,
  filterByTerm,
  openTermsFor,
  resolveTermFilter,
  termTabsFor,
} from './annualReportModel'

function entry(id: string, term: string): StudentWeeklyAssessmentEntry {
  return { id, term, scores: {}, total: 10, max_total: 14, percentage: 71.4 }
}

function report(
  visibility: StudentAssessmentVisibility | null | undefined,
  overrides: Partial<NonNullable<StudentAnnualReportPayload['assessments']>> = {},
  summary: StudentAnnualReportPayload['summary'] = {
    subjects_count: 6,
    subjects_passed: 5,
    subjects_failed: 0,
    subjects_incomplete: 1,
  },
): StudentAnnualReportPayload {
  return {
    assessments: {
      visibility,
      weekly: {
        entries: [entry('a', 'first'), entry('b', 'second')],
        by_month: [
          { month: 'october', term: 'first', sessions: 3, score: 30, max: 40, percentage: 75 },
          { month: 'february', term: 'second', sessions: 3, score: 33, max: 40, percentage: 82.5 },
        ],
        summary: {
          sessions_count: 2,
          total_score: 20,
          total_max: 28,
          percentage: 71.4,
          by_subject: [],
          by_term: [
            { term: 'first', sessions: 1, score: 10, max: 14, percentage: 71.4 },
            { term: 'second', sessions: 1, score: 10, max: 14, percentage: 71.4 },
          ],
        },
      },
      subjects_locked: false,
      subjects: [
        { term: 'first', subject: { id: 1, name: 'Math' }, total: 87, total_max: 100 },
        { term: 'second', subject: { id: 1, name: 'Math' }, total: 90, total_max: 100 },
      ],
      ...overrides,
    },
    summary,
  }
}

describe('openTermsFor', () => {
  it.each([[undefined], [null], ['x' as never], [42 as never]])(
    'treats a missing/invalid visibility (%s) as everything open',
    (visibility) => {
      expect(openTermsFor(visibility as never, 'results')).toEqual(['first', 'second'])
    },
  )

  it('treats a part missing from the visibility object as open', () => {
    expect(openTermsFor({ results: ['first'] }, 'weekly_assessments')).toEqual(['first', 'second'])
    expect(openTermsFor({ results: null }, 'results')).toEqual(['first', 'second'])
  })

  it('returns exactly the listed terms, in first → second order, deduped', () => {
    expect(openTermsFor({ results: ['second', 'first', 'first'] }, 'results')).toEqual(['first', 'second'])
    expect(openTermsFor({ results: ['second'] }, 'results')).toEqual(['second'])
  })

  it('treats an empty list as hidden for every term', () => {
    expect(openTermsFor({ results: [] }, 'results')).toEqual([])
  })

  it('ignores unknown and non-string entries and normalizes case', () => {
    expect(openTermsFor({ results: ['FIRST', ' second ', 'third', 3, null] as never }, 'results')).toEqual([
      'first',
      'second',
    ])
    expect(openTermsFor({ results: ['third'] }, 'results')).toEqual([])
  })
})

describe('buildAnnualAssessmentsView', () => {
  it('shows both terms in every part when nothing is hidden', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first', 'second'], monthly_assessments: ['first', 'second'], results: ['first', 'second'] }),
    )
    expect(view.weekly.rows).toHaveLength(2)
    expect(view.monthly.rows).toHaveLength(2)
    expect(view.results.rows).toHaveLength(2)
    expect(view.weekly.partlyHidden || view.monthly.partlyHidden || view.results.partlyHidden).toBe(false)
    expect(view.allHidden).toBe(false)
  })

  it('works for the staff view with no visibility field', () => {
    const view = buildAnnualAssessmentsView(report(undefined))
    expect(view.weekly.openTerms).toEqual(['first', 'second'])
    expect(view.weekly.rows).toHaveLength(2)
    expect(view.monthly.rows).toHaveLength(2)
    expect(view.results.rows).toHaveLength(2)
    expect(view.summary.subjectsPassed).toBe(5)
  })

  it('works when the whole assessments block or the report is missing', () => {
    for (const input of [null, undefined, {}, { assessments: null }, { assessments: {} }]) {
      const view = buildAnnualAssessmentsView(input as never)
      expect(view.weekly.rows).toEqual([])
      expect(view.monthly.rows).toEqual([])
      expect(view.results.rows).toEqual([])
      expect(view.weekly.hidden).toBe(false)
      expect(view.summary.subjectsPassed).toBeNull()
    }
  })

  it('hiding weekly for the first term leaves only second-term sheets in entries', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['second'], monthly_assessments: ['second'], results: ['first', 'second'] }),
    )
    expect(view.weekly.hidden).toBe(false)
    expect(view.weekly.partlyHidden).toBe(true)
    expect(view.weekly.openTerms).toEqual(['second'])
    expect(view.weekly.rows.map((r) => r.id)).toEqual(['b'])
    expect(view.monthly.rows.map((r) => r.term)).toEqual(['second'])
    expect(view.weekly.byTerm.first).toBeUndefined()
    expect(view.weekly.byTerm.second).toBeDefined()
  })

  it('hiding weekly for both terms hides the weekly section and zeroes nothing', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: [], monthly_assessments: ['first', 'second'], results: ['first', 'second'] }),
    )
    expect(view.weekly.hidden).toBe(true)
    expect(view.weekly.rows).toEqual([])
    expect(view.weekly.summary).toBeNull()
    expect(view.weekly.openTerms).toEqual([])
    // The monthly roll-up has its own switch.
    expect(view.monthly.hidden).toBe(false)
    expect(view.monthly.rows).toHaveLength(2)
  })

  it('trusts weekly.hidden === true even without a visibility object', () => {
    const base = report(undefined)
    const view = buildAnnualAssessmentsView({
      ...base,
      assessments: { ...base.assessments, weekly: { hidden: true, entries: [], summary: undefined } },
    })
    expect(view.weekly.hidden).toBe(true)
    expect(view.weekly.summary).toBeNull()
  })

  it('hiding only monthly keeps weekly entries but removes the monthly roll-up', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first', 'second'], monthly_assessments: [], results: ['first', 'second'] }),
    )
    expect(view.weekly.rows).toHaveLength(2)
    expect(view.monthly.hidden).toBe(true)
    expect(view.monthly.rows).toEqual([])
  })

  it('allows weekly entries of a term without its monthly roll-up', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first', 'second'], monthly_assessments: ['first'], results: ['first', 'second'] }),
    )
    expect(view.weekly.rows).toHaveLength(2)
    expect(view.monthly.rows.map((r) => r.term)).toEqual(['first'])
  })

  it('hiding results removes the subject rows of the closed terms', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first', 'second'], monthly_assessments: ['first', 'second'], results: ['second'] }),
    )
    expect(view.results.rows.map((r) => r.term)).toEqual(['second'])
    expect(view.results.partlyHidden).toBe(true)
  })

  it('also drops rows of a closed term that a stale response still carries', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first'], monthly_assessments: ['first'], results: ['first'] }),
    )
    expect(view.weekly.rows.map((r) => r.id)).toEqual(['a'])
    expect(view.results.rows.map((r) => r.term)).toEqual(['first'])
  })

  it('drops rows with an unreadable term when a term is closed, keeps them when nothing is closed', () => {
    const rows = { weekly: { entries: [entry('x', ''), entry('a', 'first')] } }
    const closed = buildAnnualAssessmentsView({
      assessments: { visibility: { weekly_assessments: ['first'] }, ...rows },
    })
    expect(closed.weekly.rows.map((r) => r.id)).toEqual(['a'])
    const open = buildAnnualAssessmentsView({ assessments: { visibility: undefined, ...rows } })
    expect(open.weekly.rows.map((r) => r.id)).toEqual(['x', 'a'])
  })

  it('shows the report with every assessment part hidden', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: [], monthly_assessments: [], results: [] }, {}, {
        subjects_count: null,
        subjects_passed: null,
        subjects_failed: null,
        subjects_incomplete: null,
      }),
    )
    expect(view.allHidden).toBe(true)
    expect(view.weekly.hidden && view.monthly.hidden && view.results.hidden).toBe(true)
  })

  it('returns dashes (null) for summary counts when results are hidden, even if numbers were sent', () => {
    const view = buildAnnualAssessmentsView(
      report({ weekly_assessments: ['first'], monthly_assessments: ['first'], results: [] }),
    )
    expect(view.summary).toEqual({
      subjectsCount: null,
      subjectsPassed: null,
      subjectsFailed: null,
      subjectsIncomplete: null,
    })
  })

  it('returns dashes when the subjects are locked, and keeps locked separate from hidden', () => {
    const view = buildAnnualAssessmentsView(
      report(undefined, { subjects_locked: true, subjects: [] }, {
        subjects_count: null,
        subjects_passed: null,
        subjects_failed: null,
        subjects_incomplete: null,
      }),
    )
    expect(view.results.locked).toBe(true)
    expect(view.results.hidden).toBe(false)
    expect(view.summary.subjectsPassed).toBeNull()
  })

  it('keeps a legitimate zero count instead of turning it into a dash', () => {
    const view = buildAnnualAssessmentsView(
      report(undefined, {}, { subjects_count: 6, subjects_passed: 6, subjects_failed: 0, subjects_incomplete: 0 }),
    )
    expect(view.summary.subjectsFailed).toBe(0)
    expect(view.summary.subjectsIncomplete).toBe(0)
  })

  it('exposes totals exactly as sent, never re-added from the entries', () => {
    const base = report({ weekly_assessments: ['second'], monthly_assessments: ['second'], results: ['second'] })
    const view = buildAnnualAssessmentsView(base)
    expect(view.weekly.summary).toBe(base.assessments?.weekly?.summary)
    expect(view.weekly.summary?.total_score).toBe(20)
    expect(view.weekly.byTerm.second?.score).toBe(10)
  })

  it('does not break on null entries or non-array fields', () => {
    const view = buildAnnualAssessmentsView({
      assessments: {
        weekly: { entries: [null, 'x'] as never, by_month: 'oops' as never },
        subjects: null,
      },
    })
    expect(view.weekly.rows).toEqual([])
    expect(view.monthly.rows).toEqual([])
    expect(view.results.rows).toEqual([])
  })
})

describe('term tabs', () => {
  it('builds tabs from the open terms, with an "all" tab only when there are two', () => {
    expect(termTabsFor(['first', 'second'])).toEqual(['all', 'first', 'second'])
    expect(termTabsFor(['second'])).toEqual([])
    expect(termTabsFor([])).toEqual([])
  })

  it('never offers a tab for a closed term', () => {
    expect(termTabsFor(['second'])).not.toContain('first')
  })

  it('resolves the selected filter against what is open', () => {
    expect(resolveTermFilter('all', ['first', 'second'])).toBe('all')
    expect(resolveTermFilter('first', ['first', 'second'])).toBe('first')
    expect(resolveTermFilter('first', ['second'])).toBe('second')
    expect(resolveTermFilter('first', [])).toBe('all')
    // A selected tab that has just been closed falls back to "all".
    expect(resolveTermFilter('first', ['first', 'second'])).toBe('first')
  })

  it('filters rows by term', () => {
    const rows = [entry('a', 'first'), entry('b', 'second')]
    expect(filterByTerm(rows, 'all', (r) => r.term)).toHaveLength(2)
    expect(filterByTerm(rows, 'second', (r) => r.term).map((r) => r.id)).toEqual(['b'])
  })

  it('names the closed terms for the "other term unavailable" note', () => {
    expect(closedTermsFor(['first', 'second'])).toEqual([])
    expect(closedTermsFor(['second'])).toEqual(['first'])
    expect(closedTermsFor([])).toEqual(['first', 'second'])
  })
})
