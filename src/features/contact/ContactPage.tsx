import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  message: z.string().min(10),
})

type ContactForm = z.infer<typeof contactSchema>

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
    toast.success(t('contact.form.submit'))
    reset()
  })

  return (
    <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
        {t('contact.title')}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('contact.body')}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
            {t('contact.form.name')}
          </label>
          <input
            id="name"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('name')}
          />
          {errors.name ? (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
            {t('contact.form.email')}
          </label>
          <input
            id="email"
            type="email"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="message">
            {t('contact.form.message')}
          </label>
          <textarea
            id="message"
            rows={5}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('message')}
          />
          {errors.message ? (
            <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting} className="bg-brand-primary text-white hover:bg-brand-dark">
          {t('contact.form.submit')}
        </Button>
      </form>
    </section>
  )
}
