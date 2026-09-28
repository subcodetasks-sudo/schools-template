import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { CircleAlert, Eraser, RotateCw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { authFieldClass } from '@/features/auth/AuthShell'
import { getErrorMessage } from '@/lib/api'
import {
  COMPLAINT_BODY_MAX,
  COMPLAINT_TITLE_MAX,
  createComplaintTicket,
  firstValidationMessage,
  getComplaintTypes,
  isValidationError,
  mapComplaintTicketFieldErrors,
  type ComplaintTicket,
  type ComplaintTicketField,
  type ComplaintTicketInput,
  type ComplaintType,
} from '@/features/complaint-tickets/complaintTicketsApi'
import { CharCounter } from '@/features/complaint-tickets/components/ComplaintTicketsShared'
import { FieldError, FieldLabel } from '@/features/introduction-card/components/IntroductionCardShared'
import { invalidFieldClass, textareaFieldClass } from '@/features/introduction-card/components/fieldStyles'
import { cn } from '@/lib/utils'

/** Field names mirror the API payload so 422 errors map 1:1 onto the form. */
type ComplaintTicketFormValues = ComplaintTicketInput

const blankValues: ComplaintTicketFormValues = { complaint_type_id: '', title: '', body: '' }

// Unicode isolates keep `CT-000042` LTR inside Arabic sentences.
const ltr = (value: string) => `⁦${value}⁩`

function createSchema(t: TFunction, typeIds: ReadonlySet<string>, format: (n: number) => string) {
  const key = (name: string) => `profile.complaintTickets.validation.${name}`
  return z.object({
    complaint_type_id: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: t(key('typeRequired')) })
      } else if (!typeIds.has(value)) {
        ctx.addIssue({ code: 'custom', message: t(key('typeUnavailable')) })
      }
    }),
    title: z
      .string()
      .trim()
      .min(1, t(key('titleRequired')))
      .max(COMPLAINT_TITLE_MAX, t(key('titleTooLong'), { max: format(COMPLAINT_TITLE_MAX) })),
    body: z
      .string()
      .trim()
      .min(1, t(key('bodyRequired')))
      .max(COMPLAINT_BODY_MAX, t(key('bodyTooLong'), { max: format(COMPLAINT_BODY_MAX) })),
  })
}

type TypesResult = { types: ComplaintType[] | null; error: string | null }

export function NewComplaintTicketForm({ onCreated }: { onCreated: (ticket: ComplaintTicket) => void }) {
  const { t, i18n } = useTranslation()
  const idPrefix = useId()
  const ids: Record<ComplaintTicketField, string> = {
    complaint_type_id: `${idPrefix}-type`,
    title: `${idPrefix}-title`,
    body: `${idPrefix}-body`,
  }

  // `null` until the first successful load; a failed background refetch keeps the previous list.
  const [types, setTypes] = useState<ComplaintType[] | null>(null)
  const [typesError, setTypesError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const typesLoading = types === null && !typesError
  // Only the latest types request may apply its result (initial load, retry, language change, 422 refresh).
  const typesRequestRef = useRef(0)
  const hasTypesRef = useRef(false)
  const mountedRef = useRef(true)
  // Inputs are disabled while submitting, so server-error focus waits until they are enabled again.
  const pendingFocusRef = useRef<ComplaintTicketField | null>(null)

  const locale = i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US'
  const typeIds = useMemo(() => new Set((types ?? []).map((type) => type.id)), [types])
  const schema = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale)
    return createSchema(t, typeIds, (n) => formatter.format(n))
  }, [t, typeIds, locale])

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ComplaintTicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: blankValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** Pure fetch: resolves to the next state instead of setting it, so callers own all updates. */
  const fetchTypes = useCallback(async (): Promise<TypesResult> => {
    try {
      return { types: await getComplaintTypes(), error: null }
    } catch (err) {
      return {
        types: null,
        error: getErrorMessage(err, t('profile.complaintTickets.form.typesLoadError')),
      }
    }
  }, [t])

  const applyTypes = useCallback(
    (result: TypesResult) => {
      if (result.types) {
        const list = result.types
        hasTypesRef.current = true
        setTypes(list)
        setTypesError(null)
        // Keep the current selection across language changes unless the type disappeared.
        const selected = getValues('complaint_type_id')
        if (selected && !list.some((type) => type.id === selected)) {
          setValue('complaint_type_id', '')
        }
      } else if (!hasTypesRef.current) {
        // A failed background refetch keeps the loaded list on screen; only the first load shows the error.
        setTypesError(result.error)
      }
    },
    [getValues, setValue],
  )

  // Type names are localized by the server, so the list is refetched when the language changes.
  useEffect(() => {
    let ignore = false
    const request = ++typesRequestRef.current
    void fetchTypes().then((result) => {
      if (ignore || request !== typesRequestRef.current) return
      applyTypes(result)
    })
    return () => {
      ignore = true
    }
  }, [fetchTypes, applyTypes, reloadKey, i18n.language])

  useEffect(() => {
    if (isSubmitting || !pendingFocusRef.current) return
    setFocus(pendingFocusRef.current)
    pendingFocusRef.current = null
  }, [isSubmitting, setFocus])

  const reloadTypes = () => {
    setTypesError(null)
    setReloadKey((key) => key + 1)
  }

  /** The chosen type was deactivated meanwhile: refetch the list, clear the choice, keep the server error. */
  const refreshTypesAfterConflict = async (staleId: string, message: string) => {
    setValue('complaint_type_id', '', { shouldDirty: true })
    setError('complaint_type_id', { type: 'server', message })
    const request = ++typesRequestRef.current
    const result = await fetchTypes()
    if (!mountedRef.current || request !== typesRequestRef.current) return
    if (result.types) {
      applyTypes(result)
    } else {
      // Could not refresh: at least drop the stale type from the local list.
      setTypes((current) => current?.filter((type) => type.id !== staleId) ?? current)
    }
    toast.info(t('profile.complaintTickets.toasts.typesRefreshed'))
  }

  const submitTicket = async (values: ComplaintTicketFormValues) => {
    try {
      const { ticket, message } = await createComplaintTicket(values)
      toast.success(message ?? t('profile.complaintTickets.toasts.createSuccess'), {
        description: ticket.number
          ? t('profile.complaintTickets.toasts.createSuccessNumber', { number: ltr(ticket.number) })
          : undefined,
      })
      reset(blankValues)
      onCreated(ticket)
    } catch (err) {
      const fallback = t('profile.complaintTickets.toasts.createError')
      if (!isValidationError(err)) {
        // Network / 5xx / 429: keep everything the parent typed so they can retry.
        toast.error(getErrorMessage(err, fallback))
        return
      }

      const fieldErrors = mapComplaintTicketFieldErrors(err.errors)
      fieldErrors.forEach(({ field, message }) => {
        if (field !== 'complaint_type_id') setError(field, { type: 'server', message })
      })
      if (fieldErrors[0]) pendingFocusRef.current = fieldErrors[0].field
      toast.error(firstValidationMessage(err.errors) ?? getErrorMessage(err, fallback))

      const typeError = fieldErrors.find(({ field }) => field === 'complaint_type_id')
      if (typeError) await refreshTypesAfterConflict(values.complaint_type_id, typeError.message)
    }
  }

  // Wrapped in an event handler so the submit closure (which touches refs) is never created during render.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => handleSubmit(submitTicket)(event)

  const describedBy = (field: ComplaintTicketField, withCounter = false) =>
    [errors[field] ? `${ids[field]}-error` : null, withCounter ? `${ids[field]}-count` : null]
      .filter(Boolean)
      .join(' ') || undefined

  const typesUnavailable = typesLoading || Boolean(typesError) || types?.length === 0
  const typeHint = typesLoading
    ? null
    : typesError
      ? typesError
      : types?.length === 0
        ? t('profile.complaintTickets.form.typesEmpty')
        : null

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-dark/10 bg-muted/20 p-4 sm:p-5">
        <div className="sm:max-w-sm">
          <FieldLabel htmlFor={ids.complaint_type_id} required>
            {t('profile.complaintTickets.form.type')}
          </FieldLabel>
          <Controller
            control={control}
            name="complaint_type_id"
            render={({ field }) => {
              const selected = types?.find((type) => type.id === field.value) ?? null
              const label = typesLoading
                ? t('profile.complaintTickets.form.typesLoading')
                : (selected?.name ?? t('profile.complaintTickets.form.typePlaceholder'))
              const invalid = Boolean(errors.complaint_type_id)
              return (
                <Select
                  value={selected?.id ?? null}
                  onValueChange={(next) => field.onChange(typeof next === 'string' ? next : '')}
                  disabled={isSubmitting || typesUnavailable}
                >
                  <SelectTrigger
                    id={ids.complaint_type_id}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required
                    aria-invalid={invalid || undefined}
                    aria-describedby={
                      [describedBy('complaint_type_id'), typeHint ? `${ids.complaint_type_id}-hint` : null]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    className={cn(
                      authFieldClass,
                      'w-full shadow-none data-[size=default]:h-12',
                      !selected && 'text-brand-dark/45',
                      invalid && invalidFieldClass,
                    )}
                  >
                    <span className="flex-1 truncate text-start" dir="auto">
                      {label}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-brand-dark/10 shadow-lg">
                    {(types ?? []).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <span dir="auto">{type.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
          <FieldError id={`${ids.complaint_type_id}-error`} message={errors.complaint_type_id?.message} />
          {typeHint ? (
            <div
              id={`${ids.complaint_type_id}-hint`}
              role={typesError ? 'alert' : 'status'}
              className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-dark/60"
            >
              <CircleAlert
                className={cn('size-4 shrink-0', typesError ? 'text-destructive' : 'text-amber-600')}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{typeHint}</span>
              {typesError ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reloadTypes}
                  disabled={isSubmitting}
                  className="h-8 gap-1.5 rounded-lg border-brand-dark/15"
                >
                  <RotateCw className="size-3.5" aria-hidden />
                  {t('profile.complaintTickets.form.reloadTypes')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor={ids.title} required>
            {t('profile.complaintTickets.form.title')}
          </FieldLabel>
          <input
            id={ids.title}
            type="text"
            dir="auto"
            autoComplete="off"
            maxLength={COMPLAINT_TITLE_MAX}
            placeholder={t('profile.complaintTickets.form.titlePlaceholder')}
            disabled={isSubmitting}
            aria-required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy('title', true)}
            className={cn(authFieldClass, errors.title && invalidFieldClass)}
            {...register('title')}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id={`${ids.title}-error`} message={errors.title?.message} />
            <div className="ms-auto">
              <CharCounter control={control} name="title" id={`${ids.title}-count`} max={COMPLAINT_TITLE_MAX} />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor={ids.body} required>
            {t('profile.complaintTickets.form.body')}
          </FieldLabel>
          <textarea
            id={ids.body}
            rows={6}
            dir="auto"
            maxLength={COMPLAINT_BODY_MAX}
            placeholder={t('profile.complaintTickets.form.bodyPlaceholder')}
            disabled={isSubmitting}
            aria-required
            aria-invalid={Boolean(errors.body)}
            aria-describedby={describedBy('body', true)}
            className={cn(textareaFieldClass, errors.body && invalidFieldClass)}
            {...register('body')}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldError id={`${ids.body}-error`} message={errors.body?.message} />
            <div className="ms-auto">
              <CharCounter control={control} name="body" id={`${ids.body}-count`} max={COMPLAINT_BODY_MAX} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset(blankValues)}
          disabled={isSubmitting || !isDirty}
          className="h-11 w-full gap-2 rounded-xl border-brand-dark/15 sm:w-auto sm:px-5"
        >
          <Eraser className="size-4" aria-hidden />
          {t('profile.complaintTickets.form.reset')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || typesUnavailable}
          className="h-11 w-full gap-2 rounded-xl bg-brand-primary text-white hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {isSubmitting
            ? t('profile.complaintTickets.form.submitting')
            : t('profile.complaintTickets.form.submit')}
        </Button>
      </div>
    </form>
  )
}
