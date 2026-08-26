import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SupportedLanguage } from '@/lib/i18n'

const links = [
  { to: '/', key: 'home' },
  { to: '/top-students', key: 'topStudents' },
  { to: '/achievements', key: 'achievements' },
  { to: '/events', key: 'events' },
  { to: '/blog', key: 'blog' },
] as const

export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const isAr = i18n.language.startsWith('ar')
  const Arrow = isAr ? ArrowLeft : ArrowRight

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const setLanguage = (lng: SupportedLanguage) => {
    if ((lng === 'ar') === isAr) return
    void i18n.changeLanguage(lng)
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

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative pb-1 text-[15px] font-medium text-brand-dark/75 transition-colors hover:text-brand-dark',
                  isActive &&
                    'text-brand-dark after:absolute after:inset-x-1 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-secondary',
                )
              }
            >
              {t(`nav.${link.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            role="group"
            aria-label={t('language.label')}
            className="hidden h-10 items-center rounded-xl border border-brand-dark/15 bg-white/55 p-1 shadow-sm backdrop-blur-sm sm:inline-flex"
          >
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all',
                isAr
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-brand-dark/55 hover:text-brand-dark',
              )}
              aria-pressed={isAr}
            >
              ع
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all',
                !isAr
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-brand-dark/55 hover:text-brand-dark',
              )}
              aria-pressed={!isAr}
            >
              EN
            </button>
          </div>

          <NavLink
            to="/login"
            className="group/login hidden sm:inline-flex"
          >
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-brand-dark/80 bg-brand-dark px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:border-brand-dark hover:bg-brand-dark hover:text-white hover:shadow-md active:translate-y-px">
              {t('nav.login')}
              <Arrow className="size-4 transition-transform duration-300 group-hover/login:translate-x-0.5 rtl:group-hover/login:-translate-x-0.5" />
            </span>
          </NavLink>

          <Button
            variant="ghost"
            size="icon"
            className="text-brand-dark lg:hidden"
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
                    'rounded-xl px-3 py-2.5 text-sm text-brand-dark/70 hover:bg-white/70 hover:text-brand-dark',
                    isActive && 'bg-white font-medium text-brand-dark',
                  )
                }
              >
                {t(`nav.${link.key}`)}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 px-1">
              <button
                type="button"
                onClick={() => {
                  setLanguage('ar')
                  setOpen(false)
                }}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium',
                  isAr ? 'bg-brand-dark text-white' : 'bg-white/70 text-brand-dark/70',
                )}
              >
                {t('language.ar')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  setOpen(false)
                }}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium',
                  !isAr ? 'bg-brand-dark text-white' : 'bg-white/70 text-brand-dark/70',
                )}
              >
                {t('language.en')}
              </button>
            </div>
            <NavLink
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-dark px-3 py-2.5 text-center text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-dark hover:text-white"
            >
              {t('nav.login')}
              <Arrow className="size-4" />
            </NavLink>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
