import { type ReactNode, useEffect, useId, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  FileText,
  GraduationCap,
  Hash,
  Layers,
  MessageSquareWarning,
  School,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { formatGroupDateTime } from '@/features/groups/groupsApi'
import { GroupsBackLink, GroupsPageTitle } from '@/features/groups/components/GroupsShared'
import {
  COMPLAINT_TICKETS_PATH,
  classifyComplaintTicketsError,
  getMyComplaintTicket,
  type ComplaintTicket,
  type ComplaintTicketStudent,
} from '@/features/complaint-tickets/complaintTicketsApi'
import {
  ComplaintTicketsErrorState,
  ComplaintTypeBadge,
  TicketNumberBadge,
} from '@/features/complaint-tickets/components/ComplaintTicketsShared'
import { cn } from '@/lib/utils'

type TicketLoadState = {
  key: string
  ticket: ComplaintTicket | null
  error: unknown
}

/** Accepts `location.state.backTo` only when it points back into the complaint tickets pages. */
function resolveBackTarget(state: unknown) {
  if (!state || typeof state !== 'object') return COMPLAINT_TICKETS_PATH
  const backTo = (state as { backTo?: unknown }).backTo
  if (typeof backTo !== 'string' || !backTo.startsWith(COMPLAINT_TICKETS_PATH)) {
    return COMPLAINT_TICKETS_PATH
  }
  const rest = backTo.slice(COMPLAINT_TICKETS_PATH.length)
  if (rest !== '' && !/^[?#/]/.test(rest)) return COMPLAINT_TICKETS_PATH
  if (backTo.includes('\\') || backTo.includes('..')) return COMPLAINT_TICKETS_PATH
  return backTo
}

function toDateTimeAttr(value: string) {
  return value.trim().replace(' ', 'T')
}

export function ComplaintTicketDetailPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const params = useParams<{ ticketId: string }>()
  const ticketId = params.ticketId?.trim() ?? ''
  const hasId = ticketId !== ''
  const language = i18n.language

  const [reloadKey, setReloadKey] = useState(0)
  const [ticketState, setTicketState] = useState<TicketLoadState | null>(null)

  // Language is part of the key: the API localizes names (type, stage, grade) via Accept-Language.
  const requestKey = `${ticketId}\u0000${reloadKey}\u0000${language}`

  useEffect(() => {
    if (!hasId) return
    let ignore = false
    const key = `${ticketId}\u0000${reloadKey}\u0000${language}`
    getMyComplaintTicket(ticketId).then(
      (ticket) => {
        if (!ignore) setTicketState({ key, ticket, error: null })
      },
      (error: unknown) => {
        if (!ignore) setTicketState({ key, ticket: null, error: error ?? new Error('load failed') })
      },
    )
    return () => {
      ignore = true
    }
  }, [ticketId, reloadKey, language, hasId])

  const backTo = resolveBackTarget(location.state)
  const backLabel = t('profile.complaintTickets.details.back')
  const backLink = <GroupsBackLink to={backTo}>{backLabel}</GroupsBackLink>

  if (!hasId) {
    return (
      <PageShell backLink={backLink} title={t('profile.complaintTickets.details.title')}>
        <ComplaintTicketsErrorState kind="notFound" backTo={backTo} backLabel={backLabel} />
      </PageShell>
    )
  }

  const current = ticketState?.key === requestKey ? ticketState : null

  if (!current) {
    return (
      <PageShell
        backLink={backLink}
        title={null}
        meta={<MetaSkeleton />}
      >
        <TicketDetailSkeleton />
      </PageShell>
    )
  }

  const ticket = current.ticket

  if (!ticket) {
    const kind = classifyComplaintTicketsError(current.error)
    return (
      <PageShell backLink={backLink} title={t('profile.complaintTickets.details.title')}>
        <ComplaintTicketsErrorState
          kind={kind}
          message={
            kind === 'generic'
              ? getErrorMessage(current.error, t('profile.complaintTickets.details.loadError'))
              : null
          }
          onRetry={() => setReloadKey((value) => value + 1)}
          backTo={backTo}
          backLabel={backLabel}
        />
      </PageShell>
    )
  }

  const title = ticket.title.trim() || t('profile.complaintTickets.ticket.untitled')

  return (
    <PageShell
      backLink={backLink}
      title={title}
      meta={
        <>
          <TicketNumberBadge number={ticket.number} />
          <ComplaintTypeBadge type={ticket.complaintType} />
          {ticket.createdAt ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-brand-dark/55">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t('profile.complaintTickets.ticket.createdAt')}: </span>
              <time dateTime={toDateTimeAttr(ticket.createdAt)}>
                {formatGroupDateTime(ticket.createdAt, language)}
              </time>
            </span>
          ) : null}
        </>
      }
    >
      {ticket.student ? <StudentSection student={ticket.student} /> : null}
      <ComplaintSection ticket={ticket} title={title} />
    </PageShell>
  )
}

function PageShell({
  backLink,
  title,
  meta,
  children,
}: {
  backLink: ReactNode
  /** `null` while loading: renders a title-sized skeleton instead of the heading. */
  title: string | null
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="w-full min-w-0">
      <div className="mb-6">{backLink}</div>
      <header className="flex flex-col gap-3">
        {title === null ? (
          <Skeleton aria-hidden className="h-9 w-64 max-w-full rounded-xl" />
        ) : (
          <div className="min-w-0 wrap-break-word">
            <GroupsPageTitle>
              <span dir="auto">{title}</span>
            </GroupsPageTitle>
          </div>
        )}
        {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
      </header>
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  )
}

function InfoSection({
  headingId,
  heading,
  icon: Icon,
  children,
}: {
  headingId: string
  heading: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
    >
      <header className="flex items-center gap-2 border-b border-brand-dark/8 bg-brand-primary px-4 py-3 text-white">
        <Icon className="size-4 shrink-0" aria-hidden />
        <h2 id={headingId} className="text-sm font-bold sm:text-base">
          {heading}
        </h2>
      </header>
      <dl className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-6">{children}</dl>
    </section>
  )
}

function InfoField({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string
  icon: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="flex items-center gap-1.5 text-sm text-brand-dark/55">
        <Icon className="size-4 shrink-0 text-brand-primary" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold wrap-break-word text-brand-dark sm:text-base">
        {children}
      </dd>
    </div>
  )
}

function EmptyValue() {
  return <span className="font-normal text-brand-dark/45">—</span>
}

function StudentSection({ student }: { student: ComplaintTicketStudent }) {
  const { t } = useTranslation()
  const headingId = useId()

  const textValue = (value: string | null) => (value ? <bdi>{value}</bdi> : <EmptyValue />)

  return (
    <InfoSection
      headingId={headingId}
      heading={t('profile.complaintTickets.details.studentSection')}
      icon={UserRound}
    >
      <InfoField label={t('profile.complaintTickets.student.name')} icon={UserRound}>
        {textValue(student.name)}
      </InfoField>
      <InfoField label={t('profile.complaintTickets.student.code')} icon={Hash}>
        {student.code ? (
          <span dir="ltr" className="tabular-nums">
            {student.code}
          </span>
        ) : (
          <EmptyValue />
        )}
      </InfoField>
      <InfoField label={t('profile.complaintTickets.student.stage')} icon={Layers}>
        {textValue(student.stage)}
      </InfoField>
      <InfoField label={t('profile.complaintTickets.student.grade')} icon={GraduationCap}>
        {textValue(student.grade)}
      </InfoField>
      <InfoField label={t('profile.complaintTickets.student.classroom')} icon={School}>
        {textValue(student.classroom)}
      </InfoField>
    </InfoSection>
  )
}

function ComplaintSection({ ticket, title }: { ticket: ComplaintTicket; title: string }) {
  const { t, i18n } = useTranslation()
  const headingId = useId()

  return (
    <InfoSection
      headingId={headingId}
      heading={t('profile.complaintTickets.details.complaintSection')}
      icon={MessageSquareWarning}
    >
      <InfoField label={t('profile.complaintTickets.ticket.type')} icon={MessageSquareWarning}>
        {ticket.complaintType ? (
          <bdi>{ticket.complaintType.name}</bdi>
        ) : (
          <span className="font-normal text-brand-dark/45">
            {t('profile.complaintTickets.ticket.unknownType')}
          </span>
        )}
      </InfoField>
      <InfoField label={t('profile.complaintTickets.ticket.createdAt')} icon={CalendarClock}>
        {ticket.createdAt ? (
          <time dateTime={toDateTimeAttr(ticket.createdAt)}>
            {formatGroupDateTime(ticket.createdAt, i18n.language)}
          </time>
        ) : (
          <EmptyValue />
        )}
      </InfoField>
      <InfoField
        label={t('profile.complaintTickets.ticket.title')}
        icon={Type}
        className="sm:col-span-2"
      >
        <span dir="auto">{title}</span>
      </InfoField>
      <div className="min-w-0 sm:col-span-2">
        <dt className="flex items-center gap-1.5 text-sm text-brand-dark/55">
          <FileText className="size-4 shrink-0 text-brand-primary" aria-hidden />
          {t('profile.complaintTickets.ticket.body')}
        </dt>
        <dd className="mt-2 rounded-xl bg-muted/30 px-4 py-3">
          {ticket.body ? (
            <p
              dir="auto"
              className="text-start text-sm leading-7 wrap-break-word whitespace-pre-line text-brand-dark"
            >
              {ticket.body}
            </p>
          ) : (
            <p className="text-sm text-brand-dark/45">
              {t('profile.complaintTickets.ticket.noBody')}
            </p>
          )}
        </dd>
      </div>
    </InfoSection>
  )
}

function MetaSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

function SectionSkeleton({ fields, withBody = false }: { fields: number; withBody?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
      <div className="bg-brand-primary px-4 py-3">
        <Skeleton className="h-5 w-32 bg-white/25" />
      </div>
      <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-6">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
        ))}
        {withBody ? (
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-2 rounded-xl bg-muted/30 px-4 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TicketDetailSkeleton() {
  const { t } = useTranslation()
  return (
    <div aria-busy="true" aria-label={t('profile.loading')} className="space-y-6">
      <span className="sr-only" role="status">
        {t('profile.loading')}
      </span>
      <div aria-hidden className="space-y-6">
        <SectionSkeleton fields={5} />
        <SectionSkeleton fields={3} withBody />
      </div>
    </div>
  )
}
