import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Empty state for results the school has closed. Deliberately has no retry:
 * asking again changes nothing until the school opens them.
 */
export function HiddenResultState({
  message,
  className,
}: {
  /** The API's already-localized text; falls back to the app copy when empty. */
  message?: string | null
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-4 py-14 text-center sm:px-6 sm:py-16',
        className,
      )}
    >
      <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <Lock className="size-6" aria-hidden />
      </div>
      <p className="max-w-md text-balance text-base font-bold leading-relaxed text-brand-dark sm:text-lg">
        {message?.trim() || t('profile.hidden.message')}
      </p>
    </div>
  )
}

/**
 * Option of a term selector. A closed term stays visible but disabled, with a lock and a
 * "currently unavailable" tooltip (`title`), plus screen-reader text for touch/AT users.
 */
export function TermSelectItem({
  value,
  locked,
  className,
  children,
}: {
  value: string
  locked: boolean
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <SelectItem
      value={value}
      disabled={locked}
      title={locked ? t('profile.hidden.unavailable') : undefined}
      // Disabled items ignore the pointer by default, which would suppress the tooltip.
      className={cn(className, locked && 'cursor-not-allowed data-disabled:pointer-events-auto')}
    >
      {children}
      {locked ? (
        <>
          <Lock className="size-3.5 shrink-0 text-brand-dark/60" aria-hidden />
          <span className="sr-only">{t('profile.hidden.unavailable')}</span>
        </>
      ) : null}
    </SelectItem>
  )
}

/** Notice above visible data when only some terms are closed. */
export function HiddenTermsNotice({ terms }: { terms: readonly string[] }) {
  const { t } = useTranslation()
  if (terms.length === 0) return null

  return (
    <p
      role="status"
      className="mt-6 flex items-start gap-2 rounded-xl border border-brand-dark/10 bg-muted/30 px-4 py-3 text-sm text-brand-dark/70"
    >
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {t('profile.hidden.partial', {
          terms: terms.map((term) => t(`profile.weeklyEvaluations.terms.${term}`)).join(' / '),
        })}
      </span>
    </p>
  )
}
