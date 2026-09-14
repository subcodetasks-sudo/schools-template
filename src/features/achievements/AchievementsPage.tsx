import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import {
  AchievementCard,
  type Achievement,
  type AchievementAccent,
} from '@/features/home/components/AchievementCard'
import { getAchievements } from '@/features/achievements/achievementsApi'
import { useApiResource } from '@/lib/useApiResource'
import { usePagination } from '@/lib/usePagination'

const ACCENTS: AchievementAccent[] = ['rose', 'gold', 'emerald']

export function AchievementsPage() {
  const { t } = useTranslation()
  const { data, isLoading, error, reload } = useApiResource(() => getAchievements(50), [])

  const achievements = useMemo<Achievement[]>(
    () =>
      (data ?? []).map((item, index) => ({
        id: item.slug,
        image: item.image_url ?? '',
        accent: ACCENTS[index % ACCENTS.length]!,
        title: item.title,
        body: item.description,
        href: `/achievements/${item.slug}`,
      })),
    [data],
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
        {isLoading ? (
          <p className="py-16 text-center text-sm text-brand-dark/55">{t('state.loading')}</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-xl border border-brand-dark/15 px-4 py-2 text-sm"
            >
              {t('state.retry')}
            </button>
          </div>
        ) : achievements.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-dark/55">{t('state.empty')}</p>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  )
}
