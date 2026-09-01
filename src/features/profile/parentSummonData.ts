export type ParentSummonNotice = {
  id: string
  reference: string
  schoolName: string
  academicYear: string
  className: string
  parentName: string
  reason: string
  messageKey: 'urgent' | 'academic' | 'behavior'
  issuedAt: string
  studentAffairsOfficer: string
  stageVicePrincipal: string
  principal: string
  educationalAdministration: string
}

export const parentSummonNotices: ParentSummonNotice[] = [
  {
    id: 'summon-1',
    reference: '2026/091',
    schoolName: 'مدرسة المنصورة المتميزة للغات 2',
    academicYear: '2026/2027',
    className: '2/1',
    parentName: 'محمد يس محمد المغربي',
    reason: 'الحضور للأهمية القصوى لمناقشة أمر يخص الطالب/ة.',
    messageKey: 'urgent',
    issuedAt: '2026-09-01',
    studentAffairsOfficer: 'نادية عزمي',
    stageVicePrincipal: 'مروة حامد',
    principal: 'مروة حامد',
    educationalAdministration: 'إدارة غرب المنصورة التعليمية',
  },
  {
    id: 'summon-2',
    reference: '2026/074',
    schoolName: 'مدرسة المنصورة المتميزة للغات 2',
    academicYear: '2026/2027',
    className: '2/2',
    parentName: 'محمد يس محمد المغربي',
    reason: 'مناقشة المستوى الدراسي للطالب/ة واتخاذ الإجراءات اللازمة.',
    messageKey: 'academic',
    issuedAt: '2026-08-22',
    studentAffairsOfficer: 'نادية عزمي',
    stageVicePrincipal: 'مروة حامد',
    principal: 'مروة حامد',
    educationalAdministration: 'إدارة غرب المنصورة التعليمية',
  },
  {
    id: 'summon-3',
    reference: '2026/058',
    schoolName: 'مدرسة المنصورة المتميزة للغات 2',
    academicYear: '2026/2027',
    className: '2/2',
    parentName: 'محمد يس محمد المغربي',
    reason: 'مناقشة بعض الملاحظات السلوكية والتعاون لتحسين أداء الطالب/ة.',
    messageKey: 'behavior',
    issuedAt: '2026-08-15',
    studentAffairsOfficer: 'نادية عزمي',
    stageVicePrincipal: 'مروة حامد',
    principal: 'مروة حامد',
    educationalAdministration: 'إدارة غرب المنصورة التعليمية',
  },
]
