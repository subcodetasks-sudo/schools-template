import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { useProfile } from '@/features/profile/ProfileContext'
import { cn } from '@/lib/utils'

const headerCellClass =
  'border border-white/20 px-3 py-3 text-center align-middle'
const bodyCellClass = 'border border-brand-dark/10 px-2 py-3 text-center align-middle'
const dayCellClass =
  'border border-brand-dark/10 px-3 py-3 text-center align-middle text-xs font-semibold text-brand-primary sm:text-sm'

function dayLabel(day: string, t: (key: string) => string) {
  const key = `profile.schedule.days.${day}`
  const translated = t(key)
  return translated === key ? day : translated
}

function periodLabel(period: number, t: (key: string, options?: Record<string, unknown>) => string) {
  const key = `profile.schedule.periods.${period}`
  const translated = t(key)
  return translated === key ? t('profile.schedule.periodFallback', { n: period }) : translated
}

export function SchedulePage() {
  const { t } = useTranslation()
  const { schedule, isLoading, error, refreshProfile } = useProfile()

  const grid = useMemo(() => {
    if (!schedule) return null

    const days = schedule.days.length ? schedule.days : []
    const periods = schedule.periods.length ? schedule.periods : [1, 2, 3, 4, 5, 6, 7]
    const byDayPeriod = new Map<string, Array<{ subject: string; teacher: string }>>()

    const pushLesson = (day: string, period: number, subject: string, teacher: string) => {
      const key = `${day}-${period}`
      const list = byDayPeriod.get(key) ?? []
      list.push({ subject, teacher })
      byDayPeriod.set(key, list)
    }

    if (schedule.slots?.length) {
      for (const slot of schedule.slots) {
        const assignments = slot.assignments?.length
          ? slot.assignments
          : [{ subject: null, teacher: null }]
        for (const assignment of assignments) {
          pushLesson(
            slot.day,
            slot.period,
            assignment.subject?.name?.trim() || '—',
            assignment.teacher?.name?.trim() || '—',
          )
        }
      }
    } else {
      for (const entry of schedule.entries ?? []) {
        pushLesson(
          entry.day,
          entry.period,
          entry.subject?.name?.trim() || '—',
          entry.teacher?.name?.trim() || '—',
        )
      }
    }

    return { days, periods, byDayPeriod }
  }, [schedule])

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
          onClick={() => void refreshProfile()}
          className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      </div>
    )
  }

  if (!grid || grid.days.length === 0) {
    return (
      <div className="w-full">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('profile.nav.schedule')}
        </h1>
        <p className="mt-8 text-sm text-brand-dark/55">{t('profile.placeholders.schedule')}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
        {t('profile.nav.schedule')}
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

      {schedule?.classroom?.label ? (
        <p className="mt-3 text-sm text-brand-dark/55">{schedule.classroom.label}</p>
      ) : null}

      <div className="-mx-5 mt-8 overflow-x-auto overscroll-x-contain px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-x-visible lg:px-0">
        <div className="min-w-[44rem] overflow-hidden rounded-2xl border border-brand-dark/10 shadow-sm lg:min-w-0 lg:w-full">
          <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm lg:min-w-0">
            <thead>
              <tr className="bg-brand-primary text-white">
                <th className={headerCellClass}>
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CalendarDays className="size-4 text-white/90" aria-hidden />
                    <span className="text-xs font-bold sm:text-sm">
                      {t('profile.schedule.dayColumn')}
                    </span>
                  </div>
                </th>
                {grid.periods.map((period) => (
                  <th key={period} className={cn(headerCellClass, 'px-2')}>
                    <span className="text-[10px] leading-tight font-bold sm:text-xs">
                      {periodLabel(period, t)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.days.map((day, index) => (
                <tr key={day} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}>
                  <th scope="row" className={dayCellClass}>
                    {dayLabel(day, t)}
                  </th>
                  {grid.periods.map((period) => {
                    const lessons = grid.byDayPeriod.get(`${day}-${period}`) ?? []
                    return (
                      <td key={`${day}-${period}`} className={bodyCellClass}>
                        {lessons.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {lessons.map((lesson, lessonIndex) => (
                              <div key={`${day}-${period}-${lessonIndex}`}>
                                <p className="text-xs font-semibold leading-snug text-brand-dark sm:text-sm">
                                  {lesson.subject}
                                </p>
                                <p className="mt-1 text-[11px] leading-snug text-brand-dark/50 sm:text-xs">
                                  {lesson.teacher}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
