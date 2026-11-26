import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { createReadStream, statSync } from 'node:fs'
import { join, normalize, extname, resolve } from 'node:path'

// The viewer reads the records from data/ beside the page. In the artifact that is the published
// copy; `npm run dev` serves the local records folder there instead: MX_DATA, or ./data
// (gitignored; typically a symlink to the records folder).
const DATA = resolve(process.env.MX_DATA ?? 'data')
const TYPES: Record<string, string> = { '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' }

function serveRecords(): Plugin {
  return {
    name: 'serve-records',
    configureServer(server) {
      server.middlewares.use('/data', (req, res) => {
        const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '')
        const file = join(DATA, rel)
        try {
          if (!file.startsWith(DATA) || !statSync(file).isFile()) throw new Error()
          res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-cache')
          createReadStream(file).pipe(res)
        } catch {
          res.statusCode = 404
          res.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), serveRecords()],
  // relative asset paths: the artifact serves from a sub-path
  base: './',
  // `vite build --mode artifact` builds the claude.ai artifact into dist-artifact/
  ...(mode === 'artifact' && { build: { outDir: 'dist-artifact' } }),
}))
