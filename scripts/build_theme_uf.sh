#!/bin/bash
# Build one UF for a theme: setor GeoJSON, then z14 dots and thinned z3–13.
# SKIP_TILE_JOIN stays on so a national loop can join once at the end.
set -euo pipefail
if [ $# -lt 2 ]; then
    echo "Usage: $0 <UF> <income|deaths|religion>"
    exit 1
fi
UF="$1"
THEME="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==== ${THEME} ${UF} ===="
if [ "$THEME" = "religion" ]; then
    python3 scripts/build_religion_apond.py "$UF"
else
    python3 scripts/build_census_tract.py "$UF" "$THEME"
    python3 scripts/build_municipality.py "$UF" "$THEME"
fi
SKIP_TILE_JOIN=1 ./makefiles.sh "$UF" "$THEME"
echo "==== done ${THEME} ${UF} ===="
