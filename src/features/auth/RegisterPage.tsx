import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthShell, authFieldClass } from '@/features/auth/AuthShell'
import { cn } from '@/lib/utils'

const stepOneSchema = z.object({
  nationalId: z.string().min(10),
  code: z.string().min(4),
})

const stepTwoSchema = z
  .object({
    phone: z
      .string()
      .min(9)
      .max(11)
      .regex(/^[1-9]\d*$/, 'leadingZero'),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  })

type StepOneForm = z.infer<typeof stepOneSchema>
type StepTwoForm = z.infer<typeof stepTwoSchema>

export function RegisterPage() {
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2>(1)
  const [stepOneData, setStepOneData] = useState<StepOneForm | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const stepOneForm = useForm<StepOneForm>({
    resolver: zodResolver(stepOneSchema),
  })

  const stepTwoForm = useForm<StepTwoForm>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: { phone: '', password: '', confirmPassword: '' },
  })

  const password = useWatch({ control: stepTwoForm.control, name: 'password' }) ?? ''

  const passwordChecks = useMemo(() => {
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasNoPersonalInfo = !/(name|email|admin)/i.test(password)
    const isStrong = hasMinLength && hasUppercase && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)

    return [
      { key: 'strong', met: isStrong, label: t('register.checks.strong') },
      { key: 'noPersonal', met: hasNoPersonalInfo && password.length > 0, label: t('register.checks.noPersonal') },
      { key: 'minLength', met: hasMinLength, label: t('register.checks.minLength') },
      { key: 'uppercase', met: hasUppercase, label: t('register.checks.uppercase') },
    ] as const
  }, [password, t])

  const phoneRegister = stepTwoForm.register('phone')

  const onStepOne = stepOneForm.handleSubmit((data) => {
    setStepOneData(data)
    setStep(2)
  })

  const onStepTwo = stepTwoForm.handleSubmit(async (data) => {
    await new Promise((r) => setTimeout(r, 400))
    toast.success(t('register.success'))
    void stepOneData
    void data
  })

  return (
    <AuthShell panelTitle={t('register.title')} panelBody={t('register.panelBody')}>
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl">
        {t('register.title')}
      </h1>

      <StepProgress step={step} />

      {step === 1 ? (
        <form onSubmit={onStepOne} className="mt-8 space-y-5">
          <Field
            id="nationalId"
            label={t('register.nationalId')}
            error={stepOneForm.formState.errors.nationalId?.message}
          >
            <input
              id="nationalId"
              inputMode="numeric"
              placeholder={t('register.nationalIdPlaceholder')}
              className={authFieldClass}
              {...stepOneForm.register('nationalId')}
            />
          </Field>

          <Field
            id="code"
            label={t('register.code')}
            error={stepOneForm.formState.errors.code?.message}
          >
            <input
              id="code"
              placeholder={t('register.codePlaceholder')}
              className={authFieldClass}
              {...stepOneForm.register('code')}
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-xl bg-brand-primary text-base font-semibold text-white hover:bg-brand-dark"
          >
            {t('register.next')}
          </Button>

          <p className="text-center text-sm text-brand-dark/55">
            {t('register.hasAccount')}{' '}
            <Link to="/login" className="font-semibold text-brand-primary hover:underline">
              {t('register.login')}
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={onStepTwo} className="mt-8 space-y-5">
          <Field
            id="phone"
            label={t('register.phone')}
            error={
              stepTwoForm.formState.errors.phone?.message
                ? t('register.phoneInvalid')
                : undefined
            }
          >
            <div
              dir="ltr"
              className={cn(
                'flex h-12 items-center overflow-hidden rounded-xl border bg-white shadow-sm',
                stepTwoForm.formState.errors.phone
                  ? 'border-destructive'
                  : 'border-brand-dark/15 focus-within:border-brand-primary',
              )}
            >
              <span className="shrink-0 px-3 text-sm font-medium text-brand-dark/70">
                +20
              </span>
              <span className="mx-1 h-6 w-px shrink-0 bg-brand-dark/15" aria-hidden />
              <input
                id="phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder={t('register.phonePlaceholder')}
                className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-brand-dark outline-none placeholder:text-brand-dark/35"
                {...phoneRegister}
                onChange={(event) => {
                  const cleaned = event.target.value.replace(/\D/g, '').replace(/^0+/, '')
                  event.target.value = cleaned
                  void phoneRegister.onChange(event)
                }}
              />
            </div>
          </Field>

          <Field
            id="password"
            label={t('register.password')}
            error={stepTwoForm.formState.errors.password?.message}
          >
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('register.passwordPlaceholder')}
                className={cn(authFieldClass, 'pe-11 shadow-sm')}
                {...stepTwoForm.register('password')}
              />
              <TogglePassword
                show={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
                showLabel={t('login.showPassword')}
                hideLabel={t('login.hidePassword')}
              />
            </div>
          </Field>

          <Field
            id="confirmPassword"
            label={t('register.confirmPassword')}
            error={
              stepTwoForm.formState.errors.confirmPassword
                ? t('register.passwordMismatch')
                : undefined
            }
          >
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('register.confirmPasswordPlaceholder')}
                className={cn(authFieldClass, 'pe-11 shadow-sm')}
                {...stepTwoForm.register('confirmPassword')}
              />
              <TogglePassword
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
                showLabel={t('login.showPassword')}
                hideLabel={t('login.hidePassword')}
              />
            </div>
          </Field>

          <ul className="space-y-2.5">
            {passwordChecks.map((check) => (
              <li key={check.key} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full',
                    check.met ? 'bg-brand-primary text-white' : 'bg-brand-dark/8 text-brand-dark/30',
                  )}
                >
                  <Check className="size-3.5" aria-hidden />
                </span>
                <span className={cn(check.met ? 'text-brand-dark/80' : 'text-brand-dark/45')}>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>

          <Button
            type="submit"
            size="lg"
            disabled={stepTwoForm.formState.isSubmitting}
            className="h-12 w-full rounded-xl bg-brand-primary text-base font-semibold text-white hover:bg-brand-dark"
          >
            {t('register.submit')}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

function StepProgress({ step }: { step: 1 | 2 }) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-1/2">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-brand-dark/70">
        <span className={cn(step >= 1 && 'text-brand-primary')}>{t('register.step1')}</span>
        <span className={cn(step === 2 && 'text-brand-primary')}>{t('register.step2')}</span>
      </div>
      <div className="relative h-1 rounded-full bg-brand-dark/10">
        <div
          className={cn(
            'absolute inset-y-0 inset-s-0 rounded-full bg-brand-primary transition-all duration-300',
            step === 1 ? 'w-1/2' : 'w-full',
          )}
        />
        <span className="absolute start-0 top-1/2 z-10 size-3 -translate-y-1/2 rounded-full bg-brand-primary ring-2 ring-white" />
        <span
          className={cn(
            'absolute end-0 top-1/2 z-10 size-3 -translate-y-1/2 rounded-full ring-2 ring-white transition-colors',
            step === 2 ? 'bg-brand-primary' : 'bg-brand-dark/20',
          )}
        />
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
  labelClassName,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
  labelClassName?: string
}) {
  return (
    <div>
      <label
        className={cn('mb-1.5 block text-sm font-medium text-brand-dark', labelClassName)}
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function TogglePassword({
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  show: boolean
  onToggle: () => void
  showLabel: string
  hideLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-e-3 top-1/2 inline-flex -translate-y-1/2 text-brand-dark/45 transition-colors hover:text-brand-primary"
      aria-label={show ? hideLabel : showLabel}
    >
      {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  )
}
