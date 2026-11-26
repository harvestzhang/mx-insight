import type { AD, Component, Db, DueItem } from './types'

export const today = () => new Date().toISOString().slice(0, 10)

export function addMonths(date: string, months: number, endOfMonth = false): string {
  const [y, m, d] = date.split('-').map(Number)
  if (endOfMonth) {
    // last day of the Nth calendar month after the month of `date`
    const last = new Date(Date.UTC(y, m - 1 + months + 1, 0))
    return last.toISOString().slice(0, 10)
  }
  const t = new Date(Date.UTC(y, m - 1 + months, d))
  return t.toISOString().slice(0, 10)
}

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
export const monthsBetween = (a: string, b: string) => daysBetween(a, b) / 30.4375

export const fmtDate = (d?: string) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—'
export const fmtHrs = (h?: number) => (h === undefined || Number.isNaN(h) ? '—' : h.toFixed(1))

/** All (date, tach) observations from entries plus the current reading, sorted. */
export function tachSeries(db: Db): { date: string; tach: number }[] {
  const pts = db.entries.filter((e) => e.tach !== undefined).map((e) => ({ date: e.date, tach: e.tach! }))
  pts.push({ date: db.aircraft.currentTachDate, tach: db.aircraft.currentTach })
  pts.sort((a, b) => a.date.localeCompare(b.date) || a.tach - b.tach)
  // Drop readings that go backwards (typos like 613.8 after 668.3, or copied headers)
  const out: typeof pts = []
  for (const p of pts) if (!out.length || p.tach >= out[out.length - 1].tach) out.push(p)
  return out
}

/** Average hours per year over the trailing window (default 3 years) ending at the latest reading. */
export function utilization(db: Db, years = 3): number {
  const s = tachSeries(db)
  if (s.length < 2) return 50
  const end = s[s.length - 1]
  const cutoff = addMonths(end.date, -12 * years)
  const start = s.find((p) => p.date >= cutoff) ?? s[0]
  const yrs = daysBetween(start.date, end.date) / 365.25
  if (yrs < 0.25) return 50
  return Math.max(1, (end.tach - start.tach) / yrs)
}

/** likely = not provably due, but projected past due at average utilization (tach reading is stale) */
export type Status = 'overdue' | 'soon' | 'likely' | 'ok' | 'unknown'

export interface DueResult {
  dueDate?: string
  dueTach?: number
  hoursLeft?: number
  daysLeft?: number
  /** expected date the hours limit is reached at current utilization */
  projectedDate?: string
  status: Status
  /** what drives the due point */
  limiting?: 'hours' | 'calendar'
}

export function computeDue(
  db: Db,
  x: { intervalHours?: number; intervalMonths?: number; endOfMonth?: boolean; lastDate?: string; lastTach?: number; dueDate?: string; dueTach?: number },
): DueResult {
  const now = today()
  const tach = db.aircraft.currentTach
  const dueDate = x.dueDate ?? (x.intervalMonths && x.lastDate ? addMonths(x.lastDate, x.intervalMonths, x.endOfMonth) : undefined)
  const dueTach = x.dueTach ?? (x.intervalHours && x.lastTach !== undefined ? x.lastTach + x.intervalHours : undefined)
  if (!dueDate && dueTach === undefined) return { status: 'unknown' }
  const daysLeft = dueDate ? daysBetween(now, dueDate) : undefined
  const hoursLeft = dueTach !== undefined ? dueTach - tach : undefined
  const perDay = utilization(db) / 365.25
  // Assume flying continues from the last tach reading's date
  const projectedDate =
    hoursLeft !== undefined ? addDays(db.aircraft.currentTachDate, Math.max(0, hoursLeft) / perDay) : undefined
  const overdue = (daysLeft !== undefined && daysLeft < 0) || (hoursLeft !== undefined && hoursLeft < 0)
  const soon =
    (daysLeft !== undefined && daysLeft <= db.settings.soonDays) || (hoursLeft !== undefined && hoursLeft <= db.settings.soonHours)
  let limiting: 'hours' | 'calendar' | undefined
  if (dueDate && projectedDate) limiting = projectedDate < dueDate ? 'hours' : 'calendar'
  else limiting = dueDate ? 'calendar' : 'hours'
  const likely = projectedDate !== undefined && projectedDate < now
  return { dueDate, dueTach, daysLeft, hoursLeft, projectedDate, status: overdue ? 'overdue' : soon ? 'soon' : likely ? 'likely' : 'ok', limiting }
}

function addDays(date: string, days: number) {
  const t = Date.parse(date) + Math.round(days) * 86400000
  return new Date(t).toISOString().slice(0, 10)
}

export const dueForItem = (db: Db, i: DueItem) => computeDue(db, i)

export function dueForAD(db: Db, a: AD): DueResult {
  if (!a.recurring || a.status === 'not-applicable' || a.status === 'complied') return { status: 'unknown' }
  return computeDue(db, a)
}

/** Component time since install basis (hours) and age (months). */
export function componentLife(db: Db, c: Component) {
  const hours =
    c.installedTach !== undefined ? (c.timeAtInstall ?? 0) + (db.aircraft.currentTach - c.installedTach) : undefined
  const from = c.calendarFrom ?? c.installedDate
  const months = from ? monthsBetween(from, today()) : undefined
  const hrsPct = hours !== undefined && c.tboHours ? hours / c.tboHours : undefined
  const calPct = months !== undefined && c.tboMonths ? months / c.tboMonths : undefined
  return { hours, months, hrsPct, calPct }
}

/** Latest occurrence of a sign-off (e.g. 'annual') in the log, for sanity checks. */
export function lastSignoff(db: Db, kind: string) {
  return db.entries
    .filter((e) => e.signoffs?.includes(kind))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function uid(prefix = 'e') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** "2007-08-08" and "07-08-08" refer to the same AD */
export const normAD = (n: string) => {
  const p = n.trim().split('-')
  if (p.length === 3 && p[0].length === 4) p[0] = p[0].slice(2)
  return p.join('-')
}

const LABELS: Record<string, string> = {
  ad: 'AD', regulatory: 'Required', advisory: 'Advisory', maintenance: 'Maintenance',
  verify: 'Verify', recurring: 'Recurring', conditional: 'Conditional', complied: 'Complied', 'not-applicable': 'Not applicable',
}
/** Display label for a stored key such as an item kind, AD status, category or book */
export const label = (key: string) => LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
