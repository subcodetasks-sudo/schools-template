import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <section className="relative isolate overflow-hidden bg-brand-light pt-20">
      {/* Soft leaf / atmosphere accents */}
      <div
        className="pointer-events-none absolute -start-24 top-16 size-72 rounded-full bg-brand-secondary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-16 top-32 size-80 rounded-full bg-brand-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 start-0 w-1/3 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 40%, #245c7c 1.5px, transparent 1.6px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[90%] items-center px-4 pb-28 pt-10 sm:px-6 lg:grid-cols-2  lg:pb-36 lg:pt-6">
        {/* Visual — first in DOM so RTL places it on the right */}
        <div className="hero-fade hero-fade-delay-2 relative mx-auto flex  w-full max-w-88 items-center justify-center sm:max-w-104 lg:max-w-120 ">
          <img
            src="/hero.webp"
            alt=""
            aria-hidden
            className="relative z-10 size-full object-contain drop-shadow-[0_20px_40px_rgba(31,83,111,0.25)]"
          />
        </div>

        {/* Copy */}
        <div className="flex flex-col items-start w-full">
          <p className="hero-fade relative mb-4 text-base font-semibold text-brand-primary">
            {t('hero.eyebrow')}
            <svg
              className="absolute -bottom-2 start-0 h-3 w-[7.5rem] text-[#e85d4c]"
              viewBox="0 0 120 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 8C20 2 40 10 58 6C76 2 96 10 118 4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </p>

          <h1 className="hero-fade hero-fade-delay-1 max-w-xl text-4xl leading-[1.2] font-bold tracking-tight text-brand-dark sm:text-5xl lg:text-[3.25rem]">
            {t('brand')}
          </h1>

          <p className="hero-fade hero-fade-delay-2 mt-5 max-w-md text-base leading-relaxed text-brand-dark/65 sm:text-lg">
            <span className="font-semibold text-brand-dark">{t('hero.title')}. </span>
            {t('hero.subtitle')}
          </p>

          <div className="hero-fade hero-fade-delay-3 mt-8 flex flex-wrap gap-3">
            <Link to="/achievements">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-brand-dark px-6 text-base text-white hover:bg-brand-primary"
              >
                {t('hero.ctaPrimary')}
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-brand-dark/20 bg-white/60 px-6 text-base text-brand-dark hover:bg-white"
              >
                {t('hero.ctaSecondary')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
        <svg
          className="h-16 w-full text-background sm:h-20"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,48 C180,80 360,8 540,32 C720,56 900,80 1080,48 C1260,16 1350,24 1440,40 L1440,80 L0,80 Z"
          />
        </svg>
      </div>
    </section>
  )
}
