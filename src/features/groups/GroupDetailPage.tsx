import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Eye, Paperclip, UserRound, UsersRound } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  classifyGroupsError,
  formatGroupDateTime,
  getMyGroup,
  getMyGroupTasks,
  getMyGroups,
  GROUP_TASKS_PAGE_SIZE,
  type GroupTask,
  type PaginatedResult,
  type SchoolGroup,
} from '@/features/groups/groupsApi'
import {
  DueDateValue,
  GroupsBackLink,
  GroupsEmptyState,
  GroupsErrorState,
  GroupsPageTitle,
} from '@/features/groups/components/GroupsShared'

const GROUPS_PATH = '/profile/groups'

/**
 * Every async result is tagged with the request key it belongs to (group id + page + retry token).
 * A result whose key differs from the current one is treated as "still loading", so switching
 * groups resets the view instantly and a late response from a previous group is never shown.
 */
type Keyed<T> = { key: string; data: T | null; error: unknown }

function parsePageParam(value: string | null) {
  if (!value || !/^\d+$/.test(value.trim())) return 1
  const page = Number(value.trim())
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

function groupPath(groupId: string) {
  return `${GROUPS_PATH}/${encodeURIComponent(groupId)}`
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/* ------------------------------------------------------------------ */
/* Group switcher                                                      */
/* ------------------------------------------------------------------ */

function GroupSwitcher({ groups, activeId }: { groups: SchoolGroup[]; activeId: string }) {
  const { t } = useTranslation()
  const labelId = useId()
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId])

  return (
    <div className="mt-6">
      <p id={labelId} className="mb-2 text-sm font-semibold text-brand-dark/55">
        {t('profile.groups.switcher.label')}
      </p>
      <nav aria-label={t('profile.groups.switcher.ariaLabel')} aria-describedby={labelId}>
        <ul className="flex gap-2 overflow-x-auto pb-2">
          {groups.map((group) => {
            const isActive = group.id.toLowerCase() === activeId.toLowerCase()
            return (
              <li key={group.id} className="shrink-0">
                <NavLink
                  ref={isActive ? activeRef : undefined}
                  to={groupPath(group.id)}
                  end
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex max-w-64 items-center truncate rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
                    isActive
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'border border-brand-dark/15 bg-white text-brand-dark hover:border-brand-primary/40',
                  )}
                >
                  <span className="truncate">
                    {group.name || t('profile.groups.untitledGroup')}
                  </span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Group info card                                                     */
/* ------------------------------------------------------------------ */

function StatItem({
  label,
  icon: Icon,
  tone,
  children,
}: {
  label: string
  icon: typeof UserRound
  tone: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white px-4 py-4">
      <div className="min-w-0">
        <dt className="text-sm text-brand-dark/55">{label}</dt>
        <dd className="mt-1 text-lg font-bold wrap-break-word text-brand-dark">{children}</dd>
      </div>
      <span
        className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-xl', tone)}
      >
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  )
}

function GroupInfoCard({ group, headingId }: { group: SchoolGroup; headingId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'
  const studentsCount =
    group.studentsCount === null ? '—' : new Intl.NumberFormat(locale).format(group.studentsCount)

  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
    >
      <header className="border-b border-brand-dark/8 bg-brand-primary px-4 py-3 text-white">
        <h2 id={headingId} className="text-sm font-bold sm:text-base">
          {t('profile.groups.info.sectionTitle')}
        </h2>
      </header>
      <dl className="grid gap-5 p-4 sm:p-6">
        <div>
          <dt className="text-sm text-brand-dark/55">{t('profile.groups.info.name')}</dt>
          <dd className="mt-1 text-lg font-bold wrap-break-word text-brand-primary">
            {group.name || t('profile.groups.untitledGroup')}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-brand-dark/55">{t('profile.groups.info.description')}</dt>
          <dd
            className={cn(
              'mt-1 text-sm leading-7 wrap-break-word whitespace-pre-line',
              group.description ? 'text-brand-dark' : 'text-brand-dark/45',
            )}
          >
            {group.description || t('profile.groups.info.noDescription')}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatItem
            label={t('profile.groups.info.supervisor')}
            icon={UserRound}
            tone="bg-brand-primary/10 text-brand-primary"
          >
            {group.supervisor?.name ?? (
              <span className="text-base font-medium text-brand-dark/45">
                {t('profile.groups.info.noSupervisor')}
              </span>
            )}
          </StatItem>
          <StatItem
            label={t('profile.groups.info.studentsCount')}
            icon={UsersRound}
            tone="bg-emerald-500/10 text-emerald-700"
          >
            {studentsCount}
          </StatItem>
        </div>
      </dl>
    </section>
  )
}

function GroupInfoSkeleton() {
  const { t } = useTranslation()
  return (
    <div
      aria-busy="true"
      aria-label={t('profile.loading')}
      className="mt-6 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
    >
      <div className="bg-brand-primary px-4 py-3">
        <Skeleton className="h-5 w-32 bg-white/25" />
      </div>
      <div className="grid gap-5 p-4 sm:p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between gap-3 rounded-2xl border border-brand-dark/10 px-4 py-4"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="size-11 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tasks table                                                         */
/* ------------------------------------------------------------------ */

const cellClass = 'border-t border-brand-dark/8 px-4 py-3 align-middle'

function formatCount(value: number, language: string) {
  return new Intl.NumberFormat(language.startsWith('ar') ? 'ar-EG' : 'en-US').format(value)
}

function AttachmentsValue({ task }: { task: GroupTask }) {
  const { t, i18n } = useTranslation()
  if (task.attachments.length > 0 || task.hasAttachments) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-brand-dark">
        <Paperclip className="size-4 text-brand-primary" aria-hidden />
        {task.attachments.length > 0
          ? t('profile.groups.tasks.attachmentsCount', {
              count: formatCount(task.attachments.length, i18n.language),
            })
          : t('profile.groups.tasks.hasAttachments')}
      </span>
    )
  }
  return <span className="text-brand-dark/45">{t('profile.groups.tasks.noAttachments')}</span>
}

function TasksTable({
  groupId,
  tasks,
  isLoading,
}: {
  groupId: string
  tasks: GroupTask[]
  isLoading: boolean
}) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const backTo = location.pathname + location.search

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-brand-dark">
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.groups.tasks.columns.title')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.groups.tasks.columns.uploadedAt')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.groups.tasks.columns.dueDate')}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-bold">
                {t('profile.groups.tasks.columns.attachments')}
              </th>
              <th scope="col" className="px-4 py-3 text-center font-bold">
                {t('profile.groups.tasks.columns.details')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className={cellClass}>
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className={cn(cellClass, 'text-center')}>
                      <Skeleton className="mx-auto h-8 w-24 rounded-xl" />
                    </td>
                  </tr>
                ))
              : tasks.map((task, index) => {
                  const title = task.title || t('profile.groups.untitledTask')
                  return (
                    <tr key={task.id} className={cn(index % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
                      <td className={cn(cellClass, 'max-w-80 font-semibold wrap-break-word text-brand-primary')}>
                        {title}
                      </td>
                      <td className={cn(cellClass, 'whitespace-nowrap text-brand-dark')}>
                        {task.uploadedAt ? (
                          <time dateTime={task.uploadedAt.replace(' ', 'T')}>
                            {formatGroupDateTime(task.uploadedAt, i18n.language)}
                          </time>
                        ) : (
                          <span className="text-brand-dark/45">—</span>
                        )}
                      </td>
                      <td className={cellClass}>
                        <DueDateValue dueDate={task.dueDate} />
                      </td>
                      <td className={cellClass}>
                        <AttachmentsValue task={task} />
                      </td>
                      <td className={cn(cellClass, 'text-center')}>
                        <Link
                          to={`${groupPath(groupId)}/tasks/${encodeURIComponent(task.id)}`}
                          state={{ backTo }}
                          aria-label={t('profile.groups.tasks.viewDetailsFor', { title })}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-dark/15 bg-white px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-brand-dark transition-colors hover:border-brand-primary/40 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          {t('profile.groups.tasks.viewDetails')}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function GroupDetailPage() {
  const { t, i18n } = useTranslation()
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId?.trim() ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePageParam(searchParams.get('page'))

  const infoHeadingId = useId()
  const tasksHeadingId = useId()
  const tasksSectionRef = useRef<HTMLElement | null>(null)

  const [groups, setGroups] = useState<SchoolGroup[] | null>(null)
  const [groupReload, setGroupReload] = useState(0)
  const [tasksReload, setTasksReload] = useState(0)
  const [groupResult, setGroupResult] = useState<Keyed<SchoolGroup> | null>(null)
  const [tasksResult, setTasksResult] = useState<Keyed<PaginatedResult<GroupTask>> | null>(null)

  const groupKey = `${groupId}#${groupReload}`
  const tasksKey = `${groupId}#${page}#${tasksReload}`

  // Switcher data: loaded once, failures simply hide the switcher.
  useEffect(() => {
    let ignore = false
    getMyGroups()
      .then((list) => {
        if (!ignore) setGroups(list)
      })
      .catch(() => {
        if (!ignore) setGroups([])
      })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!groupId) return
    let ignore = false
    const key = `${groupId}#${groupReload}`
    getMyGroup(groupId)
      .then((group) => {
        if (!ignore) setGroupResult({ key, data: group, error: null })
      })
      .catch((error: unknown) => {
        if (!ignore) setGroupResult({ key, data: null, error })
      })
    return () => {
      ignore = true
    }
  }, [groupId, groupReload])

  useEffect(() => {
    if (!groupId) return
    let ignore = false
    const key = `${groupId}#${page}#${tasksReload}`
    getMyGroupTasks(groupId, { page, per_page: GROUP_TASKS_PAGE_SIZE })
      .then((result) => {
        if (!ignore) setTasksResult({ key, data: result, error: null })
      })
      .catch((error: unknown) => {
        if (!ignore) setTasksResult({ key, data: null, error })
      })
    return () => {
      ignore = true
    }
  }, [groupId, page, tasksReload])

  const currentGroup = groupResult?.key === groupKey ? groupResult : null
  const currentTasks = tasksResult?.key === tasksKey ? tasksResult : null
  const tasksData = currentTasks?.data ?? null

  // Out-of-range page (e.g. tasks were deleted): jump to the last available page.
  const outOfRangeLastPage =
    tasksData && tasksData.items.length === 0 && tasksData.meta.last_page < page
      ? tasksData.meta.last_page
      : null

  useEffect(() => {
    if (outOfRangeLastPage === null) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (outOfRangeLastPage <= 1) next.delete('page')
        else next.set('page', String(outOfRangeLastPage))
        return next
      },
      { replace: true },
    )
  }, [outOfRangeLastPage, setSearchParams])

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (nextPage <= 1) next.delete('page')
        else next.set('page', String(nextPage))
        return next
      })
      tasksSectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [setSearchParams],
  )

  const retryGroup = useCallback(() => setGroupReload((value) => value + 1), [])
  const retryTasks = useCallback(() => setTasksReload((value) => value + 1), [])

  const hasManyGroups = (groups?.length ?? 0) >= 2
  const backToGroupsLabel = t('profile.groups.errors.backToGroups')

  if (!groupId) {
    return (
      <div className="w-full">
        <GroupsPageTitle>{t('profile.groups.list.title')}</GroupsPageTitle>
        <div className="mt-6">
          <GroupsErrorState
            kind="notFound"
            resource="group"
            backTo={GROUPS_PATH}
            backLabel={backToGroupsLabel}
          />
        </div>
      </div>
    )
  }

  const isGroupLoading = currentGroup === null
  const group = currentGroup?.data ?? null
  const groupErrorKind = currentGroup?.error ? classifyGroupsError(currentGroup.error) : null
  const hideTasks = groupErrorKind === 'forbidden' || groupErrorKind === 'notFound'

  const isTasksLoading = currentTasks === null || outOfRangeLastPage !== null
  const tasksErrorKind = currentTasks?.error ? classifyGroupsError(currentTasks.error) : null
  const tasks = tasksData?.items ?? []

  return (
    <div className="w-full">
      {hasManyGroups ? (
        <div className="mb-4">
          <GroupsBackLink to={GROUPS_PATH}>{backToGroupsLabel}</GroupsBackLink>
        </div>
      ) : null}

      {isGroupLoading ? (
        <div aria-busy="true" className="pb-3">
          <Skeleton className="h-9 w-64 max-w-full" />
        </div>
      ) : (
        <GroupsPageTitle>
          {group
            ? group.name || t('profile.groups.untitledGroup')
            : t('profile.groups.list.title')}
        </GroupsPageTitle>
      )}

      {hasManyGroups && groups ? <GroupSwitcher groups={groups} activeId={groupId} /> : null}

      {isGroupLoading ? (
        <GroupInfoSkeleton />
      ) : group ? (
        <GroupInfoCard group={group} headingId={infoHeadingId} />
      ) : (
        <div className="mt-6">
          <GroupsErrorState
            kind={groupErrorKind ?? 'generic'}
            resource="group"
            message={getErrorMessage(currentGroup?.error, t('profile.groups.info.loadError'))}
            onRetry={retryGroup}
            backTo={GROUPS_PATH}
            backLabel={backToGroupsLabel}
          />
        </div>
      )}

      {hideTasks ? null : (
        <section
          ref={tasksSectionRef}
          aria-labelledby={tasksHeadingId}
          aria-busy={isTasksLoading}
          className="mt-10 scroll-mt-24"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={tasksHeadingId} className="text-lg font-bold text-brand-dark">
                {t('profile.groups.tasks.sectionTitle')}
              </h2>
              <p className="mt-1 text-sm text-brand-dark/55">
                {t('profile.groups.tasks.sectionHint')}
              </p>
            </div>
            {tasksData ? (
              <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold whitespace-nowrap text-brand-primary">
                {t('profile.groups.tasks.total', {
                  count: formatCount(tasksData.meta.total, i18n.language),
                })}
              </span>
            ) : null}
          </div>

          {tasksErrorKind ? (
            <GroupsErrorState
              kind={tasksErrorKind}
              resource="group"
              message={getErrorMessage(currentTasks?.error, t('profile.groups.tasks.loadError'))}
              onRetry={retryTasks}
              backTo={tasksErrorKind === 'generic' ? undefined : GROUPS_PATH}
              backLabel={backToGroupsLabel}
            />
          ) : !isTasksLoading && tasks.length === 0 ? (
            <GroupsEmptyState
              compact
              icon={ClipboardList}
              title={t('profile.groups.tasks.emptyTitle')}
              description={t('profile.groups.tasks.emptyDescription')}
            />
          ) : (
            <>
              <TasksTable groupId={groupId} tasks={tasks} isLoading={isTasksLoading} />
              {tasksData && !isTasksLoading ? (
                <Pagination
                  className="mt-6"
                  page={tasksData.meta.current_page}
                  pageCount={tasksData.meta.last_page}
                  onPageChange={handlePageChange}
                />
              ) : null}
            </>
          )}
        </section>
      )}
    </div>
  )
}
