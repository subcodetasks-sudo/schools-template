import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { authFieldClass } from '@/features/auth/AuthShell'
import { FinalCertificateSheetTable } from '@/features/final-results/components/FinalCertificateSheetTable'
import { isSchoolFinalCertificateBlocked } from '@/features/final-results/finalCertificateSheet'
import { useProfile } from '@/features/profile/ProfileContext'
import {
  buildSheetFromSuccessCertificate,
  getSuccessCertificate,
  unlockSuccessCertificate,
  type SuccessCertificatePayload,
  type SuccessCertificateTerm,
} from '@/features/profile/successCertificateApi'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

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

export function CertificatePage() {
  const { t } = useTranslation()
  const { personalName, profileData, gradeName, classroomLabel, stageName } = useProfile()
  const [qrToken, setQrToken] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** In-memory only for this visit — never persisted to web storage. */
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [payload, setPayload] = useState<SuccessCertificatePayload | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<SuccessCertificateTerm>('first')

  const ministryBlocked = isSchoolFinalCertificateBlocked({
    name: gradeName,
    code: null,
  })

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!qrToken.trim()) {
      toast.error(t('profile.certificate.codeRequired'))
      return
    }

    setIsUnlocking(true)
    setError(null)

    try {
      await unlockSuccessCertificate(qrToken)
      const data = await getSuccessCertificate()

      if (!data.certificate) {
        throw new Error(t('profile.certificate.loadError'))
      }

      // Keep grades only in React state for this page visit.
      setPayload(data)
      setSessionUnlocked(true)
      setQrToken('')
      toast.success(t('profile.certificate.unlockSuccess'))
    } catch (err) {
      setPayload(null)
      setSessionUnlocked(false)
      const message = getErrorMessage(err, t('profile.certificate.unlockError'))
      setError(message)
      toast.error(message)
    } finally {
      setIsUnlocking(false)
    }
  }

  const sheet = useMemo(
    () => buildSheetFromSuccessCertificate(payload, selectedTerm),
    [payload, selectedTerm],
  )

  const certificate = payload?.certificate
  const student = certificate?.student
  const studentName = student?.name?.trim() || personalName || t('profile.studentName')
  const seatNumber =
    student?.class_number?.trim() || profileData.classNumber || profileData.studentCode || '—'
  const studentClass =
    student?.classroom?.label?.trim() ||
    student?.classroom?.section?.trim() ||
    classroomLabel ||
    profileData.classNumber ||
    '—'
  const gradeLabel =
    student?.grade?.name?.trim() || gradeName || t('profile.certificate.gradeLevel')
  const academicYear = certificate?.academic_year
  const summary = certificate?.summary
  const showCertificate = sessionUnlocked && Boolean(certificate)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
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

        {showCertificate && academicYear ? (
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.certificate.academicYear', { year: academicYear })}
          </p>
        ) : null}
      </div>

      {ministryBlocked ? (
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm leading-relaxed text-amber-900">
          {t('finalResults.ministryManagedHint')}
        </p>
      ) : !showCertificate ? (
        <form onSubmit={handleUnlock} className="mt-8 w-full max-w-2xl">
          <p className="text-sm leading-relaxed text-brand-dark/65">
            {t('profile.certificate.unlockHint')}
          </p>
          <label className="mt-5 block text-sm font-medium text-brand-dark" htmlFor="certificate-qr">
            {t('profile.certificate.codeLabel')}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="certificate-qr"
              value={qrToken}
              onChange={(event) => setQrToken(event.target.value)}
              placeholder={t('profile.certificate.codePlaceholder')}
              className={cn(authFieldClass, 'min-w-0 flex-1')}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={isUnlocking}
              className="h-12 shrink-0 rounded-xl bg-brand-primary px-6 text-white hover:bg-brand-dark sm:px-8"
            >
              {isUnlocking
                ? t('profile.certificate.unlocking')
                : t('profile.certificate.showResult')}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </form>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <header>
              <p className="text-lg font-bold text-brand-primary">{gradeLabel}</p>
              {stageName ? (
                <p className="mt-1 text-sm text-brand-dark/55">{stageName}</p>
              ) : null}
            </header>

            <Select
              value={selectedTerm}
              onValueChange={(value) =>
                setSelectedTerm((value as SuccessCertificateTerm) || 'first')
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-brand-primary bg-brand-primary px-4 font-medium text-white data-[size=default]:h-11 sm:w-48 [&_svg]:text-white">
                <span className="flex-1 text-start">
                  {t(`profile.weeklyEvaluations.terms.${selectedTerm}`)}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-brand-dark/10 shadow-lg">
                <SelectItem value="first" className="rounded-lg">
                  {t('profile.weeklyEvaluations.terms.first')}
                </SelectItem>
                <SelectItem value="second" className="rounded-lg">
                  {t('profile.weeklyEvaluations.terms.second')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <InfoField label={t('profile.certificate.studentName')} value={studentName} />
            <div className="flex flex-col gap-4 sm:flex-row">
              <InfoField label={t('profile.certificate.seatNumber')} value={seatNumber} />
              <InfoField label={t('profile.certificate.className')} value={studentClass} />
            </div>
          </div>

          {summary ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-brand-primary/10 px-4 py-2 font-medium text-brand-primary">
                {t('profile.certificate.summary.totalSubjects', {
                  count: summary.subjects_count ?? 0,
                })}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-4 py-2 font-medium text-emerald-700">
                {t('profile.certificate.summary.successSubjects', {
                  count: summary.subjects_passed ?? 0,
                })}
              </span>
              <span className="rounded-full bg-rose-500/10 px-4 py-2 font-medium text-rose-700">
                {t('profile.certificate.summary.failureSubjects', {
                  count: summary.subjects_failed ?? 0,
                })}
              </span>
            </div>
          ) : null}

          <FinalCertificateSheetTable sheet={sheet} />
        </div>
      )}
    </div>
  )
}
