import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout, type DetailSection } from '@/components/DetailPageLayout'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { formatPublishedDate, getBlogArticle } from '@/features/blog/blogApi'
import { useApiResource } from '@/lib/useApiResource'

export function BlogDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const { data: entry, isLoading, error, errorStatus, reload } = useApiResource(
    () => getBlogArticle(id),
    [id],
  )

  if (errorStatus === 404) {
    return <Navigate to="/blog" replace />
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

  const publishedLabel = formatPublishedDate(entry.published_at, i18n.language)
  const images = entry.image_urls ?? []

  const sections: DetailSection[] = [
    { title: t('detail.sections.overview'), body: entry.content, html: true },
  ]

  if (images.length > 0) {
    sections.push({
      title: t('detail.sections.gallery'),
      body: (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((src, index) => (
            <ImageWithFallback
              key={`${src}-${index}`}
              src={src}
              alt=""
              loading="lazy"
              className="aspect-4/3 w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ),
    })
  }

  return (
    <DetailPageLayout
      bannerTitle={t('detail.blog')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.blog'), to: '/blog' },
        { label: entry.title },
      ]}
      image={entry.thumbnail_url ?? ''}
      imageAlt={entry.title}
      title={entry.title}
      sidebarMeta={
        <div className="flex items-center gap-3">
          <ImageWithFallback
            src={entry.author_photo_url}
            alt=""
            className="size-10 rounded-full object-cover ring-2 ring-brand-muted/40"
          />
          <div className="text-sm text-brand-dark/55">
            {entry.author_name ? (
              <p>
                <span className="font-medium text-brand-dark/70">{t('blog.by')}</span>{' '}
                {entry.author_name}
              </p>
            ) : null}
            {publishedLabel ? <p>{publishedLabel}</p> : null}
          </div>
        </div>
      }
      sections={sections}
    />
  )
}
