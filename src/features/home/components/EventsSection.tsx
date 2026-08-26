import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeader } from '@/components/SectionHeader'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { EventCard, type SchoolEvent } from '@/features/home/components/EventCard'
import { cn } from '@/lib/utils'

const items = [
  { id: 'theater', image: '/event-1.jpg', date: '2026-01-13' },
  { id: 'community', image: '/event-2.jpg', date: '2026-02-08' },
  { id: 'childrensDay', image: '/event-3.jpg', date: '2026-03-21' },
  { id: 'swimming', image: '/event-4.jpg', date: '2026-04-12' },
  { id: 'campusVisit', image: '/event-5.jpg', date: '2026-05-18' },
  { id: 'readingWeek', image: '/event-1.jpg', date: '2026-06-09' },
  { id: 'sportsDay', image: '/event-4.jpg', date: '2026-07-15' },
] as const

/** Extra copies so Embla loop always has content on both sides. */
const LOOP_COPIES = 3

function formatEventDate(isoDate: string, language: string) {
  const locale = language.startsWith('ar') ? 'ar-EG' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00`))
}

function applyCoverflow(api: NonNullable<CarouselApi>, isRtl: boolean) {
  const engine = api.internalEngine()
  const scrollProgress = api.scrollProgress()
  const snaps = api.scrollSnapList()
  const slides = api.slideNodes()
  const direction = isRtl ? -1 : 1
  const loopPoints = engine.options.loop ? engine.slideLooper.loopPoints : null

  for (let snapIndex = 0; snapIndex < snaps.length; snapIndex++) {
    const snap = snaps[snapIndex]!
    let diff = snap - scrollProgress

    if (loopPoints) {
      for (const loopItem of loopPoints) {
        const target = loopItem.target()
        if (snapIndex === loopItem.index && target !== 0) {
          const sign = Math.sign(target)
          if (sign === -1) diff = snap - (1 + scrollProgress)
          if (sign === 1) diff = snap + (1 - scrollProgress)
        }
      }
    }

    if (diff > 0.5) diff -= 1
    if (diff < -0.5) diff += 1

    const abs = Math.min(Math.abs(diff), 1)
    const card = slides[snapIndex]?.querySelector(
      '[data-coverflow-card]',
    ) as HTMLElement | null
    if (!card) continue

    card.style.transform = `translate3d(${diff * -10 * direction}%, 0, ${-abs * 56}px) rotateY(${diff * 48 * direction}deg) scale(${1 - abs * 0.12})`
    card.style.opacity = String(Math.max(1 - abs * 0.18, 0.65))
    card.style.zIndex = String(Math.round((1 - abs) * 20))
  }
}

export function EventsSection() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')
  const dir = isRtl ? 'rtl' : 'ltr'
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const rafId = useRef(0)

  const events = useMemo<SchoolEvent[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        image: item.image,
        dateLabel: formatEventDate(item.date, i18n.language),
        title: t(`events.items.${item.id}.title`),
        body: t(`events.items.${item.id}.body`),
      })),
    [t, i18n.language],
  )

  const carouselEvents = useMemo(
    () =>
      Array.from({ length: LOOP_COPIES }, (_, copy) =>
        events.map((event) => ({
          ...event,
          uid: `${event.id}-${copy}`,
        })),
      ).flat(),
    [events],
  )

  const logicalCount = events.length
  const logicalSelected = logicalCount > 0 ? selected % logicalCount : 0
  const startIndex = logicalCount

  const paintCoverflow = useCallback(() => {
    if (!api) return
    applyCoverflow(api, isRtl)
  }, [api, isRtl])

  const scheduleCoverflow = useCallback(() => {
    cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(paintCoverflow)
  }, [paintCoverflow])

  useEffect(() => {
    if (!api) return

    const onSelect = () => {
      setSelected(api.selectedScrollSnap())
    }

    const onReInit = () => {
      setSelected(api.selectedScrollSnap())
      paintCoverflow()
    }

    setSelected(api.selectedScrollSnap())
    paintCoverflow()

    api.on('select', onSelect)
    api.on('reInit', onReInit)
    api.on('scroll', scheduleCoverflow)
    api.on('settle', paintCoverflow)

    return () => {
      cancelAnimationFrame(rafId.current)
      api.off('select', onSelect)
      api.off('reInit', onReInit)
      api.off('scroll', scheduleCoverflow)
      api.off('settle', paintCoverflow)
    }
  }, [api, paintCoverflow, scheduleCoverflow])

  const scrollToLogical = (logicalIndex: number) => {
    if (!api || logicalCount === 0) return
    const copy = Math.floor(api.selectedScrollSnap() / logicalCount)
    const safeCopy = Math.min(Math.max(copy, 0), LOOP_COPIES - 1)
    api.scrollTo(safeCopy * logicalCount + logicalIndex)
  }

  return (
    <section className="overflow-x-clip bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          className="mb-12"
          title={t('events.title')}
          accent={t('events.accent')}
          viewAllTo="/events"
        />

        <div className="relative" style={{ perspective: '1200px' }}>
          <Carousel
            key={dir}
            setApi={setApi}
            opts={{
              align: 'center',
              direction: dir,
              loop: true,
              containScroll: false,
              slidesToScroll: 1,
              duration: 18,
              startIndex,
            }}
            className="w-full **:data-[slot=carousel-content]:overflow-visible"
          >
            <CarouselContent className="-ms-2 items-start transform-3d sm:-ms-3">
              {carouselEvents.map((event, index) => (
                <CarouselItem
                  key={event.uid}
                  className="basis-[82%] ps-2 sm:basis-[42%] sm:ps-3 md:basis-[34%] lg:basis-[30%]"
                >
                  <div className="w-full transform-3d py-6">
                    <div
                      data-coverflow-card
                      className="will-change-transform"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <EventCard
                        event={event}
                        active={index === selected}
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {logicalCount > 1 ? (
          <div
            className="mt-8 flex items-center justify-center gap-2.5"
            role="tablist"
            aria-label={t('events.title')}
          >
            {events.map((event, index) => (
              <button
                key={event.id}
                type="button"
                role="tab"
                aria-selected={logicalSelected === index}
                aria-label={`${t('events.title')} ${index + 1}`}
                onClick={() => scrollToLogical(index)}
                className={cn(
                  'h-1.5 w-7 rounded-[1px] transition-colors',
                  logicalSelected === index
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
