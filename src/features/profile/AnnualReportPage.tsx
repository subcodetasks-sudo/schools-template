import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EyeOff, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStudentAnnualReport,
  isHiddenResourceError,
  type StudentAnnualReportPayload,
} from '@/features/profile/studentProfileApi'
import {
  buildAnnualAssessmentsView,
  closedTermsFor,
  filterByTerm,
  resolveTermFilter,
  termTabsFor,
  type AssessmentTerm,
  type TermFilter,
} from '@/features/profile/annualReportModel'
import { WeeklyAssessmentsTable } from '@/features/profile/WeeklyAssessmentsTable'
import { cn } from '@/lib/utils'
import { useApiResource } from '@/lib/useApiResource'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** The whole report can be switched off: 403 `{ hidden: true, resource: 'annual_report' }`. */
type AnnualReportResult =
  | { hidden: false; report: StudentAnnualReportPayload }
  | { hidden: true }

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

function formatPair(score: number | null | undefined, max: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return '—'
  return max != null && Number.isFinite(max) ? `${formatNumber(score)} / ${formatNumber(max)}` : formatNumber(score)
}

function monthLabel(month: string | null | undefined, t: Translate) {
  const value = month?.trim().toLowerCase()
  if (!value) return '—'
  const key = `profile.weeklyEvaluations.months.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function termLabel(term: string | null | undefined, t: Translate) {
  const value = term?.trim().toLowerCase()
  if (value === 'first' || value === 'second') return t(`profile.weeklyEvaluations.terms.${value}`)
  return value || '—'
}

function statusLabel(status: string | null | undefined, t: Translate) {
  const value = status?.trim().toLowerCase()
  if (!value) return '—'
  const key = `profile.annualReport.status.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function HiddenMessage({ title, description }: { title: string; description?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-10 text-center"
    >
      <div className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <EyeOff className="size-5" aria-hidden />
      </div>
      <p className="text-base font-bold text-brand-dark">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-sm text-brand-dark/55">{description}</p> : null}
    </div>
  )
}

function SectionHidden() {
  const { t } = useTranslation()
  return (
    <HiddenMessage
      title={t('profile.annualReport.hidden.section')}
      description={t('profile.annualReport.hidden.sectionDescription')}
    />
  )
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-8 text-center text-sm text-brand-dark/55">
      {children}
    </p>
  )
}

/** Tabs are built from the open terms of the part being shown, never from a fixed list. */
function TermTabs({
  openTerms,
  value,
  onChange,
}: {
  openTerms: AssessmentTerm[]
  value: TermFilter
  onChange: (next: TermFilter) => void
}) {
  const { t } = useTranslation()
  const tabs = termTabsFor(openTerms)
  if (tabs.length === 0) return null

  return (
    <div role="tablist" aria-label={t('profile.annualReport.tabs.label')} className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab === value
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              active
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-dark/15 bg-white text-brand-dark hover:border-brand-primary/50',
            )}
          >
            {tab === 'all' ? t('profile.annualReport.tabs.all') : termLabel(tab, t)}
          </button>
        )
      })}
    </div>
  )
}

/** Small note shown when only one of the two terms is open for this part. */
function OtherTermNote({ openTerms }: { openTerms: AssessmentTerm[] }) {
  const { t } = useTranslation()
  const closed = closedTermsFor(openTerms)
  if (openTerms.length === 0 || closed.length === 0) return null
  return (
    <p className="text-xs font-medium text-brand-dark/55">
      {t('profile.annualReport.hidden.otherTerm', { term: termLabel(closed[0], t) })}
    </p>
  )
}

function Section({
  title,
  openTerms,
  tabs,
  children,
}: {
  title: string
  openTerms: AssessmentTerm[]
  tabs?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-dark">{title}</h2>
        {tabs}
      </div>
      <OtherTermNote openTerms={openTerms} />
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-dark/10 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-brand-dark/55">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  )
}

function AnnualReportContent({ report }: { report: StudentAnnualReportPayload }) {
  const { t } = useTranslation()
  const view = useMemo(() => buildAnnualAssessmentsView(report), [report])
  const [weeklyTab, setWeeklyTab] = useState<TermFilter>('all')
  const [monthlyTab, setMonthlyTab] = useState<TermFilter>('all')
  const [resultsTab, setResultsTab] = useState<TermFilter>('all')

  const { weekly, monthly, results, summary } = view

  // A stored tab is only honoured while that term is still open (the switches can change).
  const weeklyFilter = resolveTermFilter(weeklyTab, weekly.openTerms)
  const monthlyFilter = resolveTermFilter(monthlyTab, monthly.openTerms)
  const resultsFilter = resolveTermFilter(resultsTab, results.openTerms)

  const weeklyRows = filterByTerm(weekly.rows, weeklyFilter, (entry) => entry.term)
  const monthlyRows = filterByTerm(monthly.rows, monthlyFilter, (row) => row.term)
  const resultRows = filterByTerm(results.rows, resultsFilter, (row) => row.term)

  // Totals exactly as sent: the overall summary, or the API's own per-term bucket. Never re-added.
  const weeklyTotals =
    weeklyFilter === 'all'
      ? weekly.summary
        ? {
            percentage: weekly.summary.percentage,
            sessions: weekly.summary.sessions_count,
            score: weekly.summary.total_score,
            max: weekly.summary.total_max,
          }
        : null
      : weekly.byTerm[weeklyFilter]
        ? {
            percentage: weekly.byTerm[weeklyFilter]?.percentage ?? null,
            sessions: weekly.byTerm[weeklyFilter]?.sessions,
            score: weekly.byTerm[weeklyFilter]?.score,
            max: weekly.byTerm[weeklyFilter]?.max,
          }
        : null

  const showMonthlySubject = monthlyRows.some((row) => row.subject?.name)
  const showMonthlyTerm = monthlyFilter === 'all' && monthly.openTerms.length > 1

  return (
    <div className="space-y-6">
      <section aria-label={t('profile.annualReport.sections.summary')} className="space-y-3">
        <h2 className="text-lg font-bold text-brand-dark">{t('profile.annualReport.sections.summary')}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t('profile.annualReport.summary.subjectsCount')} value={formatNumber(summary.subjectsCount)} />
          <Stat label={t('profile.annualReport.summary.subjectsPassed')} value={formatNumber(summary.subjectsPassed)} />
          <Stat label={t('profile.annualReport.summary.subjectsFailed')} value={formatNumber(summary.subjectsFailed)} />
          <Stat
            label={t('profile.annualReport.summary.subjectsIncomplete')}
            value={formatNumber(summary.subjectsIncomplete)}
          />
        </div>
      </section>

      <Section
        title={t('profile.annualReport.sections.weekly')}
        openTerms={weekly.openTerms}
        tabs={
          weekly.hidden ? null : (
            <TermTabs openTerms={weekly.openTerms} value={weeklyFilter} onChange={setWeeklyTab} />
          )
        }
      >
        {weekly.hidden ? (
          <SectionHidden />
        ) : weeklyRows.length === 0 ? (
          <EmptyMessage>{t('profile.annualReport.empty.weekly')}</EmptyMessage>
        ) : (
          <>
            {weeklyTotals ? (
              <div
                role="group"
                aria-label={t('profile.annualReport.sections.weeklyTotals')}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <Stat label={t('profile.annualReport.totals.percentage')} value={formatPercentage(weeklyTotals.percentage)} />
                <Stat label={t('profile.annualReport.totals.sessions')} value={formatNumber(weeklyTotals.sessions)} />
                <Stat
                  label={t('profile.annualReport.totals.score')}
                  value={formatPair(weeklyTotals.score, weeklyTotals.max)}
                />
              </div>
            ) : null}
            <WeeklyAssessmentsTable entries={weeklyRows} />
          </>
        )}
      </Section>

      <Section
        title={t('profile.annualReport.sections.monthly')}
        openTerms={monthly.openTerms}
        tabs={
          monthly.hidden ? null : (
            <TermTabs openTerms={monthly.openTerms} value={monthlyFilter} onChange={setMonthlyTab} />
          )
        }
      >
        {monthly.hidden ? (
          <SectionHidden />
        ) : monthlyRows.length === 0 ? (
          <EmptyMessage>{t('profile.annualReport.empty.monthly')}</EmptyMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-dark/10">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <thead className="bg-muted/50 text-brand-dark/70">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.month')}
                  </th>
                  {showMonthlyTerm ? (
                    <th scope="col" className="px-3 py-2 text-start font-semibold">
                      {t('profile.annualReport.columns.term')}
                    </th>
                  ) : null}
                  {showMonthlySubject ? (
                    <th scope="col" className="px-3 py-2 text-start font-semibold">
                      {t('profile.annualReport.columns.subject')}
                    </th>
                  ) : null}
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.sessions')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.score')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.percentage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, index) => (
                  <tr
                    key={`${row.academic_year ?? ''}-${row.term}-${row.month}-${row.subject?.id ?? ''}-${index}`}
                    className="border-t border-brand-dark/8"
                  >
                    <th scope="row" className="px-3 py-2.5 text-start font-bold text-brand-dark">
                      {monthLabel(row.month, t)}
                    </th>
                    {showMonthlyTerm ? <td className="px-3 py-2.5">{termLabel(row.term, t)}</td> : null}
                    {showMonthlySubject ? <td className="px-3 py-2.5">{row.subject?.name || '—'}</td> : null}
                    <td className="px-3 py-2.5 tabular-nums">{formatNumber(row.sessions)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{formatPair(row.score, row.max)}</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-brand-dark">
                      {formatPercentage(row.average_percentage ?? row.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={t('profile.annualReport.sections.results')}
        openTerms={results.openTerms}
        tabs={
          results.hidden || results.locked ? null : (
            <TermTabs openTerms={results.openTerms} value={resultsFilter} onChange={setResultsTab} />
          )
        }
      >
        {results.hidden ? (
          <SectionHidden />
        ) : results.locked ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-10 text-center"
          >
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Lock className="size-5" aria-hidden />
            </div>
            <p className="text-base font-bold text-brand-dark">{t('profile.annualReport.locked.title')}</p>
            <p className="mt-1.5 max-w-md text-sm text-brand-dark/55">
              {t('profile.annualReport.locked.description')}
            </p>
          </div>
        ) : resultRows.length === 0 ? (
          <EmptyMessage>{t('profile.annualReport.empty.results')}</EmptyMessage>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-dark/10">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead className="bg-muted/50 text-brand-dark/70">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.subject')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.term')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.yearWork')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.finalExam')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.total')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.percentage')}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t('profile.annualReport.columns.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row, index) => (
                  <tr key={`${row.term}-${row.subject?.id ?? row.subject?.name ?? ''}-${index}`} className="border-t border-brand-dark/8">
                    <th scope="row" className="px-3 py-2.5 text-start font-bold text-brand-dark">
                      {row.subject?.name || '—'}
                    </th>
                    <td className="px-3 py-2.5">{termLabel(row.term, t)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatPair(row.year_work?.score, row.year_work?.max)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatPair(row.final_exam?.score, row.final_exam?.max)}
                    </td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-brand-dark">
                      {formatPair(row.total, row.total_max)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{formatPercentage(row.percentage)}</td>
                    <td className="px-3 py-2.5">{statusLabel(row.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

export function AnnualReportPage() {
  const { t } = useTranslation()

  const {
    data: result,
    isLoading,
    error,
    reload,
  } = useApiResource<AnnualReportResult>(
    async () => {
      try {
        return { hidden: false, report: await getStudentAnnualReport() }
      } catch (err) {
        if (isHiddenResourceError(err, 'annual_report')) return { hidden: true }
        throw err
      }
    },
    [t],
    t('profile.annualReport.loadError'),
  )

  // The school can change the switches at any time, and the report follows them:
  // refetch whenever the student comes back to this tab instead of trusting stale data.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const report = result && !result.hidden ? result.report : null

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('profile.annualReport.title')}
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
        <div className="flex flex-wrap items-center gap-3">
          {report?.academic_year ? (
            <p className="text-sm font-medium text-brand-dark/55">
              {t('profile.annualReport.academicYear', { year: report.academic_year })}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => void reload()}
            className="rounded-xl border-brand-dark/15"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} aria-hidden />
            {t('profile.annualReport.refresh')}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {isLoading && !result ? (
          <p role="status" className="py-16 text-center text-sm text-brand-dark/55">
            {t('profile.loading')}
          </p>
        ) : null}

        {error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => void reload()} className="rounded-xl border-brand-dark/15">
              {t('profile.retry')}
            </Button>
          </div>
        ) : null}

        {!error && result?.hidden ? (
          <HiddenMessage
            title={t('profile.annualReport.hidden.report')}
            description={t('profile.annualReport.hidden.reportDescription')}
          />
        ) : null}

        {!error && report ? <AnnualReportContent report={report} /> : null}
      </div>
    </div>
  )
}
