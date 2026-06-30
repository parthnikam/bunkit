import { SettingsForm } from '@/components/settings/settings-form'
import type { AppSettings, DateKey } from '@/lib/models/attendance'
import { isSemesterColumn, type SemesterColumn } from '@/lib/models/semester'
import { createClient } from '@/lib/server'

type StoredSemesterSettings = {
  start_date?: DateKey
  end_date?: DateKey
  minimum_attendance?: number
  recommended_attendance?: number
  holidays?: DateKey[]
  holiday_ranges?: { start: DateKey; end: DateKey }[]
  timetable?: AppSettings['timetable']
}

const fallbackSettings: AppSettings = {
  semesterStart: '20260701',
  semesterEnd: '20261130',
  minimumAttendance: 75,
  recommendedAttendance: 80,
  holidays: [],
  holidayRanges: [],
  timetable: {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  },
}

function normalizeSettings(stored?: StoredSemesterSettings | null): AppSettings {
  return {
    semesterStart: stored?.start_date ?? fallbackSettings.semesterStart,
    semesterEnd: stored?.end_date ?? fallbackSettings.semesterEnd,
    minimumAttendance: stored?.minimum_attendance ?? fallbackSettings.minimumAttendance,
    recommendedAttendance: stored?.recommended_attendance ?? fallbackSettings.recommendedAttendance,
    holidays: stored?.holidays ?? fallbackSettings.holidays,
    holidayRanges: stored?.holiday_ranges ?? fallbackSettings.holidayRanges,
    timetable: stored?.timetable ?? fallbackSettings.timetable,
  }
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const { data } = userData.user
    ? await supabase
        .from('TIMETABLE')
        .select('current_sem, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8')
        .eq('user_id', userData.user.id)
        .maybeSingle()
    : { data: null }

  const row = data as Record<string, unknown> | null
  const initialSemester: SemesterColumn = isSemesterColumn(row?.current_sem) ? row.current_sem : 'sem1'
  const initialSettings = normalizeSettings(row?.[initialSemester] as StoredSemesterSettings | null)

  return (
    <div className="px-4 py-5 sm:px-6 md:py-8">
      <header className="mb-6 space-y-1">
        <p className="text-sm text-muted-foreground">Onboarding</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <SettingsForm initialSemester={initialSemester} initialSettings={initialSettings} />
    </div>
  )
}
