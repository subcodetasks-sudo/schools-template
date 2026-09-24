import { apiGet, apiPost, apiUpload, unwrapData } from '@/lib/api'
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
  guardian?: {
    name?: string | null
    relation?: string | null
    national_id?: string | null
    qualification?: string | null
    job?: string | null
    address?: string | null
  } | null
  address?: StudentAddress | null
  documents?: StudentDocuments | null
}

export type StudentAddress = {
  governorate?: string | null
  district?: string | null
  city?: string | null
  area?: string | null
  address?: string | null
  alternative_phone?: string | null
}

export const studentDocumentCollections = [
  'student_photo',
  'birth_certificate',
  'father_id_card',
  'mother_id_card',
] as const

export type StudentDocumentCollection = (typeof studentDocumentCollections)[number]

export type StudentDocumentFile = {
  id?: number | string
  fileName?: string | null
  mimeType?: string | null
  size?: string | null
  urls?: {
    original?: string | null
    thumb?: string | null
    medium?: string | null
    large?: string | null
    webp?: string | null
  } | null
}

export type StudentDocuments = Record<StudentDocumentCollection, StudentDocumentFile[]>

export type StudentDocumentUploads = Partial<Record<StudentDocumentCollection, File[]>>

export type StudentScheduleEntry = {
  day: string
  period: number
  subject?: StudentNamedRef | null
  teacher?: { id?: string | number; name?: string | null } | null
}

export type StudentScheduleAssignment = {
  subject?: StudentNamedRef | null
  teacher?: { id?: string | number; name?: string | null } | null
}

export type StudentScheduleSlot = {
  day: string
  period: number
  assignments?: StudentScheduleAssignment[] | null
}

export type StudentSchedule = {
  id?: string
  days: string[]
  periods: number[]
  classroom?: (StudentNamedRef & {
    grade?: StudentNamedRef | null
    stage?: StudentNamedRef | null
  }) | null
  entries?: StudentScheduleEntry[] | null
  slots?: StudentScheduleSlot[] | null
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

export type StudentCallup = {
  id: string
  reason: string
  summons_date?: string | null
  academic_year?: string | null
  notes?: string | null
  created_at?: string | null
}

export type StudentProfilePayload = {
  personal: StudentPersonal
  schedule: StudentSchedule
  statistics: StudentStatistics
  callups?: StudentCallup[] | null
  success_certificate_unlocked?: boolean | null
}

export type UpdateStudentProfilePayload = {
  phone?: string
  image?: string
  religion?: string
  father_national_id?: string
  father_address?: string
  father_job?: string
  father_phone?: string
  guardian_name?: string
  guardian_relation?: string
  guardian_national_id?: string
  guardian_qualification?: string
  guardian_job?: string
  guardian_address?: string
  governorate?: string
  district?: string
  city?: string
  area?: string
  address?: string
  alternative_phone?: string
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
    guardianName: text(personal.guardian?.name, ''),
    guardianRelation: text(personal.guardian?.relation, ''),
    guardianNationalId: text(personal.guardian?.national_id, ''),
    guardianQualification: text(personal.guardian?.qualification, ''),
    guardianJob: text(personal.guardian?.job, ''),
    guardianAddress: text(personal.guardian?.address, ''),
    governorate: text(personal.address?.governorate, ''),
    district: text(personal.address?.district, ''),
    city: text(personal.address?.city, ''),
    area: text(personal.address?.area, ''),
    detailedAddress: text(personal.address?.address, ''),
    alternativePhone: text(personal.address?.alternative_phone, ''),
  }
}

export function emptyStudentDocuments(): StudentDocuments {
  return {
    student_photo: [],
    birth_certificate: [],
    father_id_card: [],
    mother_id_card: [],
  }
}

export function mapPersonalDocuments(
  personal: StudentPersonal | null | undefined,
): StudentDocuments {
  const docs = personal?.documents
  return {
    student_photo: Array.isArray(docs?.student_photo) ? docs.student_photo : [],
    birth_certificate: Array.isArray(docs?.birth_certificate) ? docs.birth_certificate : [],
    father_id_card: Array.isArray(docs?.father_id_card) ? docs.father_id_card : [],
    mother_id_card: Array.isArray(docs?.mother_id_card) ? docs.mother_id_card : [],
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
    guardian_name: personal.guardian?.name ?? undefined,
    guardian_relation: personal.guardian?.relation ?? undefined,
    guardian_national_id: personal.guardian?.national_id ?? undefined,
    guardian_qualification: personal.guardian?.qualification ?? undefined,
    guardian_job: personal.guardian?.job ?? undefined,
    guardian_address: personal.guardian?.address ?? undefined,
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

function filledText(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed === '—') return undefined
  return trimmed
}

function assignFilled(
  payload: UpdateStudentProfilePayload,
  key: keyof UpdateStudentProfilePayload,
  value: string | undefined,
) {
  const next = filledText(value)
  if (next) payload[key] = next
}

export const profileApiFieldMap = {
  phone: 'phone',
  religion: 'religion',
  father_national_id: 'fatherNationalId',
  father_address: 'fatherAddress',
  father_job: 'fatherJob',
  father_phone: 'fatherPhone',
  guardian_name: 'guardianName',
  guardian_relation: 'guardianRelation',
  guardian_national_id: 'guardianNationalId',
  guardian_qualification: 'guardianQualification',
  guardian_job: 'guardianJob',
  guardian_address: 'guardianAddress',
  governorate: 'governorate',
  district: 'district',
  city: 'city',
  area: 'area',
  address: 'detailedAddress',
  alternative_phone: 'alternativePhone',
} as const satisfies Record<string, keyof ProfileData>

export function mapApiFieldToProfileKey(field: string): keyof ProfileData | undefined {
  const normalized = field.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized in profileApiFieldMap) {
    return profileApiFieldMap[normalized as keyof typeof profileApiFieldMap]
  }

  const last = normalized.split('.').pop()
  if (last && last in profileApiFieldMap) {
    return profileApiFieldMap[last as keyof typeof profileApiFieldMap]
  }

  return undefined
}

export function mapProfileDataToUpdatePayload(
  data: ProfileData,
  image?: string | null,
): UpdateStudentProfilePayload {
  const payload: UpdateStudentProfilePayload = {}

  assignFilled(payload, 'phone', data.phone)
  assignFilled(payload, 'religion', data.religion)
  assignFilled(payload, 'father_national_id', data.fatherNationalId)
  assignFilled(payload, 'father_address', data.fatherAddress)
  assignFilled(payload, 'father_job', data.fatherJob)
  assignFilled(payload, 'father_phone', data.fatherPhone)
  payload.guardian_name = data.guardianName.trim()
  payload.guardian_relation = data.guardianRelation.trim()
  payload.guardian_national_id = data.guardianNationalId.trim()
  payload.guardian_qualification = data.guardianQualification.trim()
  payload.guardian_job = data.guardianJob.trim()
  payload.guardian_address = data.guardianAddress.trim()
  assignFilled(payload, 'governorate', data.governorate)
  assignFilled(payload, 'district', data.district)
  assignFilled(payload, 'city', data.city)
  assignFilled(payload, 'area', data.area)
  assignFilled(payload, 'address', data.detailedAddress)
  assignFilled(payload, 'alternative_phone', data.alternativePhone)

  if (image && /^https?:\/\//i.test(image)) {
    payload.image = image
  }

  return payload
}

export function hasDocumentUploads(files?: StudentDocumentUploads | null) {
  if (!files) return false
  return studentDocumentCollections.some((key) => (files[key]?.length ?? 0) > 0)
}

export function buildProfileFormData(
  payload: UpdateStudentProfilePayload,
  files?: StudentDocumentUploads,
) {
  const form = new FormData()

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    form.append(key, String(value))
  }

  if (files) {
    for (const collection of studentDocumentCollections) {
      for (const file of files[collection] ?? []) {
        form.append(`documents[${collection}][]`, file)
      }
    }
  }

  return form
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

export type StudentWeeklyAssessmentTerm = 'first' | 'second'

export type StudentWeeklyAssessmentMonth =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december'

export type StudentWeeklyAssessmentSubject = {
  id: number
  name: string
  code?: string | null
}

export type StudentWeeklyAssessmentBucket = {
  subject?: StudentWeeklyAssessmentSubject
  term?: StudentWeeklyAssessmentTerm | string
  sessions: number
  score: number
  max: number
  percentage: number | null
}

export type StudentWeeklyAssessmentEntry = {
  id: string
  session_id?: string
  subject?: StudentWeeklyAssessmentSubject | null
  academic_year?: string | null
  term?: StudentWeeklyAssessmentTerm | string | null
  month?: StudentWeeklyAssessmentMonth | string | null
  week?: number | null
  week_date?: string | null
  is_absent?: boolean
  scores: Record<string, number | null>
  total: number
  max_total: number
  percentage: number | null
}

export type StudentWeeklyAssessmentsPayload = {
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
    term?: StudentWeeklyAssessmentTerm | string | null
    subject_id?: number | null
    month?: StudentWeeklyAssessmentMonth | string | null
  } | null
  summary: {
    sessions_count: number
    total_score: number
    total_max: number
    percentage: number | null
    by_subject: StudentWeeklyAssessmentBucket[]
    by_term: StudentWeeklyAssessmentBucket[]
  }
  entries: StudentWeeklyAssessmentEntry[]
}

export type StudentWeeklyAssessmentsQuery = {
  academic_year?: string
  term?: StudentWeeklyAssessmentTerm | string
  subject_id?: number | string
  month?: StudentWeeklyAssessmentMonth | string
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

export type StudentLessonAbsence = {
  date: string
  day_name?: string | null
  academic_year?: string | null
  period?: number | null
  period_label?: string | null
  subject?: (StudentNamedRef & { code?: string | null }) | null
  recorded_by?: string | null
}

export type StudentLessonAbsencesSummary = {
  recorded_lessons: number
  present_lessons: number
  absence_lessons: number
  attendance_rate: number | null
}

export type StudentLessonAbsencesByMonth = {
  month: string
  absence_lessons: number
}

export type StudentLessonAbsencesPayload = {
  filters?: {
    academic_year?: string | null
    from?: string | null
    to?: string | null
  } | null
  summary: StudentLessonAbsencesSummary
  absences: StudentLessonAbsence[]
  by_month: StudentLessonAbsencesByMonth[]
}

export type StudentAnnualReportPayload = {
  academic_year?: string | null
  attendance?: {
    daily?: StudentAbsencesPayload | null
    lessons?: StudentLessonAbsencesPayload | null
  } | null
}

export async function getStudentAnnualReport(academicYear?: string) {
  const response = await apiGet<StudentAnnualReportPayload>(
    '/v1/auth/student/profile/annual-report',
    {
      requiresAuth: true,
      params: academicYear ? { academic_year: academicYear } : undefined,
    },
  )
  return unwrapData(response)
}

const PERIOD_LABELS: Record<string, number> = {
  الأولى: 1,
  الاولى: 1,
  first: 1,
  '1st': 1,
  '1': 1,
  الثانية: 2,
  second: 2,
  '2nd': 2,
  '2': 2,
  الثالثة: 3,
  third: 3,
  '3rd': 3,
  '3': 3,
  الرابعة: 4,
  fourth: 4,
  '4th': 4,
  '4': 4,
  الخامسة: 5,
  fifth: 5,
  '5th': 5,
  '5': 5,
  السادسة: 6,
  sixth: 6,
  '6th': 6,
  '6': 6,
  السابعة: 7,
  seventh: 7,
  '7th': 7,
  '7': 7,
  الثامنة: 8,
  eighth: 8,
  '8th': 8,
  '8': 8,
}

const ABSENCE_NOTICE_RE =
  /(?:في|in|en)\s+(.+?)\s+[-–]\s+(.+?)\s+(?:بتاريخ|on|le)\s+(\d{4}-\d{2}-\d{2})/i

function isAbsenceNotification(item: { type?: string; title?: string; body?: string }) {
  if (item.type && item.type !== 'attendance') return false
  const text = `${item.title ?? ''} ${item.body ?? ''}`
  return /غياب|absent|absence/i.test(text) && !/حضور|present/i.test(item.title ?? '')
}

function resolvePeriod(label: string) {
  const trimmed = label.trim()
  const mapped = PERIOD_LABELS[trimmed] ?? PERIOD_LABELS[trimmed.toLowerCase()]
  if (mapped) return { period: mapped, period_label: trimmed }
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && numeric > 0) return { period: numeric, period_label: trimmed }
  return { period: null, period_label: trimmed || null }
}

function academicYearFromDate(date: string) {
  const [year, month] = date.split('-').map(Number)
  if (!year || !month) return null
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

function dayNameFromDate(date: string) {
  const value = new Date(`${date}T00:00:00`)
  if (Number.isNaN(value.getTime())) return null
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(value)
}

function emptyLessonAbsences(academicYear?: string | null): StudentLessonAbsencesPayload {
  return {
    filters: { academic_year: academicYear ?? null, from: null, to: null },
    summary: {
      recorded_lessons: 0,
      present_lessons: 0,
      absence_lessons: 0,
      attendance_rate: null,
    },
    absences: [],
    by_month: [],
  }
}

export function buildLessonAbsencesFromNotifications(
  items: Array<{ type?: string; title?: string; body?: string; createdAt?: string }>,
  academicYear?: string | null,
): StudentLessonAbsencesPayload {
  const seen = new Set<string>()
  const absences: StudentLessonAbsence[] = []

  for (const item of items) {
    if (!isAbsenceNotification(item)) continue
    const match = item.body?.match(ABSENCE_NOTICE_RE)
    if (!match) continue

    const subjectName = match[1]?.trim()
    const periodInfo = resolvePeriod(match[2] ?? '')
    const date = match[3]
    const key = `${date}|${subjectName}|${periodInfo.period ?? periodInfo.period_label}`
    if (seen.has(key)) continue
    seen.add(key)

    absences.push({
      date,
      day_name: dayNameFromDate(date),
      academic_year: academicYearFromDate(date) ?? academicYear ?? null,
      period: periodInfo.period,
      period_label: periodInfo.period_label,
      subject: subjectName ? { name: subjectName } : null,
    })
  }

  absences.sort((a, b) => b.date.localeCompare(a.date))

  const byMonthMap = new Map<string, number>()
  for (const row of absences) {
    const month = row.date.slice(0, 7)
    byMonthMap.set(month, (byMonthMap.get(month) ?? 0) + 1)
  }

  return {
    filters: {
      academic_year: academicYear ?? absences[0]?.academic_year ?? null,
      from: null,
      to: null,
    },
    summary: {
      recorded_lessons: absences.length,
      present_lessons: 0,
      absence_lessons: absences.length,
      attendance_rate: null,
    },
    absences,
    by_month: [...byMonthMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, absence_lessons]) => ({ month, absence_lessons })),
  }
}

export async function getStudentLessonAbsences(academicYear?: string) {
  const report = await getStudentAnnualReport(academicYear)
  const official = report.attendance?.lessons
  if ((official?.absences?.length ?? 0) > 0) {
    return {
      ...official!,
      filters: official?.filters ?? {
        academic_year: report.academic_year ?? academicYear ?? null,
        from: null,
        to: null,
      },
    }
  }

  const { getNotifications } = await import('@/features/notifications/notificationsApi')
  const page = await getNotifications({ per_page: 50, page: 1 })
  const fallback = buildLessonAbsencesFromNotifications(
    page.items,
    official?.filters?.academic_year ?? report.academic_year ?? academicYear,
  )

  if (fallback.absences.length > 0) return fallback
  return official ?? emptyLessonAbsences(report.academic_year ?? academicYear)
}

export async function getStudentWeeklyAssessments(query: StudentWeeklyAssessmentsQuery = {}) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value != null && value !== ''),
  )

  const response = await apiGet<StudentWeeklyAssessmentsPayload>(
    '/v1/auth/student/profile/weekly-assessments',
    {
      requiresAuth: true,
      params,
    },
  )
  return unwrapData(response)
}

export type StudentMonthlyAssessmentRow = {
  month?: StudentWeeklyAssessmentMonth | string | null
  term?: StudentWeeklyAssessmentTerm | string | null
  academic_year?: string | null
  subject?: StudentWeeklyAssessmentSubject | null
  sessions?: number
  score?: number
  max?: number
  scores?: Record<string, number | null> | null
  total?: number | null
  max_total?: number | null
  percentage?: number | null
}

export type StudentMonthlyAssessmentsPayload = {
  student?: StudentWeeklyAssessmentsPayload['student']
  filters?: {
    academic_year?: string | null
    term?: StudentWeeklyAssessmentTerm | string | null
    subject_id?: number | null
  } | null
  summary: {
    months_count?: number | null
    subjects_count?: number | null
    total_score?: number | null
    total_max?: number | null
    percentage?: number | null
    by_subject?: StudentWeeklyAssessmentBucket[]
    by_month?: StudentWeeklyAssessmentBucket[]
  }
  months: StudentMonthlyAssessmentRow[]
}

export type StudentMonthlyAssessmentsQuery = {
  academic_year?: string
  term?: StudentWeeklyAssessmentTerm | string
  subject_id?: number | string
}

export async function getStudentMonthlyAssessments(query: StudentMonthlyAssessmentsQuery = {}) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value != null && value !== ''),
  )

  const response = await apiGet<StudentMonthlyAssessmentsPayload>(
    '/v1/auth/student/profile/monthly-assessments',
    {
      requiresAuth: true,
      params,
    },
  )
  return unwrapData(response)
}

export type StudentFeeMoney = {
  net_amount?: number | string | null
  net?: number | string | null
  amount?: number | string | null
  paid_amount?: number | string | null
  paid?: number | string | null
  remaining_amount?: number | string | null
  remaining?: number | string | null
}

export type StudentSeparateFeePayment = {
  id?: string | number
  kind?: string | null
  label?: string | null
  amount?: number | string | null
  paid_at?: string | null
  date?: string | null
  method?: string | null
}

export type StudentFeesPayload = {
  academic_year?: string | null
  student?: {
    id?: string
    name?: string | null
    code?: string | null
  } | null
  tuition?: StudentFeeMoney | null
  separate?: {
    paid_amount?: number | string | null
    payments?: StudentSeparateFeePayment[] | null
  } | null
}

function asMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function readTuitionTotals(tuition: StudentFeeMoney | null | undefined) {
  return {
    net: asMoney(tuition?.net_amount ?? tuition?.net ?? tuition?.amount),
    paid: asMoney(tuition?.paid_amount ?? tuition?.paid),
    remaining: asMoney(tuition?.remaining_amount ?? tuition?.remaining),
  }
}

export async function getStudentFees() {
  const response = await apiGet<StudentFeesPayload>('/v1/auth/student/profile/fees', {
    requiresAuth: true,
  })
  return unwrapData(response)
}

export async function updateStudentProfile(
  payload: UpdateStudentProfilePayload,
  files?: StudentDocumentUploads,
) {
  if (hasDocumentUploads(files)) {
    const response = await apiUpload<StudentProfilePayload>(
      '/v1/auth/student/profile',
      buildProfileFormData(payload, files),
      { requiresAuth: true },
    )
    return unwrapData(response)
  }

  const response = await apiPost<StudentProfilePayload>('/v1/auth/student/profile', payload, {
    requiresAuth: true,
  })
  return unwrapData(response)
}
