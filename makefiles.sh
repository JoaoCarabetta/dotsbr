#!/bin/bash
# Dot tiles for one UF: z14 from the setor polygons, z3–13 thinned from z14.
#
# Why not one mapshaper -dots run per zoom (the old pipeline)? mapshaper turns
# each polygon's count into Math.round(value / per_dot) dots, so any group
# smaller than half a dot in a polygon vanishes. At coarse zooms that erased
# most small groups (national z5: preta 4.5% of dots vs 10.2% in the census).
# Now only z14 is drawn from polygons, with stochastic rounding (a group of
# 0.3 dots gets a dot 30% of the time), and every coarser zoom keeps each z14
# dot with probability per_dot[14] / per_dot[z] (scripts/dot_tiles.py thin).
# Both steps are unbiased, zooms are nested, and no clusters are needed.
#
# Check if UF argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <UF> [zooms] [race|income|deaths|religion]"
    echo "Example: $0 RJ"
    echo "Example: $0 SE 3,4,5,6 income   # re-thin z3–6 from the existing z14"
    exit 1
fi

UF=$1
# Optional comma-separated zoom list. Zooms below 14 only need the z14
# MBTiles, not the census GeoJSON; include 14 to redraw it from polygons.
ONLY_ZOOMS="${2:-}"
THEME="${3:-race}"
# A theme may be passed as the second argument when all zooms are wanted.
case "$ONLY_ZOOMS" in
    race|income|deaths|religion)
        THEME="$ONLY_ZOOMS"
        ONLY_ZOOMS=""
        ;;
esac

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

theme_directory="data/censo2022/output/tiles/${THEME}"
census_tract_geojson="${theme_directory}/census_tract_${UF}.geojson"
# Isolate intermediates per UF so building RR does not clobber RJ dots.
if [ "$THEME" = "race" ]; then
    output_directory="dots/${UF}"
    tiles_directory="tiles/${UF}"
else
    output_directory="dots/${THEME}/${UF}"
    tiles_directory="tiles/${THEME}/${UF}"
fi
# Never rm -rf tiles/: they are versioned and expensive to regenerate.

case "$THEME" in
    race)
        categories=("branca" "preta" "amarela" "parda" "indigena")
        point_property="race"
        ;;
    income)
        categories=("income_ate_1sm" "income_1_2sm" "income_2_3sm" "income_3_5sm" "income_5_10sm" "income_mais_10sm" "income_sem_dado")
        point_property="cat"
        ;;
    deaths)
        categories=("death_0_14" "death_15_29" "death_30_59" "death_60_plus" "death_age_suppressed")
        point_property="cat"
        ;;
    religion)
        # Same mix at every zoom: APOND religion allocated onto setores.
        categories=("relig_catolica" "relig_evangelica" "relig_espirita" "relig_afro" "relig_indigena" "relig_sem_religiao" "relig_outras" "relig_sem_info")
        point_property="cat"
        ;;
    *)
        echo "Unknown theme: $THEME (expected race, income, deaths, or religion)"
        exit 1
        ;;
esac

# per_dot for every zoom lives in scripts/themes.py (the legend in index.html
# must match it); tippecanoe flags live in scripts/dot_tiles.py.
per_dot=$(python3 scripts/dot_tiles.py per-dot "$THEME" 14) || exit 1
read -r -a tippecanoe_args <<< "$(python3 scripts/dot_tiles.py tippecanoe-args "$THEME" 14)"

wants_zoom() {
    [ -z "$ONLY_ZOOMS" ] && return 0
    case ",$ONLY_ZOOMS," in
        *",$1,"*) return 0 ;;
    esac
    return 1
}

# mapshaper is not always on PATH; npx is the same fallback as other Node CLIs.
if command -v mapshaper >/dev/null 2>&1; then
    MAPSHAPER=(mapshaper)
else
    MAPSHAPER=(npx --yes mapshaper)
fi

mkdir -p "$tiles_directory"

if wants_zoom 14; then
    if [ ! -f "$census_tract_geojson" ]; then
        echo "Error: missing input $census_tract_geojson"
        exit 1
    fi
    fields=$(IFS=,; echo "${categories[*]}")
    # Stochastic rounding inside mapshaper (the GeoJSON's exact counts also
    # feed the hover tiles, so they stay untouched on disk): each value
    # becomes a multiple of per_dot whose expectation is the value itself.
    # u(k) is a deterministic hash of the feature id and field index, so
    # reruns produce the same dots.
    rounding='var u=function(k){var h=Math.imul(($.id+1)^Math.imul(k+1,0x9E3779B9),0x85EBCA6B);h^=h>>>13;h=Math.imul(h,0xC2B2AE35);h^=h>>>16;return (h>>>0)/4294967296;};'
    for k in "${!categories[@]}"; do
        f=${categories[$k]}
        rounding+=" ${f}=Math.floor((${f}||0)/${per_dot}+u(${k}))*${per_dot};"
    done

    output_geojson="${output_directory}/zoom14-14/points.geojson"
    mkdir -p "$(dirname "$output_geojson")"
    echo ">> z14: mapshaper -dots (${per_dot} per dot, stochastic rounding)"
    "${MAPSHAPER[@]}" "$census_tract_geojson" -each "$rounding" \
        -dots fields="$fields" values="$fields" save-as=$point_property per-dot=$per_dot evenness=0.5 \
        -o format=geojson ndjson "$output_geojson" || { echo "Error in mapshaper command"; exit 1; }

    mkdir -p "${tiles_directory}/zoom14-14"
    echo ">> z14: tippecanoe"
    tippecanoe -o "${tiles_directory}/zoom14-14/tiles.mbtiles" "${tippecanoe_args[@]}" "$output_geojson" \
        || { echo "Error in tippecanoe command"; exit 1; }
fi

# Coarser zooms: nested random subsets of the z14 dots.
thin_zooms=()
for z in 3 4 5 6 7 8 9 10 11 12 13; do
    wants_zoom "$z" && thin_zooms+=("z$z")
done
if [ ${#thin_zooms[@]} -gt 0 ]; then
    echo ">> z3–13: thinning z14 (${thin_zooms[*]})"
    python3 scripts/dot_tiles.py thin "$THEME" "$UF" "${thin_zooms[@]}" || { echo "Error thinning z14"; exit 1; }
fi

# Merge every UF × zoom already on disk, not just the UF we just built.
# SKIP_TILE_JOIN=1 when rebuilding many UFs in a loop, then join once.
if [ "${SKIP_TILE_JOIN:-}" = "1" ]; then
    echo ">> Skipping tile-join (SKIP_TILE_JOIN=1)"
    echo ">> Done"
    exit 0
fi
echo ">> Merging tilesets from all UFs"
mkdir -p data/tiles
if [ "$THEME" = "race" ]; then
    # No tile is ever dropped: dense metro tiles exceed tippecanoe's 500KB
    # default at z7–9 and would otherwise lose dots (and skew the mix).
    # Extension selects the container: the browser reads this PMTiles file
    # directly (no tileserver). Per-UF inputs stay MBTiles.
    tile-join -f --no-tile-size-limit -o "data/tiles/censo2022.pmtiles" tiles/*/*/tiles.mbtiles
else
    # Theme glob is isolated so prototype MBTiles cannot absorb race tiles.
    tile-join -f --no-tile-size-limit -o "data/tiles/censo2022_${THEME}.pmtiles" "tiles/${THEME}"/*/*/tiles.mbtiles
fi
echo ">> Done"
