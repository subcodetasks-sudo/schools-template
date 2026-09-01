export type EvaluationScores = {
  performanceTasks: number
  homeworkNotebook: number
  activityNotebook: number
  weeklyEvaluation: number
  attendanceBehavior: number
}

export type SubjectEvaluation = {
  key: string
  scores: EvaluationScores
}

export type MonthEvaluation = {
  subjects: SubjectEvaluation[]
}

export const evaluationColumnMaxScores = [10, 5, 5, 5, 5] as const
export const evaluationTotalMax = 30

export const monthlyEvaluationStudent = {
  name: 'ابن محمد يس محمد المغربي',
  grade: 'الصف الأول الابتدائي',
  className: 'A',
}

const emptyMonths = new Set([2, 7, 8, 9])
const subjectKeys = ['arabic', 'english', 'math'] as const

function clamp(value: number, max: number) {
  return Math.min(max, Math.max(0, value))
}

function createScores(month: number, subjectIndex: number): EvaluationScores {
  const seed = month * 5 + subjectIndex * 3

  return {
    performanceTasks: clamp(6 + (seed % 5), 10),
    homeworkNotebook: clamp(2 + (seed % 4), 5),
    activityNotebook: clamp(2 + ((seed + 1) % 4), 5),
    weeklyEvaluation: clamp(3 + (seed % 3), 5),
    attendanceBehavior: clamp(4 + (subjectIndex % 2), 5),
  }
}

function createMonthEvaluation(month: number): MonthEvaluation {
  return {
    subjects: subjectKeys.map((key, index) => ({
      key,
      scores: createScores(month, index),
    })),
  }
}

export const monthlyEvaluationsByMonth: Partial<Record<number, MonthEvaluation>> =
  Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => index + 1)
      .filter((month) => !emptyMonths.has(month))
      .map((month) => [month, createMonthEvaluation(month)]),
  )

export function getSubjectTotal(scores: EvaluationScores) {
  return (
    scores.performanceTasks +
    scores.homeworkNotebook +
    scores.activityNotebook +
    scores.weeklyEvaluation +
    scores.attendanceBehavior
  )
}

export function getMonthGrandTotal(evaluation: MonthEvaluation) {
  return evaluation.subjects.reduce((sum, subject) => sum + getSubjectTotal(subject.scores), 0)
}
