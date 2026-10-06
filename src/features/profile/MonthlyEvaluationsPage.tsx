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
import { BRAND_MONTH_COLORS, type MonthColor } from '@/features/profile/monthColors'
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

type MonthSection = {
  key: string
  rows: StudentMonthlyAssessmentRow[]
  total: number
  max: number
  percentage: number | null
}

function SubjectCard({
  row,
  scoreKeys,
  color,
}: {
  row: StudentMonthlyAssessmentRow
  scoreKeys: string[]
  color: MonthColor
}) {
  const { t } = useTranslation()
  const pct = row.percentage
  const scored = scoreKeys.filter((key) => row.scores?.[key] != null)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-brand-dark">{row.subject?.name?.trim() || '—'}</h3>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', color.chip)}>
          {formatPercentage(pct)}
        </span>
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-dark/8">
          <div
            className={cn('h-full rounded-full transition-[width]', color.bar)}
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
        <p className="mt-1.5 text-sm font-semibold text-brand-dark">
          {row.total != null && row.max_total != null
            ? `${row.total} / ${row.max_total}`
            : (row.total ?? '—')}
        </p>
      </div>

      {scored.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 border-t border-brand-dark/8 pt-3">
          {scored.map((key) => (
            <li
              key={key}
              className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs text-brand-dark/70"
            >
              <span>{scoreColumnLabel(key, t)}</span>
              <span className="font-bold text-brand-dark">{row.scores?.[key]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function MonthPanel({ section, color }: { section: MonthSection; color: MonthColor }) {
  const { t } = useTranslation()
  const scoreKeys = useMemo(
    () => Array.from(new Set(section.rows.flatMap((row) => Object.keys(row.scores ?? {})))),
    [section.rows],
  )

  return (
    <section className="space-y-4">
      <header
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-l px-5 py-4 text-white shadow-sm',
          color.header,
        )}
      >
        <div>
          <h2 className="text-lg font-bold sm:text-xl">{monthLabel(section.key, t)}</h2>
          <p className="mt-0.5 text-sm text-white/80">
            {t('profile.monthlyEvaluations.grandTotal')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-xl font-bold leading-none">
              {section.max > 0 ? `${section.total} / ${section.max}` : section.total}
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 text-center">
            <p className={cn('text-xl font-bold leading-none', color.text)}>
              {formatPercentage(section.percentage)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {section.rows.map((row, index) => (
          <SubjectCard
            key={`${row.subject?.id ?? row.subject?.name}-${index}`}
            row={row}
            scoreKeys={scoreKeys}
            color={color}
          />
        ))}
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

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

  const monthSections = useMemo<MonthSection[]>(() => {
    const map = new Map<string, StudentMonthlyAssessmentRow[]>()
    for (const row of data?.months ?? []) {
      const key = row.month?.trim() || 'unknown'
      map.set(key, [...(map.get(key) ?? []), row])
    }
    return Array.from(map.entries()).flatMap(([key, rows]) => {
      if (rows.length === 0) return []
      const total = rows.reduce((sum, row) => sum + (row.total ?? 0), 0)
      const max = rows.reduce((sum, row) => sum + (row.max_total ?? 0), 0)
      return [{ key, rows, total, max, percentage: max > 0 ? (total / max) * 100 : null }]
    })
  }, [data])

  const activeIndex = Math.max(
    0,
    monthSections.findIndex((section) => section.key === selectedMonth),
  )
  const activeSection = monthSections[activeIndex]

  const termLabel =
    selectedTerm === 'all'
      ? t('profile.monthlyEvaluations.allTerms')
      : t(`profile.weeklyEvaluations.terms.${selectedTerm}`)

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

        {!isLoading && !error && monthSections.length === 0 ? (
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

        {!isLoading && !error && activeSection ? (
          <div className="space-y-5">
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
              {monthSections.map((section, index) => {
                const color = BRAND_MONTH_COLORS[index % BRAND_MONTH_COLORS.length]
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setSelectedMonth(section.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                      index === activeIndex ? color.active : color.tint,
                    )}
                  >
                    {monthLabel(section.key, t)}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px]',
                        index === activeIndex ? 'bg-white/25' : 'bg-white',
                      )}
                    >
                      {formatPercentage(section.percentage)}
                    </span>
                  </button>
                )
              })}
            </div>
            <MonthPanel
              key={activeSection.key}
              section={activeSection}
              color={BRAND_MONTH_COLORS[activeIndex % BRAND_MONTH_COLORS.length]}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
