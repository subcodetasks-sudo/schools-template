import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { formatPublishedDate, getBlogArticle, type BlogArticle } from '@/features/blog/blogApi'
import { ApiError, getErrorMessage } from '@/lib/api'

export function BlogDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [entry, setEntry] = useState<BlogArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    return getBlogArticle(id)
      .then(setEntry)
      .catch((err) => {
        setEntry(null)
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(getErrorMessage(err))
        }
      })
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (notFound) {
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
            onClick={() => void load()}
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

  const sections = [{ title: t('detail.sections.overview'), body: entry.content, html: true }]

  if (images.length > 0) {
    const galleryHtml = `<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">${images
      .map(
        (src) =>
          `<img src="${src}" alt="" loading="lazy" class="aspect-4/3 w-full rounded-xl object-cover" onerror="this.onerror=null;this.src='/logo.jpeg'" />`,
      )
      .join('')}</div>`
    sections.push({ title: t('detail.sections.gallery'), body: galleryHtml, html: true })
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
