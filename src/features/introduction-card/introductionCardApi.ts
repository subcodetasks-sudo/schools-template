import { ApiError, apiGet, apiPost, unwrapData, type ApiValidationErrors } from '@/lib/api'
import { formatGroupDateTime, parseGroupDate } from '@/features/groups/groupsApi'

const INTRODUCTION_CARD_BASE = '/v1/auth/student/profile/introduction-card'

export const INTRODUCTION_CARD_TYPES = ['health', 'psychological', 'social', 'other'] as const
export const INTRODUCTION_CARD_TEXT_MAX = 5000
export const INTRODUCTION_CARD_MAX_ROWS = 10

export type IntroductionCardType = (typeof INTRODUCTION_CARD_TYPES)[number]

export type IntroductionCardStudent = {
  id: string
  name: string | null
  code: string | null
  stage: string | null
  grade: string | null
  /** Classroom section, falling back to its label. */
  classroom: string | null
}

export type IntroductionCardEntry = {
  id: string
  /** `null` when the server sent a type this site does not know — display `typeLabel` instead. */
  type: IntroductionCardType | null
  /** Server-localized label (follows Accept-Language). */
  typeLabel: string | null
  description: string
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type IntroductionCard = {
  student: IntroductionCardStudent
  /** Newest first. */
  items: IntroductionCardEntry[]
}

export type IntroductionCardEntryInput = {
  type: IntroductionCardType
  description: string
  notes: string | null
}

export type IntroductionCardEntryPatch = Partial<IntroductionCardEntryInput>

/** Same Arabic/English formatting as group dates (`YYYY-MM-DD HH:mm:ss` from the API). */
export const formatIntroductionCardDateTime = formatGroupDateTime

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null
}

function readText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

export function isIntroductionCardType(value: unknown): value is IntroductionCardType {
  return typeof value === 'string' && (INTRODUCTION_CARD_TYPES as readonly string[]).includes(value)
}

function readName(raw: unknown) {
  const record = asRecord(raw)
  return record ? readText(record.name, record.label, record.title) : readText(raw)
}

function readClassroom(raw: unknown) {
  const record = asRecord(raw)
  return record ? readText(record.section, record.label, record.name) : readText(raw)
}

function normalizeStudent(raw: unknown): IntroductionCardStudent {
  const record = asRecord(raw) ?? {}
  return {
    id: readText(record.id) ?? '',
    name: readText(record.name),
    code: readText(record.code, record.studentCode, record.student_code),
    stage: readName(record.stage),
    grade: readName(record.grade),
    classroom: readClassroom(record.classroom ?? record.class_room),
  }
}

export function normalizeIntroductionCardEntry(raw: unknown): IntroductionCardEntry {
  const record = asRecord(raw) ?? {}
  const rawType = readText(record.type)?.toLowerCase()
  return {
    id: readText(record.id) ?? '',
    type: isIntroductionCardType(rawType) ? rawType : null,
    typeLabel: readText(record.type_label, record.typeLabel),
    description: readText(record.description) ?? '',
    notes: readText(record.notes),
    createdAt: readText(record.createdAt, record.created_at),
    updatedAt: readText(record.updatedAt, record.updated_at),
  }
}

/** Newest `createdAt` first; same-second rows fall back to the higher numeric id, otherwise keep server order. */
export function sortEntriesNewestFirst(entries: IntroductionCardEntry[]) {
  return entries
    .map((entry, index) => ({ entry, index, time: parseGroupDate(entry.createdAt)?.getTime() ?? 0 }))
    .sort((a, b) => {
      if (a.time !== b.time) return b.time - a.time
      const aId = Number(a.entry.id)
      const bId = Number(b.entry.id)
      if (a.entry.id && b.entry.id && Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
        return bId - aId
      }
      return a.index - b.index
    })
    .map(({ entry }) => entry)
}

function normalizeCard(payload: unknown): IntroductionCard {
  const data = asRecord(unwrapData(payload as { data?: unknown })) ?? {}
  const rawItems = Array.isArray(data.items) ? data.items : []
  return {
    student: normalizeStudent(data.student),
    items: sortEntriesNewestFirst(rawItems.map(normalizeIntroductionCardEntry)),
  }
}

function toRequestEntry(entry: IntroductionCardEntryInput) {
  return {
    type: entry.type,
    description: entry.description.trim(),
    notes: entry.notes?.trim() || null,
  }
}

export async function getIntroductionCard(): Promise<IntroductionCard> {
  const response = await apiGet<unknown>(INTRODUCTION_CARD_BASE, { requiresAuth: true })
  return normalizeCard(response)
}

/**
 * Adds entries (never replaces). One entry is sent as the documented single-object body
 * `{ type, description, notes }`; several are sent as `{ items: [...] }`.
 */
export async function addIntroductionCardEntries(
  entries: IntroductionCardEntryInput[],
): Promise<IntroductionCard> {
  if (entries.length === 0) throw new Error('No entries to add')
  const rows = entries.map(toRequestEntry)
  const body = rows.length === 1 ? rows[0] : { items: rows }
  const response = await apiPost<unknown>(INTRODUCTION_CARD_BASE, body, { requiresAuth: true })
  return normalizeCard(response)
}

/** Partial update (POST, not PATCH) — only the provided fields are sent. */
export async function updateIntroductionCardEntry(
  id: string,
  patch: IntroductionCardEntryPatch,
): Promise<IntroductionCard> {
  const body: Record<string, string | null> = {}
  if (patch.type !== undefined) body.type = patch.type
  if (patch.description !== undefined) body.description = patch.description.trim()
  if (patch.notes !== undefined) body.notes = patch.notes?.trim() || null

  const response = await apiPost<unknown>(
    `${INTRODUCTION_CARD_BASE}/entries/${encodeURIComponent(id)}`,
    body,
    { requiresAuth: true },
  )
  return normalizeCard(response)
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** 404 has no dedicated copy here — it is shown as a generic, retryable error. */
export type IntroductionCardErrorKind = 'forbidden' | 'generic'

export function classifyIntroductionCardError(error: unknown): IntroductionCardErrorKind {
  return error instanceof ApiError && error.status === 403 ? 'forbidden' : 'generic'
}

export function isValidationError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 422
}

export type IntroductionCardField = 'type' | 'description' | 'notes'

export type IntroductionCardFieldError = {
  /** Row index for `items.N.field`; `null` for a single-object body (`field`). */
  index: number | null
  field: IntroductionCardField
  message: string
}

const FIELD_ERROR_RE = /^(?:items\.(\d+)\.)?(type|description|notes)$/

/** Maps Laravel keys (`description`, `items.1.type`, …) to row/field pairs; unknown keys are skipped. */
export function mapIntroductionCardFieldErrors(
  errors: ApiValidationErrors | undefined,
): IntroductionCardFieldError[] {
  const result: IntroductionCardFieldError[] = []
  for (const [key, messages] of Object.entries(errors ?? {})) {
    const match = FIELD_ERROR_RE.exec(key)
    const message = Array.isArray(messages) ? messages[0] : messages
    if (!match || typeof message !== 'string' || !message.trim()) continue
    result.push({
      index: match[1] === undefined ? null : Number(match[1]),
      field: match[2] as IntroductionCardField,
      message,
    })
  }
  return result
}

export function firstValidationMessage(errors: ApiValidationErrors | undefined) {
  for (const messages of Object.values(errors ?? {})) {
    const first = Array.isArray(messages) ? messages[0] : messages
    if (typeof first === 'string' && first.trim()) return first
  }
  return undefined
}
