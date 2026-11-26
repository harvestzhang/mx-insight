import { useCallback, useEffect, useState } from 'react'
import type { Db } from './types'
import { Store } from './storage'
import { Dashboard } from './views/Dashboard'
import { Logbook } from './views/Logbook'
import { ADs } from './views/ADs'
import { Components } from './views/Components'
import { Engine } from './views/Engine'

const TABS = ['Dashboard', 'Logbook', 'ADs', 'Components', 'Engine'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [db, setDb] = useState<Db>()
  const [store, setStore] = useState<Store>()
  const [tab, setTab] = useState<Tab>(() => (TABS as readonly string[]).includes(location.hash.slice(1)) ? (location.hash.slice(1) as Tab) : 'Dashboard')
  const [error, setError] = useState<string>()

  const open = useCallback(async () => {
    try {
      const s = new Store()
      const loaded = await s.load()
      setStore(s)
      setDb(loaded)
      setError(undefined)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  // The records are published beside the page under data/
  useEffect(() => {
    open()
  }, [open])

  useEffect(() => {
    location.hash = tab
  }, [tab])
  // Pick up a republish when the window regains focus
  useEffect(() => {
    if (!store) return
    const check = async () => {
      if (document.visibilityState !== 'visible') return
      if (await store.changed()) await open()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [store, open])

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1)
      if ((TABS as readonly string[]).includes(h)) setTab(h as Tab)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])


  if (!db || !store) return <div className="loading">{error ?? 'Loading…'}</div>

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="tail">{db.aircraft.tail}</span>
          <span className="muted">
            {db.aircraft.year} {db.aircraft.make} {db.aircraft.model} · s/n {db.aircraft.serial}
          </span>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
      </header>
      {error && (
        <div className="banner error">
          {error} <button onClick={() => setError(undefined)}>Dismiss</button>
        </div>
      )}
      <main>
        {tab === 'Dashboard' && <Dashboard db={db} />}
        {tab === 'Logbook' && <Logbook db={db} store={store} />}
        {tab === 'ADs' && <ADs db={db} />}
        {tab === 'Components' && <Components db={db} />}
        {tab === 'Engine' && <Engine db={db} />}
      </main>
    </div>
  )
}
