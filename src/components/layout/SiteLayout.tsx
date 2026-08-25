import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { cn } from '@/lib/utils'

export function SiteLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className={cn('flex min-h-dvh flex-col', isHome && 'bg-brand-light')}>
      <SiteHeader />
      <main className={cn('flex-1', !isHome && 'pt-24')}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
