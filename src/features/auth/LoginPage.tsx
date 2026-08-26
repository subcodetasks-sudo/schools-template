import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthShell, authFieldClass } from '@/features/auth/AuthShell'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  nationalId: z.string().min(10),
  password: z.string().min(6),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

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
    navigate('/profile')
  })

  return (
    <AuthShell panelTitle={t('login.title')} panelBody={t('login.panelBody')}>
      <h1 className="text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl text-center">
        {t('login.title')}
      </h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-dark" htmlFor="nationalId">
            {t('login.nationalId')}
          </label>
          <input
            id="nationalId"
            inputMode="numeric"
            autoComplete="username"
            placeholder={t('login.nationalIdPlaceholder')}
            className={authFieldClass}
            {...register('nationalId')}
          />
          {errors.nationalId ? (
            <p className="mt-1 text-xs text-destructive">{errors.nationalId.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-dark" htmlFor="password">
            {t('login.password')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder')}
              className={cn(authFieldClass, 'pe-11')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-e-3 top-1/2 inline-flex -translate-y-1/2 text-brand-dark/45 transition-colors hover:text-brand-primary"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-brand-primary text-base font-semibold text-white hover:bg-brand-dark"
        >
          {t('login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-brand-dark/55">
        {t('login.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-brand-primary hover:underline">
          {t('login.register')}
        </Link>
      </p>
    </AuthShell>
  )
}
