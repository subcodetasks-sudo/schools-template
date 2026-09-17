import { apiGet, apiPost, unwrapData } from '@/lib/api'
import {
  EMPTY_SUBJECT_CELL,
  resolveSheetResult,
  sumGrandTotal,
  type FinalCertificateSheet,
  type FinalCertificateSubjectCell,
  type FinalCertificateSubjectCol,
} from '@/features/final-results/finalCertificateSheet'
import type { StudentNamedRef } from '@/features/profile/studentProfileApi'

export type SuccessCertificateTerm = 'first' | 'second'

export type SuccessCertificateSubjectRow = {
  term?: SuccessCertificateTerm | string | null
  subject?: { id?: number | string; name?: string | null; code?: string | null } | null
  year_work?: { score?: number | null; max?: number | null } | null
  final_exam?: { score?: number | null; max?: number | null } | null
  total?: number | null
  total_max?: number | null
  percentage?: number | null
  status?: string | null
  approval_status?: string | null
  passing?: {
    checks?: {
      final_exam?: { passed?: boolean | null } | null
    } | null
  } | null
}

export type SuccessCertificatePayload = {
  unlocked: boolean
  unlocked_at?: string | null
  certificate: {
    student?: {
      id?: string
      name?: string | null
      code?: string | null
      class_number?: string | null
      grade?: StudentNamedRef | null
      classroom?: StudentNamedRef | null
      stage?: StudentNamedRef | null
    } | null
    academic_year?: string | null
    subjects?: SuccessCertificateSubjectRow[] | null
    summary?: {
      subjects_count?: number | null
      subjects_passed?: number | null
      subjects_failed?: number | null
      subjects_incomplete?: number | null
    } | null
  } | null
}

export type UnlockSuccessCertificatePayload = {
  unlocked: boolean
  unlocked_at?: string | null
}

/** Accept raw token or a scanned verify URL containing `/students/verify/{token}`. */
export function extractQrToken(input: string) {
  const raw = input.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const match = url.pathname.match(/\/students\/verify\/([^/]+)/i)
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {
    // not a URL — treat as raw token
  }

  const pathMatch = raw.match(/\/students\/verify\/([^/?#]+)/i)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1])

  return raw
}

export async function unlockSuccessCertificate(qrToken: string) {
  const response = await apiPost<UnlockSuccessCertificatePayload>(
    '/v1/auth/student/profile/success-certificate/unlock',
    { qr_token: extractQrToken(qrToken) },
    { requiresAuth: true },
  )
  return unwrapData(response)
}

export async function getSuccessCertificate(academicYear?: string) {
  const response = await apiGet<SuccessCertificatePayload>(
    '/v1/auth/student/profile/success-certificate',
    {
      requiresAuth: true,
      params: academicYear ? { academic_year: academicYear } : undefined,
    },
  )
  return unwrapData(response)
}

function mapSubjectCell(row: SuccessCertificateSubjectRow): FinalCertificateSubjectCell {
  return {
    yearWork: row.year_work?.score ?? null,
    finalExam: row.final_exam?.score ?? null,
    total: row.total ?? null,
    totalMax: row.total_max ?? null,
    status: row.status || 'incomplete',
    finalExamPassed: row.passing?.checks?.final_exam?.passed ?? null,
  }
}

/**
 * Build the one-row certificate sheet matrix for a selected term
 * from `GET …/success-certificate` subjects.
 */
export function buildSheetFromSuccessCertificate(
  payload: SuccessCertificatePayload | null | undefined,
  term: SuccessCertificateTerm,
): FinalCertificateSheet {
  const certificate = payload?.certificate
  const rows = (certificate?.subjects ?? []).filter(
    (row) => String(row.term || '') === term,
  )

  const subjectMap = new Map<string, FinalCertificateSubjectCol>()
  for (const row of rows) {
    const id = row.subject?.id != null ? String(row.subject.id) : ''
    const name = row.subject?.name?.trim()
    if (!id || !name) continue
    if (!subjectMap.has(id)) {
      subjectMap.set(id, { id, name })
    }
  }

  const subjects = Array.from(subjectMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ar'),
  )

  const student = certificate?.student
  const cells: Record<string, FinalCertificateSubjectCell> = {}
  for (const subject of subjects) {
    const match = rows.find((row) => String(row.subject?.id) === subject.id)
    cells[subject.id] = match ? mapSubjectCell(match) : { ...EMPTY_SUBJECT_CELL }
  }

  const cellList = subjects.map((subject) => cells[subject.id] ?? EMPTY_SUBJECT_CELL)
  const statuses = cellList.map((cell) => cell.status)

  return {
    subjects,
    students:
      subjects.length === 0
        ? []
        : [
            {
              studentId: student?.id || '',
              name: student?.name?.trim() || '—',
              code: student?.code?.trim() || '—',
              seatNumber: student?.class_number?.trim() || '—',
              classroomLabel:
                student?.classroom?.label?.trim() ||
                student?.classroom?.section?.trim() ||
                '—',
              subjects: cells,
              grandTotal: sumGrandTotal(cellList),
              result: resolveSheetResult(statuses),
            },
          ],
  }
}
