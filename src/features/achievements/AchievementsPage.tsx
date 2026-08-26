import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import {
  AchievementCard,
  type Achievement,
} from '@/features/home/components/AchievementCard'
import { achievementCatalog } from '@/features/achievements/data'
import { usePagination } from '@/lib/usePagination'

export function AchievementsPage() {
  const { t, i18n } = useTranslation()

  const achievements = useMemo<Achievement[]>(
    () =>
      Array.from({ length: 3 }, (_, copy) =>
        achievementCatalog.map((item) => ({
          id: `${item.id}-${copy}`,
          image: item.image,
          accent: item.accent,
          title: t(`achievements.items.${item.id}.title`),
          body: t(`achievements.items.${item.id}.body`),
          href: `/achievements/${item.id}`,
        })),
      ).flat(),
    [t, i18n.language],
  )

  const { page, setPage, pageCount, current } = usePagination(achievements, 9)

  return (
    <section className="pb-16">
      <PageBanner
        title={t('achievements.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.achievements') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              notchClassName="bg-background"
            />
          ))}
        </div>

        <Pagination
          className="mt-12"
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </div>
    </section>
  )
}
