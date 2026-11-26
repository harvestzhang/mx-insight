export type Book = 'airframe' | 'engine' | 'propeller' | 'avionics'

export interface SourceRef {
  /** a file in the data folder's sources/, e.g. "airframe-logbook-1.pdf" or "2026-11-25-1.jpg" */
  file: string
  /** page within a PDF */
  page?: number
}

/** A correction to what the mechanic wrote, where the right value can be inferred */
export interface Erratum {
  /** which part of the entry: "tach", "date", "text", "ads", "engineTime", "airframeTT", … */
  field: string
  asWritten: string
  corrected: string
  /** how the correct value was inferred */
  reason: string
}

/** Something that can't be resolved from the records: needs the owner (or an A&P) to decide */
export interface Ambiguity {
  field?: string
  note: string
}

export interface LogEntry {
  id: string
  book: Book
  date: string // YYYY-MM-DD
  tach?: number
  /** Airframe total time as written in the entry, if different from tach */
  airframeTT?: number
  /** Engine time since overhaul / since new as written */
  engineTime?: number
  propTime?: number
  shop?: string
  signer?: string
  certificate?: string
  workOrder?: string
  /** Close transcription of the entry */
  text: string
  /** inspection kinds this entry signs off: annual, 100hr, elt, 91.411, 91.413, oil, compass… */
  signoffs?: string[]
  /** AD numbers complied with, e.g. "76-07-12" */
  ads?: string[]
  source?: SourceRef
  /**
   * The fields above hold the corrected values. Each erratum records what was
   * actually written in the paper log and why it was changed.
   */
  errata?: Erratum[]
  /** Unresolved questions; an empty or missing list means nothing is open */
  ambiguous?: Ambiguity[]
}

/** Something that comes due on hours and/or calendar */
export interface DueItem {
  id: string
  name: string
  /** regulatory = required for airworthiness; advisory = recommended (e.g. TBO under Part 91) */
  kind: 'regulatory' | 'ad' | 'maintenance' | 'advisory'
  intervalHours?: number
  intervalMonths?: number
  /** due at end of the calendar month (annual, ELT, 91.411/413) */
  endOfMonth?: boolean
  lastDate?: string
  lastTach?: number
  /** explicit next-due override (e.g. ELT battery expiration printed on the battery) */
  dueDate?: string
  dueTach?: number
  ref?: string
  notes?: string
}

export interface AD {
  id: string
  number: string // e.g. 2007-08-08 or 07-08-08
  subject: string
  appliesTo: 'airframe' | 'engine' | 'propeller' | 'appliance'
  recurring: boolean
  intervalHours?: number
  intervalMonths?: number
  /** verify: applies but no compliance found; conditional: depends on installed part numbers/serials */
  status: 'complied' | 'recurring' | 'not-applicable' | 'verify' | 'conditional'
  method?: string
  lastDate?: string
  lastTach?: number
  supersededBy?: string
  notes?: string
}

export interface Component {
  id: string
  name: string
  category: 'engine' | 'propeller' | 'accessory' | 'airframe' | 'avionics' | 'electrical'
  make?: string
  partNumber?: string
  serial?: string
  installedDate?: string
  installedTach?: number
  /** time on the part when installed (0 for new/overhauled) */
  timeAtInstall?: number
  timeLabel?: 'TSN' | 'SMOH' | 'TSO' | 'TSI'
  /** recommended overhaul / replacement */
  tboHours?: number
  tboMonths?: number
  /** when calendar life is counted from (e.g. factory reman date), defaults to installedDate */
  calendarFrom?: string
  removed?: boolean
  notes?: string
}

export interface CompressionReading {
  date: string
  tach: number
  /** cylinder readings, index 0 = cyl #1; master orifice pressure per reading */
  cyl: { psi: number; master: number }[]
  /** e.g. corrections or doubts about this reading */
  note?: string
  ambiguous?: boolean
}

export interface Aircraft {
  tail: string
  make: string
  model: string
  serial: string
  year: number
  engine: string
  propeller: string
  /** latest known tach reading */
  currentTach: number
  currentTachDate: string
}

export interface Db {
  version: 1
  aircraft: Aircraft
  entries: LogEntry[]
  dueItems: DueItem[]
  ads: AD[]
  components: Component[]
  compressions: CompressionReading[]
  settings: {
    soonHours: number
    soonDays: number
  }
}
