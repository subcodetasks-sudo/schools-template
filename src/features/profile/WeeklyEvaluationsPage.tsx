import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ListChecks, Lock, Percent } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  HiddenResultState,
  HiddenTermsNotice,
  TermSelectItem,
} from '@/features/profile/HiddenResultState'
import { guardHiddenTerm, lockedTerms } from '@/features/profile/hiddenResults'
import { getHiddenInfo, type HiddenInfo } from '@/lib/api'
import {
  getStudentWeeklyAssessments,
  type StudentWeeklyAssessmentComponentSummary,
  type StudentWeeklyAssessmentMonth,
  type StudentWeeklyAssessmentSubject,
  type StudentWeeklyAssessmentsPayload,
  type StudentWeeklyAssessmentsQuery,
  type StudentWeeklyAssessmentTerm,
} from '@/features/profile/studentProfileApi'
import { WeeklyAssessmentsTable } from '@/features/profile/WeeklyAssessmentsTable'
import { cn } from '@/lib/utils'

const FILTER_MONTHS: StudentWeeklyAssessmentMonth[] = [
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

function mergeSubjects(
  current: StudentWeeklyAssessmentSubject[],
  incoming: StudentWeeklyAssessmentSubject[],
) {
  const map = new Map<number, StudentWeeklyAssessmentSubject>()
  for (const subject of current) map.set(subject.id, subject)
  for (const subject of incoming) map.set(subject.id, subject)
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

function componentTitle(
  component: { key: string; name: string; name_en?: string | null },
  isEnglish: boolean,
) {
  return (isEnglish && component.name_en?.trim()) || component.name || component.key
}

function ComponentSummaryCard({
  item,
  isEnglish,
}: {
  item: StudentWeeklyAssessmentComponentSummary
  isEnglish: boolean
}) {
  const { t } = useTranslation()
  return (
    <li className="rounded-xl border border-brand-dark/10 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-brand-dark">{componentTitle(item, isEnglish)}</span>
        <span className="font-semibold text-brand-primary">
          {formatPercentage(item.percentage)}
        </span>
      </div>
      <ProgressBar percentage={item.percentage} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-dark/55">
        <span>{t('profile.weeklyEvaluations.componentWeeks', { count: item.weeks })}</span>
        <span>{formatScorePair(item.score, item.max)}</span>
      </div>
    </li>
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
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.language.startsWith('en')
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => readQuery(searchParams), [searchParams])
  const filtersActive = hasActiveFilters(query)

  const [data, setData] = useState<StudentWeeklyAssessmentsPayload | null>(null)
  const [subjectOptions, setSubjectOptions] = useState<StudentWeeklyAssessmentSubject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** The school closed what was asked for (403 `data.hidden`): a locked state, not an error. */
  const [hidden, setHidden] = useState<HiddenInfo | null>(null)
  const latestRequest = useRef(0)

  const loadAssessments = useCallback(async () => {
    const requestId = ++latestRequest.current
    const isCurrent = () => requestId === latestRequest.current

    setIsLoading(true)
    setError(null)

    try {
      const payload = await guardHiddenTerm(
        'weekly_assessments',
        query.academic_year,
        query.term,
        () => getStudentWeeklyAssessments(query),
      )
      if (!isCurrent()) return
      setData(payload)
      setHidden(null)

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
      if (!isCurrent()) return
      const hiddenInfo = getHiddenInfo(err)
      if (hiddenInfo) {
        // Never keep showing the previous term's numbers next to a locked state.
        setData(null)
        setHidden(hiddenInfo)
      } else {
        setHidden(null)
        setError(err instanceof Error ? err.message : t('profile.weeklyEvaluations.loadError'))
      }
    } finally {
      if (isCurrent()) setIsLoading(false)
    }
  }, [query, t])

  useEffect(() => {
    const requests = latestRequest
    void loadAssessments()
    // Ignore the answer of a request that is superseded or outlives the page.
    return () => {
      requests.current++
    }
  }, [loadAssessments])

  const updateFilter = (key: keyof StudentWeeklyAssessmentsQuery, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    const normalized = value == null ? '' : String(value)
    if (!normalized || normalized === 'all') next.delete(key)
    else next.set(key, normalized)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const student = data?.student
  const summary = data?.summary
  const entries = data?.entries ?? []
  const bySubject = summary?.by_subject ?? []
  const byComponent = summary?.by_component ?? []

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
  // Terms the school closed. Read at render: every answer that changes them also sets state.
  const closedTerms = lockedTerms('weekly_assessments', query.academic_year)
  const allTermsClosed = closedTerms.length === 2
  const isTermClosed = (term: string) => (closedTerms as readonly string[]).includes(term)
  const monthOptions = ['all', ...FILTER_MONTHS] as const

  const selectedSubjectName =
    subjectOptions.find((subject) => String(subject.id) === selectedSubject)?.name ||
    bySubject.find((item) => String(item.subject?.id) === selectedSubject)?.subject?.name

  if (isLoading && !data && !hidden) {
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

      {allTermsClosed ? (
        <HiddenResultState className="mt-8" message={hidden?.message} />
      ) : (
        <>
      {hidden ? null : (
        <>
      <div className="mt-8 space-y-4">
        <InfoField label={t('profile.weeklyEvaluations.studentName')} value={studentName} />
        <div className="flex flex-col gap-4 sm:flex-row">
          <InfoField label={t('profile.weeklyEvaluations.grade')} value={studentGrade} />
          <InfoField label={t('profile.weeklyEvaluations.className')} value={classroomDisplay} />
        </div>
      </div>

      <HiddenTermsNotice terms={closedTerms} />

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
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select
          value={selectedTerm}
          onValueChange={(value) => updateFilter('term', value == null ? 'all' : String(value))}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-brand-dark/15 bg-white data-[size=default]:h-11 sm:w-44">
            <span className="flex flex-1 items-center gap-2 text-start">
              {selectedTerm === 'all'
                ? t('profile.weeklyEvaluations.filters.allTerms')
                : t(`profile.weeklyEvaluations.terms.${selectedTerm}`)}
              {isTermClosed(selectedTerm) ? (
                <Lock
                  className="size-3.5 shrink-0 text-brand-dark/60"
                  aria-label={t('profile.hidden.unavailable')}
                />
              ) : null}
            </span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
            {termOptions.map((term) =>
              term === 'all' ? (
                <SelectItem key={term} value={term} className="rounded-lg">
                  {t('profile.weeklyEvaluations.filters.allTerms')}
                </SelectItem>
              ) : (
                <TermSelectItem
                  key={term}
                  value={term}
                  locked={isTermClosed(term)}
                  className="rounded-lg"
                >
                  {t(`profile.weeklyEvaluations.terms.${term}`)}
                </TermSelectItem>
              ),
            )}
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

      {hidden ? (
        <HiddenResultState className="mt-6" message={hidden.message} />
      ) : (
        <>
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
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

      {byComponent.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold text-brand-dark">
            {t('profile.weeklyEvaluations.byComponentTitle')}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {byComponent.map((item) => (
              <ComponentSummaryCard key={item.key} item={item} isEnglish={isEnglish} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-brand-dark">
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
          <WeeklyAssessmentsTable entries={entries} />
        )}
      </section>
        </>
      )}
        </>
      )}
    </div>
  )
}
