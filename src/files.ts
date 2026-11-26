// The on-disk format: a folder of small, human-readable JSON files.
//
//   aircraft.json            aircraft + non-secret settings
//   logbook/airframe.json    log entries, one array per book, sorted by date
//   logbook/engine.json
//   logbook/propeller.json
//   logbook/avionics.json
//   inspections.json         recurring due items (annual, ELT, 91.411, oil…)
//   ads.json                 airworthiness directive compliance
//   components.json          installed components and TBOs
//   compressions.json        differential compression history
//   sources/                 scanned logbook PDFs and photos of new pages; an entry's
//                            source.file names a file here (binary)
//
import type { Book, Db, LogEntry } from './types'

export const BOOKS: Book[] = ['airframe', 'engine', 'propeller', 'avionics']

const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n'

export function dbToFiles(db: Db): Record<string, string> {
  const byDate = (a: LogEntry, b: LogEntry) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  const settings = db.settings
  const files: Record<string, string> = {
    'aircraft.json': json({ version: db.version, aircraft: db.aircraft, settings }),
    'inspections.json': json(db.dueItems),
    'ads.json': json(db.ads),
    'components.json': json(db.components),
    'compressions.json': json(db.compressions),
  }
  for (const book of BOOKS) {
    files[`logbook/${book}.json`] = json(db.entries.filter((e) => e.book === book).sort(byDate))
  }
  return files
}

export function filesToDb(files: Record<string, string | undefined>): Db {
  const read = <T>(path: string, fallback: T): T => {
    const s = files[path]
    if (!s) return fallback
    try {
      return JSON.parse(s) as T
    } catch (err) {
      throw new Error(`${path} is not valid JSON: ${(err as Error).message}`)
    }
  }
  const head = read<{ version: 1; aircraft: Db['aircraft']; settings: Partial<Db['settings']> } | null>('aircraft.json', null)
  if (!head) throw new Error('aircraft.json is missing — is this an MX Insight folder?')
  const entries = BOOKS.flatMap((book) => read<LogEntry[]>(`logbook/${book}.json`, []).map((e) => ({ ...e, book })))
  return {
    version: 1,
    aircraft: head.aircraft,
    settings: { soonHours: 10, soonDays: 30, ...head.settings },
    entries,
    dueItems: read('inspections.json', []),
    ads: read('ads.json', []),
    components: read('components.json', []),
    compressions: read('compressions.json', []),
  }
}
