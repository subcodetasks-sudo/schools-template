import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import {
  Brain,
  CircleAlert,
  GraduationCap,
  Hash,
  HeartPulse,
  Layers,
  School,
  ShieldAlert,
  StickyNote,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { authFieldClass } from '@/features/auth/AuthShell'
import {
  INTRODUCTION_CARD_TEXT_MAX,
  INTRODUCTION_CARD_TYPES,
  isIntroductionCardType,
  type IntroductionCardEntry,
  type IntroductionCardErrorKind,
  type IntroductionCardStudent,
  type IntroductionCardType,
} from '@/features/introduction-card/introductionCardApi'
import { invalidFieldClass } from '@/features/introduction-card/components/fieldStyles'
import { cn } from '@/lib/utils'

const typeTones: Record<IntroductionCardType, { icon: LucideIcon; tone: string }> = {
  health: { icon: HeartPulse, tone: 'bg-destructive/10 text-destructive' },
  psychological: { icon: Brain, tone: 'bg-brand-primary/10 text-brand-primary' },
  social: { icon: UsersRound, tone: 'bg-amber-500/10 text-amber-800' },
  other: { icon: StickyNote, tone: 'bg-brand-dark/5 text-brand-dark/70' },
}

export function EntryTypeBadge({ entry }: { entry: Pick<IntroductionCardEntry, 'type' | 'typeLabel'> }) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = typeTones[entry.type ?? 'other']
  const label = entry.type
    ? t(`profile.introductionCard.types.${entry.type}`)
    : (entry.typeLabel ?? t('profile.introductionCard.types.other'))

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        tone,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span dir="auto">{label}</span>
    </span>
  )
}

export function IntroductionCardErrorState({
  kind,
  message,
  onRetry,
}: {
  kind: IntroductionCardErrorKind
  message?: string | null
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const Icon = kind === 'forbidden' ? ShieldAlert : CircleAlert

  return (
    <div
      role="alert"
      className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-12 text-center"
    >
      <span
        className={cn(
          'inline-flex size-14 items-center justify-center rounded-full',
          kind === 'generic' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700',
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-lg font-bold text-brand-dark">
        {kind === 'forbidden'
          ? t('profile.introductionCard.errors.forbiddenTitle')
          : t('profile.introductionCard.errors.genericTitle')}
      </p>
      <p className="max-w-md text-sm text-brand-dark/55">
        {kind === 'forbidden'
          ? t('profile.introductionCard.errors.forbiddenDescription')
          : message || t('profile.introductionCard.errors.genericDescription')}
      </p>
      {kind === 'generic' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-xl border border-brand-dark/15 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
        >
          {t('profile.retry')}
        </button>
      ) : null}
    </div>
  )
}

const studentFields = [
  { key: 'name', icon: UserRound },
  { key: 'code', icon: Hash },
  { key: 'stage', icon: Layers },
  { key: 'grade', icon: GraduationCap },
  { key: 'classroom', icon: School },
] as const satisfies ReadonlyArray<{ key: keyof IntroductionCardStudent; icon: LucideIcon }>

export function StudentHeader({ student }: { student: IntroductionCardStudent }) {
  const { t } = useTranslation()

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {studentFields.map((field) => (
        <div
          key={field.key}
          className="flex min-w-0 flex-col items-start gap-1.5 rounded-2xl border border-brand-dark/10 bg-white px-3.5 py-3.5 shadow-sm"
        >
          <field.icon className="size-4 text-brand-primary" aria-hidden />
          <dt className="text-xs font-medium text-brand-dark/50">
            {t(`profile.introductionCard.student.${field.key}`)}
          </dt>
          <dd className="max-w-full text-sm font-semibold wrap-break-word text-brand-dark" dir="auto">
            {student[field.key] ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function FieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: {
  htmlFor: string
  required?: boolean
  optional?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <label className="mb-1.5 block text-sm font-medium text-brand-dark" htmlFor={htmlFor}>
      {children}
      {required ? (
        <span className="ms-1 text-destructive" aria-hidden>
          *
        </span>
      ) : null}
      {optional ? (
        <span className="ms-1.5 text-xs font-normal text-brand-dark/45">
          {t('profile.introductionCard.form.optional')}
        </span>
      ) : null}
    </label>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  )
}

/** Live `n / 5000` counter; subscribes to just this field so typing does not re-render the whole form. */
export function CharCounter<T extends FieldValues>({
  control,
  name,
  id,
}: {
  control: Control<T>
  name: FieldPath<T>
  id: string
}) {
  const { t, i18n } = useTranslation()
  const value = useWatch({ control, name }) as unknown
  const length = typeof value === 'string' ? value.length : 0
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'
  const format = (n: number) => new Intl.NumberFormat(locale).format(n)

  return (
    <p
      id={id}
      className={cn(
        'mt-1 text-end text-xs tabular-nums',
        length > INTRODUCTION_CARD_TEXT_MAX ? 'text-destructive' : 'text-brand-dark/45',
      )}
    >
      {t('profile.introductionCard.form.charCount', {
        value: format(length),
        max: format(INTRODUCTION_CARD_TEXT_MAX),
      })}
    </p>
  )
}

/** Type picker rendered as a form field (authFieldClass sizing); the trigger shows the translated label, not the raw value. */
export function EntryTypeSelect({
  id,
  value,
  onChange,
  onBlur,
  triggerRef,
  invalid,
  describedBy,
  disabled,
  fallbackLabel,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  triggerRef?: (element: HTMLButtonElement | null) => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
  /** Label shown for an empty value (e.g. the server label of an unknown type) instead of the placeholder. */
  fallbackLabel?: string | null
}) {
  const { t } = useTranslation()
  const selected = isIntroductionCardType(value) ? value : null
  const label = selected
    ? t(`profile.introductionCard.types.${selected}`)
    : (fallbackLabel ?? t('profile.introductionCard.form.typePlaceholder'))

  return (
    <Select
      value={selected}
      onValueChange={(next) => onChange(typeof next === 'string' ? next : '')}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        ref={triggerRef}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          authFieldClass,
          'w-full shadow-none data-[size=default]:h-12',
          !selected && 'text-brand-dark/45',
          invalid && invalidFieldClass,
        )}
      >
        <span className="flex-1 truncate text-start" dir="auto">
          {label}
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-brand-dark/10 shadow-lg">
        {INTRODUCTION_CARD_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(`profile.introductionCard.types.${type}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
