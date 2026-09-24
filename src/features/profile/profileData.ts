export const profileFieldKeys = [
  'nationalId',
  'studentCode',
  'phone',
  'religion',
  'registrationStatus',
  'classNumber',
  'transfers',
  'fees',
  'paymentVoucher',
  'paymentDate',
  'paymentAmount',
  'fatherNationalId',
  'fatherAddress',
  'fatherJob',
  'fatherPhone',
  'guardianName',
  'guardianRelation',
  'guardianNationalId',
  'guardianQualification',
  'guardianJob',
  'guardianAddress',
  'governorate',
  'district',
  'city',
  'area',
  'detailedAddress',
  'alternativePhone',
] as const

export type ProfileFieldKey = (typeof profileFieldKeys)[number]
export type ProfileData = Record<ProfileFieldKey, string>

export const defaultProfilePhoto = '/student-1.png'

export const defaultProfileData: ProfileData = {
  nationalId: '',
  studentCode: '',
  phone: '',
  religion: '',
  registrationStatus: '',
  classNumber: '',
  transfers: '',
  fees: '',
  paymentVoucher: '',
  paymentDate: '',
  paymentAmount: '',
  fatherNationalId: '',
  fatherAddress: '',
  fatherJob: '',
  fatherPhone: '',
  guardianName: '',
  guardianRelation: '',
  guardianNationalId: '',
  guardianQualification: '',
  guardianJob: '',
  guardianAddress: '',
  governorate: '',
  district: '',
  city: '',
  area: '',
  detailedAddress: '',
  alternativePhone: '',
}

/** School-owned fields — cannot be changed via POST /profile */
export const readOnlyProfileFields: ProfileFieldKey[] = [
  'nationalId',
  'studentCode',
  'registrationStatus',
  'classNumber',
  'transfers',
  'fees',
  'paymentVoucher',
  'paymentDate',
  'paymentAmount',
]

export const editableProfileFields: ProfileFieldKey[] = [
  'phone',
  'religion',
  'fatherNationalId',
  'fatherAddress',
  'fatherJob',
  'fatherPhone',
  'guardianName',
  'guardianRelation',
  'guardianNationalId',
  'guardianQualification',
  'guardianJob',
  'guardianAddress',
  'governorate',
  'district',
  'city',
  'area',
  'detailedAddress',
  'alternativePhone',
]

export const fatherProfileFields = [
  'fatherNationalId',
  'fatherAddress',
  'fatherJob',
  'fatherPhone',
] as const satisfies ReadonlyArray<ProfileFieldKey>

export const guardianProfileFields = [
  'guardianName',
  'guardianRelation',
  'guardianNationalId',
  'guardianQualification',
  'guardianJob',
  'guardianAddress',
] as const satisfies ReadonlyArray<ProfileFieldKey>

export const fatherContactFields = fatherProfileFields
export const guardianContactFields = guardianProfileFields

export const addressProfileFields = [
  'governorate',
  'district',
  'city',
  'area',
  'detailedAddress',
  'alternativePhone',
] as const satisfies ReadonlyArray<ProfileFieldKey>

export const requiredContactFields = [
  ...fatherProfileFields,
  ...guardianProfileFields,
] as const satisfies ReadonlyArray<ProfileFieldKey>

function isFilled(value: string | undefined) {
  const trimmed = value?.trim()
  return Boolean(trimmed) && trimmed !== '—'
}

export function getContactCompleteness(data: ProfileData) {
  const missingFather = fatherProfileFields.filter((key) => !isFilled(data[key]))
  const missingGuardian = guardianProfileFields.filter((key) => !isFilled(data[key]))

  return {
    missingFather,
    missingGuardian,
    fatherIncomplete: missingFather.length > 0,
    guardianIncomplete: missingGuardian.length > 0,
    incomplete: missingFather.length > 0 || missingGuardian.length > 0,
    missingFields: requiredContactFields.filter((key) => !isFilled(data[key])),
  }
}

export function isProfileFieldFilled(value: string | undefined) {
  return isFilled(value)
}
