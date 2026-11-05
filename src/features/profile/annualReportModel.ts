import type {
  StudentAnnualReportPayload,
  StudentAnnualSubjectRow,
  StudentAnnualWeekly,
  StudentAnnualWeeklyMonthRow,
  StudentAssessmentVisibility,
  StudentWeeklyAssessmentBucket,
  StudentWeeklyAssessmentEntry,
} from '@/features/profile/studentProfileApi'

/**
 * View model for the assessments part of the annual report.
 *
 * The school can hide weekly assessments, monthly assessments and results per term. The API
 * reports what is open in `assessments.visibility`; the arrays inside the report are already
 * filtered by the server. Rules here:
 *  - read `visibility`, never infer "hidden" from empty data;
 *  - a missing `visibility` (staff view, old cache) means everything is open;
 *  - term tabs come from the open terms of each part, never a fixed `['first', 'second']`;
 *  - totals are shown as sent — nothing is summed on the client.
 */

export const ASSESSMENT_TERMS = ['first', 'second'] as const
export type AssessmentTerm = (typeof ASSESSMENT_TERMS)[number]

export type VisibilityPart = keyof StudentAssessmentVisibility

const ALL_TERMS: readonly AssessmentTerm[] = ASSESSMENT_TERMS

export function normalizeAssessmentTerm(value: unknown): AssessmentTerm | null {
  if (typeof value !== 'string') return null
  const term = value.trim().toLowerCase()
  return (ALL_TERMS as readonly string[]).includes(term) ? (term as AssessmentTerm) : null
}

/**
 * Terms the school keeps open for one part.
 *  - no `visibility` object, or no entry for this part → everything is open;
 *  - an array → exactly the terms listed (unknown values ignored, duplicates removed);
 *  - an empty array → hidden for every term.
 */
export function openTermsFor(
  visibility: StudentAssessmentVisibility | null | undefined,
  part: VisibilityPart,
): AssessmentTerm[] {
  if (!visibility || typeof visibility !== 'object') return [...ALL_TERMS]
  const list = visibility[part]
  if (!Array.isArray(list)) return [...ALL_TERMS]
  const open = new Set(list.map(normalizeAssessmentTerm).filter((t): t is AssessmentTerm => t !== null))
  return ALL_TERMS.filter((term) => open.has(term))
}

/** Keep a row only if its term is open. A row with no readable term is kept only when nothing is closed. */
function inOpenTerms<T>(rows: T[] | null | undefined, open: AssessmentTerm[], termOf: (row: T) => unknown) {
  if (!Array.isArray(rows)) return []
  const nothingClosed = open.length === ALL_TERMS.length
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false
    const term = normalizeAssessmentTerm(termOf(row))
    return term ? open.includes(term) : nothingClosed
  })
}

export type PartView<T> = {
  /** No term is open: replace the whole section with the hidden message. */
  hidden: boolean
  /** Open terms of this part, in first → second order. These drive the term tabs. */
  openTerms: AssessmentTerm[]
  /** At least one term is open and at least one is closed. */
  partlyHidden: boolean
  rows: T[]
}

function partView<T>(
  open: AssessmentTerm[],
  rows: T[],
  forcedHidden = false,
): PartView<T> {
  const hidden = forcedHidden || open.length === 0
  return {
    hidden,
    openTerms: hidden ? [] : open,
    partlyHidden: !hidden && open.length < ALL_TERMS.length,
    rows: hidden ? [] : rows,
  }
}

export type WeeklyPartView = PartView<StudentWeeklyAssessmentEntry> & {
  /** Totals as sent by the API (never re-added). `null` when the section is hidden. */
  summary: StudentAnnualWeekly['summary'] | null
  /** Per-term totals as sent, keyed by term, for the term tabs. */
  byTerm: Partial<Record<AssessmentTerm, StudentWeeklyAssessmentBucket>>
}

export type ResultsPartView = PartView<StudentAnnualSubjectRow> & {
  /** Subjects are withheld until the success certificate is unlocked. Separate from `hidden`. */
  locked: boolean
}

export type AnnualSummaryView = {
  subjectsCount: number | null
  subjectsPassed: number | null
  subjectsFailed: number | null
  subjectsIncomplete: number | null
}

export type AnnualAssessmentsView = {
  weekly: WeeklyPartView
  monthly: PartView<StudentAnnualWeeklyMonthRow>
  results: ResultsPartView
  summary: AnnualSummaryView
  /** Everything about assessments is closed: the page shows one hidden message per part. */
  allHidden: boolean
}

function countOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function buildAnnualAssessmentsView(
  report: Partial<StudentAnnualReportPayload> | null | undefined,
): AnnualAssessmentsView {
  const assessments = report?.assessments ?? null
  const visibility = assessments?.visibility ?? null
  const weekly = assessments?.weekly ?? null

  const weeklyOpen = openTermsFor(visibility, 'weekly_assessments')
  const monthlyOpen = openTermsFor(visibility, 'monthly_assessments')
  const resultsOpen = openTermsFor(visibility, 'results')

  // `weekly.hidden === true` is authoritative even when `visibility` is missing.
  const weeklyView = partView(
    weeklyOpen,
    inOpenTerms(weekly?.entries, weeklyOpen, (entry) => entry.term),
    weekly?.hidden === true,
  )

  const byTerm: WeeklyPartView['byTerm'] = {}
  if (!weeklyView.hidden) {
    for (const bucket of weekly?.summary?.by_term ?? []) {
      const term = normalizeAssessmentTerm(bucket?.term)
      if (term && weeklyOpen.includes(term) && !byTerm[term]) byTerm[term] = bucket
    }
  }

  const monthlyView = partView(
    monthlyOpen,
    inOpenTerms(weekly?.by_month, monthlyOpen, (row) => row.term),
  )

  const resultsHiddenView = partView(
    resultsOpen,
    inOpenTerms(assessments?.subjects, resultsOpen, (row) => row.term),
  )
  const results: ResultsPartView = {
    ...resultsHiddenView,
    locked: assessments?.subjects_locked === true,
  }

  // Counts are only meaningful when the results are visible and unlocked. Otherwise show dashes,
  // even if a stale response still carried numbers.
  const countsAvailable = !results.hidden && !results.locked
  const summary = report?.summary
  const count = (value: unknown) => (countsAvailable ? countOrNull(value) : null)

  return {
    weekly: {
      ...weeklyView,
      summary: weeklyView.hidden ? null : (weekly?.summary ?? null),
      byTerm,
    },
    monthly: monthlyView,
    results,
    summary: {
      subjectsCount: count(summary?.subjects_count),
      subjectsPassed: count(summary?.subjects_passed),
      subjectsFailed: count(summary?.subjects_failed),
      subjectsIncomplete: count(summary?.subjects_incomplete),
    },
    allHidden: weeklyView.hidden && monthlyView.hidden && results.hidden,
  }
}

export type TermFilter = 'all' | AssessmentTerm

/**
 * Tabs for one part: built from its open terms. With two open terms there is an "all" tab;
 * with one open term there is nothing to switch, so no tabs are returned.
 */
export function termTabsFor(openTerms: AssessmentTerm[]): TermFilter[] {
  return openTerms.length > 1 ? ['all', ...openTerms] : []
}

/** The effective filter: the chosen one if that tab exists, else "all" (or the single open term). */
export function resolveTermFilter(
  selected: TermFilter,
  openTerms: AssessmentTerm[],
): TermFilter {
  if (openTerms.length === 1) return openTerms[0]
  if (selected === 'all' || openTerms.includes(selected)) return selected
  return 'all'
}

export function filterByTerm<T>(
  rows: T[],
  filter: TermFilter,
  termOf: (row: T) => unknown,
): T[] {
  if (filter === 'all') return rows
  return rows.filter((row) => normalizeAssessmentTerm(termOf(row)) === filter)
}

/** Terms that exist in the standard set but are closed for this part (for the "other term" note). */
export function closedTermsFor(openTerms: AssessmentTerm[]): AssessmentTerm[] {
  return ALL_TERMS.filter((term) => !openTerms.includes(term))
}
