export const semesterColumns = [
  'sem1',
  'sem2',
  'sem3',
  'sem4',
  'sem5',
  'sem6',
  'sem7',
  'sem8',
] as const

export type SemesterColumn = (typeof semesterColumns)[number]

export function isSemesterColumn(value: unknown): value is SemesterColumn {
  return typeof value === 'string' && semesterColumns.includes(value as SemesterColumn)
}
