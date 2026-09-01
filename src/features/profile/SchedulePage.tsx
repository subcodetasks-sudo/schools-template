import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock } from 'lucide-react'
import {
  scheduleByDay,
  scheduleDays,
  scheduleTimeSlots,
  type ScheduleLesson,
} from '@/features/profile/scheduleData'
import { cn } from '@/lib/utils'

const headerCellClass =
  'border border-white/20 px-3 py-3 text-center align-middle'
const bodyCellClass = 'border border-brand-dark/10 px-2 py-3 text-center align-middle'
const dayCellClass =
  'border border-brand-dark/10 px-3 py-3 text-center align-middle text-xs font-semibold text-brand-primary sm:text-sm'

const scheduleColGroup = (
  <colgroup>
    <col style={{ width: '11%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
    <col style={{ width: '12.7%' }} />
  </colgroup>
)

function ScheduleCell({ lesson }: { lesson: ScheduleLesson | null }) {
  const { t } = useTranslation()

  if (!lesson) {
    return <td className={bodyCellClass} />
  }

  return (
    <td className={bodyCellClass}>
      <p className="text-xs font-semibold leading-snug text-brand-dark sm:text-sm">
        {t(`profile.schedule.subjects.${lesson.subjectKey}`)}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-brand-dark/50 sm:text-xs">
        {lesson.teacher}
      </p>
    </td>
  )
}

export function SchedulePage() {
  const { t } = useTranslation()

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

      <div className="-mx-5 mt-8 overflow-x-auto overscroll-x-contain px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-x-visible lg:px-0">
        <div className="min-w-[44rem] overflow-hidden rounded-2xl border border-brand-dark/10 shadow-sm lg:min-w-0 lg:w-full">
          <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm lg:min-w-0">
          {scheduleColGroup}
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
              {scheduleTimeSlots.map((slot) => (
                <th
                  key={`${slot.start}-${slot.end}`}
                  className={cn(headerCellClass, 'px-2')}
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Clock className="size-3.5 text-white/90" aria-hidden />
                    <span className="text-[10px] leading-tight font-bold sm:text-xs">
                      {slot.start} _ {slot.end}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduleDays.map((dayKey, index) => (
              <tr key={dayKey} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}>
                <th
                  scope="row"
                  className={dayCellClass}
                >
                  {t(`profile.schedule.days.${dayKey}`)}
                </th>
                {scheduleByDay[dayKey].map((lesson, lessonIndex) => (
                  <ScheduleCell key={`${dayKey}-${lessonIndex}`} lesson={lesson} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
