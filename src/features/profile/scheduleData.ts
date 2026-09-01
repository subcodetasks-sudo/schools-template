export type ScheduleLesson = {
  subjectKey: string
  teacher: string
}

export type DayKey =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'

export const scheduleDays: DayKey[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
]

export const scheduleTimeSlots = [
  { start: '8:45', end: '9:30' },
  { start: '9:35', end: '10:20' },
  { start: '10:30', end: '11:15' },
  { start: '11:20', end: '12:05' },
  { start: '12:30', end: '1:15' },
  { start: '1:20', end: '2:05' },
  { start: '2:15', end: '3:00' },
] as const

const teachers = [
  'أ/ محمد الجندي',
  'أ/ سارة أحمد',
  'أ/ خالد حسن',
  'أ/ نورهان محمود',
  'أ/ أحمد فتحي',
  'أ/ فاطمة علي',
  'أ/ ياسر إبراهيم',
  'أ/ منى السيد',
  'أ/ عمر رفعت',
  'أ/ هبة ناصر',
  'أ/ كريم عبد الله',
  'أ/ رانيا توفيق',
  'أ/ محمود سامي',
  'أ/ دينا كمال',
  'أ/ طارق عادل',
] as const

let teacherIndex = 0

function nextTeacher() {
  const teacher = teachers[teacherIndex % teachers.length]
  teacherIndex += 1
  return teacher
}

function lesson(subjectKey: string): ScheduleLesson {
  return { subjectKey, teacher: nextTeacher() }
}

export const scheduleByDay: Record<DayKey, (ScheduleLesson | null)[]> = {
  saturday: [
    lesson('arabic'),
    lesson('science'),
    lesson('english'),
    lesson('math'),
    null,
    lesson('organicChemistry'),
    lesson('islamicEducation'),
  ],
  sunday: [
    lesson('islamicEducation'),
    lesson('arabic'),
    lesson('science'),
    lesson('english'),
    lesson('math'),
    null,
    lesson('thinkingSkills'),
  ],
  monday: [
    lesson('thinkingSkills'),
    lesson('islamicEducation'),
    lesson('arabic'),
    lesson('science'),
    lesson('english'),
    lesson('math'),
    null,
  ],
  tuesday: [
    null,
    lesson('thinkingSkills'),
    lesson('islamicEducation'),
    lesson('arabic'),
    lesson('science'),
    lesson('english'),
    lesson('math'),
  ],
  wednesday: [
    lesson('math'),
    null,
    lesson('thinkingSkills'),
    lesson('islamicEducation'),
    lesson('arabic'),
    lesson('science'),
    lesson('english'),
  ],
  thursday: [
    lesson('english'),
    lesson('math'),
    null,
    lesson('thinkingSkills'),
    lesson('islamicEducation'),
    lesson('arabic'),
    lesson('science'),
  ],
}
