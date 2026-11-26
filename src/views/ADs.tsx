import type { AD, Db } from '../types'
import { dueForAD, fmtDate, fmtHrs } from '../calc'
import { normAD, label } from '../calc'
import { Badge, DueCells } from './common'

// open questions first, then what recurs, then history
const STATUS: AD['status'][] = ['verify', 'recurring', 'conditional', 'complied', 'not-applicable']

export function ADs({ db }: { db: Db }) {
  const sorted = [...db.ads].sort((a, b) => STATUS.indexOf(a.status) - STATUS.indexOf(b.status) || b.number.localeCompare(a.number))
  return (
    <div className="stack">
      <table>
        <thead>
          <tr>
            <th>AD</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Last complied</th>
            <th>Due</th>
            <th>Remaining</th>
            <th>Projected</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const d = dueForAD(db, a)
            const mentions = db.entries.filter((e) => e.ads?.some((n) => normAD(n) === normAD(a.number))).length
            return (
              <tr key={a.id}>
                <td>
                  <strong>{a.number}</strong>
                  <div className="muted small">{label(a.appliesTo)}</div>
                </td>
                <td>
                  {a.subject}
                  {a.recurring && (
                    <div className="muted small">
                      {[a.intervalHours && `${a.intervalHours} hr`, a.intervalMonths && `${a.intervalMonths} mo`].filter(Boolean).join(' / ').replace(/^(?=.)/, 'Every ') || 'Recurring, interval not set'}
                    </div>
                  )}
                  {a.notes && <div className="muted small">{a.notes}</div>}
                  <div className="muted small">Cited in {mentions} log {mentions === 1 ? 'entry' : 'entries'}</div>
                </td>
                <td>
                  {a.status === 'recurring' ? <Badge status={d.status} /> : <span className={`badge ${a.status === 'verify' ? 'overdue' : a.status === 'conditional' ? 'soon' : 'unknown'}`}>{label(a.status)}</span>}
                </td>
                <td>
                  {fmtDate(a.lastDate)}
                  {a.lastTach !== undefined && <div className="muted small">@ {fmtHrs(a.lastTach)}</div>}
                </td>
                {a.recurring && a.status !== 'not-applicable' ? <DueCells d={d} /> : <td colSpan={3} className="muted">{a.supersededBy ? `Superseded by ${a.supersededBy}` : ''}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
