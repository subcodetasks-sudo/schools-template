import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { StudentWeeklyAssessmentEntry } from '@/features/profile/studentProfileApi'
import {
  buildWeeklyTable,
  type WeeklyTableCell,
  type WeeklyTableComponentColumn,
  type WeeklyTableRow,
  type WeeklyTableSubjectColumn,
} from '@/features/profile/weeklyTableModel'
import { getWeeklyMonthPalette } from '@/features/profile/weeklyMonthColors'
import { cn } from '@/lib/utils'

const ALL_SUBJECTS = 'all'

/** Header row heights are fixed so the second header row can stick right below the first. */
const HEAD_ROW_1 = 'h-10'
const HEAD_ROW_2_TOP = 'top-10'

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}

function ScoreValue({ score, max }: { score: number | null; max: number | null }) {
  if (score === null) return <span className="text-brand-dark/35">—</span>
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-brand-dark">{formatNumber(score)}</span>
      {max !== null ? (
        <span className="text-[10px] text-brand-dark/50 sm:text-[11px]">
          {'/'}
          {formatNumber(max)}
        </span>
      ) : null}
    </span>
  )
}

function componentLabel(column: WeeklyTableComponentColumn, isEnglish: boolean) {
  return (isEnglish && column.nameEn?.trim()) || column.name || column.key
}

const CELL_BASE = 'border-b border-e px-1.5 py-2 text-center align-middle text-xs tabular-nums sm:px-2 sm:text-sm'
const GROUP_START = 'border-s-2 border-s-brand-dark/20'

/** Every body cell of a subject group: its components plus the total. */
function SubjectCells({
  subject,
  cell,
  palette,
  noEntryLabel,
  absentLabel,
}: {
  subject: WeeklyTableSubjectColumn
  cell: WeeklyTableCell | undefined
  palette: ReturnType<typeof getWeeklyMonthPalette>
  noEntryLabel: string
  absentLabel: string
}) {
  const span = subject.components.length + 1
  const base = cn(CELL_BASE, palette.border)

  if (!cell) {
    return (
      <td colSpan={span} className={cn(base, GROUP_START, palette.cell, 'text-brand-dark/35')}>
        <span aria-hidden>—</span>
        <span className="sr-only">{noEntryLabel}</span>
      </td>
    )
  }

  if (cell.absent) {
    return (
      <td colSpan={span} className={cn(base, GROUP_START, 'bg-destructive/5')}>
        <span className="inline-block rounded-lg bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
          {absentLabel}
        </span>
      </td>
    )
  }

  return (
    <>
      {subject.components.map((component, index) => {
        const value = cell.components[component.key]
        return (
          <td key={component.key} className={cn(base, palette.cell, index === 0 && GROUP_START)}>
            <ScoreValue score={value?.score ?? null} max={value?.max ?? null} />
          </td>
        )
      })}
      <td
        className={cn(
          base,
          palette.total,
          subject.components.length === 0 && GROUP_START,
        )}
      >
        <ScoreValue score={cell.total} max={cell.maxTotal} />
      </td>
    </>
  )
}

function WeekLabel({ row }: { row: WeeklyTableRow }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-start gap-0.5 leading-tight">
      <span className="text-xs font-semibold sm:text-sm">
        {row.week != null
          ? t('profile.weeklyEvaluations.weekNumber', { n: row.week })
          : (row.weekDate ?? t('profile.weeklyEvaluations.unknownWeek'))}
      </span>
      {row.week != null && row.weekDate ? (
        <span className="text-[10px] font-normal opacity-70 sm:text-[11px]" dir="ltr">
          {row.weekDate}
        </span>
      ) : null}
    </div>
  )
}

export function WeeklyAssessmentsTable({
  entries,
}: {
  entries: StudentWeeklyAssessmentEntry[]
}) {
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.language.startsWith('en')
  const isMobile = useIsMobile()

  const [subjectChoice, setSubjectChoice] = useState<string | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<ReadonlySet<string>>(new Set())

  const model = useMemo(
    () =>
      buildWeeklyTable(entries, (key) => {
        const translationKey = `profile.weeklyEvaluations.scoreColumns.${key}`
        const translated = t(translationKey)
        return translated === translationKey ? key : translated
      }),
    [entries, t],
  )

  const canPickSubject = model.subjects.length > 1
  // Phones can't fit several subject groups side by side, so they start on one subject.
  const selectedSubject =
    subjectChoice && model.subjects.some((subject) => subject.id === subjectChoice)
      ? subjectChoice
      : isMobile && canPickSubject
        ? model.subjects[0].id
        : ALL_SUBJECTS

  const visibleSubjects = useMemo(
    () =>
      selectedSubject === ALL_SUBJECTS
        ? model.subjects
        : model.subjects.filter((subject) => subject.id === selectedSubject),
    [model.subjects, selectedSubject],
  )

  // Hide weeks where none of the visible subjects has anything recorded.
  const visibleMonths = useMemo(
    () =>
      model.months
        .map((block) => ({
          ...block,
          rows: block.rows.filter((row) =>
            visibleSubjects.some((subject) => row.cells[subject.id]),
          ),
        }))
        .filter((block) => block.rows.length > 0),
    [model.months, visibleSubjects],
  )

  const totalColumns =
    1 + visibleSubjects.reduce((sum, subject) => sum + subject.components.length + 1, 0)

  const translateOr = (key: string, fallback: string) => {
    const translated = t(key)
    return translated === key ? fallback : translated
  }

  const toggleMonth = (key: string) =>
    setCollapsedMonths((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const noEntryLabel = t('profile.weeklyEvaluations.table.notRecorded')
  const absentLabel = t('profile.weeklyEvaluations.absent')
  const totalLabel = t('profile.weeklyEvaluations.table.total')

  return (
    <div className="space-y-3">
      {canPickSubject ? (
        <div
          role="group"
          aria-label={t('profile.weeklyEvaluations.table.subjectPicker')}
          className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1"
        >
          {[{ id: ALL_SUBJECTS, name: t('profile.weeklyEvaluations.filters.allSubjects') }]
            .concat(model.subjects.map(({ id, name }) => ({ id, name })))
            .map((option) => {
              const active = option.id === selectedSubject
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSubjectChoice(option.id)}
                  className={cn(
                    'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
                    active
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-brand-dark/15 bg-white text-brand-dark hover:border-brand-primary/50',
                  )}
                >
                  {option.name}
                </button>
              )
            })}
        </div>
      ) : null}

      <div className="max-h-[75vh] overflow-auto overscroll-x-contain rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t('profile.weeklyEvaluations.table.caption')}</caption>
          <thead>
            <tr>
              {/* The first column intentionally has no visible title. */}
              <th
                scope="col"
                rowSpan={2}
                className="sticky inset-s-0 top-0 z-40 min-w-20 border-b border-e border-brand-muted bg-brand-light px-2 py-2 sm:min-w-28 sm:px-3"
              >
                <span className="sr-only">{t('profile.weeklyEvaluations.table.weekColumn')}</span>
              </th>
              {visibleSubjects.map((subject) => (
                <th
                  key={subject.id}
                  scope="colgroup"
                  colSpan={subject.components.length + 1}
                  className={cn(
                    'sticky top-0 z-30 border-b border-e border-brand-primary bg-brand-primary px-2 text-center text-xs font-bold text-white sm:px-3 sm:text-sm',
                    HEAD_ROW_1,
                    GROUP_START,
                  )}
                >
                  {subject.name}
                </th>
              ))}
            </tr>
            <tr>
              {visibleSubjects.map((subject) => (
                <Fragment key={subject.id}>
                  {subject.components.map((component, index) => (
                    <th
                      key={component.key}
                      scope="col"
                      className={cn(
                        'sticky z-30 min-w-16 border-b border-e border-brand-muted bg-brand-light px-1.5 py-2 text-center text-[11px] font-semibold leading-tight text-brand-dark sm:min-w-24 sm:px-2 sm:text-xs',
                        HEAD_ROW_2_TOP,
                        index === 0 && GROUP_START,
                      )}
                    >
                      {componentLabel(component, isEnglish)}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className={cn(
                      'sticky z-30 min-w-14 border-b border-e border-brand-muted bg-brand-muted px-1.5 py-2 text-center text-[11px] font-bold leading-tight text-brand-dark sm:min-w-20 sm:px-2 sm:text-xs',
                      HEAD_ROW_2_TOP,
                      subject.components.length === 0 && GROUP_START,
                    )}
                  >
                    {totalLabel}
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          {visibleMonths.map((block) => {
            const palette = getWeeklyMonthPalette(block.month)
            const collapsed = collapsedMonths.has(block.key)
            const monthName = block.month
              ? translateOr(`profile.weeklyEvaluations.months.${block.month}`, block.month)
              : t('profile.weeklyEvaluations.unknownWeek')
            const termName = block.term
              ? translateOr(`profile.weeklyEvaluations.terms.${block.term}`, block.term)
              : null

            return (
              <tbody key={block.key}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={totalColumns}
                    className={cn('p-0 text-start text-sm font-bold', palette.band)}
                  >
                    {/* Sticky so the month stays in view while the table scrolls sideways. */}
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      onClick={() => toggleMonth(block.key)}
                      className="sticky inset-s-0 flex min-h-11 w-fit max-w-[100vw] items-center gap-2 px-3 py-2 text-start"
                    >
                      <ChevronDown
                        className={cn(
                          'size-4 shrink-0 transition-transform',
                          collapsed && '-rotate-90 rtl:rotate-90',
                        )}
                        aria-hidden
                      />
                      <span>{monthName}</span>
                      {termName ? (
                        <span className="text-xs font-medium opacity-80">· {termName}</span>
                      ) : null}
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold">
                        {block.rows.length}
                      </span>
                    </button>
                  </th>
                </tr>
                {collapsed
                  ? null
                  : block.rows.map((row) => (
                      <tr key={row.key}>
                        <th
                          scope="row"
                          className={cn(
                            'sticky inset-s-0 z-10 border-b border-e px-2 py-2 text-start align-middle shadow-[inset_-1px_0_0_rgba(0,0,0,0.04)] sm:px-3',
                            palette.week,
                            palette.border,
                          )}
                        >
                          <WeekLabel row={row} />
                        </th>
                        {visibleSubjects.map((subject) => (
                          <SubjectCells
                            key={subject.id}
                            subject={subject}
                            cell={row.cells[subject.id]}
                            palette={palette}
                            noEntryLabel={noEntryLabel}
                            absentLabel={absentLabel}
                          />
                        ))}
                      </tr>
                    ))}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}
