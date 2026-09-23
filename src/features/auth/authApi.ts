import { apiPost, unwrapData } from '@/lib/api'

export type RegisterStep1Payload =
  | { national_id: string; code: string; passport_number?: never }
  | { passport_number: string; code: string; national_id?: never }

export type RegisterStep1Result = {
  token: string
  expires_in?: number
  student: {
    name?: string
    code?: string
    national_id?: string | null
    passport_number?: string | null
  }
}

export type RegisterStep2Payload = {
  token: string
  phone: string
  password: string
  confirm_password: string
}

export type AuthUser = {
  id?: number | string
  type?: string
  role?: string
  name?: string
  national_id?: string
  nationalId?: string
  phone?: string
  code?: string
  email?: string
  image?: string
  religion?: string
  status?: string
  class_number?: string
  grade?: string
  classroom?: string
  stage?: string
  father_name?: string
  father_national_id?: string
  father_address?: string
  father_job?: string
  father_phone?: string
  transfers?: string
  fees?: string
  payment_voucher?: string
  payment_date?: string
  payment_amount?: string
}

export type AuthSessionResult = {
  token: string
  user: AuthUser
  expires_at?: string
}

export type LoginPayload = {
  code: string
  password: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function readNamed(value: unknown) {
  if (typeof value === 'string') return value
  const record = asRecord(value)
  return readString(record?.name, record?.title, record?.label)
}

function flattenAuthPayload(raw: unknown): Record<string, unknown> {
  let data = asRecord(raw) ?? {}

  const nested = asRecord(data.data)
  if (
    nested &&
    (nested.token ||
      nested.access_token ||
      nested.accessToken ||
      nested.user ||
      nested.student)
  ) {
    data = { ...data, ...nested }
  }

  return data
}

function extractAuthToken(data: Record<string, unknown>): string | null {
  const user = asRecord(data.user)
  const auth = asRecord(data.auth)
  const candidates = [
    data.token,
    data.access_token,
    data.accessToken,
    user?.token,
    user?.access_token,
    user?.accessToken,
    auth?.token,
    auth?.access_token,
    auth?.accessToken,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

function pickStudentSource(data: Record<string, unknown>) {
  const user = asRecord(data.user)
  const student =
    asRecord(data.student) ??
    asRecord(user?.student) ??
    asRecord(data.profile) ??
    null
  const guardian = asRecord(data.guardian) ?? asRecord(student?.guardian)
  const father = asRecord(guardian?.father) ?? asRecord(data.father)
  const additional = asRecord(data.additional) ?? asRecord(student?.additional)

  return { user, student, father, additional, root: data }
}

export function normalizeUser(raw: unknown, fallback: Partial<AuthUser> = {}): AuthUser {
  const data = flattenAuthPayload(raw)
  const { user, student, father, additional, root } = pickStudentSource(data)
  const source = { ...root, ...user, ...student }

  const nationalId = readString(
    source.national_id,
    source.nationalId,
    fallback.national_id,
    fallback.nationalId,
  )

  return {
    id: (source.id as AuthUser['id']) ?? fallback.id,
    type: readString(source.type, fallback.type) ?? 'student',
    role: readString(source.role, fallback.role) ?? 'student',
    name: readString(source.name, fallback.name),
    national_id: nationalId,
    nationalId,
    phone: readString(source.phone, fallback.phone),
    code: readString(source.code, source.student_code, fallback.code),
    email: readString(source.email, fallback.email),
    image: readString(source.image, source.avatar, source.photo, fallback.image),
    religion: readString(source.religion, fallback.religion),
    status: readString(source.status, source.registration_status, fallback.status),
    class_number: readString(source.class_number, source.classNumber, fallback.class_number),
    grade: readNamed(source.grade) ?? fallback.grade,
    classroom: readNamed(source.classroom) ?? fallback.classroom,
    stage: readNamed(source.stage) ?? fallback.stage,
    father_name: readString(father?.name, source.father_name, fallback.father_name),
    father_national_id: readString(
      father?.national_id,
      source.father_national_id,
      fallback.father_national_id,
    ),
    father_address: readString(father?.address, source.father_address, fallback.father_address),
    father_job: readString(father?.job, source.father_job, fallback.father_job),
    father_phone: readString(father?.phone, source.father_phone, fallback.father_phone),
    transfers: readString(
      additional?.school_transfers,
      source.school_transfers,
      source.transfers,
      fallback.transfers,
    ),
    fees: readString(additional?.school_fees, source.school_fees, source.fees, fallback.fees),
    payment_voucher: readString(
      additional?.payment_receipt_number,
      source.payment_receipt_number,
      source.payment_voucher,
      fallback.payment_voucher,
    ),
    payment_date: readString(
      additional?.payment_date,
      source.payment_date,
      fallback.payment_date,
    ),
    payment_amount: readString(
      additional?.payment_amount,
      source.payment_amount,
      fallback.payment_amount,
    ),
  }
}

function normalizeSession(
  raw: unknown,
  fallback: Partial<AuthUser> = {},
): AuthSessionResult {
  const data = flattenAuthPayload(raw)
  const token = extractAuthToken(data)

  if (!token) {
    throw new Error('Auth token missing from response')
  }

  return {
    token,
    user: normalizeUser(data, fallback),
    expires_at: typeof data.expires_at === 'string' ? data.expires_at : undefined,
  }
}

export async function registerStep1(payload: RegisterStep1Payload) {
  const response = await apiPost<RegisterStep1Result>(
    '/v1/auth/student/register/step1',
    payload,
    { skipAuth: true, requiresAuth: false },
  )
  const data = unwrapData(response)
  const token = typeof data?.token === 'string' ? data.token : null

  if (!token) {
    throw new Error('Registration token missing from response')
  }

  return {
    ...data,
    token,
    student: data.student ?? {
      name: undefined,
      code: payload.code,
      national_id: 'national_id' in payload ? payload.national_id : null,
      passport_number: 'passport_number' in payload ? payload.passport_number : null,
    },
  } satisfies RegisterStep1Result
}

export async function registerStep2(payload: RegisterStep2Payload) {
  const body = {
    token: payload.token,
    phone: payload.phone,
    password: payload.password,
    confirm_password: payload.confirm_password,
  }

  const response = await apiPost<unknown>('/v1/auth/student/register/step2', body, {
    skipAuth: true,
    requiresAuth: false,
    headers: {
      Authorization: `Bearer ${payload.token}`,
    },
  })
  const data = unwrapData(response)

  try {
    return normalizeSession(data, {
      phone: payload.phone,
      role: 'student',
      type: 'student',
    })
  } catch {
    return null
  }
}

export async function loginRequest(payload: LoginPayload) {
  const response = await apiPost<unknown>('/v1/auth/login', payload, {
    skipAuth: true,
    requiresAuth: false,
  })
  return normalizeSession(unwrapData(response), {
    code: payload.code,
    role: 'student',
    type: 'student',
  })
}

export async function fetchCurrentUser() {
  try {
    const { getStudentProfile, mapPersonalToAuthUser } = await import(
      '@/features/profile/studentProfileApi'
    )
    const profile = await getStudentProfile()
    return mapPersonalToAuthUser(profile.personal)
  } catch {
    return null
  }
}

export async function logoutRequest() {
  try {
    await apiPost('/v1/auth/logout', undefined, { requiresAuth: true })
  } catch {
    // Local logout should still succeed if the token is already invalid.
  }
}

export function formatStudentAccountId(nationalId: string) {
  return nationalId
}

export function getUserInitials(name?: string | null) {
  if (!name?.trim()) return '؟'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
}

export function toE164EgyptPhone(localDigits: string) {
  const digits = localDigits.replace(/\D/g, '').replace(/^0+/, '')
  return `+20${digits}`
}
