'use client'

import type {
  AppSettings,
  AttendanceMarks,
  PlannedAbsences,
  SubjectRecord,
} from '@/lib/models/attendance'
import { isSemesterColumn, type SemesterColumn } from '@/lib/models/semester'

export type CachedSemesterData = Record<string, unknown> & {
  absences?: PlannedAbsences
  marks?: AttendanceMarks
  subjects?: SubjectRecord[]
}

const currentSemesterKey = 'bunk.current_sem'
const semesterDataPrefix = 'bunk.semester_data.'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function semesterDataKey(semester: SemesterColumn) {
  return `${semesterDataPrefix}${semester}`
}

export function saveCurrentSemesterCache(semester: SemesterColumn) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(currentSemesterKey, semester)
}

export function readCurrentSemesterCache(): SemesterColumn | null {
  if (!canUseStorage()) {
    return null
  }

  const value = window.localStorage.getItem(currentSemesterKey)

  return isSemesterColumn(value) ? value : null
}

export function saveSemesterDataCache(semester: SemesterColumn, data: CachedSemesterData) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(semesterDataKey(semester), JSON.stringify(data))
}

export function readSemesterDataCache(semester: SemesterColumn): CachedSemesterData | null {
  if (!canUseStorage()) {
    return null
  }

  const value = window.localStorage.getItem(semesterDataKey(semester))

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as CachedSemesterData
  } catch {
    return null
  }
}

export function saveSemesterCache(semester: SemesterColumn, data: CachedSemesterData) {
  saveCurrentSemesterCache(semester)
  saveSemesterDataCache(semester, data)
}

export function cacheSemesterAbsences(
  semester: SemesterColumn,
  absences: PlannedAbsences,
  data: CachedSemesterData | null = readSemesterDataCache(semester)
) {
  saveSemesterCache(semester, {
    ...(data ?? {}),
    absences,
  })
}

export function semesterCacheFromState({
  absences,
  marks,
  settings,
  subjects,
}: {
  absences: PlannedAbsences
  marks?: AttendanceMarks
  settings: AppSettings
  subjects: SubjectRecord[]
}): CachedSemesterData {
  return {
    start_date: settings.semesterStart,
    end_date: settings.semesterEnd,
    minimum_attendance: settings.minimumAttendance,
    recommended_attendance: settings.recommendedAttendance,
    holidays: settings.holidays ?? [],
    holiday_ranges: settings.holidayRanges ?? [],
    timetable: settings.timetable,
    absences,
    marks: marks ?? {},
    subjects,
  }
}
