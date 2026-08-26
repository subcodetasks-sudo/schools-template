import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import {
  getAchievementEntry,
  isAchievementSlug,
} from '@/features/achievements/data'

export function AchievementDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  if (!isAchievementSlug(id)) {
    return <Navigate to="/achievements" replace />
  }

  const entry = getAchievementEntry(id)!
  const title = t(`achievements.items.${id}.title`)
  const body = t(`achievements.items.${id}.body`)

  return (
    <DetailPageLayout
      bannerTitle={t('detail.achievement')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.achievements'), to: '/achievements' },
        { label: title },
      ]}
      image={entry.image}
      imageAlt={title}
      title={title}
      sidebarMeta={
        <p className="text-sm text-brand-dark/55">{t('detail.achievementMeta')}</p>
      }
      sections={[
        { title: t('detail.sections.overview'), body },
        {
          title: t('detail.sections.story'),
          body: t('detail.achievementStory'),
        },
        {
          title: t('detail.sections.impact'),
          body: t('detail.achievementImpact'),
        },
      ]}
    />
  )
}
