export const today = () => new Date().toISOString().slice(0, 10)
export const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const inRange = (d: string, start?: string, end?: string) => !!start && !!end && d >= start && d <= end
export function elapsedPct(start?: string, end?: string, now = today()) {
  if (!start || !end) return 0
  const s = Date.parse(start), e = Date.parse(end), n = Date.parse(now)
  return Math.max(0, Math.min(100, Math.round(((n - s) / (e - s)) * 100)))
}
