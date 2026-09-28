import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, UserRound, UsersRound } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { getMyGroups, type SchoolGroup } from '@/features/groups/groupsApi'
import {
  GroupsEmptyState,
  GroupsErrorState,
  GroupsLoadingState,
  GroupsPageTitle,
} from '@/features/groups/components/GroupsShared'

type LoadResult = { groups: SchoolGroup[] | null; error: string | null }

function groupPath(id: string) {
  return `/profile/groups/${encodeURIComponent(id)}`
}

function formatCount(value: number | null, language: string) {
  if (value === null) return '—'
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-US'
  return new Intl.NumberFormat(locale).format(value)
}

function GroupCard({ group }: { group: SchoolGroup }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')
  const OpenIcon = isRtl ? ArrowLeft : ArrowRight
  const name = group.name || t('profile.groups.untitledGroup')

  return (
    <Link
      to={groupPath(group.id)}
      className="group flex h-full flex-col rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm transition-colors hover:border-brand-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <UsersRound className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold wrap-break-word text-brand-dark transition-colors group-hover:text-brand-primary">
            {name}
          </h2>
          {group.description ? (
            <p className="mt-1 line-clamp-2 text-sm wrap-break-word text-brand-dark/70">
              {group.description}
            </p>
          ) : (
            <p className="mt-1 text-sm text-brand-dark/45">{t('profile.groups.info.noDescription')}</p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-brand-dark/10 pt-4 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 text-brand-primary" aria-hidden />
          <dt className="shrink-0 text-brand-dark/55">{t('profile.groups.info.supervisor')}:</dt>
          <dd
            className={
              group.supervisor
                ? 'min-w-0 truncate font-semibold text-brand-dark'
                : 'min-w-0 truncate text-brand-dark/45'
            }
          >
            {group.supervisor?.name ?? t('profile.groups.info.noSupervisor')}
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <UsersRound className="size-4 shrink-0 text-brand-primary" aria-hidden />
          <dt className="shrink-0 text-brand-dark/55">{t('profile.groups.info.studentsCount')}:</dt>
          <dd className="min-w-0 truncate font-semibold text-brand-dark">
            {formatCount(group.studentsCount, i18n.language)}
          </dd>
        </div>
      </dl>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-primary">
        {t('profile.groups.list.openGroup')}
        <OpenIcon
          className="size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  )
}

export function GroupsPage() {
  const { t, i18n } = useTranslation()
  const [groups, setGroups] = useState<SchoolGroup[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  /** Pure fetch: resolves to the next state instead of setting it, so the effect owns all updates. */
  const loadGroups = useCallback(async (): Promise<LoadResult> => {
    try {
      return { groups: await getMyGroups(), error: null }
    } catch (err) {
      return { groups: null, error: getErrorMessage(err, t('profile.groups.list.loadError')) }
    }
  }, [t])

  useEffect(() => {
    // Ignore responses that arrive after unmount or after a newer request (retry / language change).
    let ignore = false
    void loadGroups().then((result) => {
      if (ignore) return
      setGroups(result.groups)
      setError(result.error)
      setIsLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [loadGroups, reloadKey])

  const retry = () => {
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <GroupsPageTitle>{t('profile.groups.list.title')}</GroupsPageTitle>
        <p className="mt-2 text-sm text-brand-dark/55">{t('profile.groups.list.subtitle')}</p>
      </div>
      {groups && groups.length > 0 && !isLoading && !error ? (
        <span className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
          {t('profile.groups.list.count', { count: formatCount(groups.length, i18n.language) })}
        </span>
      ) : null}
    </div>
  )

  if (isLoading) {
    return (
      <div className="w-full">
        {header}
        <div className="mt-8">
          <GroupsLoadingState />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full">
        {header}
        <div className="mt-8">
          <GroupsErrorState kind="generic" message={error} onRetry={retry} />
        </div>
      </div>
    )
  }

  const list = groups ?? []

  if (list.length === 1) {
    return <Navigate to={groupPath(list[0].id)} replace />
  }

  return (
    <div className="w-full">
      {header}
      <div className="mt-8">
        {list.length === 0 ? (
          <GroupsEmptyState
            title={t('profile.groups.list.emptyTitle')}
            description={t('profile.groups.list.emptyDescription')}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {list.map((group) => (
              <li key={group.id} className="min-w-0">
                <GroupCard group={group} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
