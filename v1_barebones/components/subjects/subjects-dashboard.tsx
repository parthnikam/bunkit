'use client'

import { ChevronDown, CircleAlert, Target } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  plannedMissCounts,
  predictedSubjects,
} from '@/lib/logic/attendance-engine'
import {
  attendance,
  held,
  skipsLeft,
} from '@/lib/logic/subject-calculations'
import type { AppSettings, PlannedAbsences, SubjectRecord } from '@/lib/models/attendance'

type SubjectsDashboardProps = {
  initialSubjects: SubjectRecord[]
  initialAbsences: PlannedAbsences
  settings: AppSettings
}

const targets = [60, 65, 70, 75, 80, 85, 90]

function formatNumber(value: number) {
  if (value === Number.POSITIVE_INFINITY) {
    return 'unlimited'
  }

  return String(value)
}

function statusFor(percent: number, minimum: number, recommended: number) {
  if (percent < minimum) {
    return {
      label: 'Unsafe',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  if (percent < recommended) {
    return {
      label: 'Buffer',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'Safe',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

export function SubjectsDashboard({
  initialSubjects,
  initialAbsences,
  settings,
}: SubjectsDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState(initialSubjects[0]?.name ?? '')
  const [target, setTarget] = useState(settings.recommendedAttendance)

  const plannedCounts = useMemo(() => plannedMissCounts(initialAbsences), [initialAbsences])
  const projectedSubjects = useMemo(
    () => predictedSubjects(initialSubjects, initialAbsences),
    [initialAbsences, initialSubjects]
  )
  const selected = projectedSubjects.find((subject) => subject.name === selectedSubject)
  const selectedSkips = selected ? skipsLeft(selected, target) : 0

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Attendance budget</p>
          <h1 className="text-xl font-semibold tracking-tight">Bunks</h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
          <Target className="size-4 text-muted-foreground" />
          <select
            aria-label="Target attendance"
            className="bg-transparent text-sm font-medium outline-none"
            onChange={(event) => setTarget(Number(event.target.value))}
            value={target}
          >
            {targets.map((item) => (
              <option key={item} value={item}>
                {item}%
              </option>
            ))}
          </select>
          <ChevronDown className="size-3 text-muted-foreground" />
        </div>
      </header>

      <section className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex w-max gap-2">
          {projectedSubjects.map((subject) => {
            const selected = subject.name === selectedSubject

            return (
              <button
                className={[
                  'h-8 w-[172px] rounded-lg border px-3 text-left text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                ].join(' ')}
                key={subject.name}
                onClick={() => setSelectedSubject(subject.name)}
                type="button"
              >
                {subject.name}
              </button>
            )
          })}
        </div>
      </section>

      {selected ? (
        <section className="grid gap-2 rounded-lg border px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(selectedSkips)} skips left at {target}%
            </p>
          </div>
          <div className="text-sm">{attendance(selected).toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">
            {selected.missed}/{held(selected)} missed
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto">
        <div className="space-y-2">
          <div className="grid min-w-[720px] grid-cols-[1fr_86px_110px_110px_110px_92px] gap-2 border-b pb-2 text-xs text-muted-foreground">
            <span>Subject</span>
            <span>Percent</span>
            <span>Missed</span>
            <span>Skips left</span>
            <span>Planned</span>
            <span>Status</span>
          </div>

          {projectedSubjects.map((subject) => {
            const percent = attendance(subject)
            const minimum = subject.minimumTarget ?? settings.minimumAttendance
            const recommended = subject.safetyTarget ?? settings.recommendedAttendance
            const status = statusFor(percent, minimum, recommended)
            const plannedMisses = plannedCounts[subject.name] ?? 0

            return (
              <button
                className={[
                  'grid min-w-[720px] grid-cols-[1fr_86px_110px_110px_110px_92px] items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                  selectedSubject === subject.name ? 'border-primary' : 'border-border',
                ].join(' ')}
                key={subject.name}
                onClick={() => setSelectedSubject(subject.name)}
                type="button"
              >
                <span className="font-medium">{subject.name}</span>
                <span>{percent.toFixed(1)}%</span>
                <span className="text-muted-foreground">
                  {subject.missed}/{held(subject)}
                </span>
                <span>{formatNumber(skipsLeft(subject, target))}</span>
                <span className="text-muted-foreground">{plannedMisses}</span>
                <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${status.className}`}>
                  {status.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Percentages include planned misses. Change the target to see how many more classes each
          subject can absorb.
        </p>
      </section>
    </div>
  )
}
