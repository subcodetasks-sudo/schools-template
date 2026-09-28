import { ApiError, apiGet, unwrapData } from '@/lib/api'
import type { MediaUrls } from '@/features/profile/mediaApi'

const GROUPS_BASE = '/v1/auth/student/profile/groups'

export const GROUP_TASKS_PAGE_SIZE = 10

export type SchoolGroupSupervisor = {
  id: string
  name: string
}

export type SchoolGroup = {
  id: string
  name: string
  description: string | null
  supervisor: SchoolGroupSupervisor | null
  /** Live member count from the API; `null` when the backend omitted it. */
  studentsCount: number | null
  createdAt: string | null
  updatedAt: string | null
}

export type GroupTaskAttachment = {
  id: string
  fileName: string
  mimeType: string | null
  size: string | null
  urls: MediaUrls
  createdAt: string | null
}

export type GroupTask = {
  id: string
  groupId: string | null
  title: string
  description: string | null
  /** Upload date (the task's `created_at`), `YYYY-MM-DD HH:mm:ss`. */
  uploadedAt: string | null
  /** `YYYY-MM-DD` or `null` when the task has no deadline. */
  dueDate: string | null
  attachments: GroupTaskAttachment[]
  hasAttachments: boolean
}

export type PaginationMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export type PaginatedResult<T> = {
  items: T[]
  meta: PaginationMeta
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

function readCount(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed)
  }
  return null
}

function readPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback
}

/** Only allow absolute http(s) URLs from the API — never build or rewrite media paths. */
export function safeHttpUrl(value: unknown): string | null {
  const text = readText(value)
  if (!text) return null
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function normalizeSupervisor(raw: unknown): SchoolGroupSupervisor | null {
  const record = asRecord(raw)
  if (!record) return null
  const name = readText(record.name)
  if (!name) return null
  return { id: readText(record.id) ?? '', name }
}

export function normalizeGroup(raw: unknown): SchoolGroup {
  const record = asRecord(raw) ?? {}
  return {
    id: readText(record.id) ?? '',
    name: readText(record.name) ?? '',
    description: readText(record.description),
    supervisor: normalizeSupervisor(record.supervisor ?? record.teacher),
    studentsCount: readCount(
      record.studentsCount,
      record.students_count,
      record.membersCount,
      record.members_count,
    ),
    createdAt: readText(record.createdAt, record.created_at),
    updatedAt: readText(record.updatedAt, record.updated_at),
  }
}

function normalizeAttachment(raw: unknown, index: number): GroupTaskAttachment | null {
  const record = asRecord(raw)
  if (!record) return null
  const rawUrls = asRecord(record.urls) ?? {}
  const urls: MediaUrls = {
    original: safeHttpUrl(rawUrls.original ?? record.url),
    thumb: safeHttpUrl(rawUrls.thumb),
    medium: safeHttpUrl(rawUrls.medium),
    large: safeHttpUrl(rawUrls.large),
    webp: safeHttpUrl(rawUrls.webp),
  }
  return {
    id: readText(record.id) ?? `attachment-${index}`,
    fileName: readText(record.fileName, record.file_name, record.name) ?? '',
    mimeType: readText(record.mimeType, record.mime_type),
    size: readText(record.size, record.humanReadableSize),
    urls,
    createdAt: readText(record.createdAt, record.created_at),
  }
}

export function normalizeTask(raw: unknown): GroupTask {
  const record = asRecord(raw) ?? {}
  const attachments = Array.isArray(record.attachments)
    ? record.attachments
        .map((item, index) => normalizeAttachment(item, index))
        .filter((item): item is GroupTaskAttachment => item !== null)
    : []

  return {
    id: readText(record.id) ?? '',
    groupId: readText(record.groupId, record.group_id),
    title: readText(record.title) ?? '',
    description: readText(record.description),
    uploadedAt: readText(record.uploadedAt, record.uploaded_at, record.createdAt, record.created_at),
    dueDate: readText(record.dueDate, record.due_date),
    attachments,
    hasAttachments:
      attachments.length > 0 || record.hasAttachments === true || record.has_attachments === true,
  }
}

/**
 * Accepts every list shape the backend may return:
 * a plain array, `{ data: [...] }`, or Laravel pagination `{ data: [...], meta, links }`.
 */
export function unwrapPaginated<T>(
  payload: unknown,
  normalize: (raw: unknown) => T,
  fallbackPerPage: number,
): PaginatedResult<T> {
  const data = unwrapData(payload as { data?: unknown })
  const page = asRecord(data)
  const rawItems: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(page?.data)
      ? (page.data as unknown[])
      : []
  const items = rawItems.map(normalize)
  const meta = asRecord(page?.meta) ?? asRecord(page) ?? {}

  const perPage = readPositiveInt(meta.per_page ?? meta.perPage, fallbackPerPage)
  const currentPage = readPositiveInt(meta.current_page ?? meta.currentPage, 1)
  // Keep the server's last_page as-is (even when < current_page) so callers can detect an out-of-range page.
  const lastPage = readPositiveInt(meta.last_page ?? meta.lastPage, 1)

  return {
    items,
    meta: {
      total: readCount(meta.total) ?? items.length,
      per_page: perPage,
      current_page: currentPage,
      last_page: Array.isArray(data) ? 1 : lastPage,
    },
  }
}

function encodeId(id: string) {
  return encodeURIComponent(id)
}

/** Every group the logged-in student belongs to. Fetches all pages so the switcher is complete. */
export async function getMyGroups(): Promise<SchoolGroup[]> {
  const perPage = 50
  const maxPages = 20
  const groups: SchoolGroup[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await apiGet<unknown>(GROUPS_BASE, {
      requiresAuth: true,
      params: { page, per_page: perPage },
    })
    const result = unwrapPaginated(response, normalizeGroup, perPage)

    for (const group of result.items) {
      if (!group.id || seen.has(group.id)) continue
      seen.add(group.id)
      groups.push(group)
    }

    if (result.items.length === 0 || result.meta.current_page >= result.meta.last_page) break
  }

  return groups
}

export async function getMyGroup(groupId: string): Promise<SchoolGroup> {
  const response = await apiGet<unknown>(`${GROUPS_BASE}/${encodeId(groupId)}`, {
    requiresAuth: true,
  })
  const group = normalizeGroup(unwrapData(response as { data?: unknown }))
  if (!group.id) throw new ApiError('Not found', { status: 404, data: null })
  return group
}

export async function getMyGroupTasks(
  groupId: string,
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResult<GroupTask>> {
  const perPage = params.per_page ?? GROUP_TASKS_PAGE_SIZE
  const response = await apiGet<unknown>(`${GROUPS_BASE}/${encodeId(groupId)}/tasks`, {
    requiresAuth: true,
    params: { page: params.page ?? 1, per_page: perPage },
  })
  const result = unwrapPaginated(response, normalizeTask, perPage)
  // The backend already sorts newest-first; re-sort defensively so the table never shows stale order.
  result.items = sortTasksNewestFirst(result.items.filter((task) => task.id))
  return result
}

export async function getMyGroupTask(groupId: string, taskId: string): Promise<GroupTask> {
  const response = await apiGet<unknown>(
    `${GROUPS_BASE}/${encodeId(groupId)}/tasks/${encodeId(taskId)}`,
    { requiresAuth: true },
  )
  const task = normalizeTask(unwrapData(response as { data?: unknown }))
  if (!task.id) throw new ApiError('Not found', { status: 404, data: null })
  return task
}

/* ------------------------------------------------------------------ */
/* Error classification                                                */
/* ------------------------------------------------------------------ */

export type GroupsErrorKind = 'forbidden' | 'notFound' | 'generic'

/** 403 = the student is not a member of this group; 404 = group/task does not exist. */
export function classifyGroupsError(error: unknown): GroupsErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'forbidden'
    if (error.status === 404) return 'notFound'
  }
  return 'generic'
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parses `YYYY-MM-DD` as a local calendar date (no UTC shift) and datetimes as-is. */
export function parseGroupDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  const dateOnly = DATE_ONLY_RE.exec(trimmed)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const isoish = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  const date = new Date(isoish)
  return Number.isNaN(date.getTime()) ? null : date
}

function localeFor(language: string) {
  return language.startsWith('ar') ? 'ar-EG' : 'en-GB'
}

export function formatGroupDate(value: string | null | undefined, language: string) {
  const date = parseGroupDate(value)
  if (!date) return value?.trim() || '—'
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatGroupDateTime(value: string | null | undefined, language: string) {
  const date = parseGroupDate(value)
  if (!date) return value?.trim() || '—'
  if (value && DATE_ONLY_RE.test(value.trim())) return formatGroupDate(value, language)
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'soon' | 'upcoming'

/** `soon` = due within the next 3 days. Compared by calendar day in the viewer's timezone. */
export function getDueStatus(dueDate: string | null | undefined, now = new Date()): DueStatus {
  const due = parseGroupDate(dueDate)
  if (!due) return 'none'
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const diffDays = Math.round((startOfDue - startOfToday) / 86_400_000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 3) return 'soon'
  return 'upcoming'
}

export function sortTasksNewestFirst(tasks: GroupTask[]) {
  return [...tasks].sort((a, b) => {
    const aTime = parseGroupDate(a.uploadedAt)?.getTime() ?? 0
    const bTime = parseGroupDate(b.uploadedAt)?.getTime() ?? 0
    return bTime - aTime
  })
}

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

export type AttachmentKind = 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'archive' | 'file'

function fileExtension(fileName: string) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim())
  return match ? match[1].toLowerCase() : ''
}

export function getAttachmentKind(attachment: Pick<GroupTaskAttachment, 'fileName' | 'mimeType'>): AttachmentKind {
  const mime = attachment.mimeType?.toLowerCase() ?? ''
  const ext = fileExtension(attachment.fileName)
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.includes('word') || ['doc', 'docx'].includes(ext)) return 'word'
  if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx'].includes(ext))
    return 'powerpoint'
  if (mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z'].includes(ext)) return 'archive'
  return 'file'
}

export function getAttachmentUrl(attachment: GroupTaskAttachment) {
  return attachment.urls.original ?? attachment.urls.large ?? attachment.urls.medium ?? null
}

export function getAttachmentPreviewUrl(attachment: GroupTaskAttachment) {
  if (getAttachmentKind(attachment) !== 'image') return null
  return (
    attachment.urls.thumb ??
    attachment.urls.medium ??
    attachment.urls.webp ??
    attachment.urls.original ??
    null
  )
}

export function getAttachmentExtensionLabel(attachment: GroupTaskAttachment) {
  const ext = fileExtension(attachment.fileName)
  if (ext) return ext.toUpperCase()
  const subtype = attachment.mimeType?.split('/')[1]
  return subtype ? subtype.toUpperCase().slice(0, 6) : ''
}
