import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Home, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t, i18n } = useTranslation()
  const Arrow = i18n.language.startsWith('ar') ? ArrowLeft : ArrowRight

  return (
    <section className="flex min-h-[calc(100dvh-10rem)] items-center bg-brand-light px-4 py-10 sm:px-6 sm:py-16">
      <div className="relative mx-auto max-w-6xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-s-1 -top-2 h-16 w-24 opacity-70 sm:h-20 sm:w-32"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 8px)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-e-1 -bottom-2 h-16 w-24 opacity-70 sm:h-20 sm:w-32"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 5px, color-mix(in oklab, var(--color-brand-muted) 55%, transparent) 8px)',
          }}
        />

        <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(31,83,111,0.1)]">
          <div className="relative overflow-hidden bg-brand-dark px-6 py-10 text-center text-white sm:px-10 sm:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 40%, #ffffff 1.2px, transparent 1.3px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-e-16 top-0 size-56 rounded-full bg-brand-secondary/25 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-s-10 bottom-0 size-48 rounded-full bg-brand-primary/40 blur-3xl"
            />

            <div className="relative z-10">
              <img
                src="/logo.jpeg"
                alt={t('brand')}
                className="mx-auto size-16 rounded-full object-cover ring-4 ring-white/20 sm:size-20"
              />
              <p className="mt-6 font-bold leading-none text-brand-secondary text-[5.5rem] sm:text-[7rem]">
                404
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {t('notFound.title')}
              </h1>
            </div>
          </div>

          <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12">
            <p className="max-w-lg text-sm leading-relaxed text-brand-dark/65 sm:text-base">
              {t('notFound.body')}
            </p>

            <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/" className="w-full sm:w-auto">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-xl bg-brand-primary px-6 text-base font-bold text-white hover:bg-brand-dark sm:w-auto"
                >
                  <Home className="size-4" aria-hidden />
                  {t('notFound.backHome')}
                  <Arrow className="size-4" aria-hidden />
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-brand-dark/15 bg-white px-6 text-base font-semibold text-brand-dark hover:bg-brand-light sm:w-auto"
                >
                  <Mail className="size-4" aria-hidden />
                  {t('notFound.contact')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
