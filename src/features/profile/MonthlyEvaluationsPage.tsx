import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  evaluationColumnMaxScores,
  evaluationTotalMax,
  getMonthGrandTotal,
  getSubjectTotal,
  monthlyEvaluationStudent,
  monthlyEvaluationsByMonth,
  type MonthEvaluation,
} from '@/features/profile/monthlyEvaluationData'
import { cn } from '@/lib/utils'

const scoreKeys = [
  'performanceTasks',
  'homeworkNotebook',
  'activityNotebook',
  'weeklyEvaluation',
  'attendanceBehavior',
] as const

const evaluationsColGroup = (
  <colgroup>
    <col style={{ width: '22%' }} />
    <col style={{ width: '13%' }} />
    <col style={{ width: '13%' }} />
    <col style={{ width: '13%' }} />
    <col style={{ width: '13%' }} />
    <col style={{ width: '13%' }} />
    <col style={{ width: '13%' }} />
  </colgroup>
)

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

function getMonthLabel(month: number, language: string) {
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
    new Date(2026, month - 1, 1),
  )

  return language.startsWith('ar') ? `شهر ${monthName}` : monthName
}

function EvaluationTable({ evaluation }: { evaluation: MonthEvaluation }) {
  const { t } = useTranslation()
  const grandTotal = getMonthGrandTotal(evaluation)
  const maxGrandTotal = evaluationTotalMax * evaluation.subjects.length

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm">
        {evaluationsColGroup}
        <thead>
          <tr className="bg-brand-primary text-white">
            <th
              rowSpan={2}
              className="px-4 py-3 text-center align-middle text-xs font-bold whitespace-nowrap sm:text-sm"
            >
              {t('profile.monthlyEvaluations.columns.subject')}
            </th>
            {scoreKeys.map((scoreKey) => (
              <th
                key={scoreKey}
                className="px-2 py-3 text-center text-xs font-bold  sm:px-3 sm:text-sm"
              >
                {t(`profile.monthlyEvaluations.columns.${scoreKey}`)}
              </th>
            ))}
            <th className="px-2 py-3 text-center text-xs font-bold whitespace-nowrap sm:px-3 sm:text-sm">
              {t('profile.monthlyEvaluations.columns.total')}
            </th>
          </tr>
          <tr className="bg-brand-primary text-white">
            {evaluationColumnMaxScores.map((score) => (
              <th
                key={score}
                className="bg-brand-secondary/80 px-3 py-2 text-center text-sm font-semibold"
              >
                {score}
              </th>
            ))}
            <th className="bg-brand-secondary/80 px-3 py-2 text-center text-sm font-semibold">
              {evaluationTotalMax}
            </th>
          </tr>
        </thead>
        <tbody>
          {evaluation.subjects.map((subject, index) => {
            const total = getSubjectTotal(subject.scores)

            return (
              <tr key={subject.key} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}>
                <td className="border-t border-brand-dark/8 px-4 py-3 font-semibold text-brand-primary">
                  {t(`profile.monthlyEvaluations.subjects.${subject.key}`)}
                </td>
                {scoreKeys.map((scoreKey) => (
                  <td
                    key={scoreKey}
                    className="border-t border-brand-dark/8 px-3 py-3 text-center text-brand-dark"
                  >
                    {subject.scores[scoreKey]}
                  </td>
                ))}
                <td className="border-t border-brand-dark/8 px-3 py-3 text-center font-semibold text-brand-dark">
                  {total}
                </td>
              </tr>
            )
          })}
          <tr className="bg-brand-primary text-white">
            <td colSpan={7} className="px-4 py-3">
              <div className="flex items-center justify-between gap-4 font-bold">
                <span>{t('profile.monthlyEvaluations.grandTotal')}</span>
                <span>
                  {grandTotal} / {maxGrandTotal}
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
  const { t, i18n } = useTranslation()
  const currentMonth = new Date().getMonth() + 1
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1
        return {
          value: month,
          label: getMonthLabel(month, i18n.language),
        }
      }),
    [i18n.language],
  )

  const evaluation = monthlyEvaluationsByMonth[selectedMonth]
  const selectedMonthLabel =
    months.find((month) => month.value === selectedMonth)?.label ??
    t('profile.monthlyEvaluations.selectMonth')

  return (
    <div className="w-full">
      <div className="flex  items-start justify-between gap-4">
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

        <Select
          value={String(selectedMonth)}
          onValueChange={(value) => setSelectedMonth(Number(value))}
        >
          <SelectTrigger
            aria-label={t('profile.monthlyEvaluations.selectMonth')}
            className="h-11   rounded-xl border-brand-primary bg-brand-primary px-4 font-medium text-white shadow-sm hover:bg-brand-dark focus-visible:border-brand-primary focus-visible:ring-brand-primary/30 data-[size=default]:h-11 [&_svg]:text-white"
          >
            <span className="flex-1 text-start">{selectedMonthLabel}</span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
            {months.map((month) => (
              <SelectItem
                key={month.value}
                value={String(month.value)}
                className="rounded-lg focus:bg-brand-primary/10 focus:text-brand-primary data-highlighted:bg-brand-primary/10 data-highlighted:text-brand-primary [&_svg]:text-brand-primary"
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 space-y-6">
        <div className="space-y-4">
          <InfoField
            label={t('profile.monthlyEvaluations.studentName')}
            value={monthlyEvaluationStudent.name}
          />
          <div className="flex flex-col gap-4 sm:flex-row">
            <InfoField
              label={t('profile.monthlyEvaluations.grade')}
              value={monthlyEvaluationStudent.grade}
            />
            <InfoField
              label={t('profile.monthlyEvaluations.className')}
              value={monthlyEvaluationStudent.className}
            />
          </div>
        </div>

        {evaluation ? (
          <EvaluationTable evaluation={evaluation} />
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
