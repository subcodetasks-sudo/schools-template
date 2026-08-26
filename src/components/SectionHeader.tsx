import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ViewAllLink } from '@/components/ViewAllLink'

type SectionHeaderProps = {
  title: string
  /** Word(s) rendered in brand accent color (matched from the start of title). */
  accent?: string
  description?: string
  actions?: ReactNode
  /** When set, shows a “View all” link to the related page. */
  viewAllTo?: string
  align?: 'start' | 'center'
  className?: string
  titleClassName?: string
}

export function SectionHeader({
  title,
  accent,
  description,
  actions,
  viewAllTo,
  align = 'start',
  className,
  titleClassName,
}: SectionHeaderProps) {
  const accentText = accent?.trim()
  const restTitle =
    accentText && title.startsWith(accentText)
      ? title.slice(accentText.length).trimStart()
      : title

  return (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center',
        className,
      )}
    >
      <div className={cn(align === 'center' && 'text-center')}>
        <h2
          className={cn(
            'relative inline-block text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl',
            titleClassName,
          )}
        >
          {accentText ? (
            <>
              <span className="text-brand-primary">{accentText}</span>
              {restTitle ? <> {restTitle}</> : null}
            </>
          ) : (
            title
          )}
          <svg
            className="absolute -bottom-4 start-0 h-3 w-[6.5rem] text-brand-secondary sm:w-32"
            viewBox="0 0 120 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 8C20 2 40 10 58 6C76 2 96 10 118 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </h2>
        {description ? (
          <p className="mt-5 max-w-xl text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div
          className={cn(
            'min-w-0',
            align === 'center' && 'w-full',
            viewAllTo && 'sm:flex-1 sm:flex sm:justify-center',
          )}
        >
          {actions}
        </div>
      ) : null}

      {viewAllTo ? <ViewAllLink to={viewAllTo} /> : null}
    </div>
  )
}
