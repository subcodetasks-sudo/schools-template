import { describe, expect, it } from 'vitest'
import { buildWeeklyTable } from '@/features/profile/weeklyTableModel'
import type { StudentWeeklyAssessmentEntry } from '@/features/profile/studentProfileApi'

const entry = (over: Partial<StudentWeeklyAssessmentEntry>): StudentWeeklyAssessmentEntry => ({
  id: String(Math.random()),
  subject: { id: 1, name: 'Math' },
  term: 'first',
  month: 'october',
  week: 4,
  scores: {},
  total: 20,
  max_total: 20,
  percentage: 100,
  ...over,
})

describe('buildWeeklyTable', () => {
  it('keeps two different weeks that share the same month week number apart', () => {
    const model = buildWeeklyTable([
      entry({ term_week: 4, week_starts_on: '2026-10-04' }),
      entry({ term_week: 5, week_starts_on: '2026-10-11' }),
    ])
    const rows = model.months[0].rows
    expect(rows.map((row) => row.week)).toEqual([4, 5])
    expect(rows.map((row) => row.weekDate)).toEqual(['2026-10-04', '2026-10-11'])
  })

  it('never sums a subject/week cell (no 40/20)', () => {
    const model = buildWeeklyTable([
      entry({ term_week: 4, week_starts_on: '2026-10-04' }),
      entry({ term_week: 4, week_starts_on: '2026-10-04' }),
    ])
    const cell = model.months[0].rows[0].cells['1']
    expect(cell.total).toBe(20)
    expect(cell.maxTotal).toBe(20)
  })

  it('falls back to the month week for older payloads', () => {
    const model = buildWeeklyTable([entry({ week: 2 }), entry({ week: 3 })])
    expect(model.months[0].rows.map((row) => row.week)).toEqual([2, 3])
  })
})
