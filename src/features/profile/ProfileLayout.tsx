import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  MessageSquareWarning,
  Phone,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const mainLinks = [
  { to: '/profile', key: 'personal', icon: UserRound, end: true },
  { to: '/profile/statistics', key: 'statistics', icon: BarChart3 },
  { to: '/profile/results', key: 'results', icon: FileText },
  { to: '/profile/schedule', key: 'schedule', icon: CalendarDays },
  { to: '/profile/settings', key: 'settings', icon: Settings },
] as const

const moreLinks = [
  { to: '/profile/call-parent', key: 'callParent', icon: Phone },
  { to: '/profile/behavior', key: 'behavior', icon: ClipboardList },
  { to: '/profile/complaints', key: 'complaints', icon: MessageSquareWarning },
] as const

export function ProfileLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const logout = () => {
    navigate('/login')
  }

  const sidebar = (
    <aside className="flex h-full w-full flex-col bg-muted/40 lg:w-64 lg:border-e lg:border-brand-dark/10">
      <div className="flex flex-col items-center px-5 pt-8 pb-6 text-center">
        <Avatar className="size-20 ring-4 ring-white shadow-sm">
          <AvatarImage src="/student-1.png" alt={t('profile.studentName')} />
          <AvatarFallback>{t('profile.studentInitials')}</AvatarFallback>
        </Avatar>
        <h2 className="mt-4 text-lg font-bold text-brand-dark">{t('profile.studentName')}</h2>
        <p className="mt-1 text-sm text-brand-dark/55">{t('profile.studentGrade')}</p>
      </div>

      <Separator className="mx-5 bg-brand-dark/10" />

      <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
        {mainLinks.map((link) => (
          <NavLink
            key={link.key}
            to={link.to}
            end={'end' in link ? link.end : false}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-primary'
                  : 'text-brand-dark/65 hover:bg-white hover:text-brand-dark',
              )
            }
          >
            <link.icon className="size-4 shrink-0" aria-hidden />
            <span>{t(`profile.nav.${link.key}`)}</span>
          </NavLink>
        ))}

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen} className="mt-1">
          <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-dark/65 transition-colors hover:bg-white hover:text-brand-dark">
            <ChevronDown
              className={cn(
                'size-4 shrink-0 transition-transform',
                moreOpen ? 'rotate-180' : '',
              )}
              aria-hidden
            />
            <span>{t('profile.nav.more')}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1 rounded-xl bg-brand-dark/4 p-2">
            {moreLinks.map((link) => (
              <NavLink
                key={link.key}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-white text-brand-primary'
                      : 'text-brand-dark/60 hover:bg-white hover:text-brand-dark',
                  )
                }
              >
                <link.icon className="size-4 shrink-0" aria-hidden />
                {t(`profile.nav.${link.key}`)}
              </NavLink>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <div className="mt-auto border-t border-brand-dark/10 p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={logout}
          className="h-11 w-full justify-start gap-3 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" aria-hidden />
          {t('profile.logout')}
        </Button>
      </div>
    </aside>
  )

  return (
    <section className="bg-muted/40 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[40rem] max-w-6xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(31,83,111,0.1)] lg:min-h-[44rem] lg:flex-row">
        <div className="flex items-center justify-between border-b border-brand-dark/10 px-4 py-3 lg:hidden">
          <p className="text-sm font-semibold text-brand-dark">{t('profile.title')}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl border-brand-dark/15"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={t('profile.toggleMenu')}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>

        <div className={cn('lg:block', mobileOpen ? 'block' : 'hidden')}>{sidebar}</div>

        <div className="min-w-0 flex-1 bg-white p-5 sm:p-8">
          <Outlet />
        </div>
      </div>
    </section>
  )
}
