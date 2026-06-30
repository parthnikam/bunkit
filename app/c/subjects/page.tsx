import { SubjectsDashboard } from '@/components/subjects/subjects-dashboard'
import { getCurrentSemesterData } from '@/lib/server/current-semester'
import { redirect } from 'next/navigation'

export default async function SubjectsPage() {
  const semesterData = await getCurrentSemesterData()

  if (!semesterData.hasTimetableInfo) {
    redirect('/c/settings')
  }

  return (
    <SubjectsDashboard
      initialAbsences={semesterData.absences}
      initialSubjects={semesterData.subjects}
      settings={semesterData.settings}
    />
  )
}
