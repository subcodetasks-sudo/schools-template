import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert, ShieldOff } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { GroupsPageTitle } from '@/features/groups/components/GroupsShared'
import {
  getStudentConduct,
  type ConductDegree,
  type StudentConductPayload,
  type StudentConductViolation,
} from '@/features/profile/conductApi'
import { cn } from '@/lib/utils'

function formatDate(value: string | null, language: string) {
  if (!value?.trim()) return null
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  const hasTime = value.includes(':')
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(hasTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

function degreeTone(degree: ConductDegree | null) {
  if (degree === 4) return 'bg-rose-500/10 text-rose-700'
  if (degree === 3) return 'bg-amber-500/10 text-amber-800'
  if (degree === 2) return 'bg-orange-500/10 text-orange-800'
  if (degree === 1) return 'bg-brand-primary/10 text-brand-primary'
  return 'bg-muted text-brand-dark/70'
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-brand-dark/45 uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-brand-dark">{value}</p>
    </div>
  )
}

function ViolationCard({ item }: { item: StudentConductViolation }) {
  const { t, i18n } = useTranslation()
  const degreeLabel = item.degree
    ? t(`profile.conduct.degrees.${item.degree}`)
    : t('profile.conduct.degrees.unknown')
  const issuedOn = formatDate(item.issuedOn, i18n.language)
  const issuedDisplay = [issuedOn, item.dayName].filter(Boolean).join(' · ')
  const violationTitle =
    item.violationDescription || item.description || t('profile.conduct.unnamedViolation')
  const penaltyDisplay = [item.penaltyNumber, item.penaltyName].filter(Boolean).join(' — ')
  const typeNumber = item.violationNumber
    ? t('profile.conduct.typeNumber', { number: item.violationNumber })
    : null

  return (
    <article className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {item.serial != null ? (
            <p className="text-xs font-semibold text-brand-primary">
              {t('profile.conduct.serial', { n: item.serial })}
            </p>
          ) : null}
          <h3 className="mt-1 text-base font-bold text-brand-dark">{violationTitle}</h3>
          {typeNumber ? <p className="mt-1 text-xs text-brand-dark/50">{typeNumber}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.approvalStatusLabel ? (
            <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {item.approvalStatusLabel}
            </span>
          ) : null}
          <span
            className={cn(
              'inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold',
              degreeTone(item.degree),
            )}
          >
            {degreeLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label={t('profile.conduct.fields.issuedOn')} value={issuedDisplay} />
        <Detail label={t('profile.conduct.fields.referralSource')} value={item.referralSource} />
        <Detail label={t('profile.conduct.fields.classroom')} value={item.classroomLabel} />
        <Detail
          label={t('profile.conduct.fields.repeatCount')}
          value={item.repeatCount != null ? String(item.repeatCount) : null}
        />
        <Detail label={t('profile.conduct.fields.penalty')} value={penaltyDisplay} />
        <Detail
          label={t('profile.conduct.fields.approvedAt')}
          value={formatDate(item.approvedAt, i18n.language)}
        />
        <Detail label={t('profile.conduct.fields.description')} value={item.description} />
        <Detail label={t('profile.conduct.fields.notes')} value={item.notes} />
        <Detail
          label={t('profile.conduct.fields.protectionApproval')}
          value={item.protectionApproval}
        />
        <Detail
          label={t('profile.conduct.fields.authoritiesNotifiedOn')}
          value={formatDate(item.authoritiesNotifiedOn, i18n.language)}
        />
        <Detail
          label={t('profile.conduct.fields.authoritiesDecision')}
          value={item.authoritiesDecision}
        />
        <Detail label={t('profile.conduct.fields.schoolDecision')} value={item.schoolDecision} />
      </div>
    </article>
  )
}

export function ConductPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<StudentConductPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setData(await getStudentConduct())
    } catch (err) {
      setData(null)
      setError(getErrorMessage(err, t('profile.conduct.loadError')))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

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
          onClick={() => void load()}
          className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
        >
          {t('profile.retry')}
        </button>
      </div>
    )
  }

  const violations = data?.violations ?? []

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <GroupsPageTitle>{t('profile.nav.conduct')}</GroupsPageTitle>
        {violations.length > 0 ? (
          <span className="rounded-lg bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
            {t('profile.conduct.violationCount', { count: violations.length })}
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-dark/55">
        {t('profile.conduct.subtitle')}
      </p>

      {data?.studiesSuspended ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-900"
        >
          <ShieldOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold">{t('profile.conduct.suspendedTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed">{t('profile.conduct.suspendedBody')}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-16 text-center">
            <span className="mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <ShieldAlert className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-brand-dark/45">{t('profile.conduct.emptyViolations')}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {violations.map((item) => (
              <li key={item.id}>
                <ViolationCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
