import { useTranslation } from 'react-i18next'
import {
  History,
  LineChart as LineChartIcon,
  Package,
  Users,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

const chartData = [
  { year: '2015', assignments: 25, tests: 0 },
  { year: '2016', assignments: 78, tests: 55 },
  { year: '2017', assignments: 42, tests: 28 },
  { year: '2018', assignments: 68, tests: 72 },
  { year: '2019', assignments: 98, tests: 90 },
]

const stats = [
  {
    key: 'attendance',
    valueKey: 'profile.statistics.cards.attendance.value',
    hintKey: 'profile.statistics.cards.attendance.hint',
    icon: History,
    tone: 'bg-orange-100 text-orange-600',
  },
  {
    key: 'callups',
    valueKey: 'profile.statistics.cards.callups.value',
    icon: Users,
    tone: 'bg-violet-100 text-violet-600',
  },
  {
    key: 'tests',
    valueKey: 'profile.statistics.cards.tests.value',
    icon: LineChartIcon,
    tone: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'absences',
    valueKey: 'profile.statistics.cards.absences.value',
    icon: Package,
    tone: 'bg-amber-100 text-amber-700',
  },
] as const

export function StatisticsPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
        {t('profile.nav.statistics')}
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

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.key}
            className="flex items-center justify-between rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm text-brand-dark/55">
                {t(`profile.statistics.cards.${stat.key}.label`)}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-dark">
                {t(stat.valueKey)}
                {'hintKey' in stat ? (
                  <span className="ms-1 text-sm font-medium text-brand-dark/45">
                    {t(stat.hintKey)}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
                stat.tone,
              )}
            >
              <stat.icon className="size-5" aria-hidden />
            </span>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-dark">
            {t('profile.statistics.chartTitle')}
          </h2>
          <div className="flex items-center gap-4 text-sm text-brand-dark/70">
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-rose-600" aria-hidden />
              {t('profile.statistics.assignments')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-brand-dark" aria-hidden />
              {t('profile.statistics.tests')}
            </span>
          </div>
        </div>

        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,83,111,0.12)" />
              <XAxis
                dataKey="year"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(31,83,111,0.55)', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgba(31,83,111,0.55)', fontSize: 12 }}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: 'rgba(31,83,111,0.12)',
                  boxShadow: '0 8px 24px rgba(31,83,111,0.08)',
                }}
              />
              <Legend content={() => null} />
              <Line
                type="monotone"
                dataKey="assignments"
                name={t('profile.statistics.assignments')}
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#e11d48', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="tests"
                name={t('profile.statistics.tests')}
                stroke="#1f536f"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#1f536f', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
