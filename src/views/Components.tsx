import { useState } from 'react'
import type { Component, Db } from '../types'
import { componentLife, fmtDate, fmtHrs, label } from '../calc'
import { Pct } from './common'

const CATS: Component['category'][] = ['engine', 'propeller', 'accessory', 'airframe', 'electrical', 'avionics']

export function Components({ db }: { db: Db }) {
  const [showRemoved, setShowRemoved] = useState(false)
  return (
    <div className="stack">
      <div className="toolbar">
        <label className="small">
          <input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} /> Show removed
        </label>
      </div>
      {CATS.map((cat) => {
        const list = db.components.filter((c) => c.category === cat && (showRemoved || !c.removed))
        if (!list.length) return null
        return (
          <section key={cat}>
            <h2>{label(cat)}</h2>
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>P/N · S/N</th>
                  <th>Installed</th>
                  <th>Time</th>
                  <th>vs TBO hrs</th>
                  <th>vs calendar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const life = componentLife(db, c)
                  return (
                    <tr key={c.id} className={c.removed ? 'removed' : ''}>
                      <td>
                        {c.name}
                        {c.notes && <div className="muted small">{c.notes}</div>}
                      </td>
                      <td className="small">
                        {c.partNumber ?? '—'}
                        <div className="muted">{c.serial ?? ''}</div>
                      </td>
                      <td>
                        {fmtDate(c.installedDate)}
                        {c.installedTach !== undefined && <div className="muted small">@ {fmtHrs(c.installedTach)}</div>}
                      </td>
                      <td>
                        {life.hours !== undefined ? `${fmtHrs(life.hours)} ${c.timeLabel ?? ''}` : '—'}
                        {life.months !== undefined && <div className="muted small">{(life.months / 12).toFixed(1)} yrs</div>}
                      </td>
                      <td>{c.tboHours ? <Pct v={life.hrsPct} /> : <span className="muted">—</span>}</td>
                      <td>{c.tboMonths ? <Pct v={life.calPct} /> : <span className="muted">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}
