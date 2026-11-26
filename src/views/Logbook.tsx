import { useEffect, useMemo, useState } from 'react'
import type { Book, Db, LogEntry } from '../types'
import type { Store } from '../storage'
import { fmtDate, fmtHrs } from '../calc'

const BOOKS: Book[] = ['airframe', 'engine', 'propeller', 'avionics']

/** Read-only: entries are added and corrected with Claude Code (see CLAUDE.md in the data folder). */
export function Logbook({ db, store }: { db: Db; store: Store }) {
  const [book, setBook] = useState<Book | 'all'>('all')
  const [review, setReview] = useState<'all' | 'corrected' | 'ambiguous'>('all')
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState<LogEntry>()

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return db.entries
      .filter((e) => book === 'all' || e.book === book)
      .filter((e) => review === 'all' || (review === 'corrected' ? !!e.errata?.length : !!e.ambiguous?.length))
      .filter((e) => {
        if (!words.length) return true
        const hay = [e.text, e.shop, e.signer, e.workOrder, e.date, ...(e.ads ?? []), ...(e.signoffs ?? [])].join(' ').toLowerCase()
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [db.entries, book, q, review])
  const nCorrected = db.entries.filter((e) => e.errata?.length).length
  const nAmbiguous = db.entries.filter((e) => e.ambiguous?.length).length

  return (
    <div>
    <div className="stack">
      <div className="toolbar">
        <select value={book} onChange={(e) => setBook(e.target.value as Book | 'all')}>
          <option value="all">All books ({db.entries.length})</option>
          {BOOKS.map((b) => (
            <option key={b} value={b}>
              {b} ({db.entries.filter((e) => e.book === b).length})
            </option>
          ))}
        </select>
        <select value={review} onChange={(e) => setReview(e.target.value as typeof review)}>
          <option value="all">Any status</option>
          <option value="ambiguous">Needs review ({nAmbiguous})</option>
          <option value="corrected">Corrected ({nCorrected})</option>
        </select>
        <input placeholder="Search text, shop, AD, work order…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
      </div>
      <div className="muted small">{list.length} entries</div>
      <ul className="entries">
        {list.map((e) => (
          <li key={e.id}>
            <div className="meta">
              <span className={`book ${e.book}`}>{e.book}</span>
              <strong>{fmtDate(e.date)}</strong>
              {e.signoffs?.map((s) => (
                <span key={s} className="tag">
                  {s}
                </span>
              ))}
              {e.ambiguous?.length ? <span className="badge soon">Needs review</span> : null}
              {e.errata?.length ? <span className="badge info">Corrected</span> : null}
              {e.ads?.map((a) => (
                <span key={a} className="tag ad">
                  AD {a}
                </span>
              ))}
            </div>
            {(e.tach !== undefined || e.engineTime !== undefined || e.propTime !== undefined) && (
              <div className="times">
                {e.tach !== undefined && <span><span className="muted">AFTT</span> {fmtHrs(e.tach)}</span>}
                {e.engineTime !== undefined && <span><span className="muted">Engine</span> {fmtHrs(e.engineTime)}</span>}
                {e.propTime !== undefined && <span><span className="muted">Prop</span> {fmtHrs(e.propTime)}</span>}
              </div>
            )}
            <p>{e.text}</p>
            {e.errata?.map((x, k) => (
              <div key={k} className="erratum">
                <b>Corrected {x.field}:</b> written <s>{x.asWritten}</s> → <b>{x.corrected}</b>. <span className="muted">{x.reason}</span>
              </div>
            ))}
            {e.ambiguous?.map((x, k) => (
              <div key={k} className="ambiguity">
                <b>Needs review{x.field ? ` (${x.field})` : ''}:</b> {x.note}{' '}
              </div>
            ))}
            <div className="muted small source-line">
              {[e.shop, e.signer, e.certificate, e.workOrder && `W/O ${e.workOrder}`].filter(Boolean).join(' · ')}
              {e.source && (
                <button className={`ghost small ${viewing?.id === e.id ? 'on' : ''}`} onClick={() => setViewing(viewing?.id === e.id ? undefined : e)}>
                  {e.source.file}
                  {e.source.page ? ` p.${e.source.page}` : ''} ↗
                </button>
              )}
            </div>
            {viewing?.id === e.id && e.source && <SourcePane store={store} entry={e} close={() => setViewing(undefined)} />}
          </li>
        ))}
      </ul>
      </div>
    </div>
  )
}

/** The scanned page or photo an entry came from, shown inside the entry. */
function SourcePane({ store, entry, close }: { store: Store; entry: LogEntry; close: () => void }) {
  const [url, setUrl] = useState<string>()
  const [missing, setMissing] = useState(false)
  const src = entry.source!
  const [pdf, setPdf] = useState(false)
  useEffect(() => {
    let live = true
    let made: string | undefined
    setUrl(undefined)
    setMissing(false)
    store.getSourceView(src.file, src.page).then((v) => {
      if (!live) return
      if (!v) return setMissing(true)
      made = URL.createObjectURL(v.blob)
      setPdf(v.pdf)
      setUrl(made)
    })
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [store, src.file, src.page])
  return (
    <aside className="source-pane">
      <div className="toolbar">
        <strong className="small">
          {src.file}
          {src.page ? ` · page ${src.page}` : ''}
        </strong>
        <span className="muted small">{fmtDate(entry.date)}</span>
        <button className="ghost right small" onClick={close}>
          Close
        </button>
      </div>
      {missing && <p className="muted">Source file not found.</p>}
      {url && (pdf ? <iframe key={`${url}#${src.page}`} src={`${url}#page=${src.page ?? 1}&view=FitH`} title={src.file} /> : <img src={url} alt={src.file} />)}
    </aside>
  )
}
