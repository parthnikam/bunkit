'use client'

import { CalendarDays, Check, Clock, LogOut, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { syncCurrentSemesterSnapshot } from '@/app/c/actions'
import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import {
  saveSemesterDataCache,
  semesterCacheFromState,
} from '@/lib/client/semester-cache'
import {
  activeClassFor,
  classesFor,
  isFullPlannedAbsence,
  isPlannedAbsent,
  predictedSafetyFor,
  toDateKey,
} from '@/lib/logic/attendance-engine'
import { addDays, dateKeyToDate } from '@/lib/logic/date-helpers'
import { attendance, held } from '@/lib/logic/subject-calculations'
import type {
  AppSettings,
  AttendanceMarks,
  DateKey,
  DaySafety,
  PlannedAbsences,
  PlannerSubjectImpact,
  SessionStatus,
  SubjectRecord,
  TimetableSlot,
} from '@/lib/models/attendance'
import type { SemesterColumn } from '@/lib/models/semester'

type TodayDashboardProps = {
  currentSemester: SemesterColumn
  email?: string
  initialSubjects: SubjectRecord[]
  initialSettings: AppSettings
  initialAbsences: PlannedAbsences
  initialMarks: AttendanceMarks
}

const statusText: Record<DaySafety, string> = {
  safe: 'Safe',
  partial: 'Partial',
  unsafe: 'Unsafe',
  holiday: 'Holiday',
}

const statusClass: Record<DaySafety, string> = {
  safe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  unsafe: 'border-red-200 bg-red-50 text-red-700',
  holiday: 'border-border bg-muted text-muted-foreground',
}

function greeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)
}

function formatTime(time: string) {
  return `${time.slice(0, 2)}:${time.slice(2, 4)}`
}

function classKey(date: DateKey, slot: TimetableSlot) {
  return `${date}:${slot.subject}:${slot.time.start}`
}

function uniqueSubjects(slots: TimetableSlot[]) {
  return Array.from(new Set(slots.map((slot) => slot.subject)))
}

function subjectList(names: string[]) {
  if (names.length === 0) {
    return 'No'
  }

  return names.join(', ')
}

function safetyMessage(status: DaySafety, slots: TimetableSlot[], subjects: string[]) {
  const names = subjectList(subjects.length > 0 ? subjects : uniqueSubjects(slots))

  if (status === 'unsafe') {
    return `You can't miss ${names} classes today.`
  }

  if (status === 'partial') {
    return `You can miss ${names} classes if you want.`
  }

  if (status === 'safe') {
    return `${names} classes have enough attendance today.`
  }

  return 'No classes scheduled today.'
}

function UnsafeSubjectImpacts({ subjects }: { subjects: PlannerSubjectImpact[] }) {
  if (subjects.length === 0) {
    return null
  }

  return (
    <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {subjects.map((subject) => (
        <div className="flex items-center justify-between gap-3" key={subject.subject}>
          <span className="min-w-0 truncate font-medium">{subject.subject}</span>
          <span className="shrink-0 tabular-nums">
            {subject.beforeAttendance.toFixed(1)}% {'->'} {subject.afterAttendance.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
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

export function TodayDashboard({
  currentSemester,
  email,
  initialSubjects,
  initialSettings,
  initialAbsences,
  initialMarks,
}: TodayDashboardProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<DateKey>(toDateKey(new Date()))
  const [subjects, setSubjects] = useState(initialSubjects)
  const [plannedAbsences, setPlannedAbsences] = useState(initialAbsences)
  const [marks, setMarks] = useState<AttendanceMarks>(initialMarks)
  const [saveMessage, setSaveMessage] = useState('')
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = useMemo(() => new Date(), [])
  const selectedDate = dateKeyToDate(selectedDateKey)
  const dateCards = useMemo(
    () => Array.from({ length: 100 }, (_, index) => addDays(today, index - 7)),
    [today]
  )
  const slots = classesFor(selectedDate, initialSettings)
  const safety = predictedSafetyFor(selectedDate, subjects, initialSettings, plannedAbsences)
  const safetySubjects =
    safety.status === 'unsafe'
      ? safety.unsafeSubjects
      : safety.status === 'partial'
        ? safety.partialSubjects
        : uniqueSubjects(slots)
  const activeSlot =
    selectedDateKey === toDateKey(new Date()) ? activeClassFor(new Date(), initialSettings) : null
  const fullDayPlanned = isFullPlannedAbsence(selectedDate, initialSettings, plannedAbsences)

  const displayedName = email?.split('@')[0] ?? 'there'

  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current)
      }
    }
  }, [])

  function queueSemesterSync(next: {
    absences: PlannedAbsences
    marks: AttendanceMarks
    subjects: SubjectRecord[]
  }) {
    const snapshot = semesterCacheFromState({
      absences: next.absences,
      marks: next.marks,
      settings: initialSettings,
      subjects: next.subjects,
    })

    saveSemesterDataCache(currentSemester, snapshot)
    setSaveMessage('Saved locally')

    if (syncTimer.current) {
      clearTimeout(syncTimer.current)
    }

    syncTimer.current = setTimeout(async () => {
      setSaveMessage('Syncing...')
      try {
        const result = await syncCurrentSemesterSnapshot(snapshot)
        setSaveMessage(result.message ?? '')
      } catch {
        setSaveMessage('Saved locally. Sync will retry on the next change.')
      }
    }, 1500)
  }

  function markClass(slot: TimetableSlot, status: Extract<SessionStatus, 'attended' | 'missed'>) {
    const key = classKey(selectedDateKey, slot)
    const previous = marks[key]?.status
    const next = previous === status ? 'pending' : status
    const nextMarks: AttendanceMarks = {
      ...marks,
    }

    if (next === 'pending') {
      delete nextMarks[key]
    } else {
      nextMarks[key] = {
        date: selectedDateKey,
        subject: slot.subject,
        start: slot.time.start,
        status: next,
      }
    }
    const nextAbsences: PlannedAbsences = {
      ...plannedAbsences,
    }
    const nextSubjects = subjects.map((subject) =>
      subject.name === slot.subject ? applyMark(subject, previous, next) : subject
    )
    const planned = plannedAbsences[selectedDateKey] ?? []
    const remaining = planned.filter((subject) => subject !== slot.subject)

    if (remaining.length > 0) {
      nextAbsences[selectedDateKey] = remaining
    } else {
      delete nextAbsences[selectedDateKey]
    }

    setMarks(nextMarks)
    setSubjects(nextSubjects)
    setPlannedAbsences(nextAbsences)
    queueSemesterSync({ absences: nextAbsences, marks: nextMarks, subjects: nextSubjects })
  }

  function toggleFullDayPlan() {
    const nextPlanned = !fullDayPlanned
    const daySubjects = slots.map((slot) => slot.subject)
    const nextAbsences = { ...plannedAbsences }

    if (nextPlanned) {
      nextAbsences[selectedDateKey] = daySubjects
    } else {
      delete nextAbsences[selectedDateKey]
    }

    setPlannedAbsences(nextAbsences)
    queueSemesterSync({ absences: nextAbsences, marks, subjects })
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {greeting()}, {displayedName}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{formatMonth(selectedDate)}</h1>
        </div>
        <LogoutButton size="sm" variant="outline">
          <LogOut />
          Exit
        </LogoutButton>
      </header>

      <section className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex w-max gap-2">
          {dateCards.map((date) => {
            const dateKey = toDateKey(date)
            const selected = dateKey === selectedDateKey

            return (
              <button
                className={[
                  'grid h-16 w-14 shrink-0 place-items-center rounded-lg border text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                ].join(' ')}
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                type="button"
              >
                <span className="text-xs opacity-75">{formatDay(date)}</span>
                <span className="text-base font-medium">{date.getDate()}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${statusClass[safety.status]}`}
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="shrink-0 font-medium">{statusText[safety.status]}</span>
            <span className="truncate text-xs opacity-80">
              {safetyMessage(safety.status, slots, safetySubjects)}
            </span>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={slots.length === 0}
            onClick={toggleFullDayPlan}
            type="button"
            variant={fullDayPlanned ? 'default' : 'outline'}
          >
            {fullDayPlanned ? 'Clear bunk' : 'Bunk today'}
          </Button>
        </div>
        {safety.status === 'unsafe' ? (
          <UnsafeSubjectImpacts subjects={safety.unsafeSubjectImpacts} />
        ) : null}
      </section>
      {saveMessage ? <p className="text-xs text-muted-foreground">{saveMessage}</p> : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-medium">Classes</h2>
          {activeSlot ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {activeSlot.subject} now
            </span>
          ) : null}
        </div>

        <div className="space-y-2 overflow-x-auto">
          {slots.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
              Nothing scheduled.
            </p>
          ) : (
            slots.map((slot) => {
              const key = classKey(selectedDateKey, slot)
              const mark = marks[key]?.status
              const planned = isPlannedAbsent(selectedDate, slot.subject, plannedAbsences)
              const active = activeSlot?.subject === slot.subject && activeSlot.time.start === slot.time.start
              const subject = subjects.find((item) => item.name === slot.subject)
              const percent = subject ? attendance(subject).toFixed(1) : '0.0'
              const totalHeld = subject ? held(subject) : 0

              return (
                <div
                  className={[
                    'grid grid-cols-[76px_1fr] items-center gap-2 rounded-lg border px-2 py-2 md:min-w-[720px] md:grid-cols-[82px_1fr_92px_110px_88px_88px]',
                    active ? 'border-primary' : 'border-border',
                  ].join(' ')}
                  key={key}
                >
                  <div className="text-xs text-muted-foreground">
                    {formatTime(slot.time.start)}-{formatTime(slot.time.end)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{slot.subject}</span>
                      {planned ? (
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                          planned
                        </span>
                      ) : null}
                    </div>
                    {/* <p className="truncate text-xs text-muted-foreground">{slot.room ?? 'No room'}</p> */}
                  </div>
                  <div className="text-xs text-muted-foreground md:text-sm md:text-foreground">{percent}%</div>
                  <div className="text-right text-xs text-muted-foreground md:text-left">
                    {totalHeld} held
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => markClass(slot, 'attended')}
                    size="sm"
                    type="button"
                    variant={mark === 'attended' ? 'default' : 'outline'}
                  >
                    <Check />
                    Attend
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => markClass(slot, 'missed')}
                    size="sm"
                    type="button"
                    variant={mark === 'missed' ? 'destructive' : 'outline'}
                  >
                    <X />
                    Skip
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
