import type { GradeConfig, Marks } from '../types'

const sum = (n: (number | null)[]) => n.reduce<number>((a, b) => a + (b ?? 0), 0)

/** Returns a list of problems; an empty list means the configuration is mathematically consistent. */
export function validateConfig(c: GradeConfig): string[] {
  const e: string[] = []
  if (sum(Object.values(c.practical)) !== 100) e.push('Practical Internship weights must total 100.')
  if (sum(Object.values(c.other)) !== 100) e.push('Internship Report and Career Fair weights must total 100.')
  const { practical, other } = c.groups
  if ((practical === null) !== (other === null)) e.push('Set both group weights or leave both empty.')
  else if (practical !== null && other !== null && practical + other !== 100) e.push('Group weights must total 100.')
  const all = [...Object.values(c.practical), ...Object.values(c.other), ...(practical !== null && other !== null ? [practical, other] : [])]
  if (all.some((v) => Number.isNaN(v) || v < 0 || v > 100)) e.push('Every weight must be between 0 and 100.')
  const bands = [...c.bands].sort((a, b) => a.min - b.min)
  bands.forEach((b, i) => {
    if (!b.grade.trim()) e.push('Every grade band needs a grade label.')
    if (b.min > b.max || b.min < 0 || b.max > 100) e.push(`Band ${b.grade || i + 1} has an invalid range.`)
    if (i > 0 && b.min <= bands[i - 1].max) e.push(`Band ${b.grade} overlaps ${bands[i - 1].grade}.`)
  })
  return e
}

export interface Computation { ok: boolean; errors: string[]; practical?: number; other?: number; overall?: number; grade?: string }

export function computeResult(m: Marks, c: GradeConfig): Computation {
  const errors = validateConfig(c)
  const missing = (Object.keys(m) as (keyof Marks)[]).filter((k) => m[k] === null)
  if (missing.length) errors.push(`Missing components: ${missing.join(', ')}.`)
  if (c.groups.practical === null || c.groups.other === null) errors.push('Group weights are not configured, so an overall grade cannot be computed.')
  if (c.bands.length === 0) errors.push('Grade bands are not configured.')
  if (errors.length) return { ok: false, errors }
  const gp = c.groups.practical as number, go = c.groups.other as number
  const practical = ((m.logbook as number) * c.practical.logbook + (m.formD as number) * c.practical.formD + (m.selfEval as number) * c.practical.selfEval) / 100
  const other = ((m.report as number) * c.other.report + (m.careerFair as number) * c.other.careerFair) / 100
  const overall = Math.round(((practical * gp + other * go) / 100) * 100) / 100
  const band = c.bands.find((b) => overall >= b.min && overall <= b.max)
  if (!band) return { ok: false, errors: [`No grade band covers ${overall}.`], practical, other, overall }
  return { ok: true, errors: [], practical, other, overall, grade: band.grade }
}
