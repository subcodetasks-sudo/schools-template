import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <nav
      aria-label={t('pagination.label')}
      className={cn('flex items-center justify-center gap-2', className)}
    >
      <button
        type="button"
        aria-label={t('pagination.prev')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={pageButtonClass(false)}
      >
        <PrevIcon className="size-4" aria-hidden />
      </button>

      {pages.map((item) => (
        <button
          key={item}
          type="button"
          aria-label={t('pagination.page', { page: item })}
          aria-current={item === page ? 'page' : undefined}
          onClick={() => onPageChange(item)}
          className={pageButtonClass(item === page)}
        >
          {item}
        </button>
      ))}

      <button
        type="button"
        aria-label={t('pagination.next')}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={pageButtonClass(false)}
      >
        <NextIcon className="size-4" aria-hidden />
      </button>
    </nav>
  )
}

function pageButtonClass(active: boolean) {
  return cn(
    'inline-flex size-10 items-center justify-center rounded-md border text-sm font-medium transition-colors',
    active
      ? 'border-brand-dark/25 bg-brand-dark/5 text-brand-dark'
      : 'border-brand-dark/15 bg-white text-brand-dark/70 hover:border-brand-primary/40 hover:text-brand-primary',
    'disabled:pointer-events-none disabled:opacity-40',
  )
}
