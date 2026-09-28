import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  SearchX,
  ShieldAlert,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import {
  formatGroupDate,
  getDueStatus,
  type AttachmentKind,
  type DueStatus,
  type GroupsErrorKind,
} from '@/features/groups/groupsApi'
import { cn } from '@/lib/utils'

export function GroupsPageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
      {children}
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
  )
}

/** RTL-aware "back" link used at the top of the detail pages. */
export function GroupsBackLink({ to, children }: { to: string; children: ReactNode }) {
  const { i18n } = useTranslation()
  const BackIcon = i18n.language.startsWith('ar') ? ArrowRight : ArrowLeft

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-brand-primary transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      <BackIcon className="size-4" aria-hidden />
      {children}
    </Link>
  )
}

export function GroupsLoadingState({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-64 items-center justify-center text-sm text-brand-dark/55"
    >
      {label ?? t('profile.loading')}
    </div>
  )
}

type GroupsErrorStateProps = {
  kind: GroupsErrorKind
  message?: string | null
  onRetry?: () => void
  backTo?: string
  backLabel?: string
  /** Which resource failed — changes the forbidden/not-found copy. */
  resource?: 'group' | 'task'
}

const errorIcons: Record<GroupsErrorKind, LucideIcon> = {
  forbidden: ShieldAlert,
  notFound: SearchX,
  generic: CircleAlert,
}

export function GroupsErrorState({
  kind,
  message,
  onRetry,
  backTo,
  backLabel,
  resource = 'group',
}: GroupsErrorStateProps) {
  const { t } = useTranslation()
  const Icon = errorIcons[kind]

  const title =
    kind === 'forbidden'
      ? t('profile.groups.errors.forbiddenTitle')
      : kind === 'notFound'
        ? t(`profile.groups.errors.${resource}NotFoundTitle`)
        : t('profile.groups.errors.genericTitle')

  const description =
    kind === 'forbidden'
      ? t('profile.groups.errors.forbiddenDescription')
      : kind === 'notFound'
        ? t(`profile.groups.errors.${resource}NotFoundDescription`)
        : message || t('profile.groups.errors.genericDescription')

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
      <p className="text-lg font-bold text-brand-dark">{title}</p>
      <p className="max-w-md text-sm text-brand-dark/55">{description}</p>
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

export function GroupsEmptyState({
  title,
  description,
  icon: Icon = UsersRound,
  compact = false,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 text-center',
        compact ? 'py-10' : 'py-16',
      )}
    >
      <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="text-lg font-bold text-brand-dark">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-brand-dark/55">{description}</p> : null}
    </div>
  )
}

const dueTones: Record<Exclude<DueStatus, 'none'>, string> = {
  overdue: 'bg-destructive/10 text-destructive',
  today: 'bg-amber-500/15 text-amber-800',
  soon: 'bg-amber-500/10 text-amber-800',
  upcoming: 'bg-emerald-500/10 text-emerald-700',
}

/** Due date text + a small status pill (overdue / today / soon / upcoming). */
export function DueDateValue({
  dueDate,
  showStatus = true,
  className,
}: {
  dueDate: string | null
  showStatus?: boolean
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const status = getDueStatus(dueDate)

  if (status === 'none') {
    return <span className={cn('text-brand-dark/45', className)}>{t('profile.groups.tasks.noDueDate')}</span>
  }

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <time dateTime={dueDate ?? undefined} className="text-brand-dark">
        {formatGroupDate(dueDate, i18n.language)}
      </time>
      {showStatus ? (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
            dueTones[status],
          )}
        >
          {t(`profile.groups.tasks.dueStatus.${status}`)}
        </span>
      ) : null}
    </span>
  )
}

const attachmentIcons: Record<AttachmentKind, { icon: LucideIcon; tone: string }> = {
  pdf: { icon: FileText, tone: 'bg-red-500/10 text-red-600' },
  image: { icon: FileImage, tone: 'bg-brand-secondary/15 text-brand-primary' },
  word: { icon: FileText, tone: 'bg-blue-500/10 text-blue-700' },
  excel: { icon: FileSpreadsheet, tone: 'bg-emerald-500/10 text-emerald-700' },
  powerpoint: { icon: Presentation, tone: 'bg-orange-500/10 text-orange-700' },
  archive: { icon: FileArchive, tone: 'bg-amber-500/10 text-amber-800' },
  file: { icon: File, tone: 'bg-brand-dark/5 text-brand-dark/70' },
}

export function AttachmentKindIcon({
  kind,
  className,
}: {
  kind: AttachmentKind
  className?: string
}) {
  const { icon: Icon, tone } = attachmentIcons[kind]
  return (
    <span
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
        tone,
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
