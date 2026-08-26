import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, Mail, Phone, PhoneCall, Share2 } from 'lucide-react'
import { PageBanner } from '@/components/PageBanner'

export function TermsOfApplyingPage() {
  const { t } = useTranslation()

  return (
    <section className="bg-background pb-16 sm:pb-20">
      <PageBanner
        title={t('termsOfApplying.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('termsOfApplying.title') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-t-[1.75rem] sm:rounded-t-[2rem]">
          <div className="relative aspect-[21/9]">
            <img
              src="/achiv-1.jpg"
              alt={t('termsOfApplying.title')}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/55 via-brand-dark/35 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('termsOfApplying.heroTitle')}
              </h1>
              <p className="mt-2 text-lg font-semibold text-white/90 sm:text-2xl">
                {t('termsOfApplying.heroSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <article className="relative z-10 -mt-8 rounded-[1.75rem] border border-brand-muted/40 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(31,83,111,0.11)] sm:-mt-10 sm:rounded-[2rem] sm:px-10 sm:py-10">
          <div className="mx-auto -mt-16 mb-5 flex size-24 items-center justify-center rounded-full border-4 border-white bg-background shadow-md sm:mb-7">
            <img
              src="/logo.jpeg"
              alt={t('brand')}
              className="size-20 rounded-full object-cover"
            />
          </div>

          <p className="mx-auto max-w-3xl text-center text-base font-semibold leading-relaxed text-brand-dark sm:text-lg">
            {t('termsOfApplying.body')}
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-center text-sm text-brand-dark/65 sm:text-base">
            {t('termsOfApplying.subtitle')}
          </p>

          <div className="mx-auto mt-6 h-px max-w-4xl bg-brand-muted/40" />

          <div className="mx-auto mt-6 max-w-4xl space-y-4 text-center text-sm leading-7 text-brand-dark/70 sm:text-base">
            <p>{t('termsOfApplying.paragraph1')}</p>
            <p>{t('termsOfApplying.paragraph2')}</p>
            <p>{t('termsOfApplying.paragraph3')}</p>
          </div>

          <div className="mt-9 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-20 w-full flex-col items-center justify-center rounded-lg border border-brand-dark/20 bg-white px-4 py-3 sm:w-auto sm:min-w-64">
              <span className="text-sm font-semibold text-brand-dark/70">
                {t('termsOfApplying.ctaSecondary')}
              </span>
              <div className="mt-2 flex items-center justify-center gap-2">
                <a
                  href="mailto:info@mdls2.edu.eg"
                  aria-label="Email"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-brand-primary/8 text-brand-primary transition-colors hover:bg-brand-primary/15"
                >
                  <Mail className="size-4" />
                </a>
                <a
                  href="tel:+201001234567"
                  aria-label="Phone"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-brand-primary/8 text-brand-primary transition-colors hover:bg-brand-primary/15"
                >
                  <Phone className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="Share"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-brand-primary/8 text-brand-primary transition-colors hover:bg-brand-primary/15"
                >
                  <Share2 className="size-4" />
                </a>
                <a
                  href="#"
                  aria-label="Website"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-brand-primary/8 text-brand-primary transition-colors hover:bg-brand-primary/15"
                >
                  <Globe className="size-4" />
                </a>
              </div>
            </div>

            <Link
              to="/contact"
              className="inline-flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-brand-dark/15 bg-brand-primary px-7 py-3 text-white transition-colors hover:bg-brand-dark sm:w-auto sm:min-w-56"
            >
              <span className="text-sm font-semibold">{t('termsOfApplying.ctaPrimary')}</span>
              <PhoneCall className="size-4" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
