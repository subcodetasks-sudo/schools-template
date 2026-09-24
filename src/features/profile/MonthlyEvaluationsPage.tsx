import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/features/profile/ProfileContext'
import {
  getStudentMonthlyAssessments,
  type StudentMonthlyAssessmentRow,
  type StudentMonthlyAssessmentsPayload,
  type StudentWeeklyAssessmentTerm,
} from '@/features/profile/studentProfileApi'
import { cn } from '@/lib/utils'

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

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

function monthLabel(
  month: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (!month) return t('profile.monthlyEvaluations.allMonths')
  const key = `profile.weeklyEvaluations.months.${month}`
  const translated = t(key)
  return translated === key ? month : translated
}

function scoreColumnLabel(
  key: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const translationKey = `profile.monthlyEvaluations.scoreColumns.${key}`
  const translated = t(translationKey)
  if (translated !== translationKey) return translated

  const weeklyKey = `profile.weeklyEvaluations.scoreColumns.${key}`
  const weeklyTranslated = t(weeklyKey)
  return weeklyTranslated === weeklyKey ? key : weeklyTranslated
}

function MonthTable({
  monthKey,
  rows,
}: {
  monthKey: string
  rows: StudentMonthlyAssessmentRow[]
}) {
  const { t } = useTranslation()
  const scoreKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const row of rows) {
      for (const key of Object.keys(row.scores ?? {})) keys.add(key)
    }
    return Array.from(keys)
  }, [rows])

  const grandTotal = rows.reduce((sum, row) => sum + (row.total ?? 0), 0)
  const grandMax = rows.reduce((sum, row) => sum + (row.max_total ?? 0), 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
      <header className="border-b border-brand-dark/8 bg-brand-primary px-4 py-3 text-white">
        <h2 className="text-sm font-bold sm:text-base">{monthLabel(monthKey, t)}</h2>
      </header>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-brand-dark">
              <th className="px-4 py-3 text-start font-bold">
                {t('profile.monthlyEvaluations.columns.subject')}
              </th>
              {scoreKeys.map((key) => (
                <th key={key} className="px-3 py-3 text-center font-bold">
                  {scoreColumnLabel(key, t)}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-bold">
                {t('profile.monthlyEvaluations.columns.total')}
              </th>
              <th className="px-3 py-3 text-center font-bold">
                {t('profile.monthlyEvaluations.columns.percentage')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.subject?.id ?? row.subject?.name}-${index}`}
                className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/20')}
              >
                <td className="border-t border-brand-dark/8 px-4 py-3 font-semibold text-brand-primary">
                  {row.subject?.name?.trim() || '—'}
                </td>
                {scoreKeys.map((key) => (
                  <td
                    key={key}
                    className="border-t border-brand-dark/8 px-3 py-3 text-center text-brand-dark"
                  >
                    {row.scores?.[key] ?? '—'}
                  </td>
                ))}
                <td className="border-t border-brand-dark/8 px-3 py-3 text-center font-semibold">
                  {row.total != null && row.max_total != null
                    ? `${row.total} / ${row.max_total}`
                    : (row.total ?? '—')}
                </td>
                <td className="border-t border-brand-dark/8 px-3 py-3 text-center">
                  {formatPercentage(row.percentage)}
                </td>
              </tr>
            ))}
            <tr className="bg-brand-primary text-white">
              <td
                colSpan={Math.max(2, scoreKeys.length + 2)}
                className="px-4 py-3 font-bold"
              >
                <div className="flex items-center justify-between gap-4">
                  <span>{t('profile.monthlyEvaluations.grandTotal')}</span>
                  <span>
                    {grandMax > 0 ? `${grandTotal} / ${grandMax}` : grandTotal}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function MonthlyEvaluationsPage() {
  const { t } = useTranslation()
  const { personalName, gradeLabel, profileData } = useProfile()
  const [data, setData] = useState<StudentMonthlyAssessmentsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<StudentWeeklyAssessmentTerm | 'all'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  const studentName = personalName || t('profile.studentName')
  const studentGrade = gradeLabel || t('profile.studentGrade')
  const studentClass = profileData.classNumber || '—'

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const payload = await getStudentMonthlyAssessments(
        selectedTerm === 'all' ? {} : { term: selectedTerm },
      )
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.monthlyEvaluations.loadError'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTerm, t])

  useEffect(() => {
    void load()
  }, [load])

  const monthsGrouped = useMemo(() => {
    const rows = data?.months ?? []
    const map = new Map<string, StudentMonthlyAssessmentRow[]>()
    for (const row of rows) {
      const key = row.month?.trim() || 'unknown'
      const list = map.get(key) ?? []
      list.push(row)
      map.set(key, list)
    }
    return map
  }, [data])

  const monthOptions = useMemo(() => Array.from(monthsGrouped.keys()), [monthsGrouped])

  const visibleMonths =
    selectedMonth === 'all'
      ? monthOptions
      : monthOptions.filter((month) => month === selectedMonth)

  const termLabel =
    selectedTerm === 'all'
      ? t('profile.monthlyEvaluations.allTerms')
      : t(`profile.weeklyEvaluations.terms.${selectedTerm}`)

  const monthFilterLabel =
    selectedMonth === 'all'
      ? t('profile.monthlyEvaluations.allMonths')
      : monthLabel(selectedMonth, t)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
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

        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedTerm}
            onValueChange={(value) =>
              setSelectedTerm((value as StudentWeeklyAssessmentTerm | 'all') || 'all')
            }
          >
            <SelectTrigger
              aria-label={t('profile.monthlyEvaluations.selectTerm')}
              className="h-11 rounded-xl border-brand-primary bg-brand-primary px-4 font-medium text-white shadow-sm hover:bg-brand-dark data-[size=default]:h-11 [&_svg]:text-white"
            >
              <span className="flex-1 text-start">{termLabel}</span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-brand-dark/10 shadow-lg">
              <SelectItem value="all">{t('profile.monthlyEvaluations.allTerms')}</SelectItem>
              <SelectItem value="first">{t('profile.weeklyEvaluations.terms.first')}</SelectItem>
              <SelectItem value="second">{t('profile.weeklyEvaluations.terms.second')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth}
            onValueChange={(value) => setSelectedMonth(value || 'all')}
          >
            <SelectTrigger
              aria-label={t('profile.monthlyEvaluations.selectMonth')}
              className="h-11 rounded-xl border-brand-dark/15 bg-white px-4 font-medium text-brand-dark data-[size=default]:h-11"
            >
              <span className="flex-1 text-start">{monthFilterLabel}</span>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-brand-dark/10 shadow-lg">
              <SelectItem value="all">{t('profile.monthlyEvaluations.allMonths')}</SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {monthLabel(month, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <InfoField label={t('profile.monthlyEvaluations.studentName')} value={studentName} />
          <div className="flex flex-col gap-4 sm:flex-row">
            <InfoField label={t('profile.monthlyEvaluations.grade')} value={studentGrade} />
            <InfoField label={t('profile.monthlyEvaluations.className')} value={studentClass} />
          </div>
        </div>

        {data?.summary ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-xl bg-brand-primary/10 px-4 py-2 font-medium text-brand-primary">
              {t('profile.monthlyEvaluations.summary.percentage', {
                value: formatPercentage(data.summary.percentage),
              })}
            </span>
            <span className="rounded-xl bg-muted px-4 py-2 font-medium text-brand-dark">
              {t('profile.monthlyEvaluations.summary.score', {
                score: data.summary.total_score ?? 0,
                max: data.summary.total_max ?? 0,
              })}
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-brand-dark/55">{t('profile.loading')}</p>
        ) : null}

        {error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              className="rounded-xl border-brand-dark/15"
            >
              {t('profile.retry')}
            </Button>
          </div>
        ) : null}

        {!isLoading && !error && visibleMonths.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-16 text-center">
            <div className="mb-4 inline-flex size-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <ClipboardList className="size-6" aria-hidden />
            </div>
            <p className="text-lg font-bold text-brand-dark">
              {t('profile.monthlyEvaluations.emptyTitle')}
            </p>
            <p className="mt-2 max-w-md text-sm text-brand-dark/55">
              {t('profile.monthlyEvaluations.emptyDescription')}
            </p>
          </div>
        ) : null}

        {!isLoading && !error
          ? visibleMonths.map((month) => (
              <MonthTable key={month} monthKey={month} rows={monthsGrouped.get(month) ?? []} />
            ))
          : null}
      </div>
    </div>
  )
}
