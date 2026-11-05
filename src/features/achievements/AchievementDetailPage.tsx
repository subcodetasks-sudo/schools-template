import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { PageBanner } from '@/components/PageBanner'
import { AchievementCard, type AchievementAccent } from '@/features/home/components/AchievementCard'
import { getAchievement, getAchievements } from '@/features/achievements/achievementsApi'
import { useApiResource } from '@/lib/useApiResource'

export function AchievementDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft
  const { data: entry, isLoading, error, errorStatus, reload } = useApiResource(
    () => getAchievement(id),
    [id],
  )

  const { data: all } = useApiResource(() => getAchievements(12), [])
  const more = useMemo(
    () =>
      (all ?? [])
        .filter((item) => item.slug !== id)
        .slice(0, 3)
        .map((item, index) => ({
          id: item.slug,
          image: item.image_url ?? '',
          accent: (['rose', 'gold', 'emerald'] as AchievementAccent[])[index % 3]!,
          title: item.title,
          body: item.description,
          href: `/achievements/${item.slug}`,
        })),
    [all, id],
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

  const date = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  const image = entry.image_url ?? ''

  return (
    <section className="bg-background pb-16 sm:pb-24">
      <PageBanner
        title={t('detail.achievement')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.achievements'), to: '/achievements' },
          { label: entry.title },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <div className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-14">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-1.5 text-xs font-bold tracking-wide text-brand-primary">
              <Trophy className="size-4" aria-hidden />
              {t('detail.achievement')}
            </span>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight text-brand-dark sm:text-4xl">
              {entry.title}
            </h2>
            <span className="mt-5 block h-1.5 w-16 rounded-full bg-brand-secondary" />
            <p className="mt-5 text-base leading-8 text-brand-dark/70">
              {t('detail.achievementMeta')}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {date ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-dark shadow-sm ring-1 ring-brand-dark/10">
                  <CalendarDays className="size-4 text-brand-secondary" aria-hidden />
                  {date}
                </span>
              ) : null}
              <Link
                to="/achievements"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                <BackIcon className="size-4" aria-hidden />
                {t('nav.achievements')}
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-7">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -bottom-4 inset-s-4 -z-0 h-full w-full rounded-[2rem] bg-brand-secondary/25 sm:-bottom-5 sm:inset-s-5"
              />
              <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[2rem] bg-brand-light shadow-xl shadow-brand-dark/10 ring-1 ring-brand-dark/10">
                <ImageWithFallback
                  src={image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 -z-10 size-full scale-110 object-cover opacity-60 blur-2xl"
                />
                <ImageWithFallback
                  src={image}
                  alt={entry.title}
                  className="size-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* More achievements */}
        {more.length > 0 ? (
          <div className="mt-16 sm:mt-20">
            <h3 className="mb-8 flex items-center gap-3 text-xl font-bold text-brand-dark sm:text-2xl">
              <span className="h-7 w-1.5 rounded-full bg-brand-secondary" aria-hidden />
              {t('nav.achievements')}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  notchClassName="bg-background"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
