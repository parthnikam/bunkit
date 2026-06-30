import { SubjectsDashboard } from '@/components/subjects/subjects-dashboard'
import { getCurrentSemesterData } from '@/lib/server/current-semester'

export default async function SubjectsPage() {
  const semesterData = await getCurrentSemesterData()

  return (
    <SubjectsDashboard
      initialAbsences={semesterData.absences}
      initialSubjects={semesterData.subjects}
      settings={semesterData.settings}
    />
  )
}
