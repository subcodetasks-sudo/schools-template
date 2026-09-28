import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import {
  INTRODUCTION_CARD_MAX_ROWS,
  addIntroductionCardEntries,
  firstValidationMessage,
  isIntroductionCardType,
  isValidationError,
  mapIntroductionCardFieldErrors,
  type IntroductionCard,
  type IntroductionCardEntryInput,
} from '@/features/introduction-card/introductionCardApi'
import {
  blankEntry,
  createAddEntriesSchema,
  type AddEntriesFormValues,
} from '@/features/introduction-card/components/entrySchema'
import { EntryFields } from '@/features/introduction-card/components/EntryFields'

export function AddEntriesForm({ onSaved }: { onSaved: (card: IntroductionCard) => void }) {
  const { t } = useTranslation()
  const schema = useMemo(() => createAddEntriesSchema(t), [t])

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<AddEntriesFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entries: [{ ...blankEntry }] },
    shouldFocusError: true,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' })
  const canAddRow = fields.length < INTRODUCTION_CARD_MAX_ROWS

  const onSubmit = handleSubmit(async ({ entries }) => {
    const payload = entries.flatMap((entry): IntroductionCardEntryInput[] =>
      isIntroductionCardType(entry.type)
        ? [{ type: entry.type, description: entry.description, notes: entry.notes || null }]
        : [],
    )

    try {
      const card = await addIntroductionCardEntries(payload)
      onSaved(card)
      reset({ entries: [{ ...blankEntry }] })
      toast.success(t('profile.introductionCard.toasts.addSuccess'))
    } catch (err) {
      if (isValidationError(err)) {
        const fieldErrors = mapIntroductionCardFieldErrors(err.errors).filter(
          ({ index }) => (index ?? 0) < entries.length,
        )
        fieldErrors.forEach(({ index, field, message }) => {
          setError(`entries.${index ?? 0}.${field}`, { type: 'server', message })
        })
        if (fieldErrors[0]) {
          setFocus(`entries.${fieldErrors[0].index ?? 0}.${fieldErrors[0].field}`)
        }
        toast.error(
          firstValidationMessage(err.errors) ??
            getErrorMessage(err, t('profile.introductionCard.toasts.addError')),
        )
      } else {
        toast.error(getErrorMessage(err, t('profile.introductionCard.toasts.addError')))
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting} className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const rowErrors = errors.entries?.[index]
          return (
            <li
              key={field.id}
              className="rounded-2xl border border-brand-dark/10 bg-muted/20 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-brand-dark">
                  {t('profile.introductionCard.form.rowTitle', { number: index + 1 })}
                </p>
                {index > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                    aria-label={t('profile.introductionCard.form.removeRowLabel', { number: index + 1 })}
                    className="h-8 gap-1.5 rounded-lg text-brand-dark/60 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" aria-hidden />
                    {t('profile.introductionCard.form.removeRow')}
                  </Button>
                ) : null}
              </div>
              <EntryFields
                control={control}
                register={register}
                idPrefix={`introduction-card-new-${field.id}`}
                names={{
                  type: `entries.${index}.type`,
                  description: `entries.${index}.description`,
                  notes: `entries.${index}.notes`,
                }}
                errors={{
                  type: rowErrors?.type?.message,
                  description: rowErrors?.description?.message,
                  notes: rowErrors?.notes?.message,
                }}
              />
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ ...blankEntry })}
            disabled={!canAddRow || isSubmitting}
            className="h-11 w-full gap-2 rounded-xl border-brand-dark/15 sm:w-auto sm:px-5"
          >
            <Plus className="size-4" aria-hidden />
            {t('profile.introductionCard.form.addRow')}
          </Button>
          {!canAddRow ? (
            <p className="text-xs text-brand-dark/50" role="status">
              {t('profile.introductionCard.form.maxRows', { max: INTRODUCTION_CARD_MAX_ROWS })}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full gap-2 rounded-xl bg-brand-primary text-white hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {isSubmitting
            ? t('profile.introductionCard.form.submitting')
            : t('profile.introductionCard.form.submit')}
        </Button>
      </div>
    </form>
  )
}
