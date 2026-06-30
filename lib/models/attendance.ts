export type DateKey = `${number}${number}${number}${number}${number}${number}${number}${number}`
export type TimeKey = `${number}${number}${number}${number}`

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type SessionStatus = 'attended' | 'missed' | 'cancelled' | 'pending'
export type DaySafety = 'holiday' | 'safe' | 'partial' | 'unsafe'

export type TimeInterval = {
  start: TimeKey
  end: TimeKey
}

export type SubjectRecord = {
  name: string
  attended: number
  missed: number
  attendancePercentage?: number
  remainingSkips?: number
  totalClasses?: number
  professor?: string
  minimumTarget?: number
  safetyTarget?: number
}

export type TimetableSlot = {
  subject: string
  weekday: WeekdayKey
  time: TimeInterval
  room?: string
}

export type WeeklyTimetable = Partial<Record<WeekdayKey, TimetableSlot[]>>

export type PlannedAbsences = Partial<Record<DateKey, string[]>>

export type AttendanceMark = {
  date: DateKey
  subject: string
  start: TimeKey
  status: SessionStatus
}

export type AttendanceMarks = Partial<Record<string, AttendanceMark>>

export type AppSettings = {
  semesterStart: DateKey
  semesterEnd: DateKey
  minimumAttendance: number
  recommendedAttendance: number
  holidays?: DateKey[]
  holidayRanges?: { start: DateKey; end: DateKey }[]
  timetable: WeeklyTimetable
}

export type PlannerSubjectImpact = {
  subject: string
  plannedMisses: number
  beforeAttendance: number
  afterAttendance: number
}

export type PlannerImpact = {
  plannedMisses: Record<string, number>
  subjects: PlannerSubjectImpact[]
  safety: DaySafety
  recommendation: string
}

export type DaySafetyResult = {
  status: DaySafety
  unsafeSubjects: string[]
  partialSubjects: string[]
  subjectImpacts: PlannerSubjectImpact[]
  unsafeSubjectImpacts: PlannerSubjectImpact[]
  partialSubjectImpacts: PlannerSubjectImpact[]
}

export type BestSkipDay = {
  date: DateKey
  status: DaySafety
  classCount: number
}
