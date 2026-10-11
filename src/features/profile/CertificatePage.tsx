import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PrintPdfDocument } from '@/components/pdf/PrintPdfDocument'
import { authFieldClass } from '@/features/auth/AuthShell'
import { isSchoolFinalCertificateBlocked } from '@/features/final-results/finalCertificateSheet'
import { useProfile } from '@/features/profile/ProfileContext'
import { SuccessCertificatePdf } from '@/features/profile/SuccessCertificatePdf'
import {
  collectComponentColumns,
  extractQrToken,
  findComponent,
  getSuccessCertificate,
  unlockSuccessCertificate,
  type SuccessCertificateComponent,
  type SuccessCertificateEvaluationColor,
  type SuccessCertificatePayload,
  type SuccessCertificateSubjectRow,
  type SuccessCertificateTerm,
} from '@/features/profile/successCertificateApi'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const CERTIFICATE_QR_STORAGE_KEY = 'school-frontend:success-certificate-qr'

const EVALUATION_TONES: Record<
  string,
  { cell: string; chip: string; swatch: string }
> = {
  blue: {
    cell: 'bg-sky-100 text-sky-900',
    chip: 'bg-sky-600 text-white',
    swatch: 'bg-sky-600',
  },
  green: {
    cell: 'bg-emerald-100 text-emerald-900',
    chip: 'bg-emerald-600 text-white',
    swatch: 'bg-emerald-600',
  },
  yellow: {
    cell: 'bg-amber-100 text-amber-900',
    chip: 'bg-amber-500 text-white',
    swatch: 'bg-amber-400',
  },
  red: {
    cell: 'bg-rose-100 text-rose-900',
    chip: 'bg-rose-600 text-white',
    swatch: 'bg-rose-600',
  },
}

function readSavedQrToken() {
  try {
    return localStorage.getItem(CERTIFICATE_QR_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function saveQrToken(token: string) {
  try {
    localStorage.setItem(CERTIFICATE_QR_STORAGE_KEY, token)
  } catch {
    // Storage can be unavailable in private mode or when site data is blocked.
  }
}

function clearSavedQrToken() {
  try {
    localStorage.removeItem(CERTIFICATE_QR_STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private mode or when site data is blocked.
  }
}

function displayText(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function formatScoreWithMax(
  score: number | null | undefined,
  max: number | null | undefined,
) {
  if (score === null || score === undefined) return '—'
  if (max === null || max === undefined) return formatScore(score)
  return `${formatScore(score)} / ${formatScore(max)}`
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}%`
}

function formatRate(value: number | null | undefined) {
  return formatPercentage(value)
}

function evaluationTone(color: SuccessCertificateEvaluationColor | null | undefined) {
  return EVALUATION_TONES[String(color || '').toLowerCase()] ?? {
    cell: 'bg-brand-dark/5 text-brand-dark',
    chip: 'bg-brand-dark/70 text-white',
    swatch: 'bg-brand-dark/40',
  }
}

function ComponentScoreCell({ component }: { component?: SuccessCertificateComponent }) {
  const { t } = useTranslation()

  if (!component) {
    return <span className="text-brand-dark/35">—</span>
  }

  const statusKey = component.status?.trim().toLowerCase()
  const statusLabel = statusKey
    ? t(`profile.certificate.componentStatus.${statusKey}`, {
        defaultValue: component.status ?? '',
      })
    : null

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="tabular-nums font-medium text-brand-dark" dir="ltr">
        {formatScoreWithMax(component.score, component.max)}
      </span>
      {statusLabel ? (
        <span className="text-[10px] font-medium tracking-wide text-brand-dark/45">
          {statusLabel}
        </span>
      ) : null}
    </div>
  )
}

function EvaluationCell({ row }: { row: SuccessCertificateSubjectRow }) {
  const { t, i18n } = useTranslation()
  const evaluation = row.evaluation
  const color = evaluation?.color
  const tone = evaluationTone(color)
  const colorLabel =
    i18n.language.startsWith('ar') && evaluation?.color_ar
      ? evaluation.color_ar
      : color
        ? t(`profile.certificate.colors.${color}`, { defaultValue: String(color) })
        : '—'

  return (
    <div className={cn('inline-flex items-center justify-center rounded-lg px-2 py-1.5', tone.cell)}>
      <span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', tone.chip)}>
        {colorLabel}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation()
  const normalized = String(status || '').toLowerCase()
  const label = status
    ? t(`profile.certificate.status.${normalized}`, { defaultValue: status })
    : '—'

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        normalized === 'pass' && 'bg-emerald-500/15 text-emerald-800',
        normalized === 'fail' && 'bg-rose-500/15 text-rose-800',
        normalized !== 'pass' && normalized !== 'fail' && 'bg-amber-100 text-amber-900',
      )}
    >
      {label}
    </span>
  )
}

const LEGEND_COLORS = ['blue', 'green', 'yellow', 'red'] as const

export function CertificatePage() {
  const { t } = useTranslation()
  const {
    personalName,
    profileData,
    gradeName,
    classroomLabel,
    stageName,
    setSuccessCertificateUnlocked,
  } = useProfile()
  const [qrToken, setQrToken] = useState(readSavedQrToken)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** In-memory only for this visit — never persisted to web storage. */
  const [sessionUnlocked, setSessionUnlocked] = useState(false)
  const [payload, setPayload] = useState<SuccessCertificatePayload | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const autoUnlockAttempted = useRef(false)
  const handlePrintDone = useCallback(() => setIsPrinting(false), [])

  const ministryBlocked = isSchoolFinalCertificateBlocked({
    name: gradeName,
    code: null,
  })

  const applyUnlockedPayload = (data: SuccessCertificatePayload) => {
    if (!data.certificate) {
      throw new Error(t('profile.certificate.loadError'))
    }
    setPayload(data)
    setSessionUnlocked(true)
    setSuccessCertificateUnlocked(true)
  }

  const unlockCertificate = async (token: string, showToast: boolean) => {
    const normalizedToken = token.trim()
    if (!normalizedToken) {
      toast.error(t('profile.certificate.codeRequired'))
      return
    }

    setIsUnlocking(true)
    setError(null)

    try {
      const unlocked = await unlockSuccessCertificate(normalizedToken)
      const data = unlocked.certificate
        ? unlocked
        : await getSuccessCertificate()

      applyUnlockedPayload(data)

      saveQrToken(extractQrToken(normalizedToken))
      setQrToken('')
      if (showToast) toast.success(t('profile.certificate.unlockSuccess'))
    } catch (err) {
      clearSavedQrToken()
      setPayload(null)
      setSessionUnlocked(false)
      const message = getErrorMessage(err, t('profile.certificate.unlockError'))
      setError(message)
      if (showToast) toast.error(message)
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await unlockCertificate(qrToken, true)
  }

  useEffect(() => {
    if (autoUnlockAttempted.current) return
    autoUnlockAttempted.current = true

    const savedToken = readSavedQrToken()
    if (savedToken) void unlockCertificate(savedToken, false)
  }, [])

  const certificate = payload?.certificate
  const student = certificate?.student
  const subjects = certificate?.subjects ?? []
  const componentColumns = useMemo(() => collectComponentColumns(subjects), [subjects])

  const studentName = displayText(student?.name?.trim() || personalName, t('profile.studentName'))
  const nationalId = displayText(student?.national_id, profileData.nationalId || '—')
  const studentCode = displayText(student?.code, profileData.studentCode || '—')
  const seatNumber = displayText(
    student?.class_number,
    profileData.classNumber || profileData.studentCode || '—',
  )
  const studentClass = displayText(
    student?.classroom?.label?.trim() || student?.classroom?.section?.trim(),
    classroomLabel || profileData.classNumber || '—',
  )
  const gradeLabel = displayText(student?.grade?.name?.trim(), gradeName || '—')
  const stageLabel = displayText(student?.stage?.name?.trim(), stageName || '—')
  const classroomSection = displayText(student?.classroom?.section, '—')
  const academicYear = displayText(certificate?.academic_year)
  const termKey = (certificate?.term || 'first') as SuccessCertificateTerm | string
  const termLabel = t(`profile.weeklyEvaluations.terms.${termKey}`, {
    defaultValue: String(termKey),
  })
  const attendanceRate = formatRate(certificate?.attendance_rate)
  const summary = certificate?.summary
  const showCertificate = sessionUnlocked && Boolean(certificate)

  const infoFields = [
    [t('profile.certificate.studentName'), studentName],
    [t('profile.certificate.nationalId'), nationalId],
    [t('profile.certificate.studentCode'), studentCode],
    [t('profile.certificate.seatNumber'), seatNumber],
    [t('profile.certificate.className'), studentClass],
    [t('profile.certificate.classroomSection'), classroomSection],
    [t('profile.certificate.stage'), stageLabel],
    [t('profile.certificate.grade'), gradeLabel],
    [t('profile.certificate.term'), termLabel],
    [t('profile.certificate.academicYearLabel'), academicYear],
    [t('profile.certificate.attendanceRate'), attendanceRate],
  ] as const

  const infoRows: Array<Array<(typeof infoFields)[number]>> = []
  for (let i = 0; i < infoFields.length; i += 2) {
    infoRows.push(infoFields.slice(i, i + 2) as Array<(typeof infoFields)[number]>)
  }

  const passCount = subjects.filter((row) => String(row.status).toLowerCase() === 'pass').length
  const failCount = subjects.filter((row) => String(row.status).toLowerCase() === 'fail').length

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

        {showCertificate && academicYear !== '—' ? (
          <p className="text-sm font-medium text-brand-dark/55">
            {t('profile.certificate.academicYear', { year: academicYear })}
            {' · '}
            {termLabel}
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
          <p className="text-center text-base font-bold leading-relaxed text-brand-dark sm:text-lg">
            {t('profile.certificate.formTitleDynamic', {
              term: termLabel,
              year: academicYear,
            })}
          </p>

          <div className="overflow-hidden rounded-lg border border-brand-dark/10">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {infoRows.map((pair, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-muted/25'}>
                    {pair.map(([label, value]) => (
                      <Fragment key={label}>
                        <th
                          scope="row"
                          className="w-[18%] border-t border-brand-dark/8 bg-brand-primary px-3 py-2.5 text-start text-xs font-semibold whitespace-nowrap text-white sm:text-sm"
                        >
                          {label}
                        </th>
                        <td className="border-t border-brand-dark/8 px-3 py-2.5 font-medium text-brand-dark">
                          {value}
                        </td>
                      </Fragment>
                    ))}
                    {pair.length === 1 ? (
                      <>
                        <th className="w-[18%] border-t border-brand-dark/8 bg-brand-primary/80 px-3 py-2.5" />
                        <td className="border-t border-brand-dark/8 px-3 py-2.5" />
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-brand-primary/10 px-4 py-2 font-medium text-brand-primary">
              {t('profile.certificate.summary.totalSubjects', {
                count: summary?.subjects_count ?? subjects.length,
              })}
            </span>
            <span className="rounded-full bg-emerald-500/10 px-4 py-2 font-medium text-emerald-700">
              {t('profile.certificate.summary.successSubjects', {
                count: summary?.subjects_passed ?? passCount,
              })}
            </span>
            <span className="rounded-full bg-rose-500/10 px-4 py-2 font-medium text-rose-700">
              {t('profile.certificate.summary.failureSubjects', {
                count: summary?.subjects_failed ?? failCount,
              })}
            </span>
            {summary?.subjects_incomplete != null ? (
              <span className="rounded-full bg-amber-100 px-4 py-2 font-medium text-amber-900">
                {t('profile.certificate.summary.incompleteSubjects', {
                  count: summary.subjects_incomplete,
                })}
              </span>
            ) : null}
          </div>

          <section className="rounded-xl border border-brand-dark/10 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-brand-dark">
              {t('profile.certificate.legendTitle')}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {LEGEND_COLORS.map((color) => {
                const tone = evaluationTone(color)
                return (
                  <div
                    key={color}
                    className="flex items-center gap-3 rounded-lg border border-brand-dark/8 px-3 py-2"
                  >
                    <span className={cn('h-4 w-4 shrink-0 rounded-full', tone.swatch)} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">
                        {t(`profile.certificate.colors.${color}`)}
                      </p>
                      <p className="truncate text-xs text-brand-dark/60">
                        {t(`profile.certificate.legend.${color}`)} ·{' '}
                        {t(`profile.certificate.legendRanges.${color}`)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {subjects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-dark/15 bg-muted/20 px-4 py-10 text-center text-sm text-brand-dark/55">
              {t('profile.certificate.noSubjects')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-brand-dark/10">
              <table className="w-full min-w-4xl border-collapse text-sm text-start">
                <thead>
                  <tr>
                    <th className="sticky inset-s-0 z-10 bg-brand-dark px-3 py-3 text-center text-xs font-bold text-white sm:text-sm">
                      {t('profile.certificate.columns.subject')}
                    </th>
                    {componentColumns.map((column) => (
                      <th
                        key={column.key}
                        className="bg-brand-primary px-2 py-3 text-center text-[11px] font-bold leading-snug text-white sm:text-xs"
                      >
                        {column.name}
                      </th>
                    ))}
                    <th className="bg-brand-secondary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
                      {t('profile.certificate.columns.total')}
                    </th>
                    <th className="bg-brand-secondary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
                      {t('profile.certificate.columns.percentage')}
                    </th>
                    <th className="bg-brand-primary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
                      {t('profile.certificate.columns.color')}
                    </th>
                    <th className="bg-brand-primary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
                      {t('profile.certificate.columns.status')}
                    </th>
                    <th className="bg-brand-dark/80 px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
                      {t('profile.certificate.columns.term')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((row, index) => {
                    const subjectName = displayText(row.subject?.name)
                    const subjectId = displayText(row.subject?.id, '')
                    return (
                      <tr
                        key={`${subjectId || subjectName}-${index}`}
                        className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/25')}
                      >
                        <th
                          scope="row"
                          className="sticky inset-s-0 z-10 border-t border-brand-dark/8 bg-inherit px-3 py-2.5 text-center text-xs font-bold text-brand-dark sm:text-sm"
                        >
                          {subjectName}
                        </th>
                        {componentColumns.map((column) => (
                          <td
                            key={column.key}
                            className="border-t border-brand-dark/8 px-2 py-2 text-center"
                          >
                            <ComponentScoreCell component={findComponent(row, column.key)} />
                          </td>
                        ))}
                        <td
                          className="border-t border-brand-dark/8 px-2 py-2.5 text-center font-semibold text-brand-secondary tabular-nums"
                          dir="ltr"
                        >
                          {formatScoreWithMax(row.total, row.total_max)}
                        </td>
                        <td
                          className="border-t border-brand-dark/8 px-2 py-2.5 text-center font-semibold tabular-nums"
                          dir="ltr"
                        >
                          {formatPercentage(row.percentage)}
                        </td>
                        <td className="border-t border-brand-dark/8 px-2 py-2 text-center">
                          <EvaluationCell row={row} />
                        </td>
                        <td className="border-t border-brand-dark/8 px-2 py-2.5 text-center">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="border-t border-brand-dark/8 px-2 py-2.5 text-center text-xs text-brand-dark/70">
                          {t(`profile.weeklyEvaluations.terms.${row.term || termKey}`, {
                            defaultValue: displayText(row.term),
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-6 pt-4 sm:grid-cols-3">
            {(['computerOfficer', 'committeeHead', 'principal'] as const).map((key) => (
              <div key={key} className="text-center">
                <div className="mx-auto mb-8 h-px w-32 bg-brand-dark/25" />
                <p className="text-sm font-semibold text-brand-dark">
                  {t(`profile.certificate.signatures.${key}`)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-brand-primary text-brand-primary"
              disabled={isPrinting || subjects.length === 0}
              onClick={() => setIsPrinting(true)}
            >
              {t('profile.certificate.print')}
            </Button>
          </div>

          <PrintPdfDocument open={isPrinting} onDone={handlePrintDone}>
            <SuccessCertificatePdf
              studentName={studentName}
              studentCode={studentCode}
              academicYear={academicYear}
              term={termKey}
              subjects={subjects}
              componentColumns={componentColumns}
            />
          </PrintPdfDocument>
        </div>
      )}
    </div>
  )
}
