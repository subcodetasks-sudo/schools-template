export type FinalCertificateSubjectCol = {
  id: string
  name: string
}

export type FinalCertificateSubjectCell = {
  yearWork: number | null
  finalExam: number | null
  total: number | null
  totalMax: number | null
  status: 'pass' | 'fail' | 'incomplete' | string
  finalExamPassed: boolean | null
}

export type FinalCertificateSheetRow = {
  studentId: string
  name: string
  code: string
  seatNumber: string
  classroomLabel: string
  subjects: Record<string, FinalCertificateSubjectCell>
  grandTotal: number | null
  result: 'passed' | 'failed' | 'pending'
}

export type FinalCertificateSheet = {
  subjects: FinalCertificateSubjectCol[]
  students: FinalCertificateSheetRow[]
}

export const EMPTY_SUBJECT_CELL: FinalCertificateSubjectCell = {
  yearWork: null,
  finalExam: null,
  total: null,
  totalMax: null,
  status: 'incomplete',
  finalExamPassed: null,
}

export function resolveSheetResult(
  statuses: Array<FinalCertificateSubjectCell['status']>,
): FinalCertificateSheetRow['result'] {
  if (statuses.length === 0) return 'pending'
  if (statuses.some((status) => status === 'incomplete')) return 'pending'
  if (statuses.some((status) => status === 'fail')) return 'failed'
  if (statuses.every((status) => status === 'pass')) return 'passed'
  return 'pending'
}

export function sumGrandTotal(cells: FinalCertificateSubjectCell[]) {
  const totals = cells
    .map((cell) => cell.total)
    .filter((value): value is number => value !== null && value !== undefined)
  if (totals.length === 0) return null
  return totals.reduce((sum, value) => sum + value, 0)
}

export function isFinalExamDanger(cell: FinalCertificateSubjectCell) {
  if (cell.finalExamPassed === false) return true
  if (
    cell.finalExam != null &&
    cell.totalMax != null &&
    cell.totalMax > 0 &&
    cell.finalExam < cell.totalMax * 0.25
  ) {
    return true
  }
  return false
}

/** Baccalaureate Y2/Y3 + General Secondary Y3 — school does not own this matrix. */
export function isSchoolFinalCertificateBlocked(grade?: {
  name?: string | null
  code?: string | null
  requires_track?: boolean | null
  level?: number | null
} | null) {
  if (!grade) return false
  if (grade.requires_track) return true

  const haystack = `${grade.name ?? ''} ${grade.code ?? ''}`.toLowerCase()
  const isBac =
    haystack.includes('bac') ||
    haystack.includes('بكالوريا') ||
    haystack.includes('البكالوريا')
  const isGeneralSecondary =
    haystack.includes('ثانوية عامة') ||
    haystack.includes('general secondary') ||
    (haystack.includes('ثانوي') && haystack.includes('عام'))

  const level = grade.level
  if (isBac && (level === 2 || level === 3)) return true
  if (isGeneralSecondary && level === 3) return true

  // Name-only heuristics when level is missing
  if (isBac && (haystack.includes('2') || haystack.includes('3') || haystack.includes('ثاني') || haystack.includes('ثالث'))) {
    return true
  }
  if (isGeneralSecondary && (haystack.includes('3') || haystack.includes('ثالث'))) {
    return true
  }

  return false
}
