import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Percent } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  getStudentMonthlyAssessments,
  type StudentMonthlyAssessmentRow,
  type StudentMonthlyAssessmentsPayload,
  type StudentWeeklyAssessmentMonth,
  type StudentWeeklyAssessmentTerm,
} from '@/features/profile/studentProfileApi'
import { cn } from '@/lib/utils'

const MONTH_ORDER: StudentWeeklyAssessmentMonth[] = [
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

function monthSortIndex(month: string) {
  const index = MONTH_ORDER.indexOf(month as StudentWeeklyAssessmentMonth)
  return index === -1 ? 99 : index
}

function monthLabel(
  month: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const key = `profile.weeklyEvaluations.months.${month}`
  const translated = t(key)
  return translated === key ? month : translated
}

function termLabel(
  term: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!term) return null
  const key = `profile.weeklyEvaluations.terms.${term}`
  const translated = t(key)
  return translated === key ? String(term) : translated
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

function sumRows(rows: StudentMonthlyAssessmentRow[]) {
  const totalScore = rows.reduce((sum, row) => sum + (row.score ?? 0), 0)
  const totalMax = rows.reduce((sum, row) => sum + (row.max ?? 0), 0)
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : null
  return { totalScore, totalMax, percentage }
}

function EvaluationTable({
  rows,
  showMonth,
}: {
  rows: StudentMonthlyAssessmentRow[]
  showMonth: boolean
}) {
  const { t } = useTranslation()
  const totals = sumRows(rows)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[40rem] table-fixed border-collapse text-sm">
        <colgroup>
          {showMonth ? <col style={{ width: '14%' }} /> : null}
          <col style={{ width: showMonth ? '26%' : '32%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr className="bg-brand-primary text-white">
            {showMonth ? (
              <th className="px-4 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
                {t('profile.monthlyEvaluations.columns.month')}
              </th>
            ) : null}
            <th className="px-4 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
              {t('profile.monthlyEvaluations.columns.subject')}
            </th>
            <th className="px-3 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
              {t('profile.monthlyEvaluations.columns.sessions')}
            </th>
            <th className="px-3 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
              {t('profile.monthlyEvaluations.columns.score')}
            </th>
            <th className="px-3 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
              {t('profile.monthlyEvaluations.columns.max')}
            </th>
            <th className="px-3 py-3 text-start align-middle text-xs font-bold whitespace-nowrap sm:text-sm">
              {t('profile.monthlyEvaluations.columns.percentage')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.month}-${row.subject?.id ?? row.subject?.code ?? index}`}
              className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
            >
              {showMonth ? (
                <td className="border-t border-brand-dark/8 px-4 py-3 text-start font-medium text-brand-dark">
                  {monthLabel(String(row.month), t)}
                </td>
              ) : null}
              <td className="border-t border-brand-dark/8 px-4 py-3 text-start font-semibold text-brand-primary">
                {row.subject?.name || '—'}
              </td>
              <td className="border-t border-brand-dark/8 px-3 py-3 text-start text-brand-dark">
                {row.sessions ?? 0}
              </td>
              <td className="border-t border-brand-dark/8 px-3 py-3 text-start text-brand-dark">
                {row.score ?? 0}
              </td>
              <td className="border-t border-brand-dark/8 px-3 py-3 text-start text-brand-dark">
                {row.max ?? 0}
              </td>
              <td className="border-t border-brand-dark/8 px-3 py-3 text-start font-semibold text-brand-dark">
                {formatPercentage(row.percentage)}
              </td>
            </tr>
          ))}
          <tr className="bg-brand-primary text-white">
            <td colSpan={showMonth ? 6 : 5} className="px-4 py-3">
              <div className="flex items-center justify-between gap-4 font-bold">
                <span>{t('profile.monthlyEvaluations.grandTotal')}</span>
                <span>
                  {formatScorePair(totals.totalScore, totals.totalMax)}
                  {totals.percentage != null ? ` · ${formatPercentage(totals.percentage)}` : ''}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function MonthlyEvaluationsPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<StudentMonthlyAssessmentsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<'all' | StudentWeeklyAssessmentTerm>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const loadAssessments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = await getStudentMonthlyAssessments({
        term: selectedTerm === 'all' ? undefined : selectedTerm,
      })
      setData(payload)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : t('profile.monthlyEvaluations.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [selectedTerm, t])

  useEffect(() => {
    void loadAssessments()
  }, [loadAssessments])

  const months = data?.months ?? []

  const availableMonths = useMemo(() => {
    const unique = Array.from(new Set(months.map((row) => String(row.month))))
    return unique.sort((a, b) => monthSortIndex(a) - monthSortIndex(b))
  }, [months])

  useEffect(() => {
    if (selectedMonth === 'all') return
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth('all')
    }
  }, [availableMonths, selectedMonth])

  const filteredRows = useMemo(() => {
    const rows =
      selectedMonth === 'all'
        ? months
        : months.filter((row) => String(row.month) === selectedMonth)

    return [...rows].sort((a, b) => {
      const byMonth = monthSortIndex(String(a.month)) - monthSortIndex(String(b.month))
      if (byMonth !== 0) return byMonth
      return (a.subject?.name || '').localeCompare(b.subject?.name || '', 'ar')
    })
  }, [months, selectedMonth])

  const visibleSummary = useMemo(() => {
    if (selectedMonth === 'all' && data?.summary) {
      return {
        totalScore: data.summary.total_score,
        totalMax: data.summary.total_max,
        percentage: data.summary.percentage,
      }
    }
    return sumRows(filteredRows)
  }, [data?.summary, filteredRows, selectedMonth])

  const student = data?.student
  const studentName = student?.name?.trim() || '—'
  const studentGrade = student?.grade?.name?.trim() || '—'
  const studentClass =
    student?.classroom?.section?.trim() || student?.classroom?.label?.trim() || '—'
  const classroomDisplay =
    studentClass === '—'
      ? '—'
      : t('profile.parentSummon.classroomSection', { section: studentClass })
  const academicYear = data?.filters?.academic_year
  const selectedMonthLabel =
    selectedMonth === 'all'
      ? t('profile.weeklyEvaluations.filters.allMonths')
      : monthLabel(selectedMonth, t)

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
            {t('profile.nav.monthlyEvaluations')}
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
          {academicYear ? (
            <p className="mt-2 text-sm font-medium text-brand-dark/55">
              {t('profile.monthlyEvaluations.academicYear', { year: academicYear })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedTerm}
            onValueChange={(value) =>
              setSelectedTerm((value as 'all' | StudentWeeklyAssessmentTerm) || 'all')
            }
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-brand-dark/15 bg-white data-[size=default]:h-11 sm:w-44">
              <span className="flex-1 text-start">
                {selectedTerm === 'all'
                  ? t('profile.weeklyEvaluations.filters.allTerms')
                  : termLabel(selectedTerm, t)}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
              <SelectItem value="all" className="rounded-lg">
                {t('profile.weeklyEvaluations.filters.allTerms')}
              </SelectItem>
              <SelectItem value="first" className="rounded-lg">
                {t('profile.weeklyEvaluations.terms.first')}
              </SelectItem>
              <SelectItem value="second" className="rounded-lg">
                {t('profile.weeklyEvaluations.terms.second')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth}
            onValueChange={(value) => setSelectedMonth(value == null ? 'all' : String(value))}
          >
            <SelectTrigger
              aria-label={t('profile.monthlyEvaluations.selectMonth')}
              className="h-11 rounded-xl border-brand-primary bg-brand-primary px-4 font-medium text-white shadow-sm hover:bg-brand-dark focus-visible:border-brand-primary focus-visible:ring-brand-primary/30 data-[size=default]:h-11 sm:w-48 [&_svg]:text-white"
            >
              <span className="flex-1 text-start">{selectedMonthLabel}</span>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
              <SelectItem
                value="all"
                className="rounded-lg focus:bg-brand-primary/10 focus:text-brand-primary"
              >
                {t('profile.weeklyEvaluations.filters.allMonths')}
              </SelectItem>
              {availableMonths.map((month) => (
                <SelectItem
                  key={month}
                  value={month}
                  className="rounded-lg focus:bg-brand-primary/10 focus:text-brand-primary"
                >
                  {monthLabel(month, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="space-y-4">
          <InfoField label={t('profile.monthlyEvaluations.studentName')} value={studentName} />
          <div className="flex flex-col gap-4 sm:flex-row">
            <InfoField label={t('profile.monthlyEvaluations.grade')} value={studentGrade} />
            <InfoField
              label={t('profile.monthlyEvaluations.className')}
              value={classroomDisplay}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-brand-dark/55">
                  {t('profile.monthlyEvaluations.summary.percentage')}
                </p>
                <p className="mt-1 text-3xl font-bold text-brand-dark">
                  {formatPercentage(visibleSummary.percentage)}
                </p>
              </div>
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <Percent className="size-5" aria-hidden />
              </span>
            </div>
          </article>
          <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
            <p className="text-sm text-brand-dark/55">
              {t('profile.monthlyEvaluations.summary.subjects')}
            </p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">{filteredRows.length}</p>
          </article>
          <article className="rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
            <p className="text-sm text-brand-dark/55">
              {t('profile.monthlyEvaluations.summary.totalScore')}
            </p>
            <p className="mt-1 text-3xl font-bold text-brand-dark">
              {formatScorePair(visibleSummary.totalScore, visibleSummary.totalMax)}
            </p>
          </article>
        </div>

        {filteredRows.length > 0 ? (
          <EvaluationTable rows={filteredRows} showMonth={selectedMonth === 'all'} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-16 text-center">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <ClipboardList className="size-6" aria-hidden />
            </div>
            <p className="text-lg font-bold text-brand-dark">
              {t('profile.monthlyEvaluations.emptyTitle')}
            </p>
            <p className="mt-2 max-w-md text-sm text-brand-dark/55">
              {t('profile.monthlyEvaluations.emptyDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
