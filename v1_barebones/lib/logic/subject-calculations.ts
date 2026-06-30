import type { SubjectRecord } from '@/lib/models/attendance'

export function held(record: Pick<SubjectRecord, 'attended' | 'missed'>): number {
  return record.attended + record.missed
}

export function attendance(record: Pick<SubjectRecord, 'attended' | 'missed'>): number {
  const total = held(record)

  if (total === 0) {
    return 100
  }

  return (record.attended / total) * 100
}

export function skipsLeft(
  record: Pick<SubjectRecord, 'attended' | 'missed'>,
  threshold: number
): number {
  const requiredRatio = threshold / 100

  if (requiredRatio <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const allowedTotal = Math.floor(record.attended / requiredRatio)

  return Math.max(0, allowedTotal - held(record))
}

export function recoveryClasses(
  record: Pick<SubjectRecord, 'attended' | 'missed'>,
  threshold: number
): number {
  const requiredRatio = threshold / 100

  if (requiredRatio <= 0 || attendance(record) >= threshold) {
    return 0
  }

  if (requiredRatio >= 1) {
    return Number.POSITIVE_INFINITY
  }

  return Math.ceil((requiredRatio * held(record) - record.attended) / (1 - requiredRatio))
}

export function copyAfterMisses(record: SubjectRecord, misses: number): SubjectRecord {
  return {
    ...record,
    missed: record.missed + Math.max(0, misses),
  }
}
