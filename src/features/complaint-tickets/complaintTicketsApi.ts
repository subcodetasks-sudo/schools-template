import { ApiError, apiGet, apiPost, unwrapData, type ApiValidationErrors } from '@/lib/api'
import {
  parseGroupDate,
  unwrapPaginated,
  type PaginatedResult,
} from '@/features/groups/groupsApi'

const COMPLAINT_TICKETS_BASE = '/v1/auth/student/profile/complaint-tickets'

export const COMPLAINT_TICKETS_PAGE_SIZE = 15
export const COMPLAINT_TITLE_MAX = 255
export const COMPLAINT_BODY_MAX = 5000

export type ComplaintType = {
  id: string
  name: string
}

export type ComplaintTicketStudent = {
  id: string
  name: string | null
  code: string | null
  stage: string | null
  grade: string | null
  /** Classroom section, falling back to its label. */
  classroom: string | null
}

export type ComplaintTicket = {
  id: string
  /** Human-readable number (`CT-000042`). Display only — never use it in URLs. */
  number: string | null
  /** `null` in the list endpoint: every ticket there belongs to the logged-in student. */
  student: ComplaintTicketStudent | null
  complaintType: ComplaintType | null
  title: string
  body: string
  /** `YYYY-MM-DD HH:mm:ss` */
  createdAt: string | null
}

export type ComplaintTicketInput = {
  complaint_type_id: string
  title: string
  body: string
}

export type CreatedComplaintTicket = {
  ticket: ComplaintTicket
  /** Server message in the request language (Accept-Language). */
  message: string | null
}

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

/** Like `readText` but keeps inner line breaks and leading indentation of the body. */
function readBody(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.replace(/\r\n?/g, '\n').trim()
  }
  return ''
}

function readName(raw: unknown) {
  const record = asRecord(raw)
  return record ? readText(record.name, record.label, record.title) : readText(raw)
}

function readClassroom(raw: unknown) {
  const record = asRecord(raw)
  return record ? readText(record.section, record.label, record.name) : readText(raw)
}

export function normalizeComplaintType(raw: unknown): ComplaintType | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = readText(record.id)
  const name = readText(record.name)
  if (!id || !name) return null
  return { id, name }
}

function normalizeStudent(raw: unknown, ticket: RawRecord): ComplaintTicketStudent | null {
  const record = asRecord(raw)
  if (!record) return null
  return {
    id: readText(record.id) ?? '',
    name: readText(record.name),
    code: readText(record.code),
    // Admin-style rows put stage/grade/classroom beside `student`; accept both shapes.
    stage: readName(record.stage ?? ticket.stage),
    grade: readName(record.grade ?? ticket.grade),
    classroom: readClassroom(record.classroom ?? ticket.classroom),
  }
}

export function normalizeComplaintTicket(raw: unknown): ComplaintTicket {
  const record = asRecord(raw) ?? {}
  return {
    id: readText(record.id) ?? '',
    number: readText(record.number),
    student: normalizeStudent(record.student, record),
    complaintType: normalizeComplaintType(record.complaintType ?? record.complaint_type),
    title: readText(record.title) ?? '',
    body: readBody(record.body),
    createdAt: readText(record.createdAt, record.created_at),
  }
}

function encodeId(id: string) {
  return encodeURIComponent(id)
}

/** Active complaint types, sorted by name by the API. */
export async function getComplaintTypes(): Promise<ComplaintType[]> {
  const response = await apiGet<unknown>(`${COMPLAINT_TICKETS_BASE}/types`, { requiresAuth: true })
  const data = unwrapData(response as { data?: unknown })
  const page = asRecord(data)
  const rawItems: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(page?.data)
      ? (page.data as unknown[])
      : []

  const seen = new Set<string>()
  const types: ComplaintType[] = []
  for (const item of rawItems) {
    const type = normalizeComplaintType(item)
    if (!type || seen.has(type.id)) continue
    seen.add(type.id)
    types.push(type)
  }
  return types
}

export function sortTicketsNewestFirst(tickets: ComplaintTicket[]) {
  return [...tickets].sort((a, b) => {
    const aTime = parseGroupDate(a.createdAt)?.getTime() ?? 0
    const bTime = parseGroupDate(b.createdAt)?.getTime() ?? 0
    return bTime - aTime
  })
}

/** The logged-in student's tickets, newest first. */
export async function getMyComplaintTickets(
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResult<ComplaintTicket>> {
  const perPage = params.per_page ?? COMPLAINT_TICKETS_PAGE_SIZE
  const response = await apiGet<unknown>(COMPLAINT_TICKETS_BASE, {
    requiresAuth: true,
    params: { page: params.page ?? 1, per_page: perPage },
  })
  const result = unwrapPaginated(response, normalizeComplaintTicket, perPage)
  result.items = sortTicketsNewestFirst(result.items.filter((ticket) => ticket.id))
  return result
}

/** 403 when the ticket belongs to another student, 404 when it does not exist. */
export async function getMyComplaintTicket(ticketId: string): Promise<ComplaintTicket> {
  const response = await apiGet<unknown>(`${COMPLAINT_TICKETS_BASE}/${encodeId(ticketId)}`, {
    requiresAuth: true,
  })
  const ticket = normalizeComplaintTicket(unwrapData(response as { data?: unknown }))
  if (!ticket.id) throw new ApiError('Not found', { status: 404, data: null })
  return ticket
}

/** Files a ticket for the logged-in student. Never send student fields: the API links it automatically. */
export async function createComplaintTicket(
  input: ComplaintTicketInput,
): Promise<CreatedComplaintTicket> {
  const payload: ComplaintTicketInput = {
    complaint_type_id: input.complaint_type_id,
    title: input.title.trim(),
    body: input.body.replace(/\r\n?/g, '\n').trim(),
  }
  const response = await apiPost<unknown>(COMPLAINT_TICKETS_BASE, payload, { requiresAuth: true })
  const envelope = asRecord(response)
  return {
    ticket: normalizeComplaintTicket(unwrapData(response as { data?: unknown })),
    message: readText(envelope?.message),
  }
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type ComplaintTicketsErrorKind = 'forbidden' | 'notFound' | 'generic'

export function classifyComplaintTicketsError(error: unknown): ComplaintTicketsErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'forbidden'
    if (error.status === 404) return 'notFound'
  }
  return 'generic'
}

export function isValidationError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 422
}

export type ComplaintTicketField = 'complaint_type_id' | 'title' | 'body'

const COMPLAINT_FIELDS: readonly ComplaintTicketField[] = ['complaint_type_id', 'title', 'body']

/** First message per known field; unknown keys are ignored. */
export function mapComplaintTicketFieldErrors(
  errors: ApiValidationErrors | undefined,
): { field: ComplaintTicketField; message: string }[] {
  const result: { field: ComplaintTicketField; message: string }[] = []
  for (const [key, messages] of Object.entries(errors ?? {})) {
    if (!(COMPLAINT_FIELDS as readonly string[]).includes(key)) continue
    const message = Array.isArray(messages) ? messages[0] : messages
    if (typeof message !== 'string' || !message.trim()) continue
    result.push({ field: key as ComplaintTicketField, message })
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

export const COMPLAINT_TICKETS_PATH = '/profile/complaint-tickets'

export function complaintTicketPath(ticketId: string) {
  return `${COMPLAINT_TICKETS_PATH}/${encodeId(ticketId)}`
}
