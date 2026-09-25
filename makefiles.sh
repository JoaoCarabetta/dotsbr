#!/bin/bash
# Check if UF argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <UF> [zooms] [race|income|deaths|religion]"
    echo "Example: $0 RJ"
    echo "Example: $0 SE 3,4,5,6 income"
    exit 1
fi

UF=$1
# Optional comma-separated zoom list so we can rebuild 3–6 without touching 7–14.
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

# Define input GeoJSON files for different aggregation levels
theme_directory="data/censo2022/output/tiles/${THEME}"
census_tract_geojson="${theme_directory}/census_tract_${UF}.geojson"
# Density-clustered setores for z3–6. Built by scripts/build_density_clusters.py.
# Isolate intermediates per UF so building RR does not clobber RJ dots.
if [ "$THEME" = "race" ]; then
    output_directory="dots/${UF}"
    tiles_directory="tiles/${UF}"
else
    output_directory="dots/${THEME}/${UF}"
    tiles_directory="tiles/${THEME}/${UF}"
fi
# Per-UF tiles so a new state never overwrites another UF's MBTiles.

# Never rm -rf tiles/: zooms 7-14 are versioned and expensive to regenerate.
# Each zoom dir below is overwritten only if that zoom is in this run.

case "$THEME" in
    race)
        categories=("branca" "preta" "amarela" "parda" "indigena")
        point_property="race"
        per_dot_values=(4500 2000 900 400 150 120 90 70 50 35 25 20)
        ;;
    income)
        categories=("income_ate_1sm" "income_1_2sm" "income_2_3sm" "income_3_5sm" "income_5_10sm" "income_mais_10sm" "income_sem_dado")
        point_property="cat"
        per_dot_values=(1500 700 300 130 50 40 30 24 17 12 8 7)
        ;;
    deaths)
        categories=("death_0_14" "death_15_29" "death_30_59" "death_60_plus" "death_age_suppressed")
        point_property="cat"
        per_dot_values=(200 100 50 25 12 10 8 6 4 3 2 1)
        ;;
    religion)
        # Same mix at every zoom: APOND religion allocated onto setor/cluster.
        categories=("relig_catolica" "relig_evangelica" "relig_espirita" "relig_afro" "relig_indigena" "relig_sem_religiao" "relig_outras" "relig_sem_info")
        point_property="cat"
        per_dot_values=(3900 1750 790 350 130 105 80 60 44 31 22 18)
        ;;
    *)
        echo "Unknown theme: $THEME (expected race, income, deaths, or religion)"
        exit 1
        ;;
esac

# Combine theme categories into a string for Mapshaper.
fields=$(IFS=,; echo "${categories[*]}")
echo ">> Fields for Mapshaper: $fields"

# Create this UF's tiles directory (leave other UFs untouched)
echo ">> Creating tiles directory for ${UF}"
mkdir -p $tiles_directory

# mapshaper is not always on PATH; npx is the same fallback as other Node CLIs.
if command -v mapshaper >/dev/null 2>&1; then
    MAPSHAPER=(mapshaper)
else
    MAPSHAPER=(npx --yes mapshaper)
fi

# Zoom 3–6 = density-clustered setores; 7–14 = raw setor.
# per_dot steps ~2.25× into z7 (4500 / 2000 / 900 / 400 / 150).
min_zoom_levels=(3    4    5   6   7   8   9   10  11  12  13  14)
max_zoom_levels=(3    4    5   6   7   8   9   10  11  12  13  14)
aggregation_levels=("cluster" "cluster" "cluster" "cluster" "census" "census" "census" "census" "census" "census" "census" "census")

# Loop through zoom level ranges
echo ">> Generating dot density files and tilesets"
for i in "${!min_zoom_levels[@]}"; do
    min_zoom=${min_zoom_levels[$i]}
    max_zoom=${max_zoom_levels[$i]}
    per_dot=${per_dot_values[$i]}
    aggregation=${aggregation_levels[$i]}

    if [ -n "$ONLY_ZOOMS" ]; then
        case ",$ONLY_ZOOMS," in
            *",$min_zoom,"*) ;;
            *) continue ;;
        esac
    fi

    output_geojson="${output_directory}/zoom${min_zoom}-${max_zoom}/points.geojson"

    echo ">> Processing zoom levels: $min_zoom to $max_zoom with per-dot value: $per_dot (${aggregation} level)"

    # Create directory for dot density files
    mkdir -p "$(dirname "$output_geojson")"

    # Select input file based on aggregation level
    input_geojson=""
    if [ "$aggregation" = "cluster" ]; then
        # One cluster file per zoom: coarser target_pop at lower z.
        input_geojson="${theme_directory}/cluster_${UF}_z${min_zoom}.geojson"
    else
        input_geojson=$census_tract_geojson
    fi

    if [ ! -f "$input_geojson" ]; then
        echo "Error: missing input $input_geojson"
        if [ "$aggregation" = "cluster" ]; then
            echo "Run: python3 scripts/build_density_clusters.py ${UF} 3,4,5,6 ${THEME}"
        fi
        exit 1
    fi

    # Keep one stable source-layer while the property identifies the active theme.
    echo ">> Running mapshaper for zoom levels $min_zoom to $max_zoom using ${aggregation} data"
    "${MAPSHAPER[@]}" $input_geojson -dots fields=$fields values=$fields \
    save-as=$point_property per-dot=$per_dot evenness=0.5 -o $output_geojson

    # Check for errors
    if [ $? -ne 0 ]; then
        echo "Error in mapshaper command"
        exit 1
    fi

    # Create tileset for the zoom level range and save in a directory
    tileset_directory="${tiles_directory}/zoom${min_zoom}-${max_zoom}"
    mkdir -p $tileset_directory

    # Generate tileset
    echo ">> Running tippecanoe for zoom levels $min_zoom to $max_zoom"
    tippecanoe -o "${tileset_directory}/tiles.mbtiles" -l points -z$max_zoom -Z$min_zoom $output_geojson --force -P -r1 --drop-fraction-as-needed

    # Check for errors
    if [ $? -ne 0 ]; then
        echo "Error in tippecanoe command"
        exit 1
    fi
done

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
    # Default 500KB/tile drops SP+MG at z7 and leaves São Paulo blank.
    # Extension selects the container: the browser reads this PMTiles file
    # directly (no tileserver). Per-UF inputs stay MBTiles.
    tile-join -f --no-tile-size-limit -o "data/tiles/censo2022.pmtiles" tiles/*/*/tiles.mbtiles
else
    # Theme glob is isolated so prototype MBTiles cannot absorb race tiles.
    tile-join -f --no-tile-size-limit -o "data/tiles/censo2022_${THEME}.pmtiles" "tiles/${THEME}"/*/*/tiles.mbtiles
fi
echo ">> Done"
