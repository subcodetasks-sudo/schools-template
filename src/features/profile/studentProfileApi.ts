import { apiGet, apiPost, unwrapData } from '@/lib/api'
import type { AuthUser } from '@/features/auth/authApi'
import {
  defaultProfileData,
  defaultProfilePhoto,
  type ProfileData,
} from '@/features/profile/profileData'

export type StudentNamedRef = {
  id?: number | string
  name?: string | null
  code?: string | null
  section?: string | null
  label?: string | null
}

export type StudentPersonal = {
  id: string
  name: string
  initials?: string | null
  grade_label?: string | null
  image?: string | null
  national_id?: string | null
  student_code?: string | null
  phone?: string | null
  religion?: string | null
  registration_status?: string | null
  class_number?: string | null
  transfers?: string | null
  fees?: string | null
  payment_voucher?: string | null
  payment_date?: string | null
  payment_amount?: string | number | null
  stage?: StudentNamedRef | null
  grade?: StudentNamedRef | null
  classroom?: StudentNamedRef | null
  father?: {
    national_id?: string | null
    address?: string | null
    job?: string | null
    phone?: string | null
  } | null
}

export type StudentScheduleEntry = {
  day: string
  period: number
  subject?: StudentNamedRef | null
  teacher?: { id?: string | number; name?: string | null } | null
}

export type StudentSchedule = {
  id?: string
  days: string[]
  periods: number[]
  classroom?: (StudentNamedRef & {
    grade?: StudentNamedRef | null
    stage?: StudentNamedRef | null
  }) | null
  entries: StudentScheduleEntry[]
} | null

export type StudentStatistics = {
  evaluation?: {
    assignments?: number | null
    tests?: number | null
  } | null
  cards?: {
    attendance?: { rate?: number | null; sessions?: number | null } | null
    callups?: { count?: number | null } | null
    tests?: { completed?: number | null } | null
    absences?: { count?: number | null } | null
  } | null
} | null

export type StudentProfilePayload = {
  personal: StudentPersonal
  schedule: StudentSchedule
  statistics: StudentStatistics
}

export type UpdateStudentProfilePayload = {
  phone?: string
  image?: string
  religion?: string
  father_national_id?: string
  father_address?: string
  father_job?: string
  father_phone?: string
}

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

export function mapPersonalToProfileData(
  personal: StudentPersonal | null | undefined,
  fallback: ProfileData = defaultProfileData,
): ProfileData {
  if (!personal) return fallback

  return {
    nationalId: text(personal.national_id, fallback.nationalId),
    studentCode: text(personal.student_code, fallback.studentCode),
    phone: text(personal.phone, ''),
    religion: text(personal.religion, ''),
    registrationStatus: text(personal.registration_status, fallback.registrationStatus),
    classNumber: text(
      personal.class_number ?? personal.classroom?.label,
      fallback.classNumber,
    ),
    transfers: text(personal.transfers, '—'),
    fees: text(personal.fees, '—'),
    paymentVoucher: text(personal.payment_voucher, '—'),
    paymentDate: text(personal.payment_date, '—'),
    paymentAmount: text(personal.payment_amount, '—'),
    fatherNationalId: text(personal.father?.national_id, ''),
    fatherAddress: text(personal.father?.address, ''),
    fatherJob: text(personal.father?.job, ''),
    fatherPhone: text(personal.father?.phone, ''),
  }
}

export function mapPersonalToAuthUser(personal: StudentPersonal): AuthUser {
  return {
    id: personal.id,
    type: 'student',
    role: 'student',
    name: personal.name,
    national_id: personal.national_id ?? undefined,
    nationalId: personal.national_id ?? undefined,
    phone: personal.phone ?? undefined,
    code: personal.student_code ?? undefined,
    image: personal.image ?? undefined,
    religion: personal.religion ?? undefined,
    status: personal.registration_status ?? undefined,
    class_number: personal.class_number ?? personal.classroom?.label ?? undefined,
    grade: personal.grade_label ?? personal.grade?.name ?? undefined,
    classroom: personal.classroom?.label ?? personal.classroom?.section ?? undefined,
    stage: personal.stage?.name ?? undefined,
    father_national_id: personal.father?.national_id ?? undefined,
    father_address: personal.father?.address ?? undefined,
    father_job: personal.father?.job ?? undefined,
    father_phone: personal.father?.phone ?? undefined,
    transfers: personal.transfers ?? undefined,
    fees: personal.fees ?? undefined,
    payment_voucher: personal.payment_voucher ?? undefined,
    payment_date: personal.payment_date ?? undefined,
    payment_amount:
      personal.payment_amount === null || personal.payment_amount === undefined
        ? undefined
        : String(personal.payment_amount),
  }
}

export function mapPersonalToPhoto(personal: StudentPersonal | null | undefined) {
  // Use the exact URL from the API — never rewrite /storage or invent /media paths.
  const image = personal?.image?.trim()
  if (image && !image.includes('/storage/')) return image
  return defaultProfilePhoto
}

export function mapProfileDataToUpdatePayload(
  data: ProfileData,
  image?: string | null,
): UpdateStudentProfilePayload {
  const payload: UpdateStudentProfilePayload = {
    phone: data.phone.trim() || undefined,
    father_national_id: data.fatherNationalId.trim() || undefined,
    father_address: data.fatherAddress.trim() || undefined,
    father_job: data.fatherJob.trim() || undefined,
    father_phone: data.fatherPhone.trim() || undefined,
  }

  if (image && /^https?:\/\//i.test(image)) {
    payload.image = image
  }

  return payload
}

export type StudentAbsenceDay = {
  date: string
  day_name?: string | null
  academic_year?: string | null
  note?: string | null
  classroom?: StudentNamedRef | null
  recorded_by?: string | null
}

export type StudentAbsencesSummary = {
  recorded_days: number
  present_days: number
  absence_days: number
  attendance_rate: number | null
}

export type StudentAbsencesByMonth = {
  month: string
  absence_days: number
}

export type StudentAbsencesPayload = {
  student?: {
    id?: string
    name?: string | null
    code?: string | null
    national_id?: string | null
    class_number?: string | null
    stage?: StudentNamedRef | null
    grade?: StudentNamedRef | null
    classroom?: StudentNamedRef | null
  } | null
  filters?: {
    academic_year?: string | null
    from?: string | null
    to?: string | null
  } | null
  summary: StudentAbsencesSummary
  absences: StudentAbsenceDay[]
  by_month: StudentAbsencesByMonth[]
}

export type StudentAbsencesQuery = {
  academic_year?: string
  month?: string
  date_from?: string
  date_to?: string
}

export async function getStudentProfile() {
  const response = await apiGet<StudentProfilePayload>('/v1/auth/student/profile', {
    requiresAuth: true,
  })
  return unwrapData(response)
}

export async function getStudentAbsences(query: StudentAbsencesQuery = {}) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value != null && value !== ''),
  )

  const response = await apiGet<StudentAbsencesPayload>('/v1/auth/student/profile/absences', {
    requiresAuth: true,
    params,
  })
  return unwrapData(response)
}

export async function updateStudentProfile(payload: UpdateStudentProfilePayload) {
  const response = await apiPost<StudentProfilePayload>('/v1/auth/student/profile', payload, {
    requiresAuth: true,
  })
  return unwrapData(response)
}
