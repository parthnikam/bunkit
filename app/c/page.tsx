import { TodayDashboard } from '@/components/home/today-dashboard'
import { createClient } from '@/lib/server'
import { getCurrentSemesterData } from '@/lib/server/current-semester'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const semesterData = await getCurrentSemesterData()

  if (!semesterData.hasTimetableInfo) {
    redirect('/c/settings')
  }

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
