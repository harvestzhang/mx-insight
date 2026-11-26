// The viewer reads the records published beside the page under data/ (the JSON file set in files.ts).
// In the claude.ai artifact that is the published copy; under `npm run dev`, vite.config.ts serves the
// local records folder at the same path. The viewer only READS: Claude Code writes the records folder
// (see its CLAUDE.md), commits it, and republishes the artifact.
import type { Db } from './types'
import { filesToDb, BOOKS } from './files'

const FILE_PATHS = ['aircraft.json', 'inspections.json', 'ads.json', 'components.json', 'compressions.json', ...BOOKS.map((b) => `logbook/${b}.json`)]

async function fetchFile(path: string): Promise<Response | undefined> {
  try {
    const r = await fetch(`data/${path}`, { cache: 'no-cache' })
    return r.ok ? r : undefined
  } catch {
    return undefined
  }
}
const readText = async (p: string) => (await fetchFile(p))?.text()
const readBlob = async (p: string) => (await fetchFile(p))?.blob()

export class Store {
  private read: Record<string, string | undefined> = {}

  async load(): Promise<Db> {
    const files: Record<string, string | undefined> = {}
    for (const p of FILE_PATHS) files[p] = await readText(p)
    this.read = files
    return filesToDb(files)
  }

  /** True if any data file differs from what was last read (e.g. a republish). */
  async changed(): Promise<boolean> {
    for (const p of FILE_PATHS) if ((await readText(p)) !== this.read[p]) return true
    return false
  }

  /**
   * The image or document to show for an entry's source. The artifact can't show PDFs, so its
   * publish step renders each page to sources/<pdf name>/p<page>.jpg; use that when there is one.
   */
  async getSourceView(file: string, page?: number): Promise<{ blob: Blob; pdf: boolean } | undefined> {
    const isPdf = file.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      const img = await readBlob(`sources/${file.replace(/\.pdf$/i, '')}/p${page ?? 1}.jpg`)
      if (img) return { blob: img, pdf: false }
    }
    const blob = await readBlob(`sources/${file}`)
    return blob && { blob, pdf: isPdf }
  }
}
