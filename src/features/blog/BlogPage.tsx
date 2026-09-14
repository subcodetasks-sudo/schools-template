import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner } from '@/components/PageBanner'
import { Pagination } from '@/components/Pagination'
import { BlogCard, type BlogPost } from '@/features/home/components/BlogCard'
import { getBlogArticles } from '@/features/blog/blogApi'
import { useApiResource } from '@/lib/useApiResource'
import { usePagination } from '@/lib/usePagination'

export function BlogPage() {
  const { t } = useTranslation()
  const { data, isLoading, error, reload } = useApiResource(() => getBlogArticles(), [])

  const articles = useMemo<BlogPost[]>(
    () =>
      (data ?? []).map((post) => ({
        id: post.slug,
        image: post.thumbnail_url ?? '',
        title: post.title,
        body: post.content.replace(/<[^>]+>/g, ' ').trim(),
        href: `/blog/${post.slug}`,
      })),
    [data],
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
        ) : articles.length === 0 ? (
          <p className="py-16 text-center text-sm text-brand-dark/55">{t('state.empty')}</p>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  )
}
