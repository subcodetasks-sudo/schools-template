import { useMemo } from 'react'
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
import { useProfile } from '@/features/profile/ProfileContext'
import { cn } from '@/lib/utils'

const brandPrimary = '#245c7c'
const brandSecondary = '#3bb4b3'
const brandDark = '#1f536f'

const statsMeta = [
  {
    key: 'attendance',
    icon: History,
    tone: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    key: 'callups',
    icon: Users,
    tone: 'bg-brand-secondary/10 text-brand-secondary',
  },
  {
    key: 'tests',
    icon: LineChartIcon,
    tone: 'bg-brand-light text-brand-primary',
  },
  {
    key: 'absences',
    icon: Package,
    tone: 'bg-brand-dark/10 text-brand-dark',
  },
] as const

function formatValue(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '—'
  return `${value}${suffix}`
}

export function StatisticsPage() {
  const { t } = useTranslation()
  const { statistics, isLoading, error, refreshProfile } = useProfile()

  const cards = useMemo(() => {
    const data = statistics?.cards
    return {
      attendance: {
        value: formatValue(data?.attendance?.rate, '%'),
        hint:
          data?.attendance?.sessions != null
            ? `(${data.attendance.sessions} ${t('profile.statistics.sessions')})`
            : '',
      },
      callups: { value: formatValue(data?.callups?.count) },
      tests: { value: formatValue(data?.tests?.completed) },
      absences: { value: formatValue(data?.absences?.count) },
    }
  }, [statistics, t])

  const chartData = useMemo(() => {
    const assignments = statistics?.evaluation?.assignments
    const tests = statistics?.evaluation?.tests
    if (assignments == null && tests == null) return []

    return [
      {
        label: t('profile.statistics.current'),
        assignments: assignments ?? 0,
        tests: tests ?? 0,
      },
    ]
  }, [statistics, t])

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
        {statsMeta.map((stat) => (
          <article
            key={stat.key}
            className="flex items-center justify-between rounded-xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-sm text-brand-dark/55">
                {t(`profile.statistics.cards.${stat.key}.label`)}
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-dark">
                {cards[stat.key].value}
                {stat.key === 'attendance' && cards.attendance.hint ? (
                  <span className="ms-1 text-sm font-medium text-brand-dark/45">
                    {cards.attendance.hint}
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
              <span className="size-3 rounded-sm bg-brand-primary" aria-hidden />
              {t('profile.statistics.assignments')}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-3 rounded-sm bg-brand-secondary" aria-hidden />
              {t('profile.statistics.tests')}
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-dark/45">
            {t('profile.placeholders.statistics')}
          </p>
        ) : (
          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${brandDark}1f`} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: `${brandDark}8c`, fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: `${brandDark}8c`, fontSize: 12 }}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: `${brandDark}1f`,
                    boxShadow: '0 8px 24px rgba(31,83,111,0.08)',
                  }}
                />
                <Legend content={() => null} />
                <Line
                  type="monotone"
                  dataKey="assignments"
                  name={t('profile.statistics.assignments')}
                  stroke={brandPrimary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: brandPrimary, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="tests"
                  name={t('profile.statistics.tests')}
                  stroke={brandSecondary}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: brandSecondary, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
