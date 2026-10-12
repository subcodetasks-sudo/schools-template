import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import { getAchievement } from '@/features/achievements/achievementsApi'
import { useApiResource } from '@/lib/useApiResource'

export function AchievementDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { data: entry, isLoading, error, errorStatus, reload } = useApiResource(
    () => getAchievement(id),
    [id],
  )

  if (errorStatus === 404) {
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
            onClick={() => void reload()}
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
