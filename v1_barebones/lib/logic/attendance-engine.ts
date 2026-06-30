import {
  addDays,
  dateKeyToDate,
  dateTimeToTimeKey,
  eachDateInRange,
  isHoliday,
  isWithinSemester,
  timeToMinutes,
  toDateKey,
  weekdayKey,
} from '@/lib/logic/date-helpers'
import {
  attendance,
  copyAfterMisses,
  held,
} from '@/lib/logic/subject-calculations'
import type {
  AppSettings,
  AttendanceMark,
  AttendanceMarks,
  BestSkipDay,
  DateKey,
  DaySafetyResult,
  PlannerSubjectImpact,
  PlannedAbsences,
  PlannerImpact,
  SubjectRecord,
  TimetableSlot,
} from '@/lib/models/attendance'

function subjectByName(subjects: SubjectRecord[]): Map<string, SubjectRecord> {
  return new Map(subjects.map((subject) => [subject.name, subject]))
}

function markKey(date: DateKey, slot: TimetableSlot): string {
  return `${date}:${slot.subject}:${slot.time.start}`
}

function countSubjects(slots: TimetableSlot[]): Record<string, number> {
  return slots.reduce<Record<string, number>>((counts, slot) => {
    counts[slot.subject] = (counts[slot.subject] ?? 0) + 1
    return counts
  }, {})
}

function safetyFromMisses(
  subjects: SubjectRecord[],
  misses: Record<string, number>,
  settings: AppSettings
): DaySafetyResult {
  const records = subjectByName(subjects)
  const unsafeSubjects: string[] = []
  const partialSubjects: string[] = []
  const subjectImpacts: PlannerSubjectImpact[] = []
  const unsafeSubjectImpacts: PlannerSubjectImpact[] = []
  const partialSubjectImpacts: PlannerSubjectImpact[] = []

  for (const [name, count] of Object.entries(misses)) {
    const current = records.get(name)

    if (!current) {
      continue
    }

    const projected = copyAfterMisses(current, count)
    const minimum = current.minimumTarget ?? settings.minimumAttendance
    const recommended = current.safetyTarget ?? settings.recommendedAttendance
    const beforeAttendance = attendance(current)
    const projectedAttendance = attendance(projected)
    const impact = {
      subject: name,
      plannedMisses: count,
      beforeAttendance,
      afterAttendance: projectedAttendance,
    }
    subjectImpacts.push(impact)

    if (projectedAttendance < minimum) {
      unsafeSubjects.push(name)
      unsafeSubjectImpacts.push(impact)
    } else if (projectedAttendance < recommended) {
      partialSubjects.push(name)
      partialSubjectImpacts.push(impact)
    }
  }

  if (unsafeSubjects.length > 0) {
    return {
      status: 'unsafe',
      unsafeSubjects,
      partialSubjects,
      subjectImpacts,
      unsafeSubjectImpacts,
      partialSubjectImpacts,
    }
  }

  if (partialSubjects.length > 0) {
    return {
      status: 'partial',
      unsafeSubjects,
      partialSubjects,
      subjectImpacts,
      unsafeSubjectImpacts,
      partialSubjectImpacts,
    }
  }

  return {
    status: 'safe',
    unsafeSubjects,
    partialSubjects,
    subjectImpacts,
    unsafeSubjectImpacts,
    partialSubjectImpacts,
  }
}

export function classesFor(date: Date, settings: AppSettings): TimetableSlot[] {
  if (!isWithinSemester(date, settings) || isHoliday(date, settings)) {
    return []
  }

  return [...(settings.timetable[weekdayKey(date)] ?? [])].sort(
    (first, second) => timeToMinutes(first.time.start) - timeToMinutes(second.time.start)
  )
}

export function activeClassFor(dateTime: Date, settings: AppSettings): TimetableSlot | null {
  const currentTime = timeToMinutes(dateTimeToTimeKey(dateTime))

  return (
    classesFor(dateTime, settings).find((slot) => {
      const startsAt = timeToMinutes(slot.time.start)
      const endsAt = timeToMinutes(slot.time.end)

      return currentTime >= startsAt && currentTime < endsAt
    }) ?? null
  )
}

export function safetyFor(
  date: Date,
  subjects: SubjectRecord[],
  settings: AppSettings
): DaySafetyResult {
  const slots = classesFor(date, settings)

  if (slots.length === 0) {
    return {
      status: 'holiday',
      unsafeSubjects: [],
      partialSubjects: [],
      subjectImpacts: [],
      unsafeSubjectImpacts: [],
      partialSubjectImpacts: [],
    }
  }

  return safetyFromMisses(subjects, countSubjects(slots), settings)
}

export function plannedMissCounts(absences: PlannedAbsences): Record<string, number> {
  return Object.values(absences).reduce<Record<string, number>>((counts, subjects = []) => {
    for (const subject of subjects) {
      counts[subject] = (counts[subject] ?? 0) + 1
    }

    return counts
  }, {})
}

export function predictedSubjects(
  subjects: SubjectRecord[],
  absences: PlannedAbsences
): SubjectRecord[] {
  const misses = plannedMissCounts(absences)

  return subjects.map((subject) => copyAfterMisses(subject, misses[subject.name] ?? 0))
}

export function predictedSafetyFor(
  date: Date,
  subjects: SubjectRecord[],
  settings: AppSettings,
  absences: PlannedAbsences
): DaySafetyResult {
  const slots = classesFor(date, settings)

  if (slots.length === 0) {
    return {
      status: 'holiday',
      unsafeSubjects: [],
      partialSubjects: [],
      subjectImpacts: [],
      unsafeSubjectImpacts: [],
      partialSubjectImpacts: [],
    }
  }

  const absencesBeforeDateSkip = { ...absences }
  delete absencesBeforeDateSkip[toDateKey(date)]

  return safetyFromMisses(
    predictedSubjects(subjects, absencesBeforeDateSkip),
    countSubjects(slots),
    settings
  )
}

export function isPlannedAbsent(
  date: Date,
  subject: string,
  absences: PlannedAbsences
): boolean {
  return absences[toDateKey(date)]?.includes(subject) ?? false
}

export function isFullPlannedAbsence(
  date: Date,
  settings: AppSettings,
  absences: PlannedAbsences
): boolean {
  const slots = classesFor(date, settings)

  return slots.length > 0 && slots.every((slot) => isPlannedAbsent(date, slot.subject, absences))
}

export function markFor(
  date: Date,
  slot: TimetableSlot,
  marks: AttendanceMarks
): AttendanceMark | null {
  return marks[markKey(toDateKey(date), slot)] ?? null
}

export function impactForRange(
  start: Date,
  end: Date,
  subjects: SubjectRecord[],
  settings: AppSettings,
  existingAbsences: PlannedAbsences = {}
): PlannerImpact {
  const rangeMisses = eachDateInRange(start, end)
    .flatMap((date) => classesFor(date, settings))
    .reduce<Record<string, number>>((counts, slot) => {
      counts[slot.subject] = (counts[slot.subject] ?? 0) + 1
      return counts
    }, {})

  const plannedMisses = {
    ...plannedMissCounts(existingAbsences),
  }

  for (const [subject, count] of Object.entries(rangeMisses)) {
    plannedMisses[subject] = (plannedMisses[subject] ?? 0) + count
  }

  const impactedSubjects = subjects.map((subject) => {
    const misses = plannedMisses[subject.name] ?? 0
    const projected = copyAfterMisses(subject, misses)

    return {
      subject: subject.name,
      plannedMisses: misses,
      beforeAttendance: attendance(subject),
      afterAttendance: attendance(projected),
    }
  })

  const safety = safetyFromMisses(subjects, plannedMisses, settings).status
  const recommendation =
    safety === 'unsafe'
      ? 'This leave would put at least one subject below minimum attendance.'
      : safety === 'partial'
        ? 'This leave stays above minimum, but uses the recommended safety buffer.'
        : 'This leave keeps all subjects above the safety target.'

  return {
    plannedMisses,
    subjects: impactedSubjects,
    safety,
    recommendation,
  }
}

export function bestSkipDays(
  weekStart: Date,
  subjects: SubjectRecord[],
  settings: AppSettings,
  absences: PlannedAbsences = {}
): BestSkipDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const slots = classesFor(date, settings)
    const safety = predictedSafetyFor(date, subjects, settings, absences)

    return {
      date: toDateKey(date),
      status: safety.status,
      classCount: slots.length,
    }
  })
    .filter((day) => day.status !== 'holiday')
    .sort((first, second) => {
      const safetyRank = { safe: 0, partial: 1, unsafe: 2, holiday: 3 }
      const rankDifference = safetyRank[first.status] - safetyRank[second.status]

      if (rankDifference !== 0) {
        return rankDifference
      }

      return first.classCount - second.classCount
    })
    .slice(0, 3)
}

export { attendance, dateKeyToDate, held, toDateKey }
