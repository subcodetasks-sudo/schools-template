import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AuthShell, authFieldClass } from '@/features/auth/AuthShell'
import { StudentPasswordInput } from '@/features/auth/StudentPasswordInput'
import {
  sanitizeStudentPassword,
  validateStudentPassword,
} from '@/features/auth/studentPassword'
import {
  registerStep1,
  registerStep2,
  toE164EgyptPhone,
} from '@/features/auth/authApi'
import type { AuthRedirectState } from '@/features/auth/redirect'
import { ApiError, getErrorMessage, getFieldErrors } from '@/lib/api'
import { cn } from '@/lib/utils'

/** The step-1 registration token was rejected (expired, already used, or invalid). */
function isRegistrationTokenError(error: unknown) {
  if (getFieldErrors(error)?.token?.length) return true
  return error instanceof ApiError && [401, 410, 419].includes(error.status)
}

function firstFieldError(error: unknown, field: string) {
  return getFieldErrors(error)?.[field]?.[0]
}

type StudentIdentityType = 'egyptian' | 'foreigner'

const stepOneSchema = z
  .object({
    identityType: z.enum(['egyptian', 'foreigner']),
    nationalId: z.string().optional(),
    passportNumber: z.string().optional(),
    code: z.string().min(4),
  })
  .superRefine((data, ctx) => {
    if (data.identityType === 'egyptian') {
      const nationalId = data.nationalId?.trim() ?? ''
      if (nationalId.length < 10) {
        ctx.addIssue({
          code: 'custom',
          path: ['nationalId'],
          message: 'required',
        })
      }
      return
    }

    const passportNumber = data.passportNumber?.trim() ?? ''
    if (passportNumber.length < 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['passportNumber'],
        message: 'required',
      })
    }
  })

const stepTwoSchema = z
  .object({
    phone: z
      .string()
      .min(9)
      .max(11)
      .regex(/^[1-9]\d*$/, 'leadingZero'),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    // Messages are i18n keys under `register.passwordErrors`.
    const issue = validateStudentPassword(data.password)
    if (issue) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: issue })
    }

    if (data.confirmPassword.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'required' })
    } else if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'mismatch' })
    }
  })

type StepOneForm = z.infer<typeof stepOneSchema>
type StepTwoForm = z.infer<typeof stepTwoSchema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<1 | 2>(1)
  const [registrationToken, setRegistrationToken] = useState<string | null>(null)
  const [studentCode, setStudentCode] = useState<string | null>(null)

  const stepOneForm = useForm<StepOneForm>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      identityType: 'egyptian',
      nationalId: '',
      passportNumber: '',
      code: '',
    },
  })

  const stepTwoForm = useForm<StepTwoForm>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: { phone: '', password: '', confirmPassword: '' },
  })

  const identityType =
    useWatch({ control: stepOneForm.control, name: 'identityType' }) ?? 'egyptian'

  /** Server errors are shown as sent; client errors are translated from their key. */
  const passwordErrorText = (error?: { type?: string; message?: string }) => {
    if (!error) return undefined
    if (error.type === 'server') return error.message
    return t(`register.passwordErrors.${error.message}`, {
      defaultValue: t('register.passwordErrors.digitsOnly'),
    })
  }

  const phoneRegister = stepTwoForm.register('phone')

  const setIdentityType = (type: StudentIdentityType) => {
    stepOneForm.setValue('identityType', type, { shouldValidate: true })
    stepOneForm.clearErrors(['nationalId', 'passportNumber'])
  }

  /** Drops the step-1 token and returns to step 1, keeping what the user typed there. */
  const restartFromStepOne = () => {
    setRegistrationToken(null)
    setStudentCode(null)
    stepTwoForm.resetField('password')
    stepTwoForm.resetField('confirmPassword')
    setStep(1)
  }

  const onStepOne = stepOneForm.handleSubmit(async (data) => {
    try {
      const code = data.code.trim()
      const result =
        data.identityType === 'egyptian'
          ? await registerStep1({
              national_id: data.nationalId!.trim(),
              code,
            })
          : await registerStep1({
              passport_number: data.passportNumber!.trim(),
              code,
            })
      setRegistrationToken(result.token)
      setStudentCode(result.student.code ?? code)
      setStep(2)
    } catch (error) {
      toast.error(getErrorMessage(error, t('register.step1Error')))
    }
  })

  const onStepTwo = stepTwoForm.handleSubmit(async (data) => {
    if (!registrationToken) {
      toast.error(t('register.sessionExpired'))
      restartFromStepOne()
      return
    }

    try {
      // Always a string, never a number: leading zeros must survive.
      await registerStep2({
        token: registrationToken,
        phone: toE164EgyptPhone(data.phone),
        password: sanitizeStudentPassword(data.password),
        confirm_password: sanitizeStudentPassword(data.confirmPassword),
      })

      toast.success(t('register.success'))
      // Replace so "back" can't return to a finished registration.
      const state: AuthRedirectState = {
        from: (location.state as AuthRedirectState | null)?.from,
        code: studentCode ?? undefined,
      }
      navigate('/login', { replace: true, state })
    } catch (error) {
      if (isRegistrationTokenError(error)) {
        toast.error(getErrorMessage(error, t('register.sessionExpired')))
        restartFromStepOne()
        return
      }

      for (const field of ['phone', 'password'] as const) {
        const message = firstFieldError(error, field)
        if (message) stepTwoForm.setError(field, { type: 'server', message })
      }
      const confirmMessage =
        firstFieldError(error, 'confirm_password') ??
        firstFieldError(error, 'password_confirmation')
      if (confirmMessage) {
        stepTwoForm.setError('confirmPassword', { type: 'server', message: confirmMessage })
      }

      toast.error(getErrorMessage(error, t('register.error')))
    }
  })

  return (
    <AuthShell panelTitle={t('register.title')} panelBody={t('register.panelBody')}>
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-brand-primary sm:text-4xl">
        {t('register.title')}
      </h1>

      <StepProgress step={step} />

      {step === 1 ? (
        <form onSubmit={onStepOne} className="mt-8 space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium text-brand-dark">
              {t('register.identityType')}
            </p>
            <div
              role="radiogroup"
              aria-label={t('register.identityType')}
              className="grid grid-cols-2 gap-2 rounded-xl border border-brand-dark/10 bg-muted/30 p-1"
            >
              {(
                [
                  { value: 'egyptian', label: t('register.egyptian') },
                  { value: 'foreigner', label: t('register.foreigner') },
                ] as const
              ).map((option) => {
                const selected = identityType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setIdentityType(option.value)}
                    className={cn(
                      'h-10 rounded-lg text-sm font-semibold transition-colors',
                      selected
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-brand-dark/60 hover:text-brand-dark',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {identityType === 'egyptian' ? (
            <Field
              id="nationalId"
              label={t('register.nationalId')}
              error={
                stepOneForm.formState.errors.nationalId
                  ? t('register.nationalIdRequired')
                  : undefined
              }
            >
              <input
                id="nationalId"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('register.nationalIdPlaceholder')}
                className={authFieldClass}
                {...stepOneForm.register('nationalId')}
              />
            </Field>
          ) : (
            <Field
              id="passportNumber"
              label={t('register.passportNumber')}
              error={
                stepOneForm.formState.errors.passportNumber
                  ? t('register.passportNumberRequired')
                  : undefined
              }
            >
              <input
                id="passportNumber"
                autoComplete="off"
                placeholder={t('register.passportNumberPlaceholder')}
                className={authFieldClass}
                {...stepOneForm.register('passportNumber')}
              />
            </Field>
          )}

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
            disabled={stepOneForm.formState.isSubmitting}
            className="h-12 w-full rounded-xl bg-brand-primary text-base font-semibold text-white hover:bg-brand-dark"
          >
            {t('register.next')}
          </Button>

          <p className="text-center text-sm text-brand-dark/55">
            {t('register.hasAccount')}{' '}
            <Link
              to="/login"
              state={{ from: (location.state as AuthRedirectState | null)?.from }}
              className="font-semibold text-brand-primary hover:underline"
            >
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
              stepTwoForm.formState.errors.phone?.type === 'server'
                ? stepTwoForm.formState.errors.phone.message
                : stepTwoForm.formState.errors.phone
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
            hint={t('register.passwordHint')}
            error={passwordErrorText(stepTwoForm.formState.errors.password)}
          >
            <StudentPasswordInput
              id="password"
              registration={stepTwoForm.register('password', {
                // Once the user has tried to submit, keep the confirmation error in sync.
                deps: stepTwoForm.formState.isSubmitted ? ['confirmPassword'] : [],
              })}
              placeholder={t('register.passwordPlaceholder')}
              showLabel={t('login.showPassword')}
              hideLabel={t('login.hidePassword')}
              invalid={!!stepTwoForm.formState.errors.password}
              describedBy="password-hint"
            />
          </Field>

          <Field
            id="confirmPassword"
            label={t('register.confirmPassword')}
            hint={t('register.passwordHint')}
            error={passwordErrorText(stepTwoForm.formState.errors.confirmPassword)}
          >
            <StudentPasswordInput
              id="confirmPassword"
              registration={stepTwoForm.register('confirmPassword')}
              placeholder={t('register.confirmPasswordPlaceholder')}
              showLabel={t('login.showPassword')}
              hideLabel={t('login.hidePassword')}
              invalid={!!stepTwoForm.formState.errors.confirmPassword}
              describedBy="confirmPassword-hint"
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={stepTwoForm.formState.isSubmitting}
            className="h-12 w-full rounded-xl bg-brand-primary text-base font-semibold text-white hover:bg-brand-dark"
          >
            {t('register.submit')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={stepTwoForm.formState.isSubmitting}
            onClick={restartFromStepOne}
            className="h-12 w-full rounded-xl text-base font-semibold text-brand-dark/70 hover:text-brand-primary"
          >
            {t('register.back')}
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
  hint,
  children,
  labelClassName,
}: {
  id: string
  label: string
  error?: string
  hint?: string
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
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-brand-dark/55">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
