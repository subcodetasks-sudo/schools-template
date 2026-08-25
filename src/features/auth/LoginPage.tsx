import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 400))
    toast.success(t('login.success'))
  })

  return (
    <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <img
          src="/logo.jpeg"
          alt=""
          className="mx-auto mb-4 size-16 rounded-full object-cover ring-2 ring-brand-muted"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          {t('login.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('login.body')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-brand-muted/50 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
            {t('login.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('email')}
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
            {t('login.password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('password')}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-brand-dark text-white hover:bg-brand-primary"
        >
          {t('nav.login')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/contact" className="font-medium text-brand-primary hover:underline">
          {t('nav.contact')}
        </Link>
      </p>
    </section>
  )
}
