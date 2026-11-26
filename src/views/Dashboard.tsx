import type { Db } from '../types'
import { componentLife, dueForAD, dueForItem, fmtDate, fmtHrs, label, today, utilization, type DueResult } from '../calc'
import { Badge, DueCells } from './common'

interface Row {
  key: string
  name: string
  kind: string
  last?: string
  d: DueResult
  ref?: string
  notes?: string
}

const rank = { overdue: 0, soon: 1, likely: 2, ok: 3, unknown: 4 }

export function Dashboard({ db }: { db: Db }) {
  const util = utilization(db)

  const rows: Row[] = [
    ...db.dueItems.map((i) => ({
      key: i.id,
      name: i.name,
      kind: i.kind,
      last: i.lastDate ? `${fmtDate(i.lastDate)}${i.lastTach !== undefined ? ` @ ${fmtHrs(i.lastTach)}` : ''}` : undefined,
      d: dueForItem(db, i),
      ref: i.ref,
      notes: i.notes,
    })),
    ...db.ads
      .filter((a) => a.recurring && a.status !== 'not-applicable')
      .map((a) => ({
        key: a.id,
        name: `AD ${a.number} — ${a.subject}`,
        kind: 'ad',
        last: a.lastDate ? `${fmtDate(a.lastDate)}${a.lastTach !== undefined ? ` @ ${fmtHrs(a.lastTach)}` : ''}` : undefined,
        d: dueForAD(db, a),
        notes: a.notes,
      })),
  ].sort((a, b) => rank[a.d.status] - rank[b.d.status] || (a.d.dueDate ?? '9').localeCompare(b.d.dueDate ?? '9'))

  const components = db.components
    .filter((c) => !c.removed && (c.tboHours || c.tboMonths))
    .map((c) => ({ c, life: componentLife(db, c) }))

  const counts = { overdue: rows.filter((r) => r.d.status === 'overdue').length, soon: rows.filter((r) => r.d.status === 'soon' || r.d.status === 'likely').length }
  const staleDays = Math.round((Date.parse(today()) - Date.parse(db.aircraft.currentTachDate)) / 86400000)

  return (
    <div className="stack">
      <section className="cards">
        <div className="card">
          <div className="label">Current AFTT</div>
          <div className="big">{fmtHrs(db.aircraft.currentTach)}</div>
          <div className={staleDays > 60 ? 'warn small' : 'muted small'}>
            as of {fmtDate(db.aircraft.currentTachDate)}
            {staleDays > 60 && ` (${Math.round(staleDays / 30)} months ago)`}
          </div>
        </div>
        <div className="card">
          <div className="label">Utilization</div>
          <div className="big">{util.toFixed(0)}</div>
          <div className="muted small">hr / yr, last 3 years</div>
        </div>
        <div className="card">
          <div className={counts.overdue ? 'label overdue-text' : 'label'}>Overdue</div>
          <div className={counts.overdue ? 'big overdue-text' : 'big'}>{counts.overdue}</div>
          <div className="muted small">{counts.soon} due soon · {rows.length} tracked</div>
        </div>
        <div className="card">
          <div className="label">Engine SMOH</div>
          {(() => {
            const e = components.find((x) => x.c.category === 'engine' && x.c.tboHours)
            if (!e) return <div className="muted">—</div>
            return (
              <>
                <div className="big">{fmtHrs(e.life.hours)}</div>
                <div className="muted small">
                  {e.c.tboHours} hr TBO
                  {e.life.months !== undefined && ` · ${(e.life.months / 12).toFixed(1)} yrs since overhaul`}
                  {e.c.tboMonths !== undefined && ` (${e.c.tboMonths / 12} yr limit)`}
                </div>
              </>
            )
          })()}
        </div>
      </section>

      <section>
        <h2>What's due</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Item</th>
              <th>Last done</th>
              <th>Due</th>
              <th>Remaining</th>
              <th>Projected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <Badge status={r.d.status} />
                </td>
                <td>
                  {r.name}
                  <div className="muted small">
                    {[label(r.kind), r.ref].filter(Boolean).join(' · ')}
                  </div>
                  {r.notes && <div className="muted small">{r.notes}</div>}
                </td>
                <td>{r.last ?? <span className="muted">Not recorded</span>}</td>
                <DueCells d={r.d} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Component life</h2>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Time</th>
              <th>Hours vs TBO</th>
              <th>Calendar vs recommendation</th>
            </tr>
          </thead>
          <tbody>
            {components.map(({ c, life }) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  {fmtHrs(life.hours)} {c.timeLabel}
                  <div className="muted small">{life.months !== undefined && `${(life.months / 12).toFixed(1)} yrs`}</div>
                </td>
                <td>{c.tboHours ? <Bar v={life.hrsPct} label={`${c.tboHours} hr`} /> : <span className="muted">—</span>}</td>
                <td>{c.tboMonths ? <Bar v={life.calPct} label={`${c.tboMonths / 12} yr`} /> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Bar({ v, label }: { v?: number; label: string }) {
  if (v === undefined) return <span className="muted">—</span>
  // TBOs are advisory under Part 91: past-recommended is a caution, not a failure
  const cls = v >= 0.9 ? 'soon' : 'ok'
  return (
    <span className="pct">
      <span className="bar">
        <span className={cls} style={{ width: `${Math.min(100, v * 100)}%` }} />
      </span>
      {(v * 100).toFixed(0)}% of {label}
      {v >= 1 && <span className="muted small"> · past recommended</span>}
    </span>
  )
}
