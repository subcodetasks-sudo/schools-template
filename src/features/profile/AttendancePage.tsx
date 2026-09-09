import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarX2, CheckCircle2, ClipboardList, Percent } from 'lucide-react'
import {
  getStudentAbsences,
  type StudentAbsencesPayload,
} from '@/features/profile/studentProfileApi'
import { cn } from '@/lib/utils'

const summaryMeta = [
  {
    key: 'attendanceRate',
    icon: Percent,
    tone: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    key: 'presentDays',
    icon: CheckCircle2,
    tone: 'bg-emerald-500/10 text-emerald-700',
  },
  {
    key: 'absenceDays',
    icon: CalendarX2,
    tone: 'bg-rose-500/10 text-rose-700',
  },
  {
    key: 'recordedDays',
    icon: ClipboardList,
    tone: 'bg-brand-secondary/10 text-brand-secondary',
  },
] as const

function formatMonthLabel(month: string, language: string) {
  const [year, monthPart] = month.split('-')
  const yearNum = Number(year)
  const monthNum = Number(monthPart)
  if (!yearNum || !monthNum) return month

  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(yearNum, monthNum - 1, 1),
  )
}

function formatRate(rate: number | null | undefined) {
  if (rate === null || rate === undefined) return '—'
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`
}

export function AttendancePage() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<StudentAbsencesPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAbsences = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = await getStudentAbsences()
      setData(payload)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : t('profile.attendance.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadAbsences()
  }, [loadAbsences])

  const summaryCards = useMemo(() => {
    const summary = data?.summary
    return {
      attendanceRate: formatRate(summary?.attendance_rate),
      presentDays: summary?.present_days ?? '—',
      absenceDays: summary?.absence_days ?? '—',
      recordedDays: summary?.recorded_days ?? '—',
    }
  }, [data])

  const maxMonthAbsences = useMemo(() => {
    const values = data?.by_month?.map((item) => item.absence_days) ?? []
    return Math.max(1, ...values, 0)
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55">
        {t('profile.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void loadAbsences()}
          className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      </div>
    )
  }

  const absences = data?.absences ?? []
  const byMonth = data?.by_month ?? []
  const academicYear = data?.filters?.academic_year

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('profile.nav.attendance')}
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
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.attendance.academicYear', { year: academicYear })}
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMeta.map((item) => (
          <article
            key={item.key}
            className="flex items-center justify-between rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm text-brand-dark/55">
                {t(`profile.attendance.summary.${item.key}`)}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-dark">{summaryCards[item.key]}</p>
            </div>
            <span
              className={cn(
                'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
                item.tone,
              )}
            >
              <item.icon className="size-5" aria-hidden />
            </span>
          </article>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold text-brand-dark">
            {t('profile.attendance.byMonthTitle')}
          </h2>
          {byMonth.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-brand-dark/45">
              {t('profile.attendance.emptyMonths')}
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {byMonth.map((item) => (
                <li key={item.month}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-brand-dark">
                      {formatMonthLabel(item.month, i18n.language)}
                    </span>
                    <span className="font-semibold text-brand-primary">
                      {t('profile.attendance.absenceCount', { count: item.absence_days })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-dark/8">
                    <div
                      className="h-full rounded-full bg-brand-primary"
                      style={{
                        width: `${item.absence_days === 0 ? 0 : Math.max(8, (item.absence_days / maxMonthAbsences) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold text-brand-dark">
            {t('profile.attendance.absencesTitle')}
          </h2>
          {absences.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-brand-dark/45">
              {t('profile.attendance.emptyAbsences')}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-md border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-primary text-white">
                    <th className="px-3 py-2.5 text-start font-bold">
                      {t('profile.attendance.columns.date')}
                    </th>
                    <th className="px-3 py-2.5 text-start font-bold">
                      {t('profile.attendance.columns.day')}
                    </th>
                    <th className="px-3 py-2.5 text-start font-bold">
                      {t('profile.attendance.columns.note')}
                    </th>
                    <th className="px-3 py-2.5 text-start font-bold">
                      {t('profile.attendance.columns.classroom')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((row, index) => (
                    <tr
                      key={`${row.date}-${index}`}
                      className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
                    >
                      <td className="border-t border-brand-dark/8 px-3 py-3 font-semibold text-brand-dark">
                        {row.date}
                      </td>
                      <td className="border-t border-brand-dark/8 px-3 py-3 text-brand-dark/80">
                        {row.day_name || '—'}
                      </td>
                      <td className="border-t border-brand-dark/8 px-3 py-3 text-brand-dark/80">
                        {row.note?.trim() || t('profile.attendance.noNote')}
                      </td>
                      <td className="border-t border-brand-dark/8 px-3 py-3 text-brand-dark/80">
                        {row.classroom?.label || row.classroom?.section || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
