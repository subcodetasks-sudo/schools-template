import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DetailPageLayout } from '@/components/DetailPageLayout'
import { getBlogEntry, isBlogSlug } from '@/features/blog/data'

export function BlogDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()

  if (!isBlogSlug(id)) {
    return <Navigate to="/blog" replace />
  }

  const entry = getBlogEntry(id)!
  const title = t(`blog.items.${id}.title`)
  const body = t(`blog.items.${id}.body`)

  return (
    <DetailPageLayout
      bannerTitle={t('detail.blog')}
      breadcrumbs={[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.blog'), to: '/blog' },
        { label: title },
      ]}
      image={entry.image}
      imageAlt={title}
      title={title}
      sidebarMeta={
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt=""
            className="size-10 rounded-full object-cover ring-2 ring-brand-muted/40"
          />
          <p className="text-sm text-brand-dark/55">
            <span className="font-medium text-brand-dark/70">
              {t('blog.by')}
            </span>{' '}
            {t('blog.author')}
          </p>
        </div>
      }
      sections={[
        { title: t('detail.sections.overview'), body },
        {
          title: t('detail.sections.highlights'),
          body: t('detail.blogHighlights'),
        },
        {
          title: t('detail.sections.more'),
          body: t('detail.blogMore'),
        },
      ]}
    />
  )
}
