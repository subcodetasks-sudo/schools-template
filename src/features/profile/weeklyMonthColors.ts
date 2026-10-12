/**
 * Month colours for the weekly table, built only from the brand design-system
 * tokens (primary / secondary / dark / chart / muted).
 *
 * Tints use `color-mix(... white)` so they stay opaque: the week column and
 * header rows are sticky and must not show scrolled content through them.
 * Class strings are written in full so Tailwind can see them.
 */
export type WeeklyMonthPalette = {
  /** Full-width month band row. */
  band: string
  /** Sticky week-label cell. */
  week: string
  /** Body cells of the month's rows. */
  cell: string
  /** Total column cells. */
  total: string
  /** Border colour used between the month's cells. */
  border: string
}

const PALETTES: readonly WeeklyMonthPalette[] = [
  {
    band: 'bg-brand-primary text-white',
    week: 'bg-[color-mix(in_oklab,var(--color-brand-primary)_16%,white)] text-brand-dark',
    cell: 'bg-[color-mix(in_oklab,var(--color-brand-primary)_5%,white)]',
    total: 'bg-[color-mix(in_oklab,var(--color-brand-primary)_14%,white)]',
    border: 'border-brand-primary/20',
  },
  {
    band: 'bg-brand-secondary text-brand-dark',
    week: 'bg-[color-mix(in_oklab,var(--color-brand-secondary)_22%,white)] text-brand-dark',
    cell: 'bg-[color-mix(in_oklab,var(--color-brand-secondary)_7%,white)]',
    total: 'bg-[color-mix(in_oklab,var(--color-brand-secondary)_20%,white)]',
    border: 'border-brand-secondary/30',
  },
  {
    band: 'bg-brand-dark text-white',
    week: 'bg-[color-mix(in_oklab,var(--color-brand-dark)_18%,white)] text-brand-dark',
    cell: 'bg-[color-mix(in_oklab,var(--color-brand-dark)_6%,white)]',
    total: 'bg-[color-mix(in_oklab,var(--color-brand-dark)_16%,white)]',
    border: 'border-brand-dark/20',
  },
  {
    band: 'bg-chart-3 text-white',
    week: 'bg-[color-mix(in_oklab,var(--color-chart-3)_20%,white)] text-brand-dark',
    cell: 'bg-[color-mix(in_oklab,var(--color-chart-3)_6%,white)]',
    total: 'bg-[color-mix(in_oklab,var(--color-chart-3)_18%,white)]',
    border: 'border-chart-3/25',
  },
  {
    band: 'bg-brand-muted text-brand-dark',
    week: 'bg-[color-mix(in_oklab,var(--color-brand-muted)_55%,white)] text-brand-dark',
    cell: 'bg-brand-light/60',
    total: 'bg-[color-mix(in_oklab,var(--color-brand-muted)_50%,white)]',
    border: 'border-brand-muted',
  },
]

/** Academic-year order: the school year starts in September. */
export const ACADEMIC_MONTH_ORDER = [
  'september',
  'october',
  'november',
  'december',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
] as const

/**
 * A month always gets the same palette (by its place in the school year), and
 * neighbouring months never share one.
 */
export function getWeeklyMonthPalette(month: string | null | undefined): WeeklyMonthPalette {
  const index = month ? (ACADEMIC_MONTH_ORDER as readonly string[]).indexOf(month.toLowerCase()) : -1
  return PALETTES[(index === -1 ? PALETTES.length - 1 : index) % PALETTES.length]
}
