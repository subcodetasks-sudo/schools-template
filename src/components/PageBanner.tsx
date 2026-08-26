import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PageBreadcrumb = {
  label: string
  to?: string
}

type PageBannerProps = {
  title: string
  breadcrumbs: PageBreadcrumb[]
  className?: string
}

export function PageBanner({ title, breadcrumbs, className }: PageBannerProps) {
  return (
    <div className={cn('px-4 sm:px-6', className)}>
      <div
        className={cn(
          'relative mx-auto flex min-h-28 max-w-6xl items-center justify-center overflow-hidden bg-brand-dark px-6 py-12 text-white sm:min-h-24 sm:py-10',
          '[mask-image:radial-gradient(circle_4.5rem_at_100%_100%,transparent_98%,#000_100%)]',
          'rtl:[mask-image:radial-gradient(circle_4.5rem_at_0%_100%,transparent_98%,#000_100%)]',
        )}
      >
        <nav
          aria-label="Breadcrumb"
          className="absolute top-4 inset-s-4 flex items-center gap-2.5 text-sm text-white/90 sm:top-5 sm:inset-s-6"
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-2.5">
                {index === 0 ? (
                  crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-white/10"
                      aria-label={crumb.label}
                    >
                      <Home className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span className="inline-flex size-8 items-center justify-center">
                      <Home className="size-4" aria-hidden />
                    </span>
                  )
                ) : crumb.to && !isLast ? (
                  <Link to={crumb.to} className="transition-colors hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast && 'font-medium text-white')}>{crumb.label}</span>
                )}

                {!isLast ? (
                  <span aria-hidden className="h-px w-5 bg-white/55 sm:w-6" />
                ) : null}
              </span>
            )
          })}
        </nav>

        <h1 className="relative z-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
      </div>
    </div>
  )
}
