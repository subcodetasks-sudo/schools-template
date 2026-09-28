import { useTranslation } from 'react-i18next'
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormRegister,
} from 'react-hook-form'
import { INTRODUCTION_CARD_TEXT_MAX } from '@/features/introduction-card/introductionCardApi'
import {
  CharCounter,
  EntryTypeSelect,
  FieldError,
  FieldLabel,
} from '@/features/introduction-card/components/IntroductionCardShared'
import { invalidFieldClass, textareaFieldClass } from '@/features/introduction-card/components/fieldStyles'
import { cn } from '@/lib/utils'

type EntryField = 'type' | 'description' | 'notes'

/** Type / description / notes inputs shared by the add repeater rows and the inline edit form. */
export function EntryFields<T extends FieldValues>({
  control,
  register,
  names,
  errors,
  idPrefix,
  fallbackTypeLabel,
}: {
  control: Control<T>
  register: UseFormRegister<T>
  names: Record<EntryField, FieldPath<T>>
  errors: Partial<Record<EntryField, string>>
  idPrefix: string
  fallbackTypeLabel?: string | null
}) {
  const { t } = useTranslation()
  const ids = {
    type: `${idPrefix}-type`,
    description: `${idPrefix}-description`,
    notes: `${idPrefix}-notes`,
  }
  const describedBy = (field: EntryField, withCounter = false) =>
    [errors[field] ? `${ids[field]}-error` : null, withCounter ? `${ids[field]}-count` : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="sm:max-w-xs">
        <FieldLabel htmlFor={ids.type} required>
          {t('profile.introductionCard.form.type')}
        </FieldLabel>
        <Controller
          control={control}
          name={names.type}
          render={({ field }) => (
            <EntryTypeSelect
              id={ids.type}
              value={typeof field.value === 'string' ? field.value : ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              triggerRef={field.ref}
              invalid={Boolean(errors.type)}
              describedBy={describedBy('type')}
                  fallbackLabel={fallbackTypeLabel}
            />
          )}
        />
        <FieldError id={`${ids.type}-error`} message={errors.type} />
      </div>

      <div>
        <FieldLabel htmlFor={ids.description} required>
          {t('profile.introductionCard.form.description')}
        </FieldLabel>
        <textarea
          id={ids.description}
          rows={4}
          dir="auto"
          maxLength={INTRODUCTION_CARD_TEXT_MAX}
          placeholder={t('profile.introductionCard.form.descriptionPlaceholder')}
          aria-required
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy('description', true)}
          className={cn(textareaFieldClass, errors.description && invalidFieldClass)}
          {...register(names.description)}
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError id={`${ids.description}-error`} message={errors.description} />
          <div className="ms-auto">
            <CharCounter control={control} name={names.description} id={`${ids.description}-count`} />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor={ids.notes} optional>
          {t('profile.introductionCard.form.notes')}
        </FieldLabel>
        <textarea
          id={ids.notes}
          rows={3}
          dir="auto"
          maxLength={INTRODUCTION_CARD_TEXT_MAX}
          placeholder={t('profile.introductionCard.form.notesPlaceholder')}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy('notes', true)}
          className={cn(textareaFieldClass, 'min-h-20', errors.notes && invalidFieldClass)}
          {...register(names.notes)}
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError id={`${ids.notes}-error`} message={errors.notes} />
          <div className="ms-auto">
            <CharCounter control={control} name={names.notes} id={`${ids.notes}-count`} />
          </div>
        </div>
      </div>
    </div>
  )
}
