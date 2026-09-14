import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeader } from '@/components/SectionHeader'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  AchievementCard,
  type Achievement,
  type AchievementAccent,
} from '@/features/home/components/AchievementCard'
import { getAchievements } from '@/features/achievements/achievementsApi'
import { useApiResource } from '@/lib/useApiResource'
import { cn } from '@/lib/utils'

const ACCENTS: AchievementAccent[] = ['rose', 'gold', 'emerald']

export function AchievementsSection() {
  const { t, i18n } = useTranslation()
  const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const { data } = useApiResource(() => getAchievements(6), [])

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

  useEffect(() => {
    if (!api) return

    const sync = () => {
      setSelected(api.selectedScrollSnap())
      setScrollSnaps(api.scrollSnapList())
    }

    sync()
    api.on('select', sync)
    api.on('reInit', sync)
    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  if (achievements.length === 0) return null

  return (
    <section className="bg-muted py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          className="mb-12"
          title={t('achievements.title')}
          accent={t('achievements.accent')}
          viewAllTo="/achievements"
        />

        <Carousel
          key={dir}
          setApi={setApi}
          opts={{
            align: 'start',
            direction: dir,
            containScroll: 'trimSnaps',
            slidesToScroll: 1,
          }}
          className="w-full"
        >
          <CarouselContent className="items-stretch">
            {achievements.map((achievement) => (
              <CarouselItem
                key={achievement.id}
                className="basis-[85%] sm:basis-1/2 lg:basis-1/3"
              >
                <AchievementCard achievement={achievement} className="h-full" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {scrollSnaps.length > 1 ? (
          <div
            className="mt-10 flex items-center justify-center gap-2.5"
            role="tablist"
            aria-label={t('achievements.title')}
          >
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-label={`${t('achievements.title')} ${index + 1}`}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'h-1.5 w-7 rounded-[1px] transition-colors',
                  selected === index
                    ? 'bg-brand-primary'
                    : 'bg-black/10 hover:bg-black/20',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
