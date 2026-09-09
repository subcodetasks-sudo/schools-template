import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ListChecks, Percent } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  getStudentWeeklyAssessments,
  type StudentWeeklyAssessmentEntry,
  type StudentWeeklyAssessmentMonth,
  type StudentWeeklyAssessmentSubject,
  type StudentWeeklyAssessmentsPayload,
  type StudentWeeklyAssessmentsQuery,
  type StudentWeeklyAssessmentTerm,
} from '@/features/profile/studentProfileApi'
import { cn } from '@/lib/utils'

const FILTER_MONTHS: StudentWeeklyAssessmentMonth[] = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
]

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

function formatScorePair(score: number | null | undefined, max: number | null | undefined) {
  if (score == null && max == null) return '—'
  return `${score ?? 0} / ${max ?? 0}`
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
      <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white">
        {label}
      </span>
      <span className="flex min-h-11 flex-1 items-center rounded-lg border border-brand-dark/10 bg-white px-4 py-2.5 text-sm font-medium text-brand-dark">
        {value}
      </span>
    </div>
  )
}

function ProgressBar({ percentage }: { percentage: number | null | undefined }) {
  if (percentage === null || percentage === undefined) {
    return <div className="h-2 rounded-full bg-brand-dark/8" />
  }

  return (
    <div className="h-2 overflow-hidden rounded-full bg-brand-dark/8">
      <div
        className="h-full rounded-full bg-brand-primary transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  )
}

function scoreColumnLabel(
  key: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const translationKey = `profile.weeklyEvaluations.scoreColumns.${key}`
  const translated = t(translationKey)
  return translated === translationKey ? key : translated
}

function mergeSubjects(
  current: StudentWeeklyAssessmentSubject[],
  incoming: StudentWeeklyAssessmentSubject[],
) {
  const map = new Map<number, StudentWeeklyAssessmentSubject>()
  for (const subject of current) map.set(subject.id, subject)
  for (const subject of incoming) map.set(subject.id, subject)
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

function EntryCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: StudentWeeklyAssessmentEntry
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const termKey = entry.term ? `profile.weeklyEvaluations.terms.${entry.term}` : null
  const monthKey = entry.month ? `profile.weeklyEvaluations.months.${entry.month}` : null
  const termLabel = termKey ? (t(termKey) === termKey ? String(entry.term) : t(termKey)) : null
  const monthLabel = monthKey
    ? t(monthKey) === monthKey
      ? String(entry.month)
      : t(monthKey)
    : null
  const weekLabel =
    entry.week != null ? t('profile.weeklyEvaluations.weekNumber', { n: entry.week }) : null
  const meta = [termLabel, monthLabel, weekLabel].filter(Boolean).join(' · ')
  const scoreEntries = Object.entries(entry.scores ?? {})

  return (
    <article className="overflow-hidden rounded-xl border border-brand-dark/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-start transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0">
          <p className="font-semibold text-brand-dark">{entry.subject?.name || '—'}</p>
          {meta ? <p className="mt-1 text-xs text-brand-dark/55 sm:text-sm">{meta}</p> : null}
          {entry.week_date ? (
            <p className="mt-1 text-xs text-brand-dark/45">
              {t('profile.weeklyEvaluations.weekDate')}: {entry.week_date}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-end">
            <p className="text-sm font-bold text-brand-primary">
              {formatPercentage(entry.percentage)}
            </p>
            <p className="mt-0.5 text-xs text-brand-dark/55">
              {formatScorePair(entry.total, entry.max_total)}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'size-4 text-brand-dark/45 transition-transform',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-brand-dark/10 bg-muted/20 px-4 py-3">
          {scoreEntries.length === 0 ? (
            <p className="text-sm text-brand-dark/45">{t('profile.weeklyEvaluations.noScores')}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {scoreEntries.map(([key, value]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-dark/10 bg-white px-3 py-2 text-sm"
                >
                  <span className="text-brand-dark/70">{scoreColumnLabel(key, t)}</span>
                  <span className="font-semibold text-brand-dark">
                    {value === null || value === undefined ? '—' : value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </article>
  )
}

function readQuery(searchParams: URLSearchParams): StudentWeeklyAssessmentsQuery {
  const academic_year = searchParams.get('academic_year') || undefined
  const term = searchParams.get('term') || undefined
  const month = searchParams.get('month') || undefined
  const subjectRaw = searchParams.get('subject_id')
  const subject_id = subjectRaw && subjectRaw !== 'all' ? subjectRaw : undefined

  return { academic_year, term, month, subject_id }
}

function hasActiveFilters(query: StudentWeeklyAssessmentsQuery) {
  return Boolean(query.academic_year || query.term || query.month || query.subject_id)
}

export function WeeklyEvaluationsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => readQuery(searchParams), [searchParams])
  const filtersActive = hasActiveFilters(query)

  const [data, setData] = useState<StudentWeeklyAssessmentsPayload | null>(null)
  const [subjectOptions, setSubjectOptions] = useState<StudentWeeklyAssessmentSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadAssessments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = await getStudentWeeklyAssessments(query)
      setData(payload)

      const fromSummary =
        payload.summary?.by_subject
          ?.map((item) => item.subject)
          .filter((subject): subject is StudentWeeklyAssessmentSubject => Boolean(subject?.id)) ??
        []
      const fromEntries =
        payload.entries
          ?.map((entry) => entry.subject)
          .filter((subject): subject is StudentWeeklyAssessmentSubject => Boolean(subject?.id)) ??
        []

      setSubjectOptions((current) => mergeSubjects(current, [...fromSummary, ...fromEntries]))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.weeklyEvaluations.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [query, t])

  useEffect(() => {
    void loadAssessments()
  }, [loadAssessments])

  const updateFilter = (key: keyof StudentWeeklyAssessmentsQuery, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    const normalized = value == null ? '' : String(value)
    if (!normalized || normalized === 'all') next.delete(key)
    else next.set(key, normalized)
    setExpandedId(null)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setExpandedId(null)
    setSearchParams({}, { replace: true })
  }

  const student = data?.student
  const summary = data?.summary
  const entries = data?.entries ?? []
  const bySubject = summary?.by_subject ?? []

  const studentName = student?.name?.trim() || '—'
  const studentGrade = student?.grade?.name?.trim() || '—'
  const studentClass =
    student?.classroom?.section?.trim() ||
    student?.classroom?.label?.trim() ||
    student?.class_number?.trim() ||
    '—'
  const classroomDisplay =
    studentClass === '—'
      ? '—'
      : t('profile.parentSummon.classroomSection', { section: studentClass })

  const selectedTerm = query.term || 'all'
  const selectedMonth = query.month || 'all'
  const selectedSubject = query.subject_id ? String(query.subject_id) : 'all'
  const selectedYear = query.academic_year || data?.filters?.academic_year || ''

  const termOptions: Array<'all' | StudentWeeklyAssessmentTerm> = ['all', 'first', 'second']
  const monthOptions = ['all', ...FILTER_MONTHS] as const

  const selectedSubjectName =
    subjectOptions.find((subject) => String(subject.id) === selectedSubject)?.name ||
    bySubject.find((item) => String(item.subject?.id) === selectedSubject)?.subject?.name

  if (isLoading && !data) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55">
        {t('profile.loading')}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void loadAssessments()}
          className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('profile.nav.weeklyEvaluations')}
          <svg
            className="absolute -bottom-0.5 inset-s-0 h-2.5 w-24 text-brand-secondary"
            viewBox="0 0 120 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 8C20 2 40 10 58 6C76 2 96 10 118 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </h1>
        {selectedYear ? (
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.weeklyEvaluations.academicYear', { year: selectedYear })}
          </p>
        ) : null}
      </div>

      <div className="mt-8 space-y-4">
        <InfoField label={t('profile.weeklyEvaluations.studentName')} value={studentName} />
        <div className="flex flex-col gap-4 sm:flex-row">
          <InfoField label={t('profile.weeklyEvaluations.grade')} value={studentGrade} />
          <InfoField label={t('profile.weeklyEvaluations.className')} value={classroomDisplay} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-brand-dark/55">
                {t('profile.weeklyEvaluations.summary.percentage')}
              </p>
              <p className="mt-1 text-3xl font-bold text-brand-dark">
                {formatPercentage(summary?.percentage)}
              </p>
              <p className="mt-1 text-sm text-brand-dark/55">
                {formatScorePair(summary?.total_score, summary?.total_max)}
              </p>
            </div>
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <Percent className="size-5" aria-hidden />
            </span>
          </div>
        </article>
        <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
          <p className="text-sm text-brand-dark/55">
            {t('profile.weeklyEvaluations.summary.sessions')}
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-dark">
            {summary?.sessions_count ?? 0}
          </p>
        </article>
        <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
          <p className="text-sm text-brand-dark/55">
            {t('profile.weeklyEvaluations.summary.totalScore')}
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-dark">
            {formatScorePair(summary?.total_score, summary?.total_max)}
          </p>
        </article>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select
          value={selectedTerm}
          onValueChange={(value) => updateFilter('term', value == null ? 'all' : String(value))}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-brand-dark/15 bg-white data-[size=default]:h-11 sm:w-44">
            <span className="flex-1 text-start">
              {selectedTerm === 'all'
                ? t('profile.weeklyEvaluations.filters.allTerms')
                : t(`profile.weeklyEvaluations.terms.${selectedTerm}`)}
            </span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
            {termOptions.map((term) => (
              <SelectItem key={term} value={term} className="rounded-lg">
                {term === 'all'
                  ? t('profile.weeklyEvaluations.filters.allTerms')
                  : t(`profile.weeklyEvaluations.terms.${term}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMonth}
          onValueChange={(value) => updateFilter('month', value == null ? 'all' : String(value))}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-brand-dark/15 bg-white data-[size=default]:h-11 sm:w-44">
            <span className="flex-1 text-start">
              {selectedMonth === 'all'
                ? t('profile.weeklyEvaluations.filters.allMonths')
                : t(`profile.weeklyEvaluations.months.${selectedMonth}`)}
            </span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month} className="rounded-lg">
                {month === 'all'
                  ? t('profile.weeklyEvaluations.filters.allMonths')
                  : t(`profile.weeklyEvaluations.months.${month}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSubject}
          onValueChange={(value) =>
            updateFilter('subject_id', value == null ? 'all' : String(value))
          }
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-brand-dark/15 bg-white data-[size=default]:h-11 sm:w-52">
            <span className="flex-1 text-start">
              {selectedSubject === 'all'
                ? t('profile.weeklyEvaluations.filters.allSubjects')
                : selectedSubjectName || t('profile.weeklyEvaluations.filters.allSubjects')}
            </span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
            <SelectItem value="all" className="rounded-lg">
              {t('profile.weeklyEvaluations.filters.allSubjects')}
            </SelectItem>
            {subjectOptions.map((subject) => (
              <SelectItem key={subject.id} value={String(subject.id)} className="rounded-lg">
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 rounded-xl border border-brand-dark/15 px-4 text-sm font-medium text-brand-dark hover:bg-muted/40"
          >
            {t('profile.weeklyEvaluations.filters.clear')}
          </button>
        ) : null}

        {isLoading ? (
          <span className="text-sm text-brand-dark/45">{t('profile.loading')}</span>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <section className="mt-6 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-brand-dark">
          {t('profile.weeklyEvaluations.bySubjectTitle')}
        </h2>
        {bySubject.length === 0 ? (
          <p className="mt-6 py-6 text-center text-sm text-brand-dark/45">
            {filtersActive
              ? t('profile.weeklyEvaluations.emptyFiltered')
              : t('profile.weeklyEvaluations.emptySubjects')}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bySubject.map((item) => {
              const id = item.subject?.id
              const active = id != null && String(id) === selectedSubject
              return (
                <li key={id ?? item.subject?.name}>
                  <button
                    type="button"
                    onClick={() =>
                      updateFilter('subject_id', active || id == null ? 'all' : String(id))
                    }
                    className={cn(
                      'w-full rounded-xl border px-3 py-3 text-start transition-colors',
                      active
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-brand-dark/10 hover:border-brand-primary/40',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-brand-dark">
                        {item.subject?.name || '—'}
                      </span>
                      <span className="font-semibold text-brand-primary">
                        {formatPercentage(item.percentage)}
                      </span>
                    </div>
                    <ProgressBar percentage={item.percentage} />
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-dark/55">
                      <span>
                        {t('profile.weeklyEvaluations.subjectSessions', {
                          count: item.sessions,
                        })}
                      </span>
                      <span>{formatScorePair(item.score, item.max)}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-bold text-brand-dark">
          {t('profile.weeklyEvaluations.entriesTitle')}
        </h2>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-16 text-center">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <ListChecks className="size-6" aria-hidden />
            </div>
            <p className="text-lg font-bold text-brand-dark">
              {filtersActive
                ? t('profile.weeklyEvaluations.emptyFilteredTitle')
                : t('profile.weeklyEvaluations.emptyTitle')}
            </p>
            <p className="mt-2 max-w-md text-sm text-brand-dark/55">
              {filtersActive
                ? t('profile.weeklyEvaluations.emptyFiltered')
                : t('profile.weeklyEvaluations.emptyDescription')}
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                {t('profile.weeklyEvaluations.filters.clear')}
              </button>
            ) : null}
          </div>
        ) : (
          entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((current) => (current === entry.id ? null : entry.id))
              }
            />
          ))
        )}
      </section>
    </div>
  )
}
