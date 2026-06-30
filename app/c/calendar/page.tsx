import { LeavesDashboard } from '@/components/calendar/leaves-dashboard'
import { getCurrentSemesterData } from '@/lib/server/current-semester'
import { redirect } from 'next/navigation'

export default async function CalendarPage() {
  const semesterData = await getCurrentSemesterData()

  if (!semesterData.hasTimetableInfo) {
    redirect('/c/settings')
  }

  return (
    <LeavesDashboard
      currentSemester={semesterData.currentSemester}
      initialAbsences={semesterData.absences}
      initialSubjects={semesterData.subjects}
      settings={semesterData.settings}
    />
  )
}
