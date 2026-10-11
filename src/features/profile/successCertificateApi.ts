import { apiGet, apiPost, unwrapData } from '@/lib/api'
import type { StudentNamedRef } from '@/features/profile/studentProfileApi'

export type SuccessCertificateTerm = 'first' | 'second'

export type SuccessCertificateEvaluationColor = 'blue' | 'green' | 'yellow' | 'red' | string

export type SuccessCertificateComponent = {
  key: string
  name: string
  score: number | null
  max: number | null
  status?: string | null
}

export type SuccessCertificateEvaluation = {
  key?: string | null
  color?: SuccessCertificateEvaluationColor | null
  color_ar?: string | null
  name?: string | null
}

export type SuccessCertificateSubjectRow = {
  term?: SuccessCertificateTerm | string | null
  subject?: { id?: number | string; name?: string | null; code?: string | null } | null
  components?: SuccessCertificateComponent[] | null
  total?: number | null
  total_max?: number | null
  percentage?: number | null
  evaluation?: SuccessCertificateEvaluation | null
  status?: string | null
  /** Legacy fields — kept for older payloads */
  year_work?: { score?: number | null; max?: number | null } | null
  final_exam?: { score?: number | null; max?: number | null } | null
}

export type SuccessCertificateData = {
  student?: {
    id?: string
    name?: string | null
    code?: string | null
    national_id?: string | null
    class_number?: string | number | null
    grade?: StudentNamedRef | null
    classroom?: StudentNamedRef | null
    stage?: StudentNamedRef | null
  } | null
  academic_year?: string | null
  term?: SuccessCertificateTerm | string | null
  subjects?: SuccessCertificateSubjectRow[] | null
  attendance_rate?: number | null
  summary?: {
    subjects_count?: number | null
    subjects_passed?: number | null
    subjects_failed?: number | null
    subjects_incomplete?: number | null
  } | null
}

export type SuccessCertificatePayload = {
  unlocked: boolean
  unlocked_at?: string | null
  certificate: SuccessCertificateData | null
}

export type UnlockSuccessCertificatePayload = SuccessCertificatePayload

export type CertificateComponentColumn = {
  key: string
  name: string
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

export async function getSuccessCertificate(query?: {
  academic_year?: string
  term?: SuccessCertificateTerm | string
}) {
  const params = Object.fromEntries(
    Object.entries(query ?? {}).filter(([, value]) => value != null && value !== ''),
  )

  const response = await apiGet<SuccessCertificatePayload>(
    '/v1/auth/student/profile/success-certificate',
    {
      requiresAuth: true,
      params: Object.keys(params).length > 0 ? params : undefined,
    },
  )
  return unwrapData(response)
}

/**
 * Build dynamic score columns from every subject's `components[]`.
 * Prefer API `name` for the header — do not hardcode paper columns.
 */
export function collectComponentColumns(
  subjects: SuccessCertificateSubjectRow[] | null | undefined,
): CertificateComponentColumn[] {
  const columns: CertificateComponentColumn[] = []
  const seen = new Set<string>()

  for (const row of subjects ?? []) {
    for (const component of row.components ?? []) {
      const key = component.key?.trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      columns.push({
        key,
        name: component.name?.trim() || key,
      })
    }
  }

  return columns
}

export function findComponent(
  row: SuccessCertificateSubjectRow,
  key: string,
): SuccessCertificateComponent | undefined {
  return (row.components ?? []).find((component) => component.key === key)
}
