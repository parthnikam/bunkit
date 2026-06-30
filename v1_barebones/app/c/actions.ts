'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/server'
import { withSemesterMetrics, withSemesterMetricsForSubjects } from '@/lib/logic/semester-metrics'
import { isSemesterColumn } from '@/lib/models/semester'
import type {
  AttendanceMarks,
  DateKey,
  PlannedAbsences,
  SessionStatus,
  SubjectRecord,
  TimeKey,
  WeeklyTimetable,
  AppSettings,
} from '@/lib/models/attendance'

type StoredSemester = {
  absences?: PlannedAbsences
  marks?: AttendanceMarks
  minimum_attendance?: number
  recommended_attendance?: number
  start_date?: DateKey
  end_date?: DateKey
  holidays?: DateKey[]
  holiday_ranges?: { start: DateKey; end: DateKey }[]
  subjects?: SubjectRecord[]
  timetable?: WeeklyTimetable
  [key: string]: unknown
}

type MarkInput = {
  date: DateKey
  end: TimeKey
  start: TimeKey
  status: Extract<SessionStatus, 'attended' | 'missed' | 'pending'>
  subject: string
}

function markKey(input: Pick<MarkInput, 'date' | 'start' | 'subject'>) {
  return `${input.date}:${input.subject}:${input.start}`
}

function subjectsFromSemester(semester: StoredSemester): SubjectRecord[] {
  if (semester.subjects?.length) {
    return semester.subjects
  }

  const names = new Set<string>()
  for (const slots of Object.values(semester.timetable ?? {})) {
    for (const slot of slots ?? []) {
      names.add(slot.subject.trim().toUpperCase())
    }
  }

  return Array.from(names).map((name) => ({
    name,
    attended: 0,
    missed: 0,
  }))
}

function applyMark(subject: SubjectRecord, previous?: SessionStatus, next?: SessionStatus) {
  let attended = subject.attended
  let missed = subject.missed

  if (previous === 'attended') {
    attended -= 1
  }

  if (previous === 'missed') {
    missed -= 1
  }

  if (next === 'attended') {
    attended += 1
  }

  if (next === 'missed') {
    missed += 1
  }

  return {
    ...subject,
    attended: Math.max(0, attended),
    missed: Math.max(0, missed),
  }
}

function settingsFromSemester(semester: StoredSemester): AppSettings {
  return {
    semesterStart: semester.start_date ?? '20260701',
    semesterEnd: semester.end_date ?? '20261130',
    minimumAttendance: semester.minimum_attendance ?? 75,
    recommendedAttendance: semester.recommended_attendance ?? 80,
    holidays: semester.holidays ?? [],
    holidayRanges: semester.holiday_ranges ?? [],
    timetable: semester.timetable ?? {},
  }
}

function withMetrics(subject: SubjectRecord, semester: StoredSemester): SubjectRecord {
  return withSemesterMetrics(subject, settingsFromSemester(semester))
}

async function getSemesterRow() {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return { error: 'Sign in again to save attendance.' as const }
  }

  const { data, error } = await supabase
    .from('TIMETABLE')
    .select('id, current_sem, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  const row = data as ({ id: unknown } & Record<string, unknown>) | null
  const semester = isSemesterColumn(row?.current_sem) ? row.current_sem : 'sem1'
  const currentSemester = ((row?.[semester] as StoredSemester | null) ?? {}) as StoredSemester

  return { currentSemester, row, semester, supabase, userId: userData.user.id }
}

export async function saveAttendanceMark(input: MarkInput) {
  const context = await getSemesterRow()

  if ('error' in context) {
    return { ok: false, message: context.error }
  }

  const { currentSemester, row, semester, supabase, userId } = context
  const key = markKey(input)
  const marks: AttendanceMarks = { ...(currentSemester.marks ?? {}) }
  const previous = marks[key]?.status
  const next = input.status === 'pending' ? undefined : input.status
  const subjects = subjectsFromSemester(currentSemester)
  const subjectExists = subjects.some((subject) => subject.name === input.subject)
  const nextSubjects = (subjectExists
    ? subjects
    : [...subjects, { name: input.subject, attended: 0, missed: 0 }]
  ).map((subject) =>
    subject.name === input.subject
      ? withMetrics(applyMark(subject, previous, next), currentSemester)
      : withMetrics(subject, currentSemester)
  )
  const absences: PlannedAbsences = { ...(currentSemester.absences ?? {}) }
  const remainingAbsences = (absences[input.date] ?? []).filter(
    (subject) => subject !== input.subject
  )

  if (remainingAbsences.length > 0) {
    absences[input.date] = remainingAbsences
  } else {
    delete absences[input.date]
  }

  if (next) {
    marks[key] = {
      date: input.date,
      subject: input.subject,
      start: input.start,
      status: next,
    }
  } else {
    delete marks[key]
  }

  const nextSemester = {
    ...currentSemester,
    absences,
    marks,
    subjects: nextSubjects,
  }
  const payload = {
    user_id: userId,
    [semester]: nextSemester,
  }
  const result = row?.id
    ? await supabase.from('TIMETABLE').update(payload).eq('id', row.id)
    : await supabase.from('TIMETABLE').insert(payload)

  if (result.error) {
    return { ok: false, message: result.error.message }
  }

  revalidatePath('/c')
  revalidatePath('/c/calendar')
  revalidatePath('/c/subjects')

  return {
    ok: true,
    absences,
    marks,
    message: 'Saved attendance.',
    subjects: nextSubjects,
  }
}

export async function saveDayAbsence(date: DateKey, subjects: string[], planned: boolean) {
  const context = await getSemesterRow()

  if ('error' in context) {
    return { ok: false, message: context.error }
  }

  const { currentSemester, row, semester, supabase, userId } = context
  const absences: PlannedAbsences = { ...(currentSemester.absences ?? {}) }

  if (planned && subjects.length > 0) {
    absences[date] = subjects
  } else {
    delete absences[date]
  }

  const nextSemester = {
    ...currentSemester,
    absences,
  }
  const payload = {
    user_id: userId,
    [semester]: nextSemester,
  }
  const result = row?.id
    ? await supabase.from('TIMETABLE').update(payload).eq('id', row.id)
    : await supabase.from('TIMETABLE').insert(payload)

  if (result.error) {
    return { ok: false, message: result.error.message }
  }

  revalidatePath('/c')
  revalidatePath('/c/calendar')
  revalidatePath('/c/subjects')

  return { ok: true, absences, message: planned ? 'Saved day bunk.' : 'Cleared day bunk.' }
}

export async function syncCurrentSemesterSnapshot(snapshot: StoredSemester) {
  const context = await getSemesterRow()

  if ('error' in context) {
    return { ok: false, message: context.error }
  }

  const { currentSemester, row, semester, supabase, userId } = context
  const mergedSemester = {
    ...currentSemester,
    ...snapshot,
  }
  const nextSemester = {
    ...mergedSemester,
    subjects: mergedSemester.subjects
      ? withSemesterMetricsForSubjects(mergedSemester.subjects, settingsFromSemester(mergedSemester))
      : mergedSemester.subjects,
  }
  const payload = {
    user_id: userId,
    current_sem: semester,
    [semester]: nextSemester,
  }
  const result = row?.id
    ? await supabase.from('TIMETABLE').update(payload).eq('id', row.id)
    : await supabase.from('TIMETABLE').insert(payload)

  if (result.error) {
    return { ok: false, message: result.error.message }
  }

  revalidatePath('/c')
  revalidatePath('/c/calendar')
  revalidatePath('/c/subjects')

  return { ok: true, message: 'Synced changes.', semester, data: nextSemester }
}
