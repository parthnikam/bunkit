import { TodayDashboard } from '@/components/home/today-dashboard'
import { createClient } from '@/lib/server'
import { getCurrentSemesterData } from '@/lib/server/current-semester'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const semesterData = await getCurrentSemesterData()

  return (
    <TodayDashboard
      currentSemester={semesterData.currentSemester}
      email={data?.claims?.email}
      initialAbsences={semesterData.absences}
      initialMarks={semesterData.marks}
      initialSettings={semesterData.settings}
      initialSubjects={semesterData.subjects}
    />
  )
}
