export type CertificateColor = 'blue' | 'green' | 'yellow' | 'red'

export type GradeRow = {
  key: string
  assessment: number
  written: number
  final: number
  color: CertificateColor
}

export type ActivityRow = {
  key: string
  score: number
}

export const certificateReport = {
  student: {
    name: 'ابن محمد يس محمد المغربي',
    seatNumber: '494208280',
    className: 'A',
  },
  summary: {
    totalSubjects: 5,
    successSubjects: 5,
    failureSubjects: 0,
  },
  mainSubjects: [
    { key: 'arabic', assessment: 40, written: 60, final: 100, color: 'blue' },
    { key: 'english', assessment: 40, written: 60, final: 100, color: 'blue' },
    { key: 'math', assessment: 40, written: 60, final: 100, color: 'blue' },
  ] satisfies GradeRow[],
  basicTotal: '300/300',
  additionalSubjects: [
    { key: 'advancedEnglish', assessment: 40, written: 60, final: 100, color: 'blue' },
  ] satisfies GradeRow[],
  grandTotal: '400/400',
  religion: {
    key: 'religiousEducation',
    assessment: 40,
    written: 60,
    final: 100,
    color: 'blue',
  } satisfies GradeRow,
  activities: [
    { key: 'vocational', score: 100 },
    { key: 'physical', score: 20 },
    { key: 'tokkatsu', score: 100 },
    { key: 'art', score: 20 },
  ] satisfies ActivityRow[],
  signatures: [
    { key: 'computerOfficer', name: 'هيثم بسيوني' },
    { key: 'committeeHead', name: 'نادية عزمي' },
    { key: 'principal', name: 'مروة حامد' },
  ] as const,
}

export const colorLegend: Array<{
  color: CertificateColor
  rangeKey: string
}> = [
  { color: 'blue', rangeKey: 'blue' },
  { color: 'green', rangeKey: 'green' },
  { color: 'yellow', rangeKey: 'yellow' },
  { color: 'red', rangeKey: 'red' },
]

export const colorStyles: Record<CertificateColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
}
