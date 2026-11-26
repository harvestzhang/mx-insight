# MX Insight

A free, local-first maintenance tracker for an owner-flown piston airplane, built to hold the
complete logbook history of one aircraft.

- **Logbook**: airframe, engine, propeller and avionics entries, searchable, each linked to its source page.
- **What's due**: annual, ELT and ELT battery, 91.411/91.413, oil, 500-hr mags, recurring ADs. Status comes from calendar *and* hours; hour limits are projected to a date from your actual utilization.
- **ADs**: the compliance record found in the logs, with recurring intervals and next due.
- **Components**: time since install/overhaul against TBO (hours and calendar).
- **Engine**: compression trend per cylinder, hours flown per year.
- **Sources**: each entry links to the scanned page or photo it came from, shown beside it.
- **Read-only**: new entries, corrections and answers to open questions go in through Claude Code (see below).

## Your data is a folder of JSON files

```
CLAUDE.md                how Claude Code adds and corrects entries
aircraft.json            aircraft + settings
logbook/airframe.json    one array of entries per book, sorted by date
logbook/engine.json
logbook/propeller.json
logbook/avionics.json
inspections.json         recurring items: annual, ELT, 91.411, oil…
ads.json                 AD compliance
components.json          installed parts and TBOs
compressions.json        differential compression history
sources/                 the logbook scans (PDFs) and photos of new pages;
                         each entry's source points at a file and page here
```

The whole history is a few hundred KB of JSON. The schema is in [`src/types.ts`](src/types.ts).

The master copy lives in a folder on your Mac (e.g. `~/Documents/MX Insight/<tail>/`). Make it its own
private git repo: Claude Code commits and pushes every change, so the
history of each entry and correction is kept off the machine. It then republishes the changed files to
the artifact. The viewer never writes anything.

This repo holds only the viewer. The records live in their own repo and folder.

## Artifact

The main way to view the records is a private claude.ai artifact, **MX Insight**: it works on a phone or
iPad and can be shared with your A&P from its page. It serves a copy of the data folder; Claude Code
republishes the changed files after every ingestion (see the data folder's `CLAUDE.md`).
`scripts/build-artifact.sh` builds the whole thing into `dist-artifact/` (the viewer, the JSON, and
each scanned PDF rendered to one image per page, since the artifact frame can't show PDFs).

## Develop

```bash
npm install
npm run dev
```

Then open http://localhost:5173. The dev server serves your records folder at `data/`, the same path the
artifact uses: `./data` (gitignored; symlink it to your records folder, e.g.
`ln -s ~/Documents/MX\ Insight/<tail> data`) or the folder in `MX_DATA`. `npm run build:artifact`
reads the same folder, or the one you pass as its argument.

## Adding and correcting entries

MX Insight only displays the records. Every change goes through **Claude Code**, using your Claude Code
plan (no API key or credits needed):

1. Open Claude Code in your records folder.
2. Hand it a photo of a new logbook page and ask it to add the entry. Or answer a "Needs review"
   question, or tell it the current tach, a registration date, or a part that was changed.
3. It follows the folder's `CLAUDE.md`: reads the page carefully, cross-checks it against the other
   books, corrects clear mistakes (keeping what was written as errata), marks what it can't infer as
   needing review, saves the photo into `sources/`, and updates the due items, ADs and components.
4. It commits and pushes the change to the records repo, and republishes the artifact.

Click an entry's source (e.g. `airframe-logbook-2.pdf p.33`) to open that page beside the entry.

The paper (or scanned) logbook is the legal record. This is a working copy to plan maintenance, not a
replacement for the logbooks or your IA's AD review.

## What is and isn't checked

- The AD list is what the logs mention. It is **not** an applicability search. Check the
  [FAA DRS](https://drs.faa.gov/browse/ADFRAWD/doctypeDetails) for the airframe, engine, propeller and every appliance.
- TBOs are manufacturer recommendations. They aren't mandatory under Part 91.
