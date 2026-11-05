import type { ReactNode } from 'react'
import { PageBanner, type PageBreadcrumb } from '@/components/PageBanner'
import { ImageWithFallback } from '@/components/ImageWithFallback'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'

export type DetailSection = {
  title: string
  /** Plain text, or a node for structured content such as an image gallery. */
  body: ReactNode
  /** Treat string `body` as untrusted HTML (e.g. rich-text article content); it is sanitized before rendering. */
  html?: boolean
}

type DetailPageLayoutProps = {
  bannerTitle: string
  breadcrumbs: PageBreadcrumb[]
  image: string
  imageAlt: string
  title: string
  /** Shown under the title in the sidebar (author, date, etc.). */
  sidebarMeta?: ReactNode
  /** Overlay on the hero image (e.g. event date badge). */
  imageBadge?: ReactNode
  sections: DetailSection[]
  className?: string
}

export function DetailPageLayout({
  bannerTitle,
  breadcrumbs,
  image,
  imageAlt,
  title,
  sidebarMeta,
  imageBadge,
  sections,
  className,
}: DetailPageLayoutProps) {
  return (
    <section className={cn('bg-background pb-16 sm:pb-20', className)}>
      <PageBanner title={bannerTitle} breadcrumbs={breadcrumbs} />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative mt-6 overflow-hidden rounded-3xl bg-brand-secondary/20 ring-1 ring-brand-dark/5 lg:mt-8 w-full">
          <div className="relative h-64 w-full sm:h-80 lg:h-[28rem]">
            <ImageWithFallback
              src={image}
              alt={imageAlt}
              className="size-full object-contain"
            />
            {imageBadge ? (
              <div className="absolute inset-e-3 bottom-3 sm:inset-e-5 sm:bottom-5">
                {imageBadge}
              </div>
            ) : null}
          </div>
        </div>

        <article className="relative z-10 mt-6 rounded-3xl bg-white px-6 py-8 shadow-lg shadow-brand-dark/5 ring-1 ring-brand-dark/10 sm:mt-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <aside className="lg:col-span-4 lg:border-e lg:border-brand-dark/10 lg:pe-8">
              <span className="mb-4 block h-1.5 w-12 rounded-full bg-brand-primary" />
              <h2 className="text-2xl font-bold leading-snug text-brand-dark sm:text-3xl lg:text-[2rem]">
                {title}
              </h2>
              {sidebarMeta ? <div className="mt-6">{sidebarMeta}</div> : null}
            </aside>

            <div className="space-y-9 lg:col-span-8">
              {sections.map((section) => (
                <section key={section.title}>
                  <h3 className="border-s-4 border-brand-primary ps-3 text-lg font-bold leading-snug text-brand-dark sm:text-xl">
                    {section.title}
                  </h3>
                  {section.html && typeof section.body === 'string' ? (
                    <div
                      className="mt-3 space-y-3 text-[15px] leading-8 text-brand-dark/75 sm:text-base sm:leading-8 [&_a]:text-brand-primary [&_a]:underline [&_img]:my-4 [&_img]:rounded-xl"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.body) }}
                    />
                  ) : (
                    <div className="mt-3 text-[15px] leading-8 text-brand-dark/60 sm:text-base sm:leading-8">
                      {section.body}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
