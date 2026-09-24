import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleDollarSign, Receipt, Wallet } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import {
  getStudentFees,
  readTuitionTotals,
  type StudentFeesPayload,
  type StudentSeparateFeePayment,
} from '@/features/profile/studentProfileApi'
import { cn } from '@/lib/utils'

const tuitionMeta = [
  {
    key: 'net',
    icon: Wallet,
    tone: 'bg-brand-primary/10 text-brand-primary',
  },
  {
    key: 'paid',
    icon: CircleDollarSign,
    tone: 'bg-emerald-500/10 text-emerald-700',
  },
  {
    key: 'remaining',
    icon: Receipt,
    tone: 'bg-amber-500/10 text-amber-800',
  },
] as const

function formatMoney(
  value: number | null,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (value === null) return '—'
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  return t('profile.fees.amount', {
    amount: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value),
  })
}

function formatPaidDate(value: string | null | undefined, language: string) {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function paymentAmount(payment: StudentSeparateFeePayment) {
  const parsed = Number(String(payment.amount ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function FeesPage() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<StudentFeesPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFees = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await getStudentFees())
    } catch (err) {
      setData(null)
      setError(getErrorMessage(err, t('profile.fees.loadError')))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadFees()
  }, [loadFees])

  const tuition = useMemo(() => readTuitionTotals(data?.tuition), [data?.tuition])
  const separatePayments = data?.separate?.payments ?? []
  const separateTotal = useMemo(() => {
    const listed = asListedTotal(separatePayments)
    const reported = Number(String(data?.separate?.paid_amount ?? '').replace(/,/g, ''))
    if (Number.isFinite(reported)) return reported
    return listed
  }, [data?.separate?.paid_amount, separatePayments])

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
          onClick={() => void loadFees()}
          className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
          {t('profile.nav.fees')}
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
        {data?.academic_year ? (
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.fees.academicYear', { year: data.academic_year })}
          </p>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-brand-dark">{t('profile.fees.tuition.title')}</h2>
        <p className="mt-1 text-sm text-brand-dark/55">{t('profile.fees.tuition.hint')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tuitionMeta.map((item) => (
            <article
              key={item.key}
              className="flex items-center justify-between rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm text-brand-dark/55">
                  {t(`profile.fees.tuition.${item.key}`)}
                </p>
                <p className="mt-1 text-2xl font-bold text-brand-dark">
                  {formatMoney(tuition[item.key], i18n.language, t)}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-xl',
                  item.tone,
                )}
              >
                <item.icon className="size-5" aria-hidden />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-dark">{t('profile.fees.separate.title')}</h2>
          {separateTotal !== null ? (
            <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
              {t('profile.fees.separate.total', {
                amount: formatMoney(separateTotal, i18n.language, t),
              })}
            </span>
          ) : null}
        </div>
        <p className="mb-4 text-sm text-brand-dark/55">{t('profile.fees.separate.hint')}</p>

        {separatePayments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-10 text-center text-sm text-brand-dark/45">
            {t('profile.fees.separate.empty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {separatePayments.map((payment, index) => {
              const amount = paymentAmount(payment)
              const date = formatPaidDate(payment.paid_at ?? payment.date, i18n.language)
              return (
                <li
                  key={`${payment.id ?? payment.label ?? 'payment'}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark">
                      {payment.label?.trim() || t('profile.fees.separate.unnamed')}
                    </p>
                    {date ? (
                      <p className="mt-1 text-xs text-brand-dark/50">{date}</p>
                    ) : null}
                  </div>
                  <span className="text-sm font-bold text-brand-primary">
                    {formatMoney(amount, i18n.language, t)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function asListedTotal(payments: StudentSeparateFeePayment[]) {
  const amounts = payments
    .map(paymentAmount)
    .filter((value): value is number => value !== null)
  if (amounts.length === 0) return null
  return amounts.reduce((sum, value) => sum + value, 0)
}
