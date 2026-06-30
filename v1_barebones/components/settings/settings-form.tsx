'use client'

import { BookOpen, CalendarDays, CalendarPlus, Plus, Save, Trash2, X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { FormEvent, useMemo, useState } from 'react'

import {
  saveSemesterSettings,
  type SavedSemesterSettings,
} from '@/app/c/settings/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveCurrentSemesterCache, saveSemesterCache } from '@/lib/client/semester-cache'
import type { AppSettings, DateKey, TimeKey, WeekdayKey } from '@/lib/models/attendance'
import { semesterColumns, type SemesterColumn } from '@/lib/models/semester'

type EditableSlot = {
  id: string
  subject: string
  weekday: WeekdayKey
  start: string
  end: string
  room: string
}

type HolidayRange = {
  id: string
  start: string
  end: string
}

type SettingsFormProps = {
  initialSemester: SemesterColumn
  initialSettings: AppSettings
}

const weekdays: WeekdayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const semesters: SemesterColumn[] = [...semesterColumns]

const emptySlot: Omit<EditableSlot, 'id'> = {
  subject: '',
  weekday: 'monday',
  start: '09:00',
  end: '10:00',
  room: '',
}

function dateKeyToInput(value: DateKey): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function inputToDateKey(value: string): DateKey {
  return value.replaceAll('-', '') as DateKey
}

function timeKeyToInput(value: TimeKey): string {
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`
}

function inputToTimeKey(value: string): TimeKey {
  return value.replace(':', '') as TimeKey
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function fieldId(prefix: string, id: string): string {
  return `${prefix}-${id}`
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function SettingsForm({ initialSemester, initialSettings }: SettingsFormProps) {
  const [semester, setSemester] = useState<SemesterColumn>(initialSemester)
  const [minimumAttendance, setMinimumAttendance] = useState(initialSettings.minimumAttendance)
  const [recommendedAttendance, setRecommendedAttendance] = useState(
    initialSettings.recommendedAttendance
  )
  const [semesterStart, setSemesterStart] = useState(dateKeyToInput(initialSettings.semesterStart))
  const [semesterEnd, setSemesterEnd] = useState(dateKeyToInput(initialSettings.semesterEnd))
  const [holidays, setHolidays] = useState<string[]>(
    initialSettings.holidays?.map(dateKeyToInput) ?? []
  )
  const [holidayRanges, setHolidayRanges] = useState<HolidayRange[]>([])
  const [slots, setSlots] = useState<EditableSlot[]>(() =>
    weekdays.flatMap((weekday) =>
      (initialSettings.timetable[weekday] ?? []).map((slot, index) => ({
        id: `${weekday}-${index}`,
        subject: slot.subject,
        weekday,
        start: timeKeyToInput(slot.time.start),
        end: timeKeyToInput(slot.time.end),
        room: slot.room ?? '',
      }))
    )
  )
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [draftSlot, setDraftSlot] = useState<Omit<EditableSlot, 'id'>>(emptySlot)
  const [saveMessage, setSaveMessage] = useState('Ready')
  const [isSaving, setIsSaving] = useState(false)

  const subjects = useMemo(
    () => Array.from(new Set(slots.map((slot) => slot.subject.trim()).filter(Boolean))).sort(),
    [slots]
  )
  const slotsByWeekday = useMemo(
    () =>
      weekdays.reduce<Record<WeekdayKey, EditableSlot[]>>((groups, weekday) => {
        groups[weekday] = slots
          .filter((slot) => slot.weekday === weekday)
          .sort((first, second) => first.start.localeCompare(second.start))

        return groups
      }, {} as Record<WeekdayKey, EditableSlot[]>),
    [slots]
  )

  function addHoliday() {
    setHolidays((current) => [...current, semesterStart])
  }

  function removeHoliday(index: number) {
    setHolidays((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function addHolidayRange() {
    setHolidayRanges((current) => [
      ...current,
      { id: newId('range'), start: semesterStart, end: semesterStart },
    ])
  }

  function removeHolidayRange(id: string) {
    setHolidayRanges((current) => current.filter((range) => range.id !== id))
  }

  function addSlot() {
    if (!draftSlot.subject.trim()) {
      return
    }

    setSlots((current) => [...current, { id: newId('slot'), ...draftSlot }])
    setIsAddingSlot(false)
    setDraftSlot(emptySlot)
  }

  function updateSlot(id: string, changes: Partial<EditableSlot>) {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, ...changes } : slot))
    )
  }

  function removeSlot(id: string) {
    setSlots((current) => current.filter((slot) => slot.id !== id))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSaveMessage('Saving...')

    const expandedHolidayDates = holidayRanges.flatMap((range) => datesInRange(range.start, range.end))
    const uniqueHolidays = Array.from(new Set([...holidays, ...expandedHolidayDates])).sort()
    const settings: SavedSemesterSettings = {
      start_date: inputToDateKey(semesterStart),
      end_date: inputToDateKey(semesterEnd),
      minimum_attendance: minimumAttendance,
      recommended_attendance: recommendedAttendance,
      holidays: uniqueHolidays.map(inputToDateKey),
      holiday_ranges: holidayRanges.map((range) => ({
        start: inputToDateKey(range.start),
        end: inputToDateKey(range.end),
      })),
      timetable: weekdays.reduce<AppSettings['timetable']>((timetable, weekday) => {
        timetable[weekday] = slots
          .filter((slot) => slot.weekday === weekday && slot.subject.trim())
          .map((slot) => ({
            subject: slot.subject.trim().toUpperCase(),
            weekday,
            time: {
              start: inputToTimeKey(slot.start),
              end: inputToTimeKey(slot.end),
            },
            room: slot.room.trim() || undefined,
          }))

        return timetable
      }, {}),
      absences: {},
    }

    const result = await saveSemesterSettings(semester, settings)
    if (result.ok) {
      saveSemesterCache(semester, settings)
    }
    setSaveMessage(result.message)
    setIsSaving(false)
  }

  return (
    <form className="space-y-5 text-sm" onSubmit={handleSubmit}>
      <section className="space-y-2">
        <div className="flex items-center gap-2 border-b pb-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Semester</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <InlineSelect
            id="semester-column"
            label="Sem"
            onChange={(value) => {
              const nextSemester = value as SemesterColumn
              setSemester(nextSemester)
              saveCurrentSemesterCache(nextSemester)
            }}
            options={semesters.map((item) => ({ label: item.toUpperCase(), value: item }))}
            value={semester}
          />
          <InlineInput
            id="semester-start"
            label="Start"
            onChange={setSemesterStart}
            type="date"
            value={semesterStart}
          />
          <InlineInput
            id="semester-end"
            label="End"
            onChange={setSemesterEnd}
            type="date"
            value={semesterEnd}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 border-b pb-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <h2 className="font-medium">Attendance Rules</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <InlineInput
            id="minimum-attendance"
            label="Minimum"
            max={100}
            min={0}
            onChange={(value) => setMinimumAttendance(Number(value))}
            type="number"
            value={String(minimumAttendance)}
          />
          <InlineInput
            id="recommended-attendance"
            label="Recommended"
            max={100}
            min={0}
            onChange={(value) => setRecommendedAttendance(Number(value))}
            type="number"
            value={String(recommendedAttendance)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-4 text-muted-foreground" />
            <h2 className="font-medium">Holidays</h2>
          </div>
          <Button onClick={addHoliday} size="sm" type="button" variant="outline">
            <Plus />
            Date
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {holidays.map((holiday, index) => (
            <div className="flex items-center gap-2" key={`${holiday}-${index}`}>
              <InlineInput
                id={fieldId('holiday', String(index))}
                label="Date"
                onChange={(value) =>
                  setHolidays((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? value : item))
                  )
                }
                type="date"
                value={holiday}
              />
              <Button
                aria-label="Remove holiday"
                onClick={() => removeHoliday(index)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <h3 className="text-sm font-medium">Holiday ranges</h3>
          <Button onClick={addHolidayRange} size="sm" type="button" variant="outline">
            <Plus />
            Range
          </Button>
        </div>

        <div className="space-y-2 overflow-x-auto">
          {holidayRanges.map((range) => (
            <div
              className="grid min-w-[520px] grid-cols-[64px_1fr_44px_1fr_auto] items-center gap-2"
              key={range.id}
            >
              <Label className="text-xs text-muted-foreground" htmlFor={fieldId('range-start', range.id)}>
                Range
              </Label>
              <Input
                id={fieldId('range-start', range.id)}
                onChange={(event) =>
                  setHolidayRanges((current) =>
                    current.map((item) =>
                      item.id === range.id ? { ...item, start: event.target.value } : item
                    )
                  )
                }
                type="date"
                value={range.start}
              />
              <Label className="text-xs text-muted-foreground" htmlFor={fieldId('range-end', range.id)}>
                to
              </Label>
              <Input
                id={fieldId('range-end', range.id)}
                onChange={(event) =>
                  setHolidayRanges((current) =>
                    current.map((item) =>
                      item.id === range.id ? { ...item, end: event.target.value } : item
                    )
                  )
                }
                type="date"
                value={range.end}
              />
              <Button
                aria-label="Remove holiday range"
                onClick={() => removeHolidayRange(range.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <h2 className="font-medium">Timetable</h2>
          <Button onClick={() => setIsAddingSlot(true)} size="sm" type="button" variant="outline">
            <Plus />
            Class
          </Button>
        </div>

        <div className="space-y-4">
          {weekdays.map((weekday) => (
            <div className="space-y-1.5" key={weekday}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize">{weekday}</h3>
                <span className="text-xs text-muted-foreground">
                  {slotsByWeekday[weekday].length} classes
                </span>
              </div>

              <div className="space-y-2 overflow-x-auto">
                {slotsByWeekday[weekday].length === 0 ? (
                  <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                    No classes
                  </p>
                ) : (
                  slotsByWeekday[weekday].map((slot) => (
                    <div
                      className="grid min-w-[680px] grid-cols-[1.2fr_104px_104px_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2"
                      key={slot.id}
                    >
                      <InlineInput
                        id={fieldId('subject', slot.id)}
                        label="Subject"
                        onChange={(value) => updateSlot(slot.id, { subject: value })}
                        placeholder="MATH"
                        value={slot.subject}
                      />
                      <Input
                        aria-label="Start time"
                        onChange={(event) => updateSlot(slot.id, { start: event.target.value })}
                        type="time"
                        value={slot.start}
                      />
                      <Input
                        aria-label="End time"
                        onChange={(event) => updateSlot(slot.id, { end: event.target.value })}
                        type="time"
                        value={slot.end}
                      />
                      <InlineInput
                        id={fieldId('room', slot.id)}
                        label="Room"
                        onChange={(value) => updateSlot(slot.id, { room: value })}
                        placeholder="A-101"
                        value={slot.room}
                      />
                      <Button
                        aria-label="Remove class"
                        onClick={() => removeSlot(slot.id)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground" key={subject}>
              {subject}
            </span>
          ))}
        </div>
      </section>

      <div className="sticky bottom-20 flex items-center justify-between gap-3 border-t bg-background/95 py-4 backdrop-blur md:bottom-0">
        <p className="text-sm text-muted-foreground">{saveMessage}</p>
        <Button disabled={isSaving} type="submit">
          <Save />
          {isSaving ? 'Saving' : 'Save'}
        </Button>
      </div>

      {isAddingSlot ? (
        <div className="fixed inset-0 z-20 flex items-end bg-black/30 p-3 sm:items-center sm:justify-center">
          <div className="w-full rounded-lg bg-background p-4 shadow-lg ring-1 ring-border sm:max-w-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-medium">Add class</h3>
              <Button
                aria-label="Close add class"
                onClick={() => setIsAddingSlot(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <div className="space-y-2">
              <InlineInput
                id="new-class-subject"
                label="Subject"
                onChange={(value) => setDraftSlot({ ...draftSlot, subject: value })}
                placeholder="MATH"
                value={draftSlot.subject}
              />
              <InlineSelect
                id="new-class-day"
                label="Day"
                onChange={(value) => setDraftSlot({ ...draftSlot, weekday: value as WeekdayKey })}
                options={weekdays.map((weekday) => ({
                  label: weekday[0].toUpperCase() + weekday.slice(1),
                  value: weekday,
                }))}
                value={draftSlot.weekday}
              />
              <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
                <Label className="text-xs text-muted-foreground" htmlFor="new-class-start">
                  Time
                </Label>
                <Input
                  id="new-class-start"
                  onChange={(event) => setDraftSlot({ ...draftSlot, start: event.target.value })}
                  type="time"
                  value={draftSlot.start}
                />
                <Input
                  aria-label="New class end time"
                  onChange={(event) => setDraftSlot({ ...draftSlot, end: event.target.value })}
                  type="time"
                  value={draftSlot.end}
                />
              </div>
              <InlineInput
                id="new-class-room"
                label="Room"
                onChange={(value) => setDraftSlot({ ...draftSlot, room: value })}
                placeholder="A-101"
                value={draftSlot.room}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setIsAddingSlot(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!draftSlot.subject.trim()} onClick={addSlot} type="button">
                <Plus />
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}

function InlineInput({
  id,
  label,
  onChange,
  value,
  ...props
}: Omit<ComponentProps<typeof Input>, 'onChange' | 'value'> & {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Label className="w-16 shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} value={value} {...props} />
    </div>
  )
}

function InlineSelect({
  id,
  label,
  onChange,
  options,
  value,
}: {
  id: string
  label: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Label className="w-16 shrink-0 text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <select
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
