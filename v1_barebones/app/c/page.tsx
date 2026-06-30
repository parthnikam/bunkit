import { TodayDashboard } from '@/components/home/today-dashboard'
import { createClient } from '@/lib/server'
import { getCurrentSemesterData } from '@/lib/server/current-semester'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const semesterData = await getCurrentSemesterData()

  return (
    <TodayDashboard
      email={data?.claims?.email}
      initialAbsences={semesterData.absences}
      initialSettings={semesterData.settings}
      initialSubjects={semesterData.subjects}
    />
  )
}
