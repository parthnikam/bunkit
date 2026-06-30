'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  confirmCurrentSemesterAbsences,
} from '@/app/c/calendar/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  cacheSemesterAbsences,
  readCurrentSemesterCache,
  readSemesterDataCache,
} from '@/lib/client/semester-cache'
import {
  classesFor,
  impactForRange,
  isFullPlannedAbsence,
  isPlannedAbsent,
  predictedSubjects,
  predictedSafetyFor,
  toDateKey,
} from '@/lib/logic/attendance-engine'
import { addDays, dateKeyToDate } from '@/lib/logic/date-helpers'
import { attendance } from '@/lib/logic/subject-calculations'
import type {
  AppSettings,
  DateKey,
  DaySafety,
  PlannedAbsences,
  SubjectRecord,
  TimetableSlot,
} from '@/lib/models/attendance'
import type { SemesterColumn } from '@/lib/models/semester'

type LeavesDashboardProps = {
  initialSubjects: SubjectRecord[]
  initialAbsences: PlannedAbsences
  currentSemester: SemesterColumn
  settings: AppSettings
}

const statusClass: Record<DaySafety, string> = {
  safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  unsafe: 'border-red-200 bg-red-50 text-red-700',
  holiday: 'border-border bg-muted text-muted-foreground',
}
function dateInputValue(date: Date) {
  const key = toDateKey(date)
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
}

function inputToDate(value: string) {
  return dateKeyToDate(value.replaceAll('-', '') as DateKey)
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function mondayGridStart(date: Date) {
  const first = startOfMonth(date)
  const offset = (first.getDay() + 6) % 7
  return addDays(first, -offset)
}

function monthDays(date: Date) {
  const start = mondayGridStart(date)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function formatTime(time: string) {
  return `${time.slice(0, 2)}:${time.slice(2, 4)}`
}

function toggleSubject(dateKey: DateKey, slot: TimetableSlot, absences: PlannedAbsences) {
  const planned = absences[dateKey] ?? []
  const next = planned.includes(slot.subject)
    ? planned.filter((subject) => subject !== slot.subject)
    : [...planned, slot.subject]

  return {
    ...absences,
    [dateKey]: next,
  }
}

function mergeAbsences(current: PlannedAbsences, next: PlannedAbsences): PlannedAbsences {
  const merged: PlannedAbsences = { ...current }

  for (const [date, subjects = []] of Object.entries(next)) {
    const combined = Array.from(new Set([...(merged[date as DateKey] ?? []), ...subjects]))

    merged[date as DateKey] = combined
  }

  return merged
}

function absencesForRange(start: Date, end: Date, settings: AppSettings): PlannedAbsences {
  const absences: PlannedAbsences = {}
  let current = new Date(start)

  while (toDateKey(current) <= toDateKey(end)) {
    const dateKey = toDateKey(current)
    const subjects = classesFor(current, settings).map((slot) => slot.subject)

    if (subjects.length > 0) {
      absences[dateKey] = subjects
    }

    current = addDays(current, 1)
  }

  return absences
}

export function LeavesDashboard({
  currentSemester,
  initialSubjects,
  initialAbsences,
  settings,
}: LeavesDashboardProps) {
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today))
  const [selectedDateKey, setSelectedDateKey] = useState<DateKey>(toDateKey(today))
  const [plannedAbsences, setPlannedAbsences] = useState(initialAbsences)
  const [activeSemester, setActiveSemester] = useState(currentSemester)
  const [rangeStart, setRangeStart] = useState(dateInputValue(today))
  const [rangeEnd, setRangeEnd] = useState(dateInputValue(addDays(today, 2)))
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Ready')

  const selectedDate = dateKeyToDate(selectedDateKey)
  const selectedSlots = classesFor(selectedDate, settings)
  const selectedSafety = predictedSafetyFor(
    selectedDate,
    initialSubjects,
    settings,
    plannedAbsences
  )
  const projectedSubjects = predictedSubjects(initialSubjects, plannedAbsences)
  const fullDayPlanned = isFullPlannedAbsence(selectedDate, settings, plannedAbsences)
  const impact = impactForRange(
    inputToDate(rangeStart),
    inputToDate(rangeEnd),
    initialSubjects,
    settings,
    plannedAbsences
  )

  useEffect(() => {
    queueMicrotask(() => {
      const cachedSemester = readCurrentSemesterCache()
      const nextSemester = cachedSemester ?? currentSemester
      const cachedData = readSemesterDataCache(nextSemester)

      setActiveSemester(nextSemester)
      if (cachedData?.absences) {
        setPlannedAbsences(cachedData.absences as PlannedAbsences)
      }
    })
  }, [currentSemester])

  function toggleFullDay() {
    setPlannedAbsences((current) => {
      if (fullDayPlanned) {
        return { ...current, [selectedDateKey]: [] }
      }

      return {
        ...current,
        [selectedDateKey]: selectedSlots.map((slot) => slot.subject),
      }
    })
  }

  async function confirmLeave() {
    setIsSaving(true)
    setSaveMessage('Saving...')

    const rangeAbsences = absencesForRange(inputToDate(rangeStart), inputToDate(rangeEnd), settings)
    const nextAbsences = mergeAbsences(plannedAbsences, rangeAbsences)
    setPlannedAbsences(nextAbsences)

    const result = await confirmCurrentSemesterAbsences(nextAbsences)
    if (result.ok && result.semester) {
      cacheSemesterAbsences(result.semester, nextAbsences, result.data)
      setActiveSemester(result.semester)
    }
    setSaveMessage(result.message)
    setIsSaving(false)
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Absence planner</p>
          <h1 className="text-xl font-semibold tracking-tight">Leaves</h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-lg border px-2 py-1 text-xs text-muted-foreground">
            {activeSemester.toUpperCase()}
          </span>
        </div>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between border-b pb-2">

          <Button
            aria-label="Previous month"
            onClick={() =>
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft />
          </Button>
          <h2 className="font-medium">{monthLabel(visibleMonth)}</h2>

          <Button
            aria-label="Next month"
            onClick={() =>
              setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays(visibleMonth).map((date) => {
            const dateKey = toDateKey(date)
            const inMonth = date.getMonth() === visibleMonth.getMonth()
            const selected = dateKey === selectedDateKey
            const safety = predictedSafetyFor(date, initialSubjects, settings, plannedAbsences)
            const planned = (plannedAbsences[dateKey] ?? []).length > 0

            return (
              <button
                className={[
                  'relative h-10 rounded-lg border text-sm transition-colors',
                  selected ? 'border-primary ring-1 ring-primary' : statusClass[safety.status],
                  inMonth ? '' : 'opacity-40',
                ].join(' ')}
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                type="button"
              >
                {date.getDate()}
                {planned ? (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${statusClass[selectedSafety.status]}`}
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="font-medium capitalize">{selectedSafety.status}</span>
            <span className="truncate text-xs opacity-80">
              {selectedSlots.length === 0
                ? 'No classes scheduled.'
                : `${selectedSlots.length} classes on ${dateInputValue(selectedDate)}.`}
            </span>
          </div>
          <Button
            disabled={selectedSlots.length === 0}
            onClick={toggleFullDay}
            type="button"
            variant={fullDayPlanned ? 'default' : 'outline'}
          >
            {fullDayPlanned ? 'Clear bunk' : 'Bunk today'}
          </Button>
        </div>

        <div className="space-y-2 overflow-x-auto">
          {selectedSlots.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
              Nothing to plan.
            </p>
          ) : (
            selectedSlots.map((slot) => {
              const planned = isPlannedAbsent(selectedDate, slot.subject, plannedAbsences)

              return (
                <div
                  className="grid min-w-[640px] grid-cols-[92px_1fr_78px_120px_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm"
                  key={`${selectedDateKey}-${slot.subject}-${slot.time.start}`}
                >
                  <span className="text-xs text-muted-foreground">
                    {formatTime(slot.time.start)}-{formatTime(slot.time.end)}
                  </span>
                  <span className="font-medium">{slot.subject}</span>
                  <span className="text-sm">
                    {attendance(
                      projectedSubjects.find((subject) => subject.name === slot.subject) ?? {
                        name: slot.subject,
                        attended: 0,
                        missed: 0,
                      }
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{slot.room ?? 'No room'}</span>
                  <Button
                    onClick={() =>
                      setPlannedAbsences((current) => toggleSubject(selectedDateKey, slot, current))
                    }
                    size="sm"
                    type="button"
                    variant={planned ? 'default' : 'outline'}
                  >
                    {planned ? 'Planned' : 'Skip'}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">Plan Leaves</h2>
            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass[impact.safety]}`}>
              {impact.safety}
            </span>
          </div>
          <Button disabled={isSaving} onClick={confirmLeave} size="sm" type="button">
            {isSaving ? 'Saving' : 'Confirm leave'}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Label className="w-12 shrink-0 text-xs text-muted-foreground" htmlFor="range-start">
              Start
            </Label>
            <Input
              id="range-start"
              onChange={(event) => setRangeStart(event.target.value)}
              type="date"
              value={rangeStart}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-12 shrink-0 text-xs text-muted-foreground" htmlFor="range-end">
              End
            </Label>
            <Input
              id="range-end"
              onChange={(event) => setRangeEnd(event.target.value)}
              type="date"
              value={rangeEnd}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="space-y-2">
            <div className="grid min-w-[520px] grid-cols-[1fr_90px_120px_120px] gap-2 border-b pb-2 text-xs text-muted-foreground">
              <span>Subject</span>
              <span>Misses</span>
              <span>Before</span>
              <span>After</span>
            </div>
            {impact.subjects
              .filter((subject) => subject.plannedMisses > 0)
              .map((subject) => (
                <div
                  className="grid min-w-[520px] grid-cols-[1fr_90px_120px_120px] gap-2 rounded-lg border px-2 py-2 text-sm"
                  key={subject.subject}
                >
                  <span className="font-medium">{subject.subject}</span>
                  <span>{subject.plannedMisses}</span>
                  <span>{subject.beforeAttendance.toFixed(1)}%</span>
                  <span>{subject.afterAttendance.toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>

        <p className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          {saveMessage === 'Ready' ? impact.recommendation : saveMessage}
        </p>
      </section>
    </div>
  )
}
