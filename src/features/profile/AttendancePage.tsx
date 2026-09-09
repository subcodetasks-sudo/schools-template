import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  ClipboardList,
  Percent,
} from 'lucide-react'
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

function formatAbsenceDate(date: string, language: string) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value)
}

function formatRate(rate: number | null | undefined) {
  if (rate === null || rate === undefined) return '—'
  return `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`
}

function classroomDisplay(
  classroom: { section?: string | null; label?: string | null } | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const section = classroom?.section?.trim()
  if (section) return t('profile.parentSummon.classroomSection', { section })
  return classroom?.label?.trim() || '—'
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

      <div className="mt-6 space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <CalendarX2 className="size-4" aria-hidden />
              </span>
              <h2 className="text-lg font-bold text-brand-dark">
                {t('profile.attendance.absencesTitle')}
              </h2>
            </div>
            {absences.length > 0 ? (
              <span className="rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
                {t('profile.attendance.absenceCount', { count: absences.length })}
              </span>
            ) : null}
          </div>

          {absences.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-12 text-center text-sm text-brand-dark/45">
              {t('profile.attendance.emptyAbsences')}
            </div>
          ) : (
            <ul className="space-y-3">
              {absences.map((row, index) => (
                <li
                  key={`${row.date}-${index}`}
                  className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-0">
                    <div className="flex shrink-0 items-center gap-3 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-e sm:border-brand-dark/10 sm:pe-4">
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 sm:size-11">
                        <CalendarX2 className="size-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-brand-dark">
                          {formatAbsenceDate(row.date, i18n.language)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-brand-primary">
                          {row.day_name || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 sm:ps-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-medium tracking-wide text-brand-dark/45 uppercase">
                            {t('profile.attendance.columns.note')}
                          </p>
                          <p className="mt-1 text-sm font-medium text-brand-dark">
                            {row.note?.trim() || t('profile.attendance.noNote')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium tracking-wide text-brand-dark/45 uppercase">
                            {t('profile.attendance.columns.classroom')}
                          </p>
                          <p className="mt-1 text-sm font-medium text-brand-dark">
                            {classroomDisplay(row.classroom, t)}
                          </p>
                        </div>
                      </div>
                      {row.recorded_by ? (
                        <p className="mt-3 text-xs text-brand-dark/45">
                          {t('profile.attendance.recordedBy', { name: row.recorded_by })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <CalendarDays className="size-4" aria-hidden />
            </span>
            <h2 className="text-lg font-bold text-brand-dark">
              {t('profile.attendance.byMonthTitle')}
            </h2>
          </div>

          {byMonth.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-12 text-center text-sm text-brand-dark/45">
              {t('profile.attendance.emptyMonths')}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {byMonth.map((item) => {
                const ratio = item.absence_days === 0 ? 0 : item.absence_days / maxMonthAbsences
                return (
                  <li
                    key={item.month}
                    className="rounded-2xl border border-brand-dark/10 bg-linear-to-br from-white to-brand-light/40 px-4 py-3.5"
                  >
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-dark">
                          {formatMonthLabel(item.month, i18n.language)}
                        </p>
                        <p className="mt-1 text-xs text-brand-dark/50">
                          {t('profile.attendance.byMonthHint')}
                        </p>
                      </div>
                      <p className="shrink-0 text-2xl font-bold tabular-nums text-brand-primary">
                        {item.absence_days}
                        <span className="ms-1 text-xs font-medium text-brand-dark/45">
                          {t('profile.attendance.dayUnit')}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-dark/8">
                      <div
                        className="h-full rounded-full bg-linear-to-l from-brand-primary to-brand-secondary transition-[width] duration-500"
                        style={{
                          width: `${Math.max(ratio * 100, item.absence_days > 0 ? 12 : 0)}%`,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
