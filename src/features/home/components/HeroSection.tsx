import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'

const ease = [0.22, 1, 0.36, 1] as const

export function HeroSection() {
  const { t, i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
  const isRtl = i18n.language.startsWith('ar')

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.75, delay, ease },
        }

  const fadeBoy = reduceMotion
    ? { initial: false as const, animate: { opacity: 1, x: 0, scale: 1 } }
    : {
        initial: { opacity: 0, x: isRtl ? 28 : -28, scale: 0.96 },
        animate: { opacity: 1, x: 0, scale: 1 },
        transition: { duration: 0.9, delay: 0.2, ease },
      }

  return (
    <section className="relative isolate min-h-dvh overflow-hidden bg-brand-light pt-20">
      <div
        className="pointer-events-none absolute -start-24 top-16 size-72 rounded-full bg-brand-secondary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-16 top-24 size-80 rounded-full bg-brand-primary/10 blur-3xl"
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

      <div className="relative z-20 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-4 lg:py-0">
        <div className="relative order-2 mt-6 hidden min-h-[22rem] w-full flex-1 items-end justify-center lg:order-1 lg:mt-0 lg:flex lg:min-h-0 lg:justify-start">
          <motion.img
            src="/hero.webp"
            alt=""
            aria-hidden
            {...fadeBoy}
            className="relative z-10 h-auto max-h-[min(70dvh,36rem)] w-auto max-w-full object-contain drop-shadow-[0_16px_36px_rgba(31,83,111,0.28)] lg:absolute lg:start-0 lg:bottom-0 lg:max-h-[calc(100dvh-5rem)] lg:max-w-[min(100%,36rem)]"
          />
        </div>

        <div className="order-1 flex w-full max-w-xl flex-col items-start justify-center lg:order-2 lg:w-[52%] lg:shrink-0 lg:pb-16">
          <motion.p
            {...fadeUp(0)}
            className="relative mb-5 text-base font-semibold text-brand-primary sm:text-lg"
          >
            {t('hero.eyebrow')}
            <svg
              className="absolute -bottom-2 start-0 h-3 w-[7.5rem] text-brand-secondary"
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
          </motion.p>

          <motion.h1
            {...fadeUp(0.1)}
            className="text-[2.5rem] leading-[1.18] font-bold tracking-tight text-brand-dark sm:text-5xl"
          >
            <span className="block lg:whitespace-nowrap">{t('hero.brandLine1')}</span>
            <span className="block whitespace-nowrap">{t('hero.brandLine2')}</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-6 max-w-lg text-base leading-relaxed text-brand-dark/65 sm:text-lg"
          >
            <span className="font-semibold text-brand-dark">{t('hero.title')}. </span>
            {t('hero.subtitle')}
          </motion.p>

          <motion.div {...fadeUp(0.32)} className="mt-8 flex flex-wrap gap-3">
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
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 leading-[0]" aria-hidden>
        <svg
          className="h-12 w-full text-background sm:h-14"
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
