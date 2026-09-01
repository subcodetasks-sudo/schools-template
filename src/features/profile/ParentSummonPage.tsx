import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  parentSummonNotices,
  type ParentSummonNotice,
} from '@/features/profile/parentSummonData'
import { cn } from '@/lib/utils'

function PageTitle() {
  const { t } = useTranslation()

  return (
    <h1 className="relative inline-block pb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
      {t('profile.nav.parentSummon')}
      <svg
        className="absolute -bottom-0.5 inset-s-0 h-2.5 w-24 text-brand-secondary"
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
    </h1>
  )
}

function formatDocumentDate(date: string) {
  const value = new Date(date)
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = value.getFullYear()
  return `${day}/${month}/${year}`
}

function DocCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 border border-brand-dark/15 bg-white px-3 py-2.5">
      <span className="shrink-0 text-xs font-bold text-brand-dark">{label}</span>
      <span className="min-w-0 text-xs font-medium text-brand-dark sm:text-sm">{value}</span>
    </div>
  )
}

function SignatureCell({ title, name }: { title: string; name: string }) {
  return (
    <div className="border border-brand-dark/15 bg-white px-2 py-3 text-center">
      <p className="text-[11px] font-bold leading-snug text-brand-dark sm:text-xs">{title}</p>
      <p className="mt-2 text-xs font-semibold text-brand-primary sm:text-sm">{name}</p>
    </div>
  )
}

function SummonNoticeDetail({ notice }: { notice: ParentSummonNotice }) {
  const { t } = useTranslation()

  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-brand-dark/10 bg-white text-sm shadow-sm">
      <header className="bg-brand-light px-4 py-4 text-center sm:px-5 sm:py-5">
        <h2 className="text-xl font-bold text-brand-dark sm:text-2xl">
          {t('profile.parentSummon.documentTitleLine1')}{' '}
          {t('profile.parentSummon.documentTitleLine2')}
        </h2>
      </header>

      <div className="border-y border-brand-dark/10 bg-muted/35 px-4 py-3 text-center sm:px-5">
        <p className="text-sm font-bold text-brand-dark">{notice.schoolName}</p>
        <p className="mt-1 text-xs text-brand-dark/70">
          {t('profile.parentSummon.academicYearLabel')}: {notice.academicYear}
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-brand-dark/10">
        <DocCell
          label={t('profile.parentSummon.fields.studentName')}
          value={t('profile.studentName')}
        />
        <DocCell label={t('profile.parentSummon.fields.grade')} value={t('profile.studentGrade')} />
        <DocCell label={t('profile.parentSummon.fields.className')} value={notice.className} />
        <DocCell
          label={t('profile.parentSummon.fields.parentName')}
          value={notice.parentName}
        />
      </div>

      <section className="border-y-2 border-amber-400 bg-amber-50 px-4 py-4 text-center sm:px-5 sm:py-5">
        <p className="text-sm font-bold text-amber-900">
          {t('profile.parentSummon.reasonTitle')}
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-800">
          {notice.reason}
        </p>
      </section>

      <div className="px-4 py-2.5 text-center sm:px-5">
        <p className="text-xs font-medium text-brand-dark">
          {t('profile.parentSummon.issuedDate')}: {formatDocumentDate(notice.issuedAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 border-t border-brand-dark/10 sm:grid-cols-3">
        <SignatureCell
          title={t('profile.parentSummon.signatures.studentAffairsOfficer')}
          name={notice.studentAffairsOfficer}
        />
        <SignatureCell
          title={t('profile.parentSummon.signatures.stageVicePrincipal')}
          name={notice.stageVicePrincipal}
        />
        <SignatureCell
          title={t('profile.parentSummon.signatures.principal')}
          name={notice.principal}
        />
      </div>

      <footer className="border-t border-brand-dark/10 bg-muted/20 px-4 py-2.5 text-center sm:px-5">
        <p className="text-[11px] text-brand-dark/55 sm:text-xs">
          {notice.educationalAdministration}
        </p>
      </footer>
    </article>
  )
}

function ParentSummonCarousel() {
  const { t, i18n } = useTranslation()
  const [api, setApi] = useState<CarouselApi>()
  const [selected, setSelected] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const notices = parentSummonNotices
  const dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr'

  useEffect(() => {
    if (!api) return

    const sync = () => {
      setSelected(api.selectedScrollSnap())
      setScrollSnaps(api.scrollSnapList())
    }

    sync()
    api.on('select', sync)
    api.on('reInit', sync)

    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  if (notices.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-dark/15 bg-muted/20 px-6 py-16 text-center">
        <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Phone className="size-6" aria-hidden />
        </div>
        <p className="text-lg font-bold text-brand-dark">{t('profile.parentSummon.emptyTitle')}</p>
        <p className="mt-2 max-w-md text-sm text-brand-dark/55">
          {t('profile.parentSummon.emptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <Carousel
        key={dir}
        setApi={setApi}
        opts={{
          align: 'start',
          direction: dir,
          containScroll: 'trimSnaps',
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent>
          {notices.map((notice) => (
            <CarouselItem key={notice.id} className="basis-full">
              <SummonNoticeDetail notice={notice} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {scrollSnaps.length > 1 ? (
        <div
          className="flex items-center justify-center gap-2.5"
          role="tablist"
          aria-label={t('profile.parentSummon.carouselLabel')}
        >
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-label={t('profile.parentSummon.goToSlide', { index: index + 1 })}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-1.5 w-7 rounded-[1px] transition-colors',
                selected === index ? 'bg-brand-primary' : 'bg-brand-dark/10 hover:bg-brand-dark/20',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ParentSummonPage() {
  return (
    <div className="w-full">
      <PageTitle />
      <ParentSummonCarousel />
    </div>
  )
}
