import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import { BlogCard, type BlogPost } from '@/features/home/components/BlogCard'
import { blogCatalog } from '@/features/blog/data'
import { usePagination } from '@/lib/usePagination'

export function BlogPage() {
  const { t, i18n } = useTranslation()

  const articles = useMemo<BlogPost[]>(
    () =>
      Array.from({ length: 3 }, (_, copy) =>
        blogCatalog.map((post) => ({
          id: `${post.id}-${copy}`,
          image: post.image,
          title: t(`blog.items.${post.id}.title`),
          body: t(`blog.items.${post.id}.body`),
          href: `/blog/${post.id}`,
        })),
      ).flat(),
    [t, i18n.language],
  )

  const { page, setPage, pageCount, current } = usePagination(articles, 9)

  return (
    <section className="pb-16">
      <PageBanner
        title={t('blog.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.blog') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              readMoreLabel={t('blog.readMore')}
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
