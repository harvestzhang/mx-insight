#!/usr/bin/env bash
# Build the MX Insight artifact into dist-artifact/: the viewer plus a copy of the records.
# The data folder (first argument, else MX_DATA, else ./data) is the master copy; this only reads it.
# Scanned PDFs are rendered to one JPEG per page, because the artifact frame can't show PDFs.
# Needs poppler (brew install poppler). Then publish every file in dist-artifact/ to the artifact.
set -euo pipefail
cd "$(dirname "$0")/.."
DATA="${1:-${MX_DATA:-data}}"
[ -f "$DATA/aircraft.json" ] || { echo "No records at $DATA (pass the records folder, or set MX_DATA)" >&2; exit 1; }
OUT=dist-artifact

npx vite build --mode artifact >/dev/null
mkdir -p "$OUT/data/logbook" "$OUT/data/sources"
cp "$DATA"/*.json "$OUT/data/"
cp "$DATA"/logbook/*.json "$OUT/data/logbook/"
for f in "$DATA"/sources/*; do
  name="$(basename "$f")"
  case "$name" in
    *.pdf|*.PDF)
      dir="$OUT/data/sources/${name%.*}"
      # re-render only when the PDF is newer than its pages
      if [ ! -d "$dir" ] || [ "$f" -nt "$dir" ]; then
        rm -rf "$dir"; mkdir -p "$dir"
        pdftoppm -jpeg -jpegopt quality=72 -r 100 "$f" "$dir/p"
        # pdftoppm pads page numbers (p-01.jpg); rename to p1.jpg …
        for p in "$dir"/p-*.jpg; do n="${p##*/p-}"; n="${n%.jpg}"; mv "$p" "$dir/p$((10#$n)).jpg"; done
      fi ;;
    *) cp "$f" "$OUT/data/sources/" ;;
  esac
done
echo "Built $OUT from $DATA: $(find "$OUT" -type f | wc -l | tr -d ' ') files, $(du -sh "$OUT" | cut -f1)"
