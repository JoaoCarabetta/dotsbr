# Local setup

How to run the map on this machine. Verified 2026-09-04 with per-UF tiles under `tiles/{UF}/` (27 UFs) and MapLibre `minZoom` 3 (inclusive; first point tileset is z=3).

## What git gives you vs what it does not

In the repo:

- `index.html` (map UI + Open Graph tags + favicon links; Mapbox **light-v10** basemap via the Style API, symbol/label layers hidden; opens on Brazil via `fitBounds`, not Rio)
- `og.jpg` (legacy 1200×630 share crop; WhatsApp now uses `card.jpg`)
- `card.jpg` (stripped 1200×630 JPEG for Open Graph)
- `og.html` (tiny crawler-only Open Graph document; nginx serves it to WhatsApp)
- `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` (tab and iOS home-screen icon; five census-color dots)
- `tiles/{UF}/zoom3-3` … `tiles/{UF}/zoom14-14` (per-UF race MBTiles; 27 UFs; z3–13 are random subsets of z14)
- Theme builders (`scripts/themes.py`, `makefiles.sh` with a theme arg). Income, deaths and religion per-UF MBTiles are versioned under `tiles/{theme}/{UF}/` — `tile-join` them to PMTiles like race

Not in git (`data/` is missing on a fresh clone):

- `data/tiles/censo2022.pmtiles` — build it with `tile-join` (below)
- `data/tiles/censo2022_income.pmtiles`, `censo2022_deaths.pmtiles`, and `censo2022_religion.pmtiles`
- `data/tiles/hover.pmtiles` — município (z3–9), setor (z10–12), and `aponds` (z3–12, Religião only); `python3 scripts/ibge_uf.py tiles` or `aponds`
- `data/censo2022/output/tiles/race/census_tract.geojson` — intermediate for hover tiles (do not load in the browser)
- `data/censo2022/output/tiles/race/municipality.geojson` — intermediate for hover tiles

`config.json` is a leftover tileserver-gl config. The map does not read it.

## Dependencies

| Tool | Why | Install |
|---|---|---|
| tippecanoe (`tile-join`) | merge per-zoom MBTiles into national PMTiles | `brew install tippecanoe` |
| uv + Python 3.12 | static file server (Range requests) | `uv` uses `.python-version` |

`mapshaper` / Node.js are only needed to **regenerate** dots via `makefiles.sh`, not to serve existing tiles.

Do **not** run `./makefiles.sh` just to view the map. The script requires a UF argument (`./makefiles.sh RR`) and needs GeoJSON under `data/` that is not in git. A full run redraws z14 for **that UF only** from its setor polygons and rebuilds z3–13 by thinning z14; other states in `tiles/` stay put. To rebuild zooms below 14 from the versioned z14 (no GeoJSON, needs `tippecanoe`): `./makefiles.sh RR 3,4,5,6` or `python3 scripts/dot_tiles.py thin race RR`. For all 27 UFs, set `SKIP_TILE_JOIN=1` per UF and run one `tile-join` at the end.

## Serve existing tiles (reproduced path)

```sh
# 1. Merge the versioned per-zoom files into the PMTiles the page range-requests.
#    -f overwrites (not --force). --no-tile-size-limit is required: tippecanoe's
#    default 500KB/tile drops the SP+MG overlap at z7 (XYZ 7/47/72, ~508KB)
#    and São Paulo goes blank even though tiles/SP/ exists for all 27 UFs.
#    Do not gzip the .pmtiles file (Range + inner gzip tiles would break).
mkdir -p data/tiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022.pmtiles tiles/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_income.pmtiles tiles/income/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_deaths.pmtiles tiles/deaths/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_religion.pmtiles tiles/religion/*/*/tiles.mbtiles
python3 scripts/ibge_uf.py tiles

# 2. Page + archives on one port. scripts/serve.py speaks Range; some Python
#    3.12 http.server builds ignore it and would send the whole 200MB+ archive.
python3 scripts/serve.py
```

`serve.py` also sends CORS `*` on every response so Remotion Studio (`:3000`) can Range-GET the same `.pmtiles`. The map page is same-origin and ignores that.

Open `http://localhost:8000`. The switcher shows **Raça**, **Renda**, and **Religião** (Óbitos stays hidden; `HIDDEN_VIEWS` in `index.html`). Race tiles are versioned; Renda/Óbitos/Religião need the local theme join above. Religião also needs the controlled sample expand (`python3 scripts/build_religion_apond.py expand`) — do not commit those CSVs.

On localhost a top-right **dev** button (or `D` / `` ` ``) toggles a HUD. Zoom and raio are sliders (raio is a 0.5×–3× multiplier on the coded radius curve; **reset** returns to 1×). `1` jumps to the Brazil overview; `2` jumps to Rio at zoom 15 (tiles still max out at 14). It is not injected on `carabetta.xyz`.

Sanity checks used in the reproduction:

- `curl -I http://localhost:8000/data/tiles/censo2022.pmtiles` → `Accept-Ranges: bytes`
- `curl -H 'Range: bytes=0-16383' -o /dev/null -w '%{http_code}\n' http://localhost:8000/data/tiles/censo2022.pmtiles` → `206`
- Browser DevTools: Range `206` on the `.pmtiles` files, no `{z}/{x}/{y}.pbf` and nothing on port 8080
- SP at z7 is present in the archive (~508 KB). A join without `--no-tile-size-limit` drops it.
- If the `.pmtiles` file is missing, dots never appear (the page does not fall back to tileserver-gl)
- Hover is `data/tiles/hover.pmtiles` (not the GeoJSON). Rebuild with `python3 scripts/ibge_uf.py tiles` after the concatenated files exist.

`python3 scripts/serve.py --port 8001` if 8000 is taken. `uv run python server.py` is the Flask alternative. Do not use `python -m http.server` unless you have confirmed it returns 206 on Range.

## Public URL

The map is published at [https://carabetta.xyz/dotsbr/](https://carabetta.xyz/dotsbr/). `index.html` resolves archives as `data/tiles/{name}.pmtiles` relative to the page, so production copies those four files next to the deployed HTML (`/dotsbr/data/tiles/…`). Nginx must send `Accept-Ranges: bytes` and **not** gzip the `.pmtiles` body. Push to `main` or `master` deploys the HTML; tile uploads stay a local `./deploy.sh --tiles`. See [`deploy.md`](deploy.md).

## Create the dataset from scratch (not reproduced here)

Needs GCP access to `rj-escritorio-dev` and raw files that live only under `data/`.

1. Run the BigQuery notebook linked from [README.md](../README.md).
2. Or build one UF at a time (stdlib + mapshaper; no geopandas). See [fontes.md](fontes.md):

```sh
python3 scripts/build_municipality.py RR
python3 scripts/build_census_tract.py RR
```

For income or deaths, pass the theme. National rebuild (two UFs in parallel):

```sh
printf '%s\n' AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO \
  | xargs -P 2 -n 1 ./scripts/build_theme_pair.sh
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_income.pmtiles tiles/income/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_deaths.pmtiles tiles/deaths/*/*/tiles.mbtiles
python3 scripts/ibge_uf.py
```

Religion (sample → APOND → dasymetric tiles). Controlled `Pessoas_*_controlado.csv` stay in Downloads — never commit them:

```sh
python3 scripts/build_religion_apond.py expand
printf '%s\n' AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO \
  | xargs -P 2 -n 1 -I{} ./scripts/build_theme_uf.sh {} religion
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_religion.pmtiles tiles/religion/*/*/tiles.mbtiles
python3 scripts/build_religion_apond.py hover   # optional: dissolve again (drops water leftovers)
python3 scripts/ibge_uf.py aponds              # rebuilds hover.pmtiles (replaces aponds, does not stack)
```

3. Generate dots and per-UF MBTiles for that UF. A full run draws z14 from the setor polygons (stochastic rounding) and thins it into z3–13, then joins a national PMTiles:

```sh
./makefiles.sh RR            # z14 from polygons + z3–13 thinned, then tile-join every UF → .pmtiles
./makefiles.sh RR 3,4,5,6    # re-thin some zooms from the versioned z14 (no GeoJSON)
python3 scripts/dot_tiles.py thin race          # every UF, z3–13, from the versioned z14
python3 scripts/dot_tiles.py audit race         # shares + people implied per zoom
```

4. Then serve as in the section above. `makefiles.sh` already writes `data/tiles/censo2022.pmtiles`.
