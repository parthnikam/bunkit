import type {
  AppSettings,
  AttendanceMarks,
  DateKey,
  PlannedAbsences,
  SubjectRecord,
  WeeklyTimetable,
} from '@/lib/models/attendance'
import { isSemesterColumn, type SemesterColumn } from '@/lib/models/semester'
import { withSemesterMetricsForSubjects } from '@/lib/logic/semester-metrics'
import { createClient } from '@/lib/server'

type StoredSemesterSettings = {
  start_date?: DateKey
  end_date?: DateKey
  minimum_attendance?: number
  recommended_attendance?: number
  holidays?: DateKey[]
  holiday_ranges?: { start: DateKey; end: DateKey }[]
  timetable?: WeeklyTimetable
  absences?: PlannedAbsences
  marks?: AttendanceMarks
  subjects?: SubjectRecord[]
}

export type CurrentSemesterData = {
  absences: PlannedAbsences
  currentSemester: SemesterColumn
  hasTimetableInfo: boolean
  settings: AppSettings
  marks: AttendanceMarks
  subjects: SubjectRecord[]
}

const emptyTimetable: WeeklyTimetable = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
}

const fallbackSettings: AppSettings = {
  semesterStart: '20260701',
  semesterEnd: '20261130',
  minimumAttendance: 75,
  recommendedAttendance: 80,
  holidays: [],
  holidayRanges: [],
  timetable: emptyTimetable,
}

function normalizeSettings(stored?: StoredSemesterSettings | null): AppSettings {
  return {
    semesterStart: stored?.start_date ?? fallbackSettings.semesterStart,
    semesterEnd: stored?.end_date ?? fallbackSettings.semesterEnd,
    minimumAttendance: stored?.minimum_attendance ?? fallbackSettings.minimumAttendance,
    recommendedAttendance: stored?.recommended_attendance ?? fallbackSettings.recommendedAttendance,
    holidays: stored?.holidays ?? fallbackSettings.holidays,
    holidayRanges: stored?.holiday_ranges ?? fallbackSettings.holidayRanges,
    timetable: stored?.timetable ?? fallbackSettings.timetable,
  }
}

function subjectsFromTimetable(timetable: WeeklyTimetable, storedSubjects: SubjectRecord[] = []): SubjectRecord[] {
  const names = new Set<string>()
  const storedByName = new Map(storedSubjects.map((subject) => [subject.name, subject]))

  for (const slots of Object.values(timetable)) {
    for (const slot of slots ?? []) {
      if (slot.subject.trim()) {
        names.add(slot.subject.trim().toUpperCase())
      }
    }
  }

  const subjects = Array.from(names)
    .sort()
    .map((name) => storedByName.get(name) ?? {
      name,
      attended: 0,
      missed: 0,
      totalClasses: 0,
      remainingSkips: 0,
      attendancePercentage: 100,
    })

  return subjects
}

export function hasTimetableInfo(timetable: WeeklyTimetable): boolean {
  return Object.values(timetable).some((slots) =>
    (slots ?? []).some((slot) => slot.subject.trim().length > 0)
  )
}

export async function getCurrentSemesterData(): Promise<CurrentSemesterData> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    return {
      absences: {},
      currentSemester: 'sem1',
      hasTimetableInfo: false,
      marks: {},
      settings: fallbackSettings,
      subjects: [],
    }
  }

  const { data } = await supabase
    .from('TIMETABLE')
    .select('current_sem, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const row = data as Record<string, unknown> | null
  const currentSemester: SemesterColumn = isSemesterColumn(row?.current_sem) ? row.current_sem : 'sem1'
  const stored = (row?.[currentSemester] ?? null) as StoredSemesterSettings | null
  const settings = normalizeSettings(stored)
  const subjects = withSemesterMetricsForSubjects(
    subjectsFromTimetable(settings.timetable, stored?.subjects),
    settings
  )

  return {
    absences: stored?.absences ?? {},
    currentSemester,
    hasTimetableInfo: hasTimetableInfo(settings.timetable),
    marks: stored?.marks ?? {},
    settings,
    subjects,
  }
}
