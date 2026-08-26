import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { PageBanner } from '@/components/PageBanner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  message: z.string().min(10),
})

type ContactForm = z.infer<typeof contactSchema>

const fieldClass =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 text-sm text-brand-dark shadow-sm outline-none transition-colors placeholder:text-brand-dark/35 focus:border-brand-primary'

export function ContactPage() {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 400))
    toast.success(t('contact.form.success'))
    reset()
  })

  const infoItems = [
    { icon: MapPin, label: t('footer.address') },
    { icon: Phone, label: t('footer.phone'), href: 'tel:+201001234567', dir: 'ltr' as const },
    { icon: Mail, label: t('footer.email'), href: `mailto:${t('footer.email')}`, dir: 'ltr' as const },
    { icon: Clock3, label: t('contact.hours') },
  ]

  return (
    <section className="bg-background pb-16">
      <PageBanner
        title={t('contact.title')}
        breadcrumbs={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.contact') },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <aside className="lg:col-span-5">
            <p className="max-w-md text-base leading-relaxed text-brand-dark/60">
              {t('contact.body')}
            </p>

            <h2 className="mt-8 border-s-4 border-brand-primary ps-3 text-lg font-bold text-brand-dark">
              {t('contact.infoTitle')}
            </h2>

            <ul className="mt-5 space-y-3">
              {infoItems.map((item) => (
                <li key={item.label}>
                  <div className="flex items-start gap-3 rounded-2xl border border-brand-dark/8 bg-white px-4 py-3.5 shadow-sm">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                      <item.icon className="size-4" aria-hidden />
                    </span>
                    {item.href ? (
                      <a
                        href={item.href}
                        dir={item.dir}
                        className="mt-2 text-sm font-medium text-brand-dark/75 hover:text-brand-primary"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="mt-2 text-sm font-medium text-brand-dark/75">
                        {item.label}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <div className="lg:col-span-7">
            <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_50px_rgba(31,83,111,0.1)] sm:p-8">
              <h2 className="text-xl font-bold text-brand-dark">{t('contact.formTitle')}</h2>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="name"
                    label={t('contact.form.name')}
                    error={errors.name?.message}
                  >
                    <input
                      id="name"
                      className={cn(fieldClass, 'h-12')}
                      {...register('name')}
                    />
                  </Field>
                  <Field
                    id="email"
                    label={t('contact.form.email')}
                    error={errors.email?.message}
                  >
                    <input
                      id="email"
                      type="email"
                      dir="ltr"
                      className={cn(fieldClass, 'h-12')}
                      {...register('email')}
                    />
                  </Field>
                </div>
                <Field
                  id="message"
                  label={t('contact.form.message')}
                  error={errors.message?.message}
                >
                  <textarea
                    id="message"
                    rows={6}
                    className={cn(fieldClass, 'resize-y py-3')}
                    {...register('message')}
                  />
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-brand-primary px-8 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
                >
                  {t('contact.form.submit')}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-brand-muted/50 bg-white shadow-sm">
          <iframe
            title={t('footer.mapTitle')}
            src="https://maps.google.com/maps?q=Mansoura%2C%20Egypt&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="h-64 w-full border-0 grayscale-20 sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-dark" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
