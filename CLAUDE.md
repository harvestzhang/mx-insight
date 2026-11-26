# MX Insight: notes for Claude

MX Insight is a **read-only viewer** (Vite + React + TypeScript in `src/`) over a folder of JSON files
describing one airplane's maintenance records. It is published as a private claude.ai artifact
(`npm run build:artifact`, then publish `dist-artifact/`).

**All changes to the records go through Claude Code, never the app**: adding entries from photos,
correcting mechanics' mistakes (errata), resolving "Needs review" questions, updating tach, parts and
due items. The rules for that live with the data, in the records folder's own `CLAUDE.md`, beside
the master records (their own private git repo). Locally the records folder is `data/` in this repo
(gitignored, usually a symlink) or `MX_DATA`. Follow that file when working on records.

## App conventions

- The viewer only reads, always from `data/` beside the page: the published copy in the artifact, and the
  local records folder under `npm run dev` (served by `vite.config.ts` from `./data`; `MX_DATA` overrides it).
- The data format is `src/types.ts`; file layout is `src/files.ts`. Keep the data-folder CLAUDE.md
  in step with any schema change.
- All dates are ISO `YYYY-MM-DD`, all times decimal hours. Tach is the time basis.
- Part 91: TBOs and manufacturer intervals are advisory.
- `npm run build` typechecks and builds; `npm run build:artifact` builds the artifact into `dist-artifact/`.
  Check UI changes in the browser before calling them done.
- This repo and the records repo are the source of truth: commit and push every change, then rebuild and
  republish the artifact (`index.html` and `assets/`; remove the old hashed asset files).
