import type { TFunction } from 'i18next'
import { z } from 'zod'
import {
  INTRODUCTION_CARD_MAX_ROWS,
  INTRODUCTION_CARD_TEXT_MAX,
  isIntroductionCardType,
} from '@/features/introduction-card/introductionCardApi'

/** Form values keep `type` as a string so the select can start empty (placeholder). */
export type EntryFormValues = {
  type: string
  description: string
  notes: string
}

export const blankEntry: EntryFormValues = { type: '', description: '', notes: '' }

/** `allowEmptyType` is for editing a saved entry whose server type is unknown — leaving it empty keeps it unchanged. */
export function createEntrySchema(t: TFunction, { allowEmptyType = false } = {}) {
  const max = INTRODUCTION_CARD_TEXT_MAX
  return z.object({
    type: z
      .string()
      .refine((value) => isIntroductionCardType(value) || (allowEmptyType && value === ''), {
        message: t('profile.introductionCard.validation.typeRequired'),
      }),
    description: z
      .string()
      .trim()
      .min(1, t('profile.introductionCard.validation.descriptionRequired'))
      .max(max, t('profile.introductionCard.validation.descriptionTooLong', { max })),
    notes: z
      .string()
      .trim()
      .max(max, t('profile.introductionCard.validation.notesTooLong', { max })),
  })
}

export function createAddEntriesSchema(t: TFunction) {
  return z.object({
    entries: z.array(createEntrySchema(t)).min(1).max(INTRODUCTION_CARD_MAX_ROWS),
  })
}

export type AddEntriesFormValues = { entries: EntryFormValues[] }
