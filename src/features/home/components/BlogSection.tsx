import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeader } from '@/components/SectionHeader'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { BlogCard, type BlogPost } from '@/features/home/components/BlogCard'
import { getBlogArticles } from '@/features/blog/blogApi'
import { useApiResource } from '@/lib/useApiResource'
import { cn } from '@/lib/utils'

export function BlogSection() {
  const { t, i18n } = useTranslation()
  const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const { data } = useApiResource(() => getBlogArticles(), [])

  const articles = useMemo<BlogPost[]>(
    () =>
      (data ?? []).slice(0, 6).map((post) => ({
        id: post.slug,
        image: post.thumbnail_url ?? '',
        title: post.title,
        body: post.content.replace(/<[^>]+>/g, ' ').trim(),
        href: `/blog/${post.slug}`,
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

  if (articles.length === 0) return null

  return (
    <section className="bg-muted py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          className="mb-12"
          title={t('blog.title')}
          accent={t('blog.accent')}
          viewAllTo="/blog"
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
            {articles.map((post) => (
              <CarouselItem
                key={post.id}
                className="basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <BlogCard
                  post={post}
                  readMoreLabel={t('blog.readMore')}
                  className="h-full"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {scrollSnaps.length > 1 ? (
          <div
            className="mt-10 flex items-center justify-center gap-2.5"
            role="tablist"
            aria-label={t('blog.title')}
          >
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-label={`${t('blog.title')} ${index + 1}`}
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
