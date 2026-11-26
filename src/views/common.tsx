import type { ReactNode } from 'react'
import type { DueResult, Status } from '../calc'
import { fmtDate, fmtHrs } from '../calc'

export function Badge({ status, children }: { status: Status | 'high' | 'medium' | 'low' | 'info'; children?: ReactNode }) {
  const label = children ?? { overdue: 'Overdue', soon: 'Due soon', likely: 'Likely due', ok: 'OK', unknown: '—', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }[status]
  return <span className={`badge ${status}`}>{label}</span>
}

export function DueCells({ d }: { d: DueResult }) {
  const due = [d.dueDate && fmtDate(d.dueDate), d.dueTach !== undefined && `${fmtHrs(d.dueTach)} tach`].filter(Boolean).join(' / ')
  const left = [
    d.daysLeft !== undefined && `${d.daysLeft < 0 ? `${-d.daysLeft} days over` : `${d.daysLeft} days`}`,
    d.hoursLeft !== undefined && `${d.hoursLeft < 0 ? `${fmtHrs(-d.hoursLeft)} hrs over` : `${fmtHrs(d.hoursLeft)} hrs`}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <>
      <td>{due || '—'}</td>
      <td>{left || '—'}</td>
      <td className={d.status === 'likely' ? 'warn' : 'muted'}>{d.projectedDate && d.hoursLeft !== undefined && d.hoursLeft > 0 ? `≈ ${fmtDate(d.projectedDate)}` : ''}</td>
    </>
  )
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export const num = (s: string) => (s.trim() === '' ? undefined : Number(s))
export const str = (s: string) => (s.trim() === '' ? undefined : s)

export function Pct({ v }: { v?: number }) {
  if (v === undefined) return <span className="muted">—</span>
  // TBOs are advisory under Part 91: past-recommended is a caution, not a failure
  const cls = v >= 0.9 ? 'soon' : 'ok'
  return (
    <span className="pct">
      <span className="bar">
        <span className={cls} style={{ width: `${Math.min(100, v * 100)}%` }} />
      </span>
      {(v * 100).toFixed(0)}%
    </span>
  )
}
