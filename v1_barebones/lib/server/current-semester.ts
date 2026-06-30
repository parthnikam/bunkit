import type {
  AppSettings,
  DateKey,
  PlannedAbsences,
  SubjectRecord,
  WeeklyTimetable,
} from '@/lib/models/attendance'
import { isSemesterColumn, type SemesterColumn } from '@/lib/models/semester'
import { createClient } from '@/lib/server'

type StoredSemesterSettings = {
  start_date?: DateKey
  end_date?: DateKey
  minimum_attendance?: number
  recommended_attendance?: number
  holidays?: DateKey[]
  timetable?: WeeklyTimetable
  absences?: PlannedAbsences
}

export type CurrentSemesterData = {
  absences: PlannedAbsences
  currentSemester: SemesterColumn
  settings: AppSettings
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
  timetable: emptyTimetable,
}

function normalizeSettings(stored?: StoredSemesterSettings | null): AppSettings {
  return {
    semesterStart: stored?.start_date ?? fallbackSettings.semesterStart,
    semesterEnd: stored?.end_date ?? fallbackSettings.semesterEnd,
    minimumAttendance: stored?.minimum_attendance ?? fallbackSettings.minimumAttendance,
    recommendedAttendance: stored?.recommended_attendance ?? fallbackSettings.recommendedAttendance,
    holidays: stored?.holidays ?? fallbackSettings.holidays,
    timetable: stored?.timetable ?? fallbackSettings.timetable,
  }
}

function subjectsFromTimetable(timetable: WeeklyTimetable): SubjectRecord[] {
  const names = new Set<string>()

  for (const slots of Object.values(timetable)) {
    for (const slot of slots ?? []) {
      if (slot.subject.trim()) {
        names.add(slot.subject.trim().toUpperCase())
      }
    }
  }

  return Array.from(names)
    .sort()
    .map((name) => ({
      name,
      attended: 0,
      missed: 0,
    }))
}

export async function getCurrentSemesterData(): Promise<CurrentSemesterData> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    return {
      absences: {},
      currentSemester: 'sem1',
      settings: fallbackSettings,
      subjects: [],
    }
  }

  const { data } = await supabase
    .from('TIMETABLE')
    .select('current_sem, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8')
    .eq('creator', userData.user.id)
    .maybeSingle()

  const row = data as Record<string, unknown> | null
  const currentSemester: SemesterColumn = isSemesterColumn(row?.current_sem) ? row.current_sem : 'sem1'
  const stored = (row?.[currentSemester] ?? null) as StoredSemesterSettings | null
  const settings = normalizeSettings(stored)

  return {
    absences: stored?.absences ?? {},
    currentSemester,
    settings,
    subjects: subjectsFromTimetable(settings.timetable),
  }
}
