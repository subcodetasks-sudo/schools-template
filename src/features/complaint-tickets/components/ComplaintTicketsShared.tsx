import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useWatch, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { CircleAlert, Hash, MessageSquareWarning, SearchX, ShieldAlert, type LucideIcon } from 'lucide-react'
import type {
  ComplaintTicketsErrorKind,
  ComplaintType,
} from '@/features/complaint-tickets/complaintTicketsApi'
import { cn } from '@/lib/utils'

/** `CT-000042` pill. Always LTR so the dash/digits never flip in Arabic. */
export function TicketNumberBadge({ number, className }: { number: string | null; className?: string }) {
  const { t } = useTranslation()
  if (!number) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-brand-dark/5 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-dark/75',
        className,
      )}
    >
      <Hash className="size-3.5 text-brand-primary" aria-hidden />
      <span className="sr-only">{t('profile.complaintTickets.ticket.number')}: </span>
      <span dir="ltr" className="tabular-nums">
        {number}
      </span>
    </span>
  )
}

export function ComplaintTypeBadge({ type, className }: { type: ComplaintType | null; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary',
        className,
      )}
    >
      <MessageSquareWarning className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate" dir="auto">
        {type?.name ?? t('profile.complaintTickets.ticket.unknownType')}
      </span>
    </span>
  )
}

const errorIcons: Record<ComplaintTicketsErrorKind, LucideIcon> = {
  forbidden: ShieldAlert,
  notFound: SearchX,
  generic: CircleAlert,
}

export function ComplaintTicketsErrorState({
  kind,
  message,
  onRetry,
  backTo,
  backLabel,
}: {
  kind: ComplaintTicketsErrorKind
  message?: string | null
  onRetry?: () => void
  backTo?: string
  backLabel?: string
}) {
  const { t } = useTranslation()
  const Icon = errorIcons[kind]

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
        {t(`profile.complaintTickets.errors.${kind}Title`)}
      </p>
      <p className="max-w-md text-sm text-brand-dark/55">
        {kind === 'generic'
          ? message || t('profile.complaintTickets.errors.genericDescription')
          : t(`profile.complaintTickets.errors.${kind}Description`)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {kind === 'generic' && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            {t('profile.retry')}
          </button>
        ) : null}
        {backTo && backLabel ? (
          <Link
            to={backTo}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {backLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** Live `n / max` counter; subscribes to just this field so typing does not re-render the whole form. */
export function CharCounter<T extends FieldValues>({
  control,
  name,
  id,
  max,
}: {
  control: Control<T>
  name: FieldPath<T>
  id: string
  max: number
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
        length > max ? 'text-destructive' : 'text-brand-dark/45',
      )}
    >
      {t('profile.complaintTickets.form.charCount', { value: format(length), max: format(max) })}
    </p>
  )
}
