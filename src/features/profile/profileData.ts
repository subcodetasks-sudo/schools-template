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
}

export const readOnlyProfileFields: ProfileFieldKey[] = [
  'nationalId',
  'studentCode',
  'registrationStatus',
  'transfers',
  'fees',
  'paymentVoucher',
  'paymentDate',
  'paymentAmount',
]
