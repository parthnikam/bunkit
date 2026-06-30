import { classesFor } from '@/lib/logic/attendance-engine'
import { dateKeyToDate, eachDateInRange } from '@/lib/logic/date-helpers'
import { attendance } from '@/lib/logic/subject-calculations'
import type { AppSettings, SubjectRecord } from '@/lib/models/attendance'

export function semesterClassCounts(settings: AppSettings): Record<string, number> {
  return eachDateInRange(
    dateKeyToDate(settings.semesterStart),
    dateKeyToDate(settings.semesterEnd)
  ).reduce<Record<string, number>>((counts, date) => {
    for (const slot of classesFor(date, settings)) {
      counts[slot.subject] = (counts[slot.subject] ?? 0) + 1
    }

    return counts
  }, {})
}

export function allowedMissesForSemester(totalClasses: number, minimumAttendance: number): number {
  return Math.floor(totalClasses * ((100 - minimumAttendance) / 100))
}

export function remainingSkipsForSemester(
  missed: number,
  totalClasses: number,
  minimumAttendance: number
): number {
  return allowedMissesForSemester(totalClasses, minimumAttendance) - missed
}

export function withSemesterMetrics(
  subject: SubjectRecord,
  settings: AppSettings,
  classCounts: Record<string, number> = semesterClassCounts(settings)
): SubjectRecord {
  const totalClasses = classCounts[subject.name] ?? subject.totalClasses ?? 0

  return {
    ...subject,
    attendancePercentage: attendance(subject),
    remainingSkips: remainingSkipsForSemester(
      subject.missed,
      totalClasses,
      subject.minimumTarget ?? settings.minimumAttendance
    ),
    totalClasses,
  }
}

export function withSemesterMetricsForSubjects(
  subjects: SubjectRecord[],
  settings: AppSettings
): SubjectRecord[] {
  const classCounts = semesterClassCounts(settings)

  return subjects.map((subject) => withSemesterMetrics(subject, settings, classCounts))
}
