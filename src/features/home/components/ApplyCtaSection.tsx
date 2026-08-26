import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function ApplyCtaSection() {
  const { t } = useTranslation()

  return (
    <section className="overflow-x-clip bg-background py-16 sm:py-20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-2 -top-3 h-20 w-28 opacity-70 sm:h-24 sm:w-36"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 8px)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-2 -bottom-3 h-20 w-28 opacity-70 sm:h-24 sm:w-36"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 8px)',
          }}
        />

        <div className="relative overflow-visible rounded-3xl bg-brand-dark">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 40%, #ffffff 1.2px, transparent 1.3px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-e-16 top-0 size-56 rounded-full bg-brand-secondary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-s-10 bottom-0 size-48 rounded-full bg-brand-primary/30 blur-3xl"
          />

          <div className="relative flex flex-col items-center gap-6 px-6 pb-4 pt-10 sm:gap-8 sm:px-10 sm:pb-6 sm:pt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-12 lg:pb-0 lg:pt-10">
            <div className="z-10 flex max-w-xl flex-col items-center text-center lg:items-start lg:pb-10 lg:text-start">
              <h2 className="text-2xl font-bold leading-snug text-white sm:text-3xl lg:text-[2rem]">
                {t('applyCta.title')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
                {t('applyCta.body')}
              </p>
              <Link to="/contact" className="mt-7 shrink-0">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 rounded-xl bg-white px-7 text-base font-bold text-brand-primary hover:bg-brand-light hover:text-brand-dark"
                >
                  {t('applyCta.cta')}
                </Button>
              </Link>
            </div>

            <div className="relative z-20 flex w-full max-w-sm shrink-0 justify-center lg:max-w-md lg:justify-end lg:self-end">
              <img
                src="/books.png"
                alt=""
                aria-hidden
                className="h-auto w-[min(100%,17rem)] -translate-y-1 object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)] sm:w-[min(100%,19rem)] lg:w-88 lg:translate-y-10"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
