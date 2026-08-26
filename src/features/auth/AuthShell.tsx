import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const slides = [
  {
    image: '/auth-slider-1.png',
    titleKey: 'login.slides.s1.title',
    bodyKey: 'login.slides.s1.body',
  },
  {
    image: '/auth-slider-2.png',
    titleKey: 'login.slides.s2.title',
    bodyKey: 'login.slides.s2.body',
  },
] as const

type AuthShellProps = {
  panelTitle: string
  panelBody: string
  children: ReactNode
}

export function AuthShell({ panelTitle, panelBody, children }: AuthShellProps) {
  const { t } = useTranslation()
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4500)
    return () => window.clearInterval(id)
  }, [])

  const slide = slides[activeSlide]!

  return (
    <section className="bg-muted/40 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid min-h-136 max-w-6xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(31,83,111,0.12)] lg:min-h-152 lg:grid-cols-2">
        <aside className="relative order-2 hidden overflow-hidden lg:order-1 lg:block">
          <img
            src="/auth-bg.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-brand-dark/55" />

          <div className="relative z-10 flex h-full flex-col items-center px-8 py-10 text-center text-white">
            <img
              src="/logo.jpeg"
              alt={t('brand')}
              className="size-20 rounded-full object-cover ring-4 ring-white/25"
            />
            <h2 className="mt-5 text-2xl font-bold">{panelTitle}</h2>
            <p className="mt-2 max-w-sm text-sm text-white/80">{panelBody}</p>

            <div className="mt-auto flex w-full flex-1 flex-col items-center justify-end">
              <img
                key={slide.image}
                src={slide.image}
                alt=""
                className="mx-auto h-56 w-auto object-contain drop-shadow-xl transition-opacity duration-500 sm:h-64 lg:h-72"
              />
              <h3 className="mt-4 text-xl font-bold">{t(slide.titleKey)}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">
                {t(slide.bodyKey)}
              </p>

              <div className="mt-6 flex items-center justify-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={t('login.slideDot', { index: index + 1 })}
                    aria-current={index === activeSlide}
                    onClick={() => setActiveSlide(index)}
                    className={cn(
                      'size-2.5 rounded-full transition-colors',
                      index === activeSlide ? 'bg-white' : 'bg-white/35 hover:bg-white/60',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="order-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:order-2 lg:px-14">
          {children}
        </div>
      </div>
    </section>
  )
}

export const authFieldClass =
  'h-12 w-full rounded-xl border border-brand-dark/15 bg-white px-4 text-sm text-brand-dark outline-none transition-colors placeholder:text-brand-dark/35 focus:border-brand-primary'
