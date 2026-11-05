import type {
  StudentMonthlyAssessmentRow,
  StudentMonthlyAssessmentsPayload,
  StudentMonthlyByMonth,
  StudentMonthlyTest,
  StudentMonthlyTestEntry,
  StudentUnplacedTest,
} from '@/features/profile/studentProfileApi'

/**
 * View model for the monthly assessments screen.
 *
 * Rules (from the API contract):
 *  - averages are used exactly as sent, never recomputed here;
 *  - a test shows only in the month it belongs to, and only when it has a mark;
 *  - `by_month` / `unplaced_tests` can be missing (old or cached responses) — treat as `[]`;
 *  - months are never invented: only months present in the response are listed.
 */

const TERM_ORDER = ['first', 'second']

/** Calendar order of the academic year (September first). */
const MONTH_ORDER = [
  'september',
  'october',
  'november',
  'december',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
]

export type MonthlyTestView = {
  key: string
  /** API-provided name, empty when the API sent none (the UI then falls back to the key). */
  name: string
  score: number
  max: number | null
}

export type MonthlySubjectRowView = {
  id: string
  subjectId: number | string | null
  subjectName: string
  sessions: number
  score: number | null
  max: number | null
  /** Weekly average of the subject in the month; `null` when there are no weekly sheets. */
  average: number | null
  hasWeeklySheets: boolean
  test: MonthlyTestView | null
}

export type MonthlyTestEntryView = MonthlyTestView & {
  subjectName: string
}

export type MonthCardView = {
  id: string
  month: string
  term: string
  academicYear: string | null
  sessions: number
  score: number | null
  max: number | null
  /** Average over all subjects of the month; `null` when the month has no weekly sheets. */
  average: number | null
  hasWeeklySheets: boolean
  tests: MonthlyTestEntryView[]
  rows: MonthlySubjectRowView[]
}

export type MonthGroupView = {
  id: string
  term: string
  academicYear: string | null
  cards: MonthCardView[]
}

export type UnplacedTestView = MonthlyTestEntryView & {
  id: string
  term: string
  academicYear: string | null
}

export type MonthlyAssessmentsView = {
  groups: MonthGroupView[]
  unplacedTests: UnplacedTestView[]
  /** More than one academic year is present, so the UI should label the year. */
  multipleYears: boolean
  isEmpty: boolean
}

/** A finite number, or `null`. Accepts numeric strings (`"88.0"`) but never turns blank/garbage into 0. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeMonth(value: unknown): string {
  return cleanString(value).toLowerCase()
}

export function normalizeTerm(value: unknown): string {
  return cleanString(value).toLowerCase()
}

function normalizeYear(value: unknown): string | null {
  return cleanString(value) || null
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

/** `monthly_test` only counts when it carries a saved mark — never render "0" for a missing mark. */
function toTestView(test: StudentMonthlyTest | null | undefined): MonthlyTestView | null {
  if (!test || typeof test !== 'object') return null
  const score = toNumber(test.score)
  if (score === null) return null
  const key = cleanString(test.key)
  const name = cleanString(test.name)
  if (!key && !name) return null
  return { key, name, score, max: toNumber(test.max) }
}

function toTestEntryView(entry: StudentMonthlyTestEntry | null | undefined): MonthlyTestEntryView | null {
  const test = toTestView(entry)
  if (!test) return null
  return { ...test, subjectName: cleanString(entry?.subject?.name) }
}

function termRank(term: string) {
  const index = TERM_ORDER.indexOf(term)
  return index === -1 ? TERM_ORDER.length : index
}

function monthRank(month: string) {
  const index = MONTH_ORDER.indexOf(month)
  return index === -1 ? MONTH_ORDER.length : index
}

function cardId(year: string | null, term: string, month: string) {
  return `${year ?? ''}|${term}|${month}`
}

function rowKey(row: StudentMonthlyAssessmentRow, index: number) {
  return `${row.subject?.id ?? row.subject?.name ?? 'subject'}-${index}`
}

function toRowView(row: StudentMonthlyAssessmentRow, index: number): MonthlySubjectRowView {
  const sessions = toNumber(row.sessions) ?? 0
  // `score`/`max` are the documented fields; `total`/`max_total` are only legacy fallbacks.
  const score = toNumber(row.score) ?? toNumber(row.total)
  const max = toNumber(row.max) ?? toNumber(row.max_total)
  // `average_percentage` is authoritative; `percentage` carries the same value for old consumers.
  // Only fall back to `percentage` when the key is absent — an explicit `null` means "no weekly sheets".
  const average =
    row.average_percentage !== undefined
      ? toNumber(row.average_percentage)
      : toNumber(row.percentage)

  return {
    id: rowKey(row, index),
    subjectId: row.subject?.id ?? null,
    subjectName: cleanString(row.subject?.name),
    sessions,
    score,
    max,
    average,
    hasWeeklySheets: average !== null || sessions > 0,
    test: toTestView(row.monthly_test),
  }
}

function sortRows(rows: MonthlySubjectRowView[]) {
  return [...rows].sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar'))
}

type RawCard = {
  month: string
  term: string
  academicYear: string | null
  source: StudentMonthlyByMonth | null
  rows: StudentMonthlyAssessmentRow[]
}

export function buildMonthlyAssessmentsView(
  payload: Partial<StudentMonthlyAssessmentsPayload> | null | undefined,
): MonthlyAssessmentsView {
  const months = asArray(payload?.months)
  const byMonth = asArray(payload?.by_month)
  const unplaced = asArray(payload?.unplaced_tests)

  const raw = new Map<string, RawCard>()

  // Cards come from `by_month`, in the order sent.
  for (const entry of byMonth) {
    const month = normalizeMonth(entry?.month)
    if (!month) continue
    const term = normalizeTerm(entry.term)
    const academicYear = normalizeYear(entry.academic_year)
    const id = cardId(academicYear, term, month)
    // A repeated (year, term, month) is a backend slip; keep the first rather than double-count.
    if (!raw.has(id)) raw.set(id, { month, term, academicYear, source: entry, rows: [] })
  }

  // Subject rows attach to their card. A month that only exists in `months[]` (old response
  // without `by_month`) still gets a card, with no average and no tests rather than a made-up one.
  for (const row of months) {
    const month = normalizeMonth(row?.month)
    if (!month) continue
    const term = normalizeTerm(row.term)
    const academicYear = normalizeYear(row.academic_year)
    const id = cardId(academicYear, term, month)
    const card = raw.get(id) ?? { month, term, academicYear, source: null, rows: [] }
    card.rows.push(row)
    raw.set(id, card)
  }

  const cards: MonthCardView[] = [...raw.entries()].map(([id, card]) => {
    const rows = sortRows(card.rows.map(toRowView))
    const source = card.source

    // Prefer the card's own `tests[]`. If it is absent (old response), fall back to the rows'
    // `monthly_test`, so a test is never lost — and never copied to another month.
    const sourceTests = source?.tests
    const tests: MonthlyTestEntryView[] = Array.isArray(sourceTests)
      ? sourceTests.map(toTestEntryView).filter((t): t is MonthlyTestEntryView => t !== null)
      : rows.flatMap((row) =>
          row.test ? [{ ...row.test, subjectName: row.subjectName }] : [],
        )

    const average = source ? toNumber(source.average_percentage) : null
    const sessions = source ? (toNumber(source.sessions) ?? 0) : rows.reduce((n, r) => n + r.sessions, 0)

    return {
      id,
      month: card.month,
      term: card.term,
      academicYear: card.academicYear,
      sessions,
      score: source ? toNumber(source.score) : null,
      max: source ? toNumber(source.max) : null,
      average,
      hasWeeklySheets: average !== null || sessions > 0,
      tests,
      rows,
    }
  })

  // `by_month` already arrives sorted by term then month; re-sorting with a stable sort only
  // matters for the fallback path and never reorders correctly-sent data.
  cards.sort(
    (a, b) =>
      (a.academicYear ?? '').localeCompare(b.academicYear ?? '') ||
      termRank(a.term) - termRank(b.term) ||
      monthRank(a.month) - monthRank(b.month),
  )

  const groups: MonthGroupView[] = []
  for (const card of cards) {
    const id = `${card.academicYear ?? ''}|${card.term}`
    let group = groups.find((g) => g.id === id)
    if (!group) {
      group = { id, term: card.term, academicYear: card.academicYear, cards: [] }
      groups.push(group)
    }
    group.cards.push(card)
  }

  const unplacedTests: UnplacedTestView[] = unplaced.flatMap((entry: StudentUnplacedTest, index) => {
    const view = toTestEntryView(entry)
    if (!view) return []
    return [
      {
        ...view,
        id: `${index}-${view.key}-${view.subjectName}`,
        term: normalizeTerm(entry.term),
        academicYear: normalizeYear(entry.academic_year),
      },
    ]
  })

  const years = new Set(cards.map((card) => card.academicYear ?? ''))
  for (const test of unplacedTests) years.add(test.academicYear ?? '')

  return {
    groups,
    unplacedTests,
    multipleYears: years.size > 1,
    isEmpty:
      cards.length === 0 && unplacedTests.length === 0 && asArray(payload?.month_files).length === 0,
  }
}

/** Weekly parts in rubric order; columns are placed by `key`, never by array position. */
const COMPONENT_ORDER = ['homework', 'notebook', 'weekly', 'behavior']

export type MonthFileCell = { average: number | null; max: number | null }

export type MonthFileSubjectView = {
  id: string
  subjectName: string
  cells: Record<string, MonthFileCell>
  weeklyTotal: number | null
  weeklyMax: number | null
  test: { score: number | null; max: number | null } | null
  total: number | null
  max: number | null
}

export type MonthFileView = {
  id: string
  month: string
  term: string
  total: number | null
  max: number | null
  percentage: number | null
  /** Columns present in this month: key + API name (may be empty). */
  columns: { key: string; name: string }[]
  subjects: MonthFileSubjectView[]
}

export function buildMonthFiles(
  payload: Partial<StudentMonthlyAssessmentsPayload> | null | undefined,
): MonthFileView[] {
  const files = asArray(payload?.month_files)
  const views: MonthFileView[] = []
  files.forEach((file, index) => {
    const month = normalizeMonth(file?.month)
    if (!month) return
    const names = new Map<string, string>()
    const subjects: MonthFileSubjectView[] = asArray(file.subjects).map((s, i) => {
      const cells: Record<string, MonthFileCell> = {}
      for (const c of asArray(s.components)) {
        const key = cleanString(c?.key)
        if (!key) continue
        cells[key] = { average: toNumber(c.average), max: toNumber(c.max) }
        if (!names.has(key) || !names.get(key)) names.set(key, cleanString(c.name))
      }
      const mt = s.monthly_test
      return {
        id: `${s.subject?.id ?? s.subject?.name ?? 'subject'}-${i}`,
        subjectName: cleanString(s.subject?.name),
        cells,
        weeklyTotal: toNumber(s.weekly_total),
        weeklyMax: toNumber(s.weekly_max),
        test: mt && typeof mt === 'object' ? { score: toNumber(mt.score), max: toNumber(mt.max) } : null,
        total: toNumber(s.total),
        max: toNumber(s.max),
      }
    })
    const rank = (k: string) => {
      const r = COMPONENT_ORDER.indexOf(k)
      return r === -1 ? COMPONENT_ORDER.length : r
    }
    const columns = [...names.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => rank(a.key) - rank(b.key))
    const term = normalizeTerm(file.term)
    views.push({
      id: `${term}|${month}|${index}`,
      month,
      term,
      total: toNumber(file.summary?.total),
      max: toNumber(file.summary?.max),
      percentage: toNumber(file.summary?.percentage),
      columns,
      subjects,
    })
  })
  return views.sort((a, b) => termRank(a.term) - termRank(b.term) || monthRank(a.month) - monthRank(b.month))
}

/** Test label: the API name, else a translated name for `monthly_1` / `monthly_2`, else the raw key. */
export function monthlyTestKeyNumber(key: string): string | null {
  const match = key.match(/^monthly_(\d+)$/i)
  return match ? match[1] : null
}
