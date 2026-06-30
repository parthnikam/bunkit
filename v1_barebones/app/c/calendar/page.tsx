import { LeavesDashboard } from '@/components/calendar/leaves-dashboard'
import { getCurrentSemesterData } from '@/lib/server/current-semester'

export default async function CalendarPage() {
  const semesterData = await getCurrentSemesterData()

  return (
    <LeavesDashboard
      currentSemester={semesterData.currentSemester}
      initialAbsences={semesterData.absences}
      initialSubjects={semesterData.subjects}
      settings={semesterData.settings}
    />
  )
}
