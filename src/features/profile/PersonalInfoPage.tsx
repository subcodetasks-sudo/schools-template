import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileBadge,
  Hash,
  Home,
  IdCard,
  Phone,
  Receipt,
  RefreshCcw,
  Wallet,
} from 'lucide-react'

const fields = [
  { key: 'nationalId', icon: IdCard },
  { key: 'studentCode', icon: Hash },
  { key: 'phone', icon: Phone },
  { key: 'religion', icon: BadgeCheck },
  { key: 'registrationStatus', icon: FileBadge },
  { key: 'classNumber', icon: Hash },
  { key: 'transfers', icon: RefreshCcw },
  { key: 'fees', icon: Wallet },
  { key: 'paymentVoucher', icon: Receipt },
  { key: 'paymentDate', icon: CalendarDays },
  { key: 'paymentAmount', icon: CreditCard },
  { key: 'fatherNationalId', icon: IdCard },
  { key: 'fatherAddress', icon: Home },
  { key: 'fatherJob', icon: Briefcase },
  { key: 'fatherPhone', icon: Phone },
] as const

export function PersonalInfoPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
        {t('profile.personal.title')}
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

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {fields.map((field) => (
          <article
            key={field.key}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
          >
            <field.icon className="size-4 text-brand-primary" aria-hidden />
            <span className="text-xs font-medium text-brand-dark/50">
              {t(`profile.personal.fields.${field.key}.label`)}
            </span>
            <p className="text-sm font-semibold text-brand-dark" dir="auto">
              {t(`profile.personal.fields.${field.key}.value`)}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
