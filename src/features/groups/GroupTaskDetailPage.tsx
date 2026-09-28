import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarClock,
  Download,
  ExternalLink,
  FileText,
  Paperclip,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { getErrorMessage } from '@/lib/api'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { Skeleton } from '@/components/ui/skeleton'
import {
  classifyGroupsError,
  formatGroupDateTime,
  getAttachmentExtensionLabel,
  getAttachmentKind,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
  getMyGroup,
  getMyGroupTask,
  type GroupTask,
  type GroupTaskAttachment,
} from '@/features/groups/groupsApi'
import {
  AttachmentKindIcon,
  DueDateValue,
  GroupsBackLink,
  GroupsErrorState,
  GroupsPageTitle,
} from '@/features/groups/components/GroupsShared'
import { cn } from '@/lib/utils'

type TaskLoadState = {
  key: string
  task: GroupTask | null
  error: unknown
}

type GroupNameState = {
  key: string
  name: string | null
}

const actionLinkClass =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40'

/** Accepts `location.state.backTo` only when it points back into this same group's pages. */
function resolveBackTarget(state: unknown, groupPath: string) {
  if (!state || typeof state !== 'object') return groupPath
  const backTo = (state as { backTo?: unknown }).backTo
  if (typeof backTo !== 'string' || !backTo.startsWith(groupPath)) return groupPath
  const rest = backTo.slice(groupPath.length)
  if (rest !== '' && !/^[?#/]/.test(rest)) return groupPath
  if (backTo.includes('\\') || backTo.includes('..')) return groupPath
  return backTo
}

export function GroupTaskDetailPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const params = useParams<{ groupId: string; taskId: string }>()
  const groupId = params.groupId?.trim() ?? ''
  const taskId = params.taskId?.trim() ?? ''
  const hasIds = groupId !== '' && taskId !== ''

  const [reloadKey, setReloadKey] = useState(0)
  const [taskState, setTaskState] = useState<TaskLoadState | null>(null)
  const [groupState, setGroupState] = useState<GroupNameState | null>(null)

  const requestKey = `${groupId}\u0000${taskId}\u0000${reloadKey}`

  useEffect(() => {
    if (!hasIds) return
    let ignore = false
    const key = `${groupId}\u0000${taskId}\u0000${reloadKey}`
    getMyGroupTask(groupId, taskId).then(
      (task) => {
        if (!ignore) setTaskState({ key, task, error: null })
      },
      (error: unknown) => {
        if (!ignore) setTaskState({ key, task: null, error: error ?? new Error('load failed') })
      },
    )
    return () => {
      ignore = true
    }
  }, [groupId, taskId, reloadKey, hasIds])

  useEffect(() => {
    if (!groupId) return
    let ignore = false
    getMyGroup(groupId).then(
      (group) => {
        if (!ignore) setGroupState({ key: groupId, name: group.name.trim() || null })
      },
      () => {
        if (!ignore) setGroupState({ key: groupId, name: null })
      },
    )
    return () => {
      ignore = true
    }
  }, [groupId])

  const groupPath = `/profile/groups/${encodeURIComponent(groupId)}`
  const backTo = resolveBackTarget(location.state, groupPath)
  const backLabel = t('profile.groups.taskDetail.backToGroup')

  const backLink = <GroupsBackLink to={hasIds ? backTo : '/profile/groups'}>{backLabel}</GroupsBackLink>

  if (!hasIds) {
    return (
      <PageShell backLink={backLink}>
        <GroupsErrorState
          kind="notFound"
          resource="task"
          backTo={groupId ? groupPath : '/profile/groups'}
          backLabel={groupId ? backLabel : t('profile.groups.errors.backToGroups')}
        />
      </PageShell>
    )
  }

  const current = taskState?.key === requestKey ? taskState : null

  if (!current) {
    return (
      <PageShell backLink={backLink}>
        <TaskDetailSkeleton />
      </PageShell>
    )
  }

  const task = current.task
  const groupMismatch =
    task !== null && task.groupId !== null && task.groupId.toLowerCase() !== groupId.toLowerCase()

  if (!task || groupMismatch) {
    const kind = groupMismatch ? 'notFound' : classifyGroupsError(current.error)
    return (
      <PageShell backLink={backLink}>
        <GroupsErrorState
          kind={kind}
          resource="task"
          message={
            kind === 'generic'
              ? getErrorMessage(current.error, t('profile.groups.taskDetail.loadError'))
              : null
          }
          onRetry={() => setReloadKey((value) => value + 1)}
          backTo={backTo}
          backLabel={backLabel}
        />
      </PageShell>
    )
  }

  const groupName = groupState?.key === groupId ? groupState.name : null
  const title = task.title.trim() || t('profile.groups.untitledTask')
  const description = task.description?.trim() ?? ''

  return (
    <PageShell backLink={backLink}>
      <article className="min-w-0">
        <header className="flex flex-col gap-3">
          {groupName ? (
            <p className="inline-flex max-w-full items-center gap-2 self-start rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
              <UsersRound className="size-3.5 shrink-0" aria-hidden />
              <span className="shrink-0">{t('profile.groups.taskDetail.group')}:</span>
              <span className="truncate" title={groupName}>
                {groupName}
              </span>
            </p>
          ) : null}
          <div className="min-w-0 wrap-break-word">
            <GroupsPageTitle>{title}</GroupsPageTitle>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaCard
            icon={CalendarClock}
            tone="bg-brand-primary/10 text-brand-primary"
            label={t('profile.groups.taskDetail.uploadedAt')}
          >
            {task.uploadedAt ? (
              <time dateTime={task.uploadedAt.replace(' ', 'T')} className="text-brand-dark">
                {formatGroupDateTime(task.uploadedAt, i18n.language)}
              </time>
            ) : (
              <span className="text-brand-dark/45">—</span>
            )}
          </MetaCard>
          <MetaCard
            icon={CalendarCheck}
            tone="bg-amber-500/10 text-amber-800"
            label={t('profile.groups.taskDetail.dueDate')}
          >
            <DueDateValue dueDate={task.dueDate} />
          </MetaCard>
        </div>

        <section
          aria-labelledby="task-description-heading"
          className="mt-6 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
        >
          <div className="flex items-center gap-2 bg-brand-primary px-4 py-3 text-white">
            <FileText className="size-4 shrink-0" aria-hidden />
            <h2 id="task-description-heading" className="text-sm font-bold">
              {t('profile.groups.taskDetail.description')}
            </h2>
          </div>
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            {description ? (
              <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-line text-brand-dark">
                {description}
              </p>
            ) : (
              <p className="text-sm text-brand-dark/45">
                {t('profile.groups.taskDetail.noDescription')}
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="task-attachments-heading" className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <h2
              id="task-attachments-heading"
              className="flex items-center gap-2 text-lg font-bold text-brand-dark"
            >
              <Paperclip className="size-5 text-brand-primary" aria-hidden />
              {t('profile.groups.taskDetail.attachments')}
            </h2>
            <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
              {new Intl.NumberFormat(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB').format(
                task.attachments.length,
              )}
            </span>
          </div>

          {task.attachments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-5 py-6 text-center text-sm text-brand-dark/45">
              {t('profile.groups.taskDetail.noAttachments')}
            </p>
          ) : (
            <ul className="space-y-3">
              {task.attachments.map((attachment) => (
                <AttachmentRow key={attachment.id} attachment={attachment} />
              ))}
            </ul>
          )}
        </section>
      </article>
    </PageShell>
  )
}

function PageShell({ backLink, children }: { backLink: ReactNode; children: ReactNode }) {
  return (
    <div className="w-full min-w-0">
      <div className="mb-6">{backLink}</div>
      {children}
    </div>
  )
}

function MetaCard({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: LucideIcon
  tone: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm text-brand-dark/55">{label}</p>
        <div className="mt-1 text-base font-bold text-brand-dark">{children}</div>
      </div>
      <span
        className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}
      >
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  )
}

function AttachmentRow({ attachment }: { attachment: GroupTaskAttachment }) {
  const { t } = useTranslation()
  const name = attachment.fileName.trim() || t('profile.groups.taskDetail.unnamedFile')
  const kind = getAttachmentKind(attachment)
  const url = getAttachmentUrl(attachment)
  const previewUrl = getAttachmentPreviewUrl(attachment)
  const extension = getAttachmentExtensionLabel(attachment)
  const details = [extension, attachment.size?.trim()].filter(Boolean).join(' · ')

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {kind === 'image' && previewUrl ? (
          <ImageWithFallback
            src={previewUrl}
            alt=""
            loading="lazy"
            decoding="async"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-xl border border-brand-dark/10 object-cover"
          />
        ) : (
          <AttachmentKindIcon kind={kind} />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-dark" title={name}>
            {name}
          </p>
          {details ? (
            <p className="mt-0.5 text-xs text-brand-dark/50">
              <bdi>{details}</bdi>
            </p>
          ) : null}
        </div>
      </div>

      {url ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('profile.groups.taskDetail.openFile', { name })}
            className={cn(
              actionLinkClass,
              'border border-brand-dark/15 text-brand-dark hover:border-brand-primary/40 hover:text-brand-primary',
            )}
          >
            <ExternalLink className="size-4" aria-hidden />
            {t('profile.groups.taskDetail.open')}
          </a>
          <a
            href={url}
            download={attachment.fileName.trim() || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('profile.groups.taskDetail.downloadFile', { name })}
            className={cn(actionLinkClass, 'bg-brand-primary text-white hover:bg-brand-dark')}
          >
            <Download className="size-4" aria-hidden />
            {t('profile.groups.taskDetail.download')}
          </a>
        </div>
      ) : (
        <span className="inline-flex shrink-0 cursor-not-allowed items-center self-start rounded-xl bg-brand-dark/5 px-3 py-2 text-xs font-semibold text-brand-dark/45 sm:self-auto">
          {t('profile.groups.taskDetail.fileUnavailable')}
        </span>
      )}
    </li>
  )
}

function TaskDetailSkeleton() {
  const { t } = useTranslation()
  return (
    <div aria-busy="true" aria-live="polite" className="min-w-0">
      <span className="sr-only" role="status">
        {t('profile.loading')}
      </span>
      <div aria-hidden>
        <Skeleton className="h-6 w-32 rounded-xl" />
        <Skeleton className="mt-4 h-9 w-3/4 max-w-md rounded-xl" />
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="size-11 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="space-y-2 px-4 py-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Skeleton className="mt-8 h-6 w-40 rounded-xl" />
        <div className="mt-4 space-y-3">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4 shadow-sm"
            >
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
