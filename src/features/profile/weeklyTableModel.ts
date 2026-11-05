import type { StudentWeeklyAssessmentEntry } from '@/features/profile/studentProfileApi'
import { ACADEMIC_MONTH_ORDER } from '@/features/profile/weeklyMonthColors'

export type WeeklyTableComponentColumn = {
  key: string
  name: string
  nameEn: string | null
}

export type WeeklyTableSubjectColumn = {
  id: string
  name: string
  components: WeeklyTableComponentColumn[]
}

export type WeeklyTableComponentValue = {
  score: number | null
  max: number | null
}

export type WeeklyTableCell = {
  absent: boolean
  components: Record<string, WeeklyTableComponentValue>
  total: number | null
  maxTotal: number | null
}

export type WeeklyTableRow = {
  key: string
  week: number | null
  weekDate: string | null
  /** Keyed by subject column id. A missing key means nothing was recorded. */
  cells: Record<string, WeeklyTableCell>
}

export type WeeklyTableMonth = {
  key: string
  month: string | null
  term: string | null
  rows: WeeklyTableRow[]
}

export type WeeklyTableModel = {
  subjects: WeeklyTableSubjectColumn[]
  months: WeeklyTableMonth[]
}

const UNKNOWN_SUBJECT_ID = 'unknown'

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Components of one entry, in display order, falling back to the raw `scores` map. */
function readEntryComponents(
  entry: StudentWeeklyAssessmentEntry,
  fallbackLabel: (key: string) => string,
) {
  const fromApi = entry.components ?? []
  if (fromApi.length > 0) {
    return fromApi.map((component) => ({
      key: component.key,
      name: component.name || component.key,
      nameEn: component.name_en ?? null,
      score: toNumberOrNull(component.score),
      max: toNumberOrNull(component.max),
    }))
  }

  return Object.entries(entry.scores ?? {}).map(([key, value]) => ({
    key,
    name: fallbackLabel(key),
    nameEn: null,
    score: toNumberOrNull(value),
    max: null,
  }))
}

function entryToCell(
  entry: StudentWeeklyAssessmentEntry,
  fallbackLabel: (key: string) => string,
): WeeklyTableCell {
  const absent = Boolean(entry.is_absent)
  const components: Record<string, WeeklyTableComponentValue> = {}
  for (const component of readEntryComponents(entry, fallbackLabel)) {
    components[component.key] = {
      score: absent ? null : component.score,
      max: component.max,
    }
  }

  return {
    absent,
    components,
    total: absent ? null : toNumberOrNull(entry.total),
    maxTotal: toNumberOrNull(entry.max_total),
  }
}

/**
 * One cell is one subject x one week, so a second entry for it is a duplicate, not extra
 * marks: summing them is what produced cells like 40/20. Keep the first real entry (an
 * absence never hides recorded marks).
 */
function mergeCells(current: WeeklyTableCell, incoming: WeeklyTableCell): WeeklyTableCell {
  if (current.absent && !incoming.absent) return incoming
  return current
}

function termRank(term: string | null) {
  if (term === 'first') return 0
  if (term === 'second') return 1
  return 2
}

function monthRank(month: string | null) {
  const index = month
    ? (ACADEMIC_MONTH_ORDER as readonly string[]).indexOf(month.toLowerCase())
    : -1
  return index === -1 ? ACADEMIC_MONTH_ORDER.length : index
}

function compareNullableNumber(a: number | null, b: number | null) {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

export function buildWeeklyTable(
  entries: StudentWeeklyAssessmentEntry[],
  fallbackLabel: (key: string) => string = (key) => key,
): WeeklyTableModel {
  const subjectMap = new Map<string, WeeklyTableSubjectColumn>()
  const monthMap = new Map<string, WeeklyTableMonth>()
  const rowMap = new Map<string, WeeklyTableRow>()

  for (const entry of entries) {
    const subjectId =
      entry.subject?.id !== undefined && entry.subject?.id !== null
        ? String(entry.subject.id)
        : UNKNOWN_SUBJECT_ID

    let subject = subjectMap.get(subjectId)
    if (!subject) {
      subject = { id: subjectId, name: entry.subject?.name?.trim() || '—', components: [] }
      subjectMap.set(subjectId, subject)
    }
    for (const component of readEntryComponents(entry, fallbackLabel)) {
      if (!subject.components.some((existing) => existing.key === component.key)) {
        subject.components.push({
          key: component.key,
          name: component.name,
          nameEn: component.nameEn,
        })
      }
    }

    const term = entry.term ? String(entry.term) : null
    const month = entry.month ? String(entry.month) : null
    const monthKey = `${term ?? ''}|${month ?? ''}`
    let monthBlock = monthMap.get(monthKey)
    if (!monthBlock) {
      monthBlock = { key: monthKey, month, term, rows: [] }
      monthMap.set(monthKey, monthBlock)
    }

    // `week` is the week of the month, so "week 4" can exist in two months and in two
    // places of one month. The week from the term start (or its start date) is unique.
    const week = entry.term_week ?? entry.week ?? null
    const weekDate = entry.week_starts_on ?? entry.week_date ?? null
    const weekId = entry.term_week ?? entry.week_starts_on ?? entry.week_date ?? entry.week
    const rowKey = `${monthKey}|${weekId ?? 'unknown'}`
    let row = rowMap.get(rowKey)
    if (!row) {
      row = { key: rowKey, week, weekDate, cells: {} }
      rowMap.set(rowKey, row)
      monthBlock.rows.push(row)
    } else if (!row.weekDate && weekDate) {
      row.weekDate = weekDate
    }

    const cell = entryToCell(entry, fallbackLabel)
    const existing = row.cells[subjectId]
    row.cells[subjectId] = existing ? mergeCells(existing, cell) : cell
  }

  const subjects = Array.from(subjectMap.values()).sort((a, b) => {
    if (a.id === UNKNOWN_SUBJECT_ID) return 1
    if (b.id === UNKNOWN_SUBJECT_ID) return -1
    return a.name.localeCompare(b.name, 'ar')
  })

  const months = Array.from(monthMap.values()).sort(
    (a, b) =>
      termRank(a.term) - termRank(b.term) ||
      monthRank(a.month) - monthRank(b.month) ||
      (a.month ?? '').localeCompare(b.month ?? ''),
  )

  for (const block of months) {
    block.rows.sort(
      (a, b) =>
        (a.weekDate ?? '￿').localeCompare(b.weekDate ?? '￿') ||
        compareNullableNumber(a.week, b.week),
    )
  }

  return { subjects, months }
}
