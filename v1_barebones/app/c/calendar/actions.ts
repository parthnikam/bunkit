'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/server'
import type { PlannedAbsences } from '@/lib/models/attendance'
import { isSemesterColumn } from '@/lib/models/semester'

type SemesterPayload = {
  absences?: Record<string, string[]>
  [key: string]: unknown
}

function mergeAbsences(
  existing: Record<string, string[]> = {},
  next: PlannedAbsences
): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...existing }

  for (const [date, subjects = []] of Object.entries(next)) {
    const combined = Array.from(new Set([...(merged[date] ?? []), ...subjects])).filter(Boolean)

    if (combined.length > 0) {
      merged[date] = combined
    }
  }

  return merged
}

export async function confirmCurrentSemesterAbsences(absences: PlannedAbsences) {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return { ok: false, message: 'Sign in again to confirm leave.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('TIMETABLE')
    .select('id, current_sem, sem1, sem2, sem3, sem4, sem5, sem6, sem7, sem8')
    .eq('creator', userData.user.id)
    .maybeSingle()

  if (lookupError) {
    return { ok: false, message: lookupError.message }
  }

  const row = existing as ({ id: unknown } & Record<string, unknown>) | null
  const semester = isSemesterColumn(row?.current_sem) ? row.current_sem : 'sem1'
  const currentSemester = ((row?.[semester] as SemesterPayload | null) ?? {}) as SemesterPayload
  const nextSemester = {
    ...currentSemester,
    absences: mergeAbsences(currentSemester.absences, absences),
  }
  const payload = {
    creator: userData.user.id,
    [semester]: nextSemester,
  }

  const result = row?.id
    ? await supabase.from('TIMETABLE').update(payload).eq('id', row.id)
    : await supabase.from('TIMETABLE').insert(payload)

  if (result.error) {
    return { ok: false, message: result.error.message }
  }

  revalidatePath('/c/calendar')
  revalidatePath('/c')
  revalidatePath('/c/subjects')

  return {
    ok: true,
    message: `Confirmed leave in ${semester.toUpperCase()}.`,
    semester,
    data: nextSemester,
  }
}
