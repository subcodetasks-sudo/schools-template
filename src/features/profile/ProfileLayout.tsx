import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileBadge,
  LogOut,
  Menu,
  Phone,
  UserRound,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProfileProvider, useProfile } from '@/features/profile/ProfileContext'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

const mainLinks = [
  { to: '/profile', key: 'personal', icon: UserRound, end: true },
  { to: '/profile/certificate', key: 'certificate', icon: FileBadge },
  { to: '/profile/monthly-evaluations', key: 'monthlyEvaluations', icon: ClipboardList },
  { to: '/profile/schedule', key: 'schedule', icon: CalendarDays },
  { to: '/profile/parent-summon', key: 'parentSummon', icon: Phone },
  { to: '/profile/statistics', key: 'statistics', icon: BarChart3 },
] as const

export function ProfileLayout() {
  return (
    <ProfileProvider>
      <ProfileLayoutContent />
    </ProfileProvider>
  )
}

function ProfileLayoutContent() {
  const { t } = useTranslation()
  const { profilePhoto } = useProfile()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebar = (
    <aside className="flex h-full w-full flex-col bg-muted/40 lg:w-64 lg:border-e lg:border-brand-dark/10">
      <div className="flex flex-col items-center px-5 pt-8 pb-6 text-center">
        <Avatar className="size-20 ring-4 ring-white shadow-sm">
          <AvatarImage src={profilePhoto} alt={t('profile.studentName')} />
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
                  : 'text-brand-dark hover:bg-white hover:text-brand-dark',
              )
            }
          >
            <link.icon className="size-4 shrink-0" aria-hidden />
            <span>{t(`profile.nav.${link.key}`)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-brand-dark/10 p-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
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
