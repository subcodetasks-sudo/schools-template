import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type ViewAllLinkProps = {
  to: string
  className?: string
}

export function ViewAllLink({ to, className }: ViewAllLinkProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center gap-2.5  font-medium text-brand-dark transition-colors hover:text-brand-primary  group',
        className,
      )}
    >
      <span aria-hidden className="h-4 w-0.5 rounded-full bg-brand-primary group-hover:rotate-0 rotate-15 transition-transform duration-300" />
      {t('viewAll')}
      <span aria-hidden className="h-4 w-0.5 rounded-full bg-brand-secondary group-hover:rotate-0 rotate-15 transition-transform duration-300" />
    </Link>
  )
}
