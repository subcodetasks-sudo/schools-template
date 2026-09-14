import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import { getAchievement, type Achievement } from '@/features/achievements/achievementsApi'
import { ApiError, getErrorMessage } from '@/lib/api'

export function AchievementDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const [entry, setEntry] = useState<Achievement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    return getAchievement(id)
      .then(setEntry)
      .catch((err) => {
        setEntry(null)
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(getErrorMessage(err))
        }
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (notFound) {
    return <Navigate to="/achievements" replace />
  }

  if (isLoading || !entry) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
        <p className={error ? 'text-sm text-destructive' : 'text-sm text-brand-dark/55'}>
          {error ?? t('state.loading')}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
          >
            {t('state.retry')}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <DetailPageLayout
      bannerTitle={t('detail.achievement')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.achievements'), to: '/achievements' },
        { label: entry.title },
      ]}
      image={entry.image_url ?? ''}
      imageAlt={entry.title}
      title={entry.title}
      sidebarMeta={
        <p className="text-sm text-brand-dark/55">{t('detail.achievementMeta')}</p>
      }
      sections={[{ title: t('detail.sections.overview'), body: entry.description }]}
    />
  )
}
