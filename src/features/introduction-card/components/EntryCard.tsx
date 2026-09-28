import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, Pencil, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import {
  firstValidationMessage,
  formatIntroductionCardDateTime,
  isIntroductionCardType,
  isValidationError,
  mapIntroductionCardFieldErrors,
  updateIntroductionCardEntry,
  type IntroductionCard,
  type IntroductionCardEntry,
  type IntroductionCardEntryPatch,
} from '@/features/introduction-card/introductionCardApi'
import { createEntrySchema, type EntryFormValues } from '@/features/introduction-card/components/entrySchema'
import { EntryFields } from '@/features/introduction-card/components/EntryFields'
import { EntryTypeBadge } from '@/features/introduction-card/components/IntroductionCardShared'

type EntryCardProps = {
  entry: IntroductionCardEntry
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSaved: (card: IntroductionCard) => void
}

export function EntryCard({ entry, isEditing, onEdit, onCancel, onSaved }: EntryCardProps) {
  const { t, i18n } = useTranslation()
  const wasUpdated = Boolean(entry.updatedAt && entry.updatedAt !== entry.createdAt)

  return (
    <article className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EntryTypeBadge entry={entry} />
        {!isEditing && entry.id ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 gap-1.5 rounded-lg border-brand-dark/15 text-brand-dark hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Pencil className="size-3.5" aria-hidden />
            {t('profile.introductionCard.list.edit')}
          </Button>
        ) : null}
      </div>

      {isEditing ? (
        <EditEntryForm entry={entry} onCancel={onCancel} onSaved={onSaved} />
      ) : (
        <>
          <p
            className="mt-3 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-brand-dark"
            dir="auto"
          >
            {entry.description || '—'}
          </p>
          {entry.notes ? (
            <div className="mt-3 rounded-xl bg-muted/40 px-3.5 py-3">
              <p className="text-xs font-medium text-brand-dark/50">
                {t('profile.introductionCard.form.notes')}
              </p>
              <p
                className="mt-1 text-sm leading-relaxed whitespace-pre-line wrap-break-word text-brand-dark/80"
                dir="auto"
              >
                {entry.notes}
              </p>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-3 text-xs text-brand-dark/50">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          {t('profile.introductionCard.list.createdAt')}{' '}
          <time dateTime={entry.createdAt ?? undefined}>
            {formatIntroductionCardDateTime(entry.createdAt, i18n.language)}
          </time>
        </span>
        {wasUpdated ? (
          <span className="inline-flex items-center gap-1.5">
            <PencilLine className="size-3.5 shrink-0" aria-hidden />
            {t('profile.introductionCard.list.updatedAt')}{' '}
            <time dateTime={entry.updatedAt ?? undefined}>
              {formatIntroductionCardDateTime(entry.updatedAt, i18n.language)}
            </time>
          </span>
        ) : null}
      </div>
    </article>
  )
}

function EditEntryForm({
  entry,
  onCancel,
  onSaved,
}: {
  entry: IntroductionCardEntry
  onCancel: () => void
  onSaved: (card: IntroductionCard) => void
}) {
  const { t } = useTranslation()
  const hasUnknownType = entry.type === null
  const schema = useMemo(
    () => createEntrySchema(t, { allowEmptyType: hasUnknownType }),
    [t, hasUnknownType],
  )
  const idPrefix = useId()

  const {
    control,
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: entry.type ?? '',
      description: entry.description,
      notes: entry.notes ?? '',
    },
    shouldFocusError: true,
  })

  const onSubmit = handleSubmit(async (values) => {
    // Compare against the latest server copy so only real changes are sent.
    const patch: IntroductionCardEntryPatch = {}
    if (isIntroductionCardType(values.type) && values.type !== entry.type) patch.type = values.type
    if (values.description !== entry.description) patch.description = values.description
    const notes = values.notes || null
    if (notes !== entry.notes) patch.notes = notes

    if (Object.keys(patch).length === 0) {
      onCancel()
      return
    }

    try {
      const card = await updateIntroductionCardEntry(entry.id, patch)
      onSaved(card)
      toast.success(t('profile.introductionCard.toasts.updateSuccess'))
    } catch (err) {
      if (isValidationError(err)) {
        const fieldErrors = mapIntroductionCardFieldErrors(err.errors)
        fieldErrors.forEach(({ field, message }) => {
          setError(field, { type: 'server', message })
        })
        if (fieldErrors[0]) setFocus(fieldErrors[0].field)
        toast.error(
          firstValidationMessage(err.errors) ??
            getErrorMessage(err, t('profile.introductionCard.toasts.updateError')),
        )
      } else {
        toast.error(getErrorMessage(err, t('profile.introductionCard.toasts.updateError')))
      }
    }
  })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSubmitting}
      aria-label={t('profile.introductionCard.form.editTitle')}
      className="mt-4 flex flex-col gap-4"
    >
      <EntryFields
        control={control}
        register={register}
        idPrefix={idPrefix}
        names={{ type: 'type', description: 'description', notes: 'notes' }}
        errors={{
          type: errors.type?.message,
          description: errors.description?.message,
          notes: errors.notes?.message,
        }}
        fallbackTypeLabel={hasUnknownType ? entry.typeLabel : null}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-11 rounded-xl border-brand-dark/15 sm:px-6"
        >
          {t('profile.introductionCard.form.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-brand-primary text-white hover:bg-brand-dark sm:px-6"
        >
          {isSubmitting
            ? t('profile.introductionCard.form.saving')
            : t('profile.introductionCard.form.save')}
        </Button>
      </div>
    </form>
  )
}
