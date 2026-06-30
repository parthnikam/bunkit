import type { AppSettings, DateKey, TimeKey, WeekdayKey } from '@/lib/models/attendance'

export const mondayFirstWeekdays: WeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const jsWeekdays: WeekdayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}${month}${day}` as DateKey
}

export function dateKeyToDate(dateKey: DateKey): Date {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(4, 6)) - 1
  const day = Number(dateKey.slice(6, 8))

  return new Date(year, month, day)
}

export function weekdayKey(date: Date): WeekdayKey {
  return jsWeekdays[date.getDay()]
}

export function timeToMinutes(time: TimeKey): number {
  const hours = Number(time.slice(0, 2))
  const minutes = Number(time.slice(2, 4))

  return hours * 60 + minutes
}

export function dateTimeToTimeKey(date: Date): TimeKey {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}${minutes}` as TimeKey
}

export function isWithinSemester(date: Date, settings: AppSettings): boolean {
  const dateKey = toDateKey(date)

  return dateKey >= settings.semesterStart && dateKey <= settings.semesterEnd
}

export function isHoliday(date: Date, settings: AppSettings): boolean {
  return settings.holidays?.includes(toDateKey(date)) ?? false
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)

  return next
}

export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  let current = new Date(start)

  while (toDateKey(current) <= toDateKey(end)) {
    dates.push(new Date(current))
    current = addDays(current, 1)
  }

  return dates
}
