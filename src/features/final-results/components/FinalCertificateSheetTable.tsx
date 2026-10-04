import { useTranslation } from 'react-i18next'
import {
  isFinalExamDanger,
  type FinalCertificateSheet,
} from '@/features/final-results/finalCertificateSheet'
import { cn } from '@/lib/utils'

const SUBJECT_TONES = [
  {
    key: 'blue',
    header: 'bg-sky-700 text-white',
    border: 'border-sky-600',
    sub: 'bg-sky-600/90 text-white',
  },
  {
    key: 'purple',
    header: 'bg-violet-700 text-white',
    border: 'border-violet-600',
    sub: 'bg-violet-600/90 text-white',
  },
  {
    key: 'green',
    header: 'bg-emerald-700 text-white',
    border: 'border-emerald-600',
    sub: 'bg-emerald-600/90 text-white',
  },
  {
    key: 'orange',
    header: 'bg-orange-700 text-white',
    border: 'border-orange-600',
    sub: 'bg-orange-600/90 text-white',
  },
  {
    key: 'cyan',
    header: 'bg-cyan-700 text-white',
    border: 'border-cyan-600',
    sub: 'bg-cyan-600/90 text-white',
  },
  {
    key: 'rose',
    header: 'bg-rose-700 text-white',
    border: 'border-rose-600',
    sub: 'bg-rose-600/90 text-white',
  },
  {
    key: 'amber',
    header: 'bg-amber-700 text-white',
    border: 'border-amber-600',
    sub: 'bg-amber-600/90 text-white',
  },
  {
    key: 'indigo',
    header: 'bg-indigo-700 text-white',
    border: 'border-indigo-600',
    sub: 'bg-indigo-600/90 text-white',
  },
] as const

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return <span className="text-brand-dark/40">—</span>
  }
  return (
    <span className="tabular-nums" dir="ltr">
      {value}
    </span>
  )
}

function formatScoreWithMax(
  value: number | null | undefined,
  max: number | null | undefined,
) {
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums" dir="ltr">
      {formatScore(value)}
      {max !== null && max !== undefined ? (
        <span className="text-xs font-normal text-brand-dark/45">/ {max}</span>
      ) : null}
    </span>
  )
}

function ResultBadge({ result }: { result: 'passed' | 'failed' | 'pending' }) {
  const { t } = useTranslation()

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        result === 'passed' && 'bg-brand-secondary text-white',
        result === 'failed' && 'bg-destructive/10 text-destructive',
        result === 'pending' && 'bg-amber-100 text-amber-800',
      )}
    >
      {t(`finalResults.sheet.results.${result}`)}
    </span>
  )
}

type FinalCertificateSheetTableProps = {
  sheet: FinalCertificateSheet
  className?: string
}

export function FinalCertificateSheetTable({
  sheet,
  className,
}: FinalCertificateSheetTableProps) {
  const { t } = useTranslation()

  if (sheet.subjects.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-dark/15 bg-muted/20 px-4 py-10 text-center text-sm text-brand-dark/55">
        {t('finalResults.sheet.noSubjects')}
      </p>
    )
  }

  if (sheet.students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-dark/15 bg-muted/20 px-4 py-10 text-center text-sm text-brand-dark/55">
        {t('finalResults.sheet.empty')}
      </p>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-brand-dark/10', className)}>
      <table className="w-full min-w-[42rem] border-collapse text-sm text-start">
        <thead>
          <tr>
            <th className="bg-brand-dark px-3 py-3 text-center text-xs font-bold text-white sm:text-sm">
              {t('finalResults.sheet.subject')}
            </th>
            <th className="bg-brand-primary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
              {t('finalResults.sheet.yearWork')}
            </th>
            <th className="bg-brand-primary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
              {t('finalResults.sheet.finalExam')}
            </th>
            <th className="bg-brand-secondary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
              {t('finalResults.sheet.subjectTotal')}
            </th>
            <th className="bg-brand-secondary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
              {t('finalResults.sheet.grandTotal')}
            </th>
            <th className="bg-brand-primary px-3 py-3 text-center text-xs font-bold whitespace-nowrap text-white sm:text-sm">
              {t('finalResults.table.status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sheet.students.flatMap((student, rowIndex) =>
            sheet.subjects.map((subject, subjectIndex) => {
              const tone = SUBJECT_TONES[subjectIndex % SUBJECT_TONES.length]
              const cell = student.subjects[subject.id] ?? {
                yearWork: null,
                yearWorkMax: null,
                finalExam: null,
                finalExamMax: null,
                total: null,
                totalMax: null,
                status: 'incomplete',
                finalExamPassed: null,
              }
              const examDanger = isFinalExamDanger(cell)

              return (
                <tr
                  key={`${student.studentId || student.code || rowIndex}-${subject.id}`}
                  className={cn(subjectIndex % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
                >
                  <th
                    scope="row"
                    className={cn(
                      'border-t px-3 py-2.5 text-center text-xs font-bold text-white sm:text-sm',
                      tone.header,
                      tone.border,
                    )}
                  >
                    {subject.name}
                  </th>
                  <td className="border-t border-brand-dark/8 px-2 py-2.5 text-center">
                    {formatScoreWithMax(cell.yearWork, cell.yearWorkMax)}
                  </td>
                  <td
                    className={cn(
                      'border-t border-brand-dark/8 px-2 py-2.5 text-center',
                      examDanger && 'bg-destructive/10 font-semibold text-destructive',
                    )}
                  >
                    {formatScoreWithMax(cell.finalExam, cell.finalExamMax)}
                  </td>
                  <td className="border-t border-brand-dark/8 px-2 py-2.5 text-center font-semibold text-brand-secondary">
                    {formatScoreWithMax(cell.total, cell.totalMax)}
                  </td>
                  <td className="border-t border-brand-dark/8 px-3 py-2.5 text-center font-semibold text-brand-secondary">
                    {formatScore(student.grandTotal)}
                  </td>
                  <td className="border-t border-brand-dark/8 px-3 py-2.5 text-center">
                    <ResultBadge result={student.result} />
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </div>
  )
}

