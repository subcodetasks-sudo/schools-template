import { useTranslation } from 'react-i18next'
import {
  isFinalExamDanger,
  type FinalCertificateSheet,
  type FinalCertificateSubjectCell,
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

function SubjectCells({
  cell,
  borderClass,
}: {
  cell: FinalCertificateSubjectCell
  borderClass: string
}) {
  const examDanger = isFinalExamDanger(cell)

  return (
    <>
      <td className={cn('border-t border-brand-dark/8 px-2 py-2.5 text-center', borderClass)}>
        {formatScore(cell.yearWork)}
      </td>
      <td
        className={cn(
          'border-t border-brand-dark/8 px-2 py-2.5 text-center',
          examDanger && 'bg-destructive/10 font-semibold text-destructive',
        )}
      >
        {formatScore(cell.finalExam)}
      </td>
      <td className="border-t border-brand-dark/8 px-2 py-2.5 text-center font-semibold text-brand-secondary">
        {formatScore(cell.total)}
      </td>
    </>
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
      <table className="w-full min-w-[48rem] border-collapse text-sm text-start">
        <thead>
          <tr>
            {sheet.subjects.map((subject, index) => {
              const tone = SUBJECT_TONES[index % SUBJECT_TONES.length]
              return (
                <th
                  key={subject.id}
                  colSpan={3}
                  className={cn(
                    'border-s-2 px-2 py-2.5 text-center text-xs font-bold sm:text-sm',
                    tone.header,
                    tone.border,
                  )}
                >
                  {subject.name}
                </th>
              )
            })}
            <th
              rowSpan={2}
              className="bg-brand-secondary px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap text-white sm:text-sm"
            >
              {t('finalResults.sheet.grandTotal')}
            </th>
            <th
              rowSpan={2}
              className="bg-brand-primary px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap text-white sm:text-sm"
            >
              {t('finalResults.table.status')}
            </th>
          </tr>
          <tr>
            {sheet.subjects.map((subject, index) => {
              const tone = SUBJECT_TONES[index % SUBJECT_TONES.length]
              return (
                <FragmentHeaders
                  key={`${subject.id}-subs`}
                  toneClass={tone.sub}
                  borderClass={cn('border-s-2', tone.border)}
                />
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sheet.students.map((student, rowIndex) => (
            <tr
              key={student.studentId || student.code || rowIndex}
              className={cn(rowIndex % 2 === 0 ? 'bg-white' : 'bg-muted/30')}
            >
              {sheet.subjects.map((subject, index) => {
                const tone = SUBJECT_TONES[index % SUBJECT_TONES.length]
                const cell = student.subjects[subject.id] ?? {
                  yearWork: null,
                  finalExam: null,
                  total: null,
                  totalMax: null,
                  status: 'incomplete',
                  finalExamPassed: null,
                }
                return (
                  <SubjectCells
                    key={`${student.studentId}-${subject.id}`}
                    cell={cell}
                    borderClass={cn('border-s-2', tone.border)}
                  />
                )
              })}
              <td className="border-t border-brand-dark/8 px-3 py-2.5 text-center font-semibold text-brand-secondary">
                {formatScore(student.grandTotal)}
              </td>
              <td className="border-t border-brand-dark/8 px-3 py-2.5 text-center">
                <ResultBadge result={student.result} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FragmentHeaders({
  toneClass,
  borderClass,
}: {
  toneClass: string
  borderClass: string
}) {
  const { t } = useTranslation()
  return (
    <>
      <th
        className={cn(
          'px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap sm:text-xs',
          toneClass,
          borderClass,
        )}
      >
        {t('finalResults.sheet.yearWork')}
      </th>
      <th
        className={cn(
          'px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap sm:text-xs',
          toneClass,
        )}
      >
        {t('finalResults.sheet.finalExam')}
      </th>
      <th
        className={cn(
          'px-2 py-2 text-center text-[11px] font-semibold whitespace-nowrap sm:text-xs',
          toneClass,
        )}
      >
        {t('finalResults.sheet.subjectTotal')}
      </th>
    </>
  )
}
