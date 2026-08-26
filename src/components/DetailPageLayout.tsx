import type { ReactNode } from 'react'
import { PageBanner, type PageBreadcrumb } from '@/components/PageBanner'
import { cn } from '@/lib/utils'

export type DetailSection = {
  title: string
  body: string
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
        <div className="relative mt-6 overflow-hidden rounded-t-[1.75rem] lg:mt-8 lg:w-[calc(100%-8rem)] w-full ">
          <div className="relative max-h-[500px] w-full">
            <img
              src={image}
              alt={imageAlt}
              className="size-full object-cover"
            />
            {imageBadge ? (
              <div className="absolute inset-e-3 bottom-3 sm:inset-e-5 sm:bottom-5">
                {imageBadge}
              </div>
            ) : null}
          </div>
        </div>

        <article className="relative z-10 -mt-16 rounded-[1.75rem] bg-white px-6 py-8 border-8 border-brand-secondary/50 sm:-mt-24 sm:rounded-[2.5rem] sm:px-8 sm:py-10 lg:-mt-28 lg:px-12 lg:py-12">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <aside className="lg:col-span-4">
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
                  <p className="mt-3 text-[15px] leading-8 text-brand-dark/60 sm:text-base sm:leading-8">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
