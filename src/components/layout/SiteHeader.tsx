import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatStudentAccountId, useAuth } from '@/features/auth/AuthContext'
import { defaultProfilePhoto } from '@/features/profile/profileData'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', key: 'home' },
  { to: '/top-students', key: 'topStudents' },
  { to: '/achievements', key: 'achievements' },
  { to: '/events', key: 'events' },
  { to: '/blog', key: 'blog' },
] as const

function ProfileMenuDropdown({
  className,
  onNavigate,
  fullWidth = false,
}: {
  className?: string
  onNavigate?: () => void
  fullWidth?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (!session) return null

  const closeMenu = () => setOpen(false)

  const goToProfile = () => {
    closeMenu()
    onNavigate?.()
    navigate('/profile')
  }

  const handleLogout = () => {
    logout()
    closeMenu()
    onNavigate?.()
    navigate('/login')
  }

  return (
    <div ref={menuRef} className={cn('relative', fullWidth && 'w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('nav.myProfile')}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-xl bg-brand-dark px-2 shadow-sm ring-1 ring-brand-dark/10 transition-all duration-300 hover:bg-brand-primary hover:shadow-md',
          fullWidth ? 'w-full max-w-none' : 'max-w-60 sm:max-w-68',
        )}
      >
        <img
          src={defaultProfilePhoto}
          alt=""
          className="size-8 shrink-0 rounded-lg object-cover ring-2 ring-white/15"
        />
        <span className="min-w-0 flex-1 text-start">
          <span className="block truncate text-sm font-bold leading-tight text-white">
            {t('profile.studentName')}
          </span>
          <span
            className="mt-0.5 block truncate text-[11px] leading-tight text-white/75"
            dir="ltr"
          >
            {formatStudentAccountId(session.nationalId)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-white/80 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-brand-dark/10 bg-white p-1.5 shadow-[0_12px_40px_rgba(31,83,111,0.12)]',
            fullWidth ? 'inset-x-0' : 'end-0 min-w-44',
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={goToProfile}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-primary/10 hover:text-brand-primary"
          >
            <UserRound className="size-4 shrink-0" aria-hidden />
            {t('nav.myProfile')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            {t('profile.logout')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function HeaderAuthAction({
  className,
  onNavigate,
  fullWidth = false,
}: {
  className?: string
  onNavigate?: () => void
  fullWidth?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, session } = useAuth()
  const Arrow = i18n.language.startsWith('ar') ? ArrowLeft : ArrowRight

  if (isAuthenticated && session) {
    return (
      <ProfileMenuDropdown
        className={className}
        onNavigate={onNavigate}
        fullWidth={fullWidth}
      />
    )
  }

  return (
    <NavLink
      to="/login"
      onClick={onNavigate}
      className={cn('group/login', fullWidth && 'w-full', className)}
    >
      <span
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-secondary hover:text-white hover:shadow-md active:translate-y-px',
          fullWidth && 'w-full',
        )}
      >
        {t('nav.login')}
        <Arrow className="size-4 transition-transform duration-300 group-hover/login:translate-x-0.5 rtl:group-hover/login:-translate-x-0.5" />
      </span>
    </NavLink>
  )
}

export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isAr = i18n.language.startsWith('ar')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleLanguage = () => {
    void i18n.changeLanguage(isAr ? 'en' : 'ar')
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300',
        scrolled || open
          ? 'border-b border-brand-muted/40 bg-brand-light/95 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" className="group flex shrink-0 items-center gap-2.5">
          <img
            src="/logo.jpeg"
            alt={t('brand')}
            className="size-14 rounded-full object-cover shadow-sm ring-2 ring-white/80 transition-transform duration-300 group-hover:scale-105 sm:size-16"
          />
        </NavLink>

        <nav className="hidden items-center gap-4 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-dark/75 hover:bg-brand-primary/10 hover:text-brand-dark',
                )
              }
            >
              {t(`nav.${link.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={toggleLanguage}
            aria-label={isAr ? t('language.switchToEn') : t('language.switchToAr')}
            className="cursor-pointer hidden size-11 ring-0 border-0 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-secondary active:scale-95 sm:inline-flex "
          >
            {isAr ? 'EN' : 'ع'}
          </Button>

          <HeaderAuthAction className="hidden sm:inline-flex" />

          <Button

            size="icon"
            className="size-11 ring-0 border-0  lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-brand-muted/40 bg-brand-light/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-primary font-medium text-white'
                      : 'text-brand-dark/70 hover:bg-brand-primary/10 hover:text-brand-dark',
                  )
                }
              >
                {t(`nav.${link.key}`)}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                toggleLanguage()
                setOpen(false)
              }}
              aria-label={isAr ? t('language.switchToEn') : t('language.switchToAr')}
              className="mt-2 inline-flex size-10 items-center justify-center self-start rounded-full bg-brand-primary text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-95"
            >
              {isAr ? 'EN' : 'ع'}
            </button>
            <HeaderAuthAction
              className="mt-2"
              fullWidth
              onNavigate={() => setOpen(false)}
            />
          </div>
        </nav>
      ) : null}
    </header>
  )
}
