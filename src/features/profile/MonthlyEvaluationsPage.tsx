import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Lock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  HiddenResultState,
  HiddenTermsNotice,
  TermSelectItem,
} from '@/features/profile/HiddenResultState'
import { guardHiddenTerm, lockedTerms } from '@/features/profile/hiddenResults'
import { useProfile } from '@/features/profile/ProfileContext'
import {
  getStudentMonthlyAssessments,
  type StudentWeeklyAssessmentTerm,
} from '@/features/profile/studentProfileApi'
import {
  buildMonthlyAssessmentsView,
  monthlyTestKeyNumber,
  type MonthCardView,
  type MonthlyTestView,
} from '@/features/profile/monthlyAssessmentsModel'
import { useApiResource } from '@/lib/useApiResource'

type Translate = (key: string, options?: Record<string, unknown>) => string

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

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

function monthLabel(month: string, t: Translate) {
  if (!month) return t('profile.monthlyEvaluations.unknownMonth')
  const key = `profile.weeklyEvaluations.months.${month}`
  const translated = t(key)
  return translated === key ? month : translated
}

function termLabel(term: string, t: Translate) {
  if (term === 'first' || term === 'second') return t(`profile.weeklyEvaluations.terms.${term}`)
  return term || t('profile.monthlyEvaluations.unknownTerm')
}

/** The API's own test name, else "Monthly test N" from its key, else a generic name. */
function testName(test: Pick<MonthlyTestView, 'name' | 'key'>, t: Translate) {
  if (test.name) return test.name
  const n = monthlyTestKeyNumber(test.key)
  return n
    ? t('profile.monthlyEvaluations.testFallbackNumbered', { n })
    : t('profile.monthlyEvaluations.testFallback')
}

function testMark(test: MonthlyTestView, t: Translate) {
  return test.max !== null
    ? t('profile.monthlyEvaluations.testMarkInline', {
        score: formatNumber(test.score),
        max: formatNumber(test.max),
      })
    : formatNumber(test.score)
}

function MonthTable({ card }: { card: MonthCardView }) {
  const { t } = useTranslation()
  const showTestColumn = card.rows.some((row) => row.test !== null)
  // Tests the API sent for the month that no subject row carries (e.g. old responses).
  const looseTests = card.rows.some((row) => row.test !== null) ? [] : card.tests
  const colCount = showTestColumn ? 3 : 2

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-dark/10">
      <table className="w-full min-w-[18rem] border-collapse text-sm">
        <caption className="bg-brand-primary px-4 py-3 text-start text-lg font-bold text-white">
          {monthLabel(card.month, t)}
        </caption>
        <thead className="bg-muted/50 text-brand-dark/70">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-semibold">
              {t('profile.monthlyEvaluations.columns.subject')}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">
              {t('profile.monthlyEvaluations.columns.average')}
            </th>
            {showTestColumn ? (
              <th scope="col" className="px-3 py-2 text-start font-semibold">
                {t('profile.monthlyEvaluations.columns.test')}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row) => (
            <tr key={row.id} className="border-t border-brand-dark/8 align-top">
              <th scope="row" className="px-3 py-2.5 text-start font-bold text-brand-dark">
                {row.subjectName || '—'}
              </th>
              <td className="px-3 py-2.5">
                {row.average !== null ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-brand-dark">
                      <bdi>{formatPercentage(row.average)}</bdi>
                    </span>
                    {row.score !== null && row.max !== null && row.max > 0 ? (
                      <span className="text-xs text-brand-dark/55">
                        <bdi>
                          {formatNumber(row.score)} / {formatNumber(row.max)}
                        </bdi>
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-brand-dark/55">
                    {row.hasWeeklySheets ? '—' : t('profile.monthlyEvaluations.noWeeklySheets')}
                  </span>
                )}
              </td>
              {showTestColumn ? (
                <td className="px-3 py-2.5">
                  {row.test ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-brand-primary">{testMark(row.test, t)}</span>
                      <span className="text-xs text-brand-dark/55">{testName(row.test, t)}</span>
                    </span>
                  ) : (
                    <span className="text-brand-dark/35">—</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
          {looseTests.map((test, index) => (
            <tr key={`${test.key}-${test.subjectName}-${index}`} className="border-t border-brand-dark/8">
              <th scope="row" className="px-3 py-2.5 text-start font-bold text-brand-dark">
                {test.subjectName || '—'}
              </th>
              <td colSpan={colCount - 1} className="px-3 py-2.5">
                <span className="text-xs text-brand-dark/55">{testName(test, t)}: </span>
                <span className="font-bold text-brand-primary">{testMark(test, t)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-brand-dark/15 bg-brand-primary/10">
          <tr>
            <th scope="row" className="px-3 py-3 text-start font-bold text-brand-dark">
              {t('profile.monthlyEvaluations.monthAverage')}
            </th>
            <td colSpan={colCount - 1} className="px-3 py-3">
              {card.average !== null ? (
                <span className="font-bold text-brand-primary">{formatPercentage(card.average)}</span>
              ) : (
                <span className="text-xs text-brand-dark/55">
                  {t('profile.monthlyEvaluations.noWeeklySheets')}
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function MonthlyEvaluationsPage() {
  const { t } = useTranslation()
  const { personalName, gradeLabel, profileData } = useProfile()
  // `null` = the student has not picked: ask without a term and let the backend choose.
  const [chosenTerm, setChosenTerm] = useState<StudentWeeklyAssessmentTerm | null>(null)

  const studentName = personalName || t('profile.studentName')
  const studentGrade = gradeLabel || t('profile.studentGrade')
  const studentClass = profileData.classNumber || '—'

  const {
    data,
    isLoading,
    error,
    hidden,
    reload: load,
  } = useApiResource(
    () =>
      guardHiddenTerm(
        'monthly_assessments',
        undefined,
        chosenTerm ?? undefined,
        () => getStudentMonthlyAssessments(chosenTerm ? { term: chosenTerm } : {}),
      ),
    [chosenTerm, t],
    t('profile.monthlyEvaluations.loadError'),
  )

  const view = useMemo(() => buildMonthlyAssessmentsView(data), [data])

  // Terms the school closed. Read at render: every answer that changes them also sets state.
  const closedTerms = lockedTerms('monthly_assessments', undefined)
  const allTermsClosed = closedTerms.length === 2
  const isTermClosed = (term: string) => (closedTerms as readonly string[]).includes(term)
  // Nothing of the report may show while it is closed, even if stale data is still around.
  const isClosed = Boolean(hidden) || allTermsClosed

  // The tab follows the term the backend actually loaded (`filters.term`).
  const loadedTerm = data?.filters?.term
  const selectedTerm: StudentWeeklyAssessmentTerm | null =
    chosenTerm ?? (loadedTerm === 'first' || loadedTerm === 'second' ? loadedTerm : null)
  const termSelectLabel = selectedTerm
    ? t(`profile.weeklyEvaluations.terms.${selectedTerm}`)
    : ''

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

        {allTermsClosed ? null : (
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedTerm ?? ''}
              onValueChange={(value) =>
                setChosenTerm(value === 'first' || value === 'second' ? value : null)
              }
            >
              <SelectTrigger
                aria-label={t('profile.monthlyEvaluations.selectTerm')}
                className="h-11 rounded-xl border-brand-primary bg-brand-primary px-4 font-medium text-white shadow-sm hover:bg-brand-dark data-[size=default]:h-11 [&_svg]:text-white"
              >
                <span className="flex flex-1 items-center gap-2 text-start">
                  {termSelectLabel}
                  {selectedTerm && isTermClosed(selectedTerm) ? (
                    <Lock className="size-3.5 shrink-0" aria-label={t('profile.hidden.unavailable')} />
                  ) : null}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-brand-dark/10 shadow-lg">
                <TermSelectItem value="first" locked={isTermClosed('first')}>
                  {t('profile.weeklyEvaluations.terms.first')}
                </TermSelectItem>
                <TermSelectItem value="second" locked={isTermClosed('second')}>
                  {t('profile.weeklyEvaluations.terms.second')}
                </TermSelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <InfoField label={t('profile.monthlyEvaluations.studentName')} value={studentName} />
          <div className="flex flex-col gap-4 sm:flex-row">
            <InfoField label={t('profile.monthlyEvaluations.grade')} value={studentGrade} />
            <InfoField label={t('profile.monthlyEvaluations.className')} value={studentClass} />
          </div>
        </div>

        {isClosed ? (
          <HiddenResultState message={hidden?.message} />
        ) : (
          <HiddenTermsNotice terms={closedTerms} />
        )}

        {!isClosed && data?.summary && !isLoading && !view.isEmpty ? (
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

        {isLoading && !hidden ? (
          <p role="status" className="text-sm text-brand-dark/55">
            {t('profile.loading')}
          </p>
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

        {!isLoading && !error && !isClosed && view.isEmpty ? (
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

        {!isLoading && !error && !isClosed
          ? view.groups.map((group) => (
              <section key={group.id} className="space-y-5">
                <h2 className="border-b border-brand-dark/10 pb-2 text-xl font-bold text-brand-dark">
                  {view.multipleYears && group.academicYear
                    ? t('profile.monthlyEvaluations.termHeadingYear', {
                        term: termLabel(group.term, t),
                        year: group.academicYear,
                      })
                    : termLabel(group.term, t)}
                </h2>
                <div className="space-y-8">
                  {group.cards.map((card) => (
                    <MonthTable key={card.id} card={card} />
                  ))}
                </div>
              </section>
            ))
          : null}

        {!isLoading && !error && !isClosed && view.unplacedTests.length > 0 ? (
          <section className="space-y-3 rounded-2xl border border-brand-dark/10 bg-muted/20 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-brand-dark">
              {t('profile.monthlyEvaluations.unplacedTitle')}
            </h2>
            <p className="text-sm text-brand-dark/55">
              {t('profile.monthlyEvaluations.unplacedDescription')}
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {view.unplacedTests.map((test) => (
                <li
                  key={test.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-dark/10 bg-white px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-bold text-brand-dark">{test.subjectName || '—'}</span>
                    <span className="ms-2 text-brand-dark/60">{testName(test, t)}</span>
                    {test.term ? (
                      <span className="ms-2 text-xs text-brand-dark/45">
                        {termLabel(test.term, t)}
                        {view.multipleYears && test.academicYear ? ` · ${test.academicYear}` : ''}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bold text-brand-primary">{testMark(test, t)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
