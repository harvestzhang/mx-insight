import { useState } from 'react'
import type { Db } from '../types'
import { fmtDate, fmtHrs, tachSeries } from '../calc'

// Validated categorical slots 1–6 (one per cylinder), fixed order
const CYL = ['#1D63B8', '#A3147A', '#155B44', '#C77700', '#6B4FBB', '#0E8A9A']

export function Engine({ db }: { db: Db }) {
  const readings = [...db.compressions].sort((a, b) => a.date.localeCompare(b.date))
  const [hi, setHi] = useState<number>()

  return (
    <div className="stack">
      <section>
        <h2>Compression trend (psi, 80 psi master)</h2>
        <CompressionChart readings={readings} hi={hi} setHi={setHi} />
        <div className="legend">
          {CYL.map((c, i) => (
            <button key={c} className={`ghost ${hi === i ? 'on' : ''}`} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(undefined)} onClick={() => setHi(hi === i ? undefined : i)}>
              <span className="swatch" style={{ background: c }} /> Cyl #{i + 1}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Readings</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Tach</th>
              {CYL.map((_, i) => (
                <th key={i}>#{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...readings].reverse().map((r) => (
              <tr key={r.date + r.tach}>
                <td>
                  {fmtDate(r.date)}
                  {r.note && <div className={r.ambiguous ? 'warn small' : 'muted small'}>{r.note}</div>}
                </td>
                <td>{fmtHrs(r.tach)}</td>
                {r.cyl.map((c, i) => (
                  <td key={i} className={c.psi / c.master < 0.7 ? 'warn' : ''}>
                    {c.psi}/{c.master}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Hours flown per year</h2>
        <HoursPerYear db={db} />
      </section>
    </div>
  )
}

function CompressionChart({ readings, hi, setHi }: { readings: Db['compressions']; hi?: number; setHi: (i?: number) => void }) {
  const [hover, setHover] = useState<number>()
  if (readings.length < 2) return <p className="muted">Need two readings to draw a trend.</p>
  const W = 860, H = 300, L = 40, R = 56, T = 14, B = 28
  const t0 = Date.parse(readings[0].date), t1 = Date.parse(readings[readings.length - 1].date)
  const x = (d: string) => L + ((Date.parse(d) - t0) / (t1 - t0)) * (W - L - R)
  const yMin = 40, yMax = 80
  const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B)
  const years = []
  for (let yr = new Date(t0).getUTCFullYear() + 1; yr <= new Date(t1).getUTCFullYear(); yr += 2) years.push(yr)
  const r = hover !== undefined ? readings[hover] : undefined
  // end-of-line labels, nudged apart so they never collide
  const lastR = readings[readings.length - 1]
  const order = CYL.map((_, i) => ({ i, y: y((lastR.cyl[i].psi / lastR.cyl[i].master) * 80) })).sort((a, b) => a.y - b.y)
  for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + 13)
  const labelY: number[] = []
  for (const o of order) labelY[o.i] = o.y
  return (
    <div className="chart" onMouseLeave={() => setHover(undefined)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Compression by cylinder over time">
        {[40, 50, 60, 70, 80].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v) + 4} className="axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {years.map((yr) => (
          <text key={yr} x={x(`${yr}-01-01`)} y={H - 8} className="axis" textAnchor="middle">
            {yr}
          </text>
        ))}
        {CYL.map((c, i) => {
          const pts = readings.map((rd) => [x(rd.date), y((rd.cyl[i].psi / rd.cyl[i].master) * 80)])
          const dim = hi !== undefined && hi !== i
          const last = pts[pts.length - 1]
          return (
            <g key={i} opacity={dim ? 0.15 : 1}>
              <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
              {pts.map((p, k) => (
                readings[k].ambiguous ? (
                  <circle key={k} cx={p[0]} cy={p[1]} r={hover === k ? 5 : 4} fill="var(--surface)" stroke={c} strokeWidth={2} />
                ) : (
                  <circle key={k} cx={p[0]} cy={p[1]} r={hover === k ? 5 : 3} fill={c} stroke="var(--surface)" strokeWidth={2} />
                )
              ))}
              <text x={last[0] + 8} y={labelY[i] + 4} className="axis" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(undefined)}>
                #{i + 1}
              </text>
            </g>
          )
        })}
        {hover !== undefined && <line x1={x(readings[hover].date)} x2={x(readings[hover].date)} y1={T} y2={H - B} className="crosshair" />}
        {readings.map((rd, k) => {
          const prev = k ? x(readings[k - 1].date) : L
          const next = k < readings.length - 1 ? x(readings[k + 1].date) : W - R
          const cx = x(rd.date)
          return <rect key={k} x={(prev + cx) / 2} width={(next - prev) / 2} y={T} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(k)} />
        })}
      </svg>
      {r && (
        <div className="tooltip" style={{ left: `${(x(r.date) / W) * 100}%` }}>
          <strong>{fmtDate(r.date)}</strong> · tach {fmtHrs(r.tach)}
          {r.note && <div className={r.ambiguous ? 'warn' : 'muted'} style={{ whiteSpace: 'normal', maxWidth: 260 }}>{r.note}</div>}
          {r.cyl.map((c, i) => (
            <div key={i}>
              <span className="swatch" style={{ background: CYL[i] }} /> #{i + 1}: {c.psi}/{c.master}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HoursPerYear({ db }: { db: Db }) {
  const s = tachSeries(db)
  // tach at each Jan 1 by linear interpolation between observations
  const at = (date: string) => {
    const t = Date.parse(date)
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i]
      const ta = Date.parse(a.date), tb = Date.parse(b.date)
      if (t >= ta && t <= tb) return tb === ta ? b.tach : a.tach + ((b.tach - a.tach) * (t - ta)) / (tb - ta)
    }
    return undefined
  }
  const first = new Date(s[0].date).getUTCFullYear(), last = new Date(s[s.length - 1].date).getUTCFullYear()
  const bars: { year: number; hrs: number }[] = []
  for (let yr = first; yr <= last; yr++) {
    const a = at(`${yr}-01-01`) ?? (yr === first ? s[0].tach : undefined)
    const b = at(`${yr + 1}-01-01`) ?? (yr === last ? s[s.length - 1].tach : undefined)
    if (a !== undefined && b !== undefined) bars.push({ year: yr, hrs: Math.max(0, b - a) })
  }
  const W = 860, H = 180, L = 36, B = 22, T = 10
  const max = Math.max(...bars.map((b) => b.hrs), 10)
  const bw = (W - L) / bars.length
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tach hours flown per year">
        {[0, Math.round(max / 2), Math.round(max)].map((v) => (
          <g key={v}>
            <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v) + 4} className="axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {bars.map((b, i) => (
          <g key={b.year}>
            <title>
              {b.year}: {b.hrs.toFixed(0)} hrs (interpolated between log entries)
            </title>
            <rect x={L + i * bw + 1} width={Math.max(1, bw - 2)} y={y(b.hrs)} height={Math.max(0, H - B - y(b.hrs))} rx={Math.min(4, bw / 4)} fill="#1D63B8" />
            {(b.year % 5 === 0 || i === 0) && (
              <text x={L + i * bw + bw / 2} y={H - 6} className="axis" textAnchor="middle">
                {b.year}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
