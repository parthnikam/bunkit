'use client'

import { CircleAlert, Target } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  plannedMissCounts,
  predictedSubjects,
} from '@/lib/logic/attendance-engine'
import {
  attendance,
  held,
} from '@/lib/logic/subject-calculations'
import {
  remainingSkipsForSemester,
  semesterClassCounts,
  withSemesterMetrics,
} from '@/lib/logic/semester-metrics'
import type { AppSettings, PlannedAbsences, SubjectRecord } from '@/lib/models/attendance'

type SubjectsDashboardProps = {
  initialSubjects: SubjectRecord[]
  initialAbsences: PlannedAbsences
  settings: AppSettings
}

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

  const plannedCounts = useMemo(() => plannedMissCounts(initialAbsences), [initialAbsences])
  const projectedSubjects = useMemo(
    () => {
      const classCounts = semesterClassCounts(settings)

      return predictedSubjects(initialSubjects, initialAbsences).map((subject) =>
        withSemesterMetrics(subject, settings, classCounts)
      )
    },
    [initialAbsences, initialSubjects, settings]
  )
  const selected = projectedSubjects.find((subject) => subject.name === selectedSubject)
  const selectedSkips = selected?.remainingSkips ?? 0

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 md:py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Attendance budget</p>
          <h1 className="text-xl font-semibold tracking-tight">Bunks</h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
          <Target className="size-4 text-muted-foreground" />
          <span className="font-medium">{settings.minimumAttendance}% min</span>
        </div>
      </header>

      <section className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div className="flex w-max gap-2">
          {projectedSubjects.map((subject) => {
            const selected = subject.name === selectedSubject

            return (
              <button
                className={[
                  'h-8 rounded-lg border px-3 text-sm transition-colors',
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
              {formatNumber(selectedSkips)} skips left at {settings.minimumAttendance}% minimum
            </p>
          </div>
          <div className="text-sm">{attendance(selected).toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">
            {selected.missed}/{held(selected)} missed
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="w-[22%] border-b px-2 pb-2 text-left font-normal">Subject</th>
              <th className="border-b px-2 pb-2 text-right font-normal">Percent</th>
              <th className="border-b px-2 pb-2 text-right font-normal">Total</th>
              <th className="border-b px-2 pb-2 text-right font-normal">Missed</th>
              <th className="border-b px-2 pb-2 text-right font-normal">Left</th>
              <th className="border-b px-2 pb-2 text-right font-normal">Planned</th>
              <th className="border-b px-2 pb-2 text-center font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {projectedSubjects.map((subject) => {
              const percent = attendance(subject)
              const minimum = subject.minimumTarget ?? settings.minimumAttendance
              const recommended = subject.safetyTarget ?? settings.recommendedAttendance
              const status = statusFor(percent, minimum, recommended)
              const plannedMisses = plannedCounts[subject.name] ?? 0

              return (
                <tr
                  className={[
                    'cursor-pointer transition-colors hover:bg-muted/60 [&>td]:border-y [&>td]:border-border [&>td]:px-2 [&>td]:py-2',
                    '[&>td:first-child]:rounded-l-lg [&>td:first-child]:border-l',
                    '[&>td:last-child]:rounded-r-lg [&>td:last-child]:border-r',
                    selectedSubject === subject.name ? '[&>td]:border-primary' : '',
                  ].join(' ')}
                  key={subject.name}
                  onClick={() => setSelectedSubject(subject.name)}
                >
                  <td className="font-medium">{subject.name}</td>
                  <td className="text-right">{percent.toFixed(1)}%</td>
                  <td className="text-right text-muted-foreground">{subject.totalClasses ?? 0}</td>
                  <td className="text-right text-muted-foreground">
                    {subject.missed}/{held(subject)}
                  </td>
                  <td className="text-right">
                    {formatNumber(
                      remainingSkipsForSemester(
                        subject.missed,
                        subject.totalClasses ?? 0,
                        settings.minimumAttendance
                      )
                    )}
                  </td>
                  <td className="text-right text-muted-foreground">{plannedMisses}</td>
                  <td className="text-center">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Percentages include planned misses. Remaining skips use total semester classes and the
          minimum attendance rule.
        </p>
      </section>
    </div>
  )
}
