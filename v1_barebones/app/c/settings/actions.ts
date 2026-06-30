'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/server'
import type { AppSettings, AttendanceMarks, DateKey, PlannedAbsences, SubjectRecord } from '@/lib/models/attendance'
import { withSemesterMetricsForSubjects } from '@/lib/logic/semester-metrics'
import type { SemesterColumn } from '@/lib/models/semester'

export type SavedSemesterSettings = {
  start_date: DateKey
  end_date: DateKey
  minimum_attendance: number
  recommended_attendance: number
  holidays: DateKey[]
  holiday_ranges: { start: DateKey; end: DateKey }[]
  timetable: AppSettings['timetable']
  absences: PlannedAbsences
  marks?: AttendanceMarks
  subjects?: SubjectRecord[]
}

export async function saveSemesterSettings(
  semester: SemesterColumn,
  settings: SavedSemesterSettings
) {
  try {
    const supabase = await createClient()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return { ok: false, message: 'Sign in again to save settings.' }
    }

    const { data: existing, error: lookupError } = await supabase
      .from('TIMETABLE')
      .select(`id, ${semester}`)
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (lookupError) {
      return { ok: false, message: `Supabase lookup failed: ${lookupError.message}` }
    }

    const row = existing as ({ id: unknown } & Record<string, unknown>) | null
    const existingSemester = (row?.[semester] ?? {}) as {
      absences?: PlannedAbsences
      marks?: AttendanceMarks
      subjects?: SubjectRecord[]
    }
    const appSettings: AppSettings = {
      semesterStart: settings.start_date,
      semesterEnd: settings.end_date,
      minimumAttendance: settings.minimum_attendance,
      recommendedAttendance: settings.recommended_attendance,
      holidays: settings.holidays,
      holidayRanges: settings.holiday_ranges,
      timetable: settings.timetable,
    }
    const existingSubjects = existingSemester.subjects ?? settings.subjects ?? []
    const subjectNames = new Set<string>()

    for (const slots of Object.values(settings.timetable)) {
      for (const slot of slots ?? []) {
        subjectNames.add(slot.subject)
      }
    }

    const subjectsWithDefaults = Array.from(subjectNames)
      .sort()
      .map(
        (name) =>
          existingSubjects.find((subject) => subject.name === name) ?? {
            name,
            attended: 0,
            missed: 0,
          }
      )

    const payload = {
      user_id: userData.user.id,
      current_sem: semester,
      [semester]: {
        ...settings,
        absences: existingSemester.absences ?? settings.absences,
        marks: existingSemester.marks ?? settings.marks ?? {},
        subjects: withSemesterMetricsForSubjects(subjectsWithDefaults, appSettings),
      },
    }

    const result = row?.id
      ? await supabase.from('TIMETABLE').update(payload).eq('id', row.id).select('id').single()
      : await supabase.from('TIMETABLE').insert(payload).select('id').single()

    if (result.error) {
      return { ok: false, message: `Supabase save failed: ${result.error.message}` }
    }

    revalidatePath('/c/settings')
    revalidatePath('/c')
    revalidatePath('/c/calendar')
    revalidatePath('/c/subjects')

    return { ok: true, message: `Saved ${semester.toUpperCase()} as current semester.` }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Save crashed: ${error.message}` : 'Save crashed.',
    }
  }
}
