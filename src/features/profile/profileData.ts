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
] as const

export type ProfileFieldKey = (typeof profileFieldKeys)[number]
export type ProfileData = Record<ProfileFieldKey, string>

export const defaultProfilePhoto = '/student-1.png'

export const defaultProfileData: ProfileData = {
  nationalId: '30101011234567',
  studentCode: '234455',
  phone: '01034678890',
  religion: 'مسلم',
  registrationStatus: 'نشط',
  classNumber: '2 / أ',
  transfers: 'لا يوجد',
  fees: 'مدفوعة',
  paymentVoucher: 'INV-88421',
  paymentDate: '12 يناير 2026',
  paymentAmount: '4500 جنيه',
  fatherNationalId: '27001011234567',
  fatherAddress: 'المنصورة، مصر',
  fatherJob: 'مهندس',
  fatherPhone: '01011223344',
  guardianName: '',
  guardianRelation: '',
  guardianNationalId: '',
  guardianQualification: '',
  guardianJob: '',
  guardianAddress: '',
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

/** Matches editable keys in docs/student-profile-api.md §4 */
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

function isFilled(value: string | undefined) {
  const trimmed = value?.trim()
  return Boolean(trimmed) && trimmed !== '—'
}

export function getContactCompleteness(data: ProfileData) {
  const fatherIncomplete = fatherProfileFields.some((key) => !isFilled(data[key]))
  const guardianIncomplete = guardianProfileFields.some((key) => !isFilled(data[key]))

  return {
    fatherIncomplete,
    guardianIncomplete,
    incomplete: fatherIncomplete || guardianIncomplete,
  }
}
