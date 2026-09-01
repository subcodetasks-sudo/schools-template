import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, Monitor, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authFieldClass } from '@/features/auth/AuthShell'
import {
  certificateReport,
  colorLegend,
  colorStyles,
  type GradeRow,
} from '@/features/profile/certificateData'
import { cn } from '@/lib/utils'

const signatureIcons = {
  computerOfficer: Monitor,
  committeeHead: ClipboardCheck,
  principal: UserRound,
} as const

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

function ColorBadge({ color }: { color: GradeRow['color'] }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className={cn('size-4 rounded-sm', colorStyles[color])} aria-hidden />
      <span className="sr-only">{t(`profile.certificate.colors.${color}`)}</span>
    </span>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="bg-brand-primary text-white">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex items-center justify-between gap-4 font-bold">
          <span>{label}</span>
          <span>{value}</span>
        </div>
      </td>
    </tr>
  )
}

const gradesColGroup = (
  <colgroup>
    <col style={{ width: '34%' }} />
    <col style={{ width: '16.5%' }} />
    <col style={{ width: '16.5%' }} />
    <col style={{ width: '16.5%' }} />
    <col style={{ width: '16.5%' }} />
  </colgroup>
)

const activitiesColGroup = (
  <colgroup>
    <col style={{ width: '75%' }} />
    <col style={{ width: '25%' }} />
  </colgroup>
)

export function CertificatePage() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [showResults, setShowResults] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!code.trim()) {
      toast.error(t('profile.certificate.codeRequired'))
      return
    }

    setShowResults(true)
  }

  return (
    <div className="w-full">
      <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
        {t('profile.nav.certificate')}
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

      <form onSubmit={handleSubmit} className="mt-8 w-full">
        <label className="block text-sm font-medium text-brand-dark" htmlFor="certificate-code">
          {t('profile.certificate.codeLabel')}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="certificate-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t('profile.certificate.codePlaceholder')}
            className={cn(authFieldClass, 'min-w-0 flex-1')}
          />
          <Button
            type="submit"
            className="h-12 shrink-0 rounded-xl bg-brand-primary px-6 text-white hover:bg-brand-dark sm:px-8"
          >
            {t('profile.certificate.showResult')}
          </Button>
        </div>
      </form>

      {showResults ? (
        <div className="mt-10 space-y-6">
          <header className="text-center">
            <p className="text-sm font-semibold leading-relaxed text-brand-dark sm:text-base">
              {t('profile.certificate.formTitle')}
            </p>
            <p className="mt-4 text-lg font-bold text-brand-primary">
              {t('profile.certificate.gradeLevel')}
            </p>
          </header>

          <div className="space-y-6">
            <div className="space-y-4">
              <InfoField
                label={t('profile.certificate.studentName')}
                value={certificateReport.student.name}
              />
              <div className="flex flex-col gap-4 sm:flex-row">
                <InfoField
                  label={t('profile.certificate.seatNumber')}
                  value={certificateReport.student.seatNumber}
                />
                <InfoField
                  label={t('profile.certificate.className')}
                  value={certificateReport.student.className}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-brand-primary/10 px-4 py-2 font-medium text-brand-primary">
                {t('profile.certificate.summary.totalSubjects', {
                  count: certificateReport.summary.totalSubjects,
                })}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-4 py-2 font-medium text-emerald-700">
                {t('profile.certificate.summary.successSubjects', {
                  count: certificateReport.summary.successSubjects,
                })}
              </span>
              <span className="rounded-full bg-rose-500/10 px-4 py-2 font-medium text-rose-700">
                {t('profile.certificate.summary.failureSubjects', {
                  count: certificateReport.summary.failureSubjects,
                })}
              </span>
            </div>

            <div className="w-full">
              <table className="w-full table-fixed border-collapse text-sm">
                {gradesColGroup}
                <thead>
                  <tr className="bg-brand-primary text-white">
                    <th className="px-4 py-3 text-start font-bold">
                      {t('profile.certificate.columns.subject')}
                    </th>
                    <th className="px-4 py-3 text-center font-bold">
                      {t('profile.certificate.columns.assessment')}
                    </th>
                    <th className="px-4 py-3 text-center font-bold">
                      {t('profile.certificate.columns.written')}
                    </th>
                    <th className="px-4 py-3 text-center font-bold">
                      {t('profile.certificate.columns.final')}
                    </th>
                    <th className="px-4 py-3 text-center font-bold">
                      {t('profile.certificate.columns.color')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificateReport.mainSubjects.map((row, index) => (
                    <tr
                      key={row.key}
                      className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
                    >
                      <td className="border-t border-brand-dark/8 px-4 py-3 font-semibold text-brand-primary">
                        {t(`profile.certificate.subjects.${row.key}`)}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        {row.assessment}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        {row.written}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center font-semibold">
                        {row.final}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        <ColorBadge color={row.color} />
                      </td>
                    </tr>
                  ))}
                  <TotalRow
                    label={t('profile.certificate.basicTotal')}
                    value={certificateReport.basicTotal}
                  />
                  {certificateReport.additionalSubjects.map((row) => (
                    <tr key={row.key} className="bg-white">
                      <td className="border-t border-brand-dark/8 px-4 py-3 font-semibold text-brand-primary">
                        {t(`profile.certificate.subjects.${row.key}`)}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        {row.assessment}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        {row.written}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center font-semibold">
                        {row.final}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                        <ColorBadge color={row.color} />
                      </td>
                    </tr>
                  ))}
                  <TotalRow
                    label={t('profile.certificate.grandTotal')}
                    value={certificateReport.grandTotal}
                  />
                  <tr className="bg-muted/30">
                    <td className="border-t border-brand-dark/8 px-4 py-3 font-semibold text-brand-primary">
                      {t(`profile.certificate.subjects.${certificateReport.religion.key}`)}
                    </td>
                    <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                      {certificateReport.religion.assessment}
                    </td>
                    <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                      {certificateReport.religion.written}
                    </td>
                    <td className="border-t border-brand-dark/8 px-4 py-3 text-center font-semibold">
                      {certificateReport.religion.final}
                    </td>
                    <td className="border-t border-brand-dark/8 px-4 py-3 text-center">
                      <ColorBadge color={certificateReport.religion.color} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <section className="w-full">
              <h3 className="bg-brand-primary px-4 py-3 text-center text-sm font-bold text-white">
                {t('profile.certificate.activitiesTitle')}
              </h3>
              <table className="w-full table-fixed border-collapse text-sm">
                {activitiesColGroup}
                <thead>
                  <tr className="bg-brand-secondary text-white">
                    <th className="px-4 py-2.5 text-start font-bold">
                      {t('profile.certificate.columns.subject')}
                    </th>
                    <th className="px-4 py-2.5 text-center font-bold">
                      {t('profile.certificate.columns.score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {certificateReport.activities.map((activity, index) => (
                    <tr
                      key={activity.key}
                      className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
                    >
                      <td className="border-t border-brand-dark/8 px-4 py-3 font-medium text-brand-dark">
                        {t(`profile.certificate.activities.${activity.key}`)}
                      </td>
                      <td className="border-t border-brand-dark/8 px-4 py-3 text-center font-semibold">
                        {activity.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {colorLegend.map((item) => (
                <div
                  key={item.color}
                  className={cn(
                    'rounded-xl px-4 py-3 text-white shadow-sm',
                    colorStyles[item.color],
                  )}
                >
                  <p className="font-bold">{t(`profile.certificate.colors.${item.color}`)}</p>
                  <p className="mt-1 text-sm text-white/90">
                    {t(`profile.certificate.legend.${item.rangeKey}`)}
                  </p>
                  <p className="mt-1 text-xs text-white/80">
                    {t(`profile.certificate.legendRanges.${item.rangeKey}`)}
                  </p>
                </div>
              ))}
            </section>

            <footer className="grid grid-cols-1 gap-4 border-t border-brand-dark/10 pt-6 sm:grid-cols-3">
              {certificateReport.signatures.map((signature) => {
                const Icon = signatureIcons[signature.key]

                return (
                  <div key={signature.key} className="text-center">
                    <div className="mx-auto mb-2 inline-flex size-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-brand-dark/55">
                      {t(`profile.certificate.signatures.${signature.key}`)}
                    </p>
                    <p className="mt-1 font-bold text-brand-dark">{signature.name}</p>
                  </div>
                )
              })}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
