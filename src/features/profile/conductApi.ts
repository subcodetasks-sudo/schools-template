import { apiGet, unwrapData } from '@/lib/api'

export type ConductDegree = 1 | 2 | 3 | 4

export type StudentConductViolation = {
  id: string
  serial: number | null
  degree: ConductDegree | null
  issuedOn: string | null
  dayName: string | null
  referralSource: string | null
  description: string | null
  notes: string | null
  repeatCount: number | null
  approvalStatus: string | null
  approvalStatusLabel: string | null
  approvedAt: string | null
  classroomLabel: string | null
  violationNumber: string | null
  violationDescription: string | null
  penaltyNumber: string | null
  penaltyName: string | null
  protectionApproval: string | null
  authoritiesNotifiedOn: string | null
  authoritiesDecision: string | null
  schoolDecision: string | null
}

export type StudentConductPayload = {
  studiesSuspended: boolean
  violations: StudentConductViolation[]
}

type RawRecord = Record<string, unknown>

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null') {
      return value.trim()
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function readNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function readBool(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value
    if (value === 1 || value === '1' || value === 'true') return true
  }
  return false
}

function readDegree(value: unknown): ConductDegree | null {
  const text = readText(value)?.toLowerCase()
  if (!text) return null
  if (['1', 'first', 'اولى', 'الأولى', 'الاولى'].includes(text)) return 1
  if (['2', 'second', 'ثانية', 'الثانية'].includes(text)) return 2
  if (['3', 'third', 'ثالثة', 'الثالثة'].includes(text)) return 3
  if (['4', 'fourth', 'رابعة', 'الرابعة'].includes(text)) return 4
  return null
}

function mapViolation(raw: unknown, index: number): StudentConductViolation {
  const item = asRecord(raw) ?? {}
  const violationType = asRecord(item.violation_type)
  const penaltyType = asRecord(item.penalty_type)
  const classroom = asRecord(item.classroom)

  return {
    id: readText(item.id) ?? String(index),
    serial: readNumber(item.serial),
    degree: readDegree(item.degree),
    issuedOn: readText(item.issued_on, item.date),
    dayName: readText(item.day_name),
    referralSource: readText(item.referral_source),
    description: readText(item.description),
    notes: readText(item.notes),
    repeatCount: readNumber(item.repeat_count),
    approvalStatus: readText(item.approval_status),
    approvalStatusLabel: readText(item.approval_status_label),
    approvedAt: readText(item.approved_at),
    classroomLabel: readText(classroom?.label, classroom?.section),
    violationNumber: readText(violationType?.number),
    violationDescription: readText(violationType?.description, violationType?.name),
    penaltyNumber: readText(penaltyType?.number),
    penaltyName: readText(penaltyType?.name),
    protectionApproval: readText(item.protection_approval),
    authoritiesNotifiedOn: readText(item.authorities_notified_on),
    authoritiesDecision: readText(item.authorities_decision),
    schoolDecision: readText(item.school_decision),
  }
}

export function normalizeStudentConduct(raw: unknown): StudentConductPayload {
  const data = asRecord(raw) ?? {}

  return {
    studiesSuspended: readBool(data.studies_suspended),
    violations: asList(data.violations).map(mapViolation),
  }
}

export async function getStudentConduct() {
  const response = await apiGet<unknown>('/v1/auth/student/profile/conduct', {
    requiresAuth: true,
  })
  return normalizeStudentConduct(unwrapData(response))
}
