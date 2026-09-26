Agent instructions for this repo live in [`AGENTS.md`](../AGENTS.md). Project layout is in [`structure.md`](structure.md). How to serve the map from the versioned per-UF MBTiles (joined to PMTiles) is in [`local-setup.md`](local-setup.md). The public page is [https://carabetta.xyz/dotsbr/](https://carabetta.xyz/dotsbr/). How that URL is published (`main`/`master` → prod) is in [`deploy.md`](deploy.md). Product analytics (Umami, not Google Analytics) are in [`user-analytics.md`](user-analytics.md). The map uses universe-by-setor aggregates ([`fontes.md`](fontes.md)); the long-form **sample** microdata (person/household, weighting area only) is catalogued in [`dicionario-microdados.md`](dicionario-microdados.md).

# Zoom Levels and Dot Density Configuration

This document describes the relationship between zoom levels and dot density in the map visualization.

The UI switches between **Raça**, **Renda**, and **Religião**, all with 27-UF coverage. Renda dots represent occupied permanent private households and are colored by the setor median income of responsible persons with income. Religião is sample-only: the mix is estimated at the weighting area (APOND) and painted dasymetrically onto the same setor polygons — zoom changes `1 ponto = N`, not the geography of the color.

**Óbitos is built but hidden from the UI for now**: the tiles (`tiles/deaths/`, `censo2022_deaths.pmtiles`), the makefiles theme, and the `deaths` entry in `VIEW_CONFIGS` all stay, but the switcher buttons were removed and `HIDDEN_VIEWS` in `index.html` makes `setView('deaths')` a no-op (persisted `dotmap-view: deaths` falls back to race on load). The UI label is **Mortes** (not “Óbitos”). Dots represent deaths reported for January 2019–July 2022, colored by age at death; sex is summed, not shown. To un-hide: restore the button in both switchers and drop `deaths` from `HIDDEN_VIEWS`.

## Configuration Table

Source of truth for **how tiles are generated** is [`makefiles.sh`](../makefiles.sh) + [`scripts/dot_tiles.py`](../scripts/dot_tiles.py); `per_dot` for every theme and zoom lives in [`scripts/themes.py`](../scripts/themes.py). Only **z14** is drawn from polygons (`census_tract_{UF}.geojson`, stochastic rounding); **z3–13 are nested random subsets of the z14 dots**. Municipality GeoJSON is hover-only. The legend (`1 ponto = N pessoas`) and the localhost HUD **fonte** / pessoas/ponto use this same table. Zoom 15 has no tiles; N is the z14 value (20).

### How each zoom is built

| Zoom | Built from | `per_dot` (people per dot) |
|------|------------|----------------------------|
| 3 | z14 dots, each kept with p = 20 / 4 500 | 4 500 |
| 4 | z14 dots, p = 20 / 2 000 | 2 000 |
| 5 | z14 dots, p = 20 / 900 | 900 |
| 6 | z14 dots, p = 20 / 400 | 400 |
| 7 | z14 dots, p = 20 / 150 | 150 |
| 8 | z14 dots, p = 20 / 120 | 120 |
| 9 | z14 dots, p = 20 / 90 | 90 |
| 10 | z14 dots, p = 20 / 70 | 70 |
| 11 | z14 dots, p = 20 / 50 | 50 |
| 12 | z14 dots, p = 20 / 35 | 35 |
| 13 | z14 dots, p = 20 / 25 | 25 |
| 14 | setor censitário (`census_tract_*.geojson`, `mapshaper -dots` after stochastic rounding) | 20 |
| 15 | *(no tiles — camera overzooms the z=14 set)* | 20 |

Themes follow the same rule with their own `per_dot` (p = per_dot[z14] / per_dot[z]).

### Why zooms are thinned from z14 (undercount fix)

`mapshaper -dots` computes each polygon's dots per category as `Math.round(value / per_dot)`. A group smaller than half a dot in a polygon never gets a dot, so the old per-zoom runs erased small groups — worst at coarse zooms, where `per_dot` is large. A second loss came from tippecanoe's `--drop-fraction-as-needed`: dense metro tiles over 500 KB / 200k features were thinned, and those tiles are richer and whiter than the country.

Measured on the tiles before the fix (`python3 scripts/dot_tiles.py audit <theme>`, national):

| Zoom | Race: preta share of dots | Race: people implied | Religião: católica / sem religião | Renda: households implied |
|---|---:|---:|---:|---:|
| 5 | 4.5% | 184.0M | 67.6% / 4.1% | 71.5M |
| 6 | 2.8% | 183.2M | 70.7% / 2.0% | 71.5M |
| 7 | 7.4% | 183.9M | 64.2% / 6.3% | 65.1M |
| 9 | 9.4% | 178.5M | 61.3% / 8.4% | 64.5M |
| 14 | 10.2% | 202.6M | 58.2% / 9.0% | 72.4M |

Now: (1) z14 uses **stochastic rounding** inside mapshaper (`-each`, a deterministic hash per feature and field): a group worth 0.3 dots gets a dot 30% of the time, so expected dots equal people / per_dot in every setor. The census GeoJSON keeps exact counts on disk (hover reads them). (2) Every coarser zoom keeps each z14 dot when its fixed random draw is below per_dot[14] / per_dot[z]; the expectation matches z14 for every category and place, dots stay inside their setor (no clusters needed), and zooming in only adds dots. (3) tippecanoe runs with `--no-feature-limit --no-tile-size-limit` (and `-x r`, the unused radius attribute mapshaper adds), so no tile drops dots.

The versioned z3–13 tiles were rebuilt this way from the versioned z14 (the census CSVs are not in git). z14 itself still comes from the old `Math.round` run until the next source rebuild: for race it is within 0.1 pp of the IBGE shares (indígena 0.5% vs 0.6%, amarela 0.3% vs 0.4%), but **Religião at z14 still under-draws small groups** (Umbanda e Candomblé 0.5% of dots, Espírita 1.3%), because each setor's APOND mix is split across eight categories at 18 people per dot. Rebuilding z14 from `apond_religion.csv` with the new `makefiles.sh` fixes it.

### Theme density scales (national)

These are independent units and must not reuse the race legend. Income (~72.4M households) stays about one third of the race schedule so the two views have similar visual density. Deaths (~3.63M visible) stay sparser on purpose — matching race 1:1 would make mortality look as populated as the census.

| Zoom | Renda: domicílios/ponto | Óbitos/ponto | Religião: pessoas 10+/ponto |
|---|---:|---:|---:|
| 3 | 1 500 | 200 | 3 900 |
| 4 | 700 | 100 | 1 750 |
| 5 | 300 | 50 | 790 |
| 6 | 130 | 25 | 350 |
| 7 | 50 | 12 | 130 |
| 8 | 40 | 10 | 105 |
| 9 | 30 | 8 | 80 |
| 10 | 24 | 6 | 60 |
| 11 | 17 | 4 | 44 |
| 12 | 12 | 3 | 31 |
| 13 | 8 | 2 | 22 |
| 14–15 | 7 | 1 | 18 |

Income categories use `V06006` divided by the 2022 minimum wage (R$ 1,212): up to 1, 1–2, 2–3, 3–5, 5–10, and over 10 minimum wages, plus unavailable. All household dots in a setor share its median-income category; the map does not infer household-level income. The ColorBrewer RdBu ramp is inverted: **poor = red, rich = blue** (`#b2182b` → `#2166ac`; `income_sem_dado` stays `#777777`).

Mortality categories are `0–14`, `15–29`, `30–59`, `60+`, and `idade suprimida`. The last category is required because IBGE suppresses detailed-age cells much more often than sex totals. Nationally, about 3.63M deaths have a visible sex total and 1.91M have a visible detailed age.

Religião is **not** on the basic questionnaire. The mix comes from the controlled sample (`P0410` × weight `P0111`, people aged 10+). Official groups: Católica, Evangélicas, Espírita, Umbanda e Candomblé, Tradições indígenas, Outras, Sem religião; codes 8+9 collapse to Sem informação. Do **not** put `P0411` denominations on the legend. Cells with weighted total &lt; 400 or unweighted n &lt; 30 are not painted; hover labels them **estimativa instável**. Every zoom is a subset of the z14 setor dots, so no zoom mixes two APONDs. Keep imputed rows (`MP0410 = 1`).

Hover on the map is a different cutoff: município polygons below zoom 10, setor from 10 — except in **Religião**, which always queries the `aponds` layer (weighting area at every zoom). The dissolve drops malha cells with no `id_apond` (water and other leftover mesh) so the sea is not a hover hit. Do not read hover as the tile-generation unit.

`per_dot` steps ~2.25× into z7 (4 500 / 2 000 / 900 / 400 / 150). Coarse-zoom dots stay on settlements because they are z14 dots, which `mapshaper -dots` placed inside setores; the old density clusters (`build_density_clusters.py`) are gone.

| Zoom | Aggregation | People per dot (`per_dot`) | Approx. dots | Circle radius (px) |
|------|-------------|----------------------------|--------------|--------------------|
| 3 | Thinned z14 | 4 500 | ~390 (SE) | 0.96 |
| 4 | Thinned z14 | 2 000 | ~930 (SE) | 0.96 |
| 5 | Thinned z14 | 900 | ~2 100 (SE) | 0.96 |
| 6 | Thinned z14 | 400 | ~4 600 (SE) | 0.96 |
| 7 | Thinned z14 | 150 | ~14 000 (SE) / ~110 000 (RJ) | 0.96 |
| 8 | Thinned z14 | 120 | | 1.04 |
| 9 | Thinned z14 | 90 | | 1.12 |
| 10 | Thinned z14 | 70 | | 1.20 |
| 11 | Thinned z14 | 50 | | 1.28 |
| 12 | Thinned z14 | 35 | | 1.36 |
| 13 | Thinned z14 | 25 | | 2.16 |
| 14 | Census tract (stochastic rounding) | 20 | | 2.16 |
| 15 | Census tract (overzoom) | 20 | | 2.16 |

## Details

- **z14:** one polygon per setor, stochastic rounding, 20 people/dot.
- **z3–13:** nested random subsets of z14 (`scripts/dot_tiles.py thin`). Unbiased per category and per place; each zoom's dots are also on the next zoom, so zooming in adds dots instead of reshuffling them. Low zooms are noisier in sparse places (a rural setor worth 0.1 dot at z3 shows one dot 10% of the time), never systematically short.
- Recorte atual dos pontos: **27 UFs** (cobertura nacional). Hover de município/setor (e `aponds` na view Religião) vem de `data/tiles/hover.pmtiles` (não do GeoJSON concatenado): o `census_tract.geojson` nacional (~248 MB) trava o mapa no zoom alto.
- MapLibre treats `minZoom` as inclusive, so `index.html` sets it to **3** (first point tileset). Camera `maxZoom` is **15** so the local Rio shortcut can overzoom; the vector source still advertises `minzoom: 3` / `maxzoom: 14` (no z=15 PBF). Archives are same-origin PMTiles (`data/tiles/*.pmtiles`); do not gzip them. Production CSP must allow MapLibre blob workers (`worker-src 'self' blob:`); see [`deploy.md`](deploy.md).
- The map **opens on Brazil, not Rio**: constructor fallback `[-51.9, -14.2]` at zoom 3.5, then a camera calculated from `[[-74, -34], [-32, 6]]`. When that whole-country fit would fall below the first point tiles on a narrow portrait screen, startup keeps the national center and clamps to zoom 3 so dots render instead of showing an empty overview. Point tiles cover all 27 UFs. A `tile-join` without `--no-tile-size-limit` still drops the SP+MG overlap at z7 (XYZ `7/47/72`, ~508 KB vs the 500 KB default) and leaves São Paulo blank even though `tiles/SP/` is complete.
- Circle radius is a linear interpolate on stops 3 / 7 / 12 / 13 (`0.96` → `0.96` → `1.36` → `2.16` px): ×1.2 everywhere, then an extra ×1.5 from zoom 13 (held through 15). The z12 stop keeps the 50% kick from ramping in at 12. People-per-dot is unchanged.

# Demographic Data Structure

This document describes the structure of the demographic data files.

## Files

### Census Tract Level

`output/tiles/race/census_tract.geojson`
Contains demographic data at the census tract level with the following attributes:
- `id_setor_censitario`: Census tract ID
- `sigla_uf`: State code
- `populacao`: Total population
- `branca`: White population count
- `preta`: Black population count
- `amarela`: Asian population count
- `parda`: Brown/Mixed population count
- `indigena`: Indigenous population count

## Usage Notes
- Census tract data is suitable for detailed local analysis
- Coarse-zoom dots are subsets of the z14 setor dots, so they stay on settlements
- Municipality polygons are hover-only (z3–9), not a dot-placement unit
- All population counts are absolute numbers

# Interactive Race Filter

Race filters live in the **legend list inside the single left panel** (`.intro-card`, below the search field). Each legend row is a toggle. There is no Raça chip or dropdown on desktop. Do not add other layer chips yet.

## Legend rows
- One row per IBGE category: color swatch + name. Clicking the row **toggles** that race. Multi-select is the default. Off rows fade (`is-off`).
- Each row has an **S** (solo) button. On hover/focus it appears; on ≤640px (inside the bottom sheet) it stays visible (34×34px) because there is no hover, and rows grow from 32px to **44px** so every filter is a comfortable touch target.
- On phones the same categories also render as the **chip rail** over the map (peek state): tap toggles, **long-press (500ms) solos**. Rows, chips, and the map filter all share one `Set` per view (`toggleCategory` / `soloCategory`), so no surface can drift.

## Available Categories

Display order everywhere the race view lists categories (legend rows, chip rail, sheet legend, hover/tap breakdowns) is **population size, descending** (Censo 2022):

1. Parda (Brown/Mixed)
2. Branca (White)
3. Preta (Black)
4. Indígena (Indigenous)
5. Amarela (Asian)

Do not add categories beyond these five IBGE keys (`branca`, `preta`, `amarela`, `parda`, `indigena`). Note `RACE_KEYS` in `index.html` keeps its own fixed order — it is the palette-assignment order for the dev HUD, not the display order; reordering it would change which hue each race gets.

## Technical Implementation
- Mapbox GL JS `setFilter` / `circle-opacity` on the `points` layer
- A `Set` of active races
- Separate handlers on `.race-row-toggle` and `.solo-button`
- `syncFilterUi()` keeps the legend rows in the same Set
- Viewport `%` is a separate pass (`updateViewportShares`): unique hover features in the canvas (`municipios-fill` below zoom 10, `setores-fill` from 10, `aponds-fill` in Religião). Raça and Religião sum official category fields; Renda classifies each unit by its `renda_mediana` (same 2022 SM bins as `themes.py`) and weights by `domicilios`, falling back to counting painted dots if those fields are missing. Integers use the largest-remainder method so they add to 100. Updates on `moveend` and hover-source `sourcedata`, not on every hover paint.

# Basemap

The map uses Mapbox **light-v10** (`mapbox://styles/mapbox/light-v10`). On load, `applyBasemapLabels()` leaves only **`settlement-label`** (cities) and **`settlement-subdivision-label`** (bairros, from z10) visible; roads, POIs, water, airports, and state/country names stay `visibility: none`. Those two layers use `name_pt` then `name` (the style default prefers `name_en`). Land/water, coastlines, admin boundaries, and light roads remain.

Hover outlines on `setores-border` and `municipios-border` are `#202124` with an 8% matching hover tint. Dots keep their category fill colors with no extra halo.

### Dot colors

| Key | Hex | Why |
|---|---|---|
| `branca` | `#4daf4a` | green — ColorBrewer Set1, permuted from HUD test; contrast on light-v10 |
| `preta` | `#ff7f00` | orange |
| `amarela` | `#377eb8` | blue |
| `parda` | `#e41a1c` | red |
| `indigena` | `#984ea3` | purple |

Income (ColorBrewer RdBu inverted — low = red, high = blue):

| Key | Hex | Why |
|---|---|---|
| `income_ate_1sm` | `#b2182b` | darkest red — até 1 salário mínimo |
| `income_1_2sm` | `#d6604d` | 1 a 2 salários mínimos |
| `income_2_3sm` | `#f4a582` | 2 a 3 salários mínimos |
| `income_3_5sm` | `#92c5de` | 3 a 5 salários mínimos |
| `income_5_10sm` | `#4393c3` | 5 a 10 salários mínimos |
| `income_mais_10sm` | `#2166ac` | darkest blue — mais de 10 salários mínimos |
| `income_sem_dado` | `#777777` | sem informação |

Religion (new palette — do not reuse the five race hues):

| Key | Hex | Label |
|---|---|---|
| `relig_catolica` | `#2c7fb8` | Católica |
| `relig_evangelica` | `#e6550d` | Evangélicas |
| `relig_sem_religiao` | `#737373` | Sem religião |
| `relig_afro` | `#756bb1` | Umbanda e Candomblé |
| `relig_espirita` | `#31a354` | Espírita |
| `relig_indigena` | `#8c510a` | Tradições indígenas |
| `relig_outras` | `#f768a1` | Outras |
| `relig_sem_info` | `#bdbdbd` | Sem informação |

This mapping is the product default (`circle-color` match + legend swatches) and HUD **Atual**. Production users get it with no HUD. Do not restore the old red/gold/mint set (`#fb3640` / `#d4b000` / `#89ffa7` / `#3899c9` / `#e8800c`) or the previous income ramp that painted poor blue and rich red. The single panel, the search field, and the slim footer keep light chrome (white surfaces, dark text) on top of the light map.

# Map chrome

The map is full-bleed (`#map` is `100vw` / `100vh`). There is **no** fixed header and **no left icon rail**. Desktop chrome is **one floating panel** top-left (`.chrome-stack` → `.intro-card`, 14px inset) plus a slim full-width footer (~32px, data/IBGE on the left, GitHub / Carabetta / © on the right). The old bottom-left legend card is gone — the legend moved into the panel, so the map's lower-left quadrant stays clear. Zoom `+/-` stays at the bottom-right, just above the footer. The first camera uses the Brazil bounds `[[-74, -34], [-32, 6]]`; narrow portrait screens keep that center at zoom 3 so the z3 dots remain visible. Search uses the same national box (flattened to Mapbox `[minLng, minLat, maxLng, maxLat]` → `[-74, -34, -32, 6]`).

## The panel (`.intro-card`)

White rounded card, top-left, story-first — the mobile sheet's reading order applied to desktop:

1. **h1 with the active lens**: `dotsbr por Raça/Renda/Religião` (`#intro-title`, rewritten live by `setView`, same "por <label>" pattern as the mobile sheet title; Óbitos would follow the same pattern when un-hidden). A **Compartilhar** button sits on the same row (`#desk-share`) — see [Share button](#share-button).
2. **Hero scale line** (`#dot-scale`, ~15px semibold): `1 ponto = N unidades`, updated on zoom and prefixed with filter state exactly like the sheet headline (`Só Parda · …` when soloed, `Mostrando k de n grupos · …` for partial sets). It was an 11px footnote in the old legend card; it is the number that keeps the map honest, so it leads.
3. **Raça / Renda / Religião** switcher (view stored as `dotmap-view`; switching does not move the camera; Óbitos hidden — see the views note at the top).
4. Explainer.
5. **Legend rows** (toggle + solo, race order parda → branca → preta → indígena → amarela). Each row shows the group's **share of the visible frame** (`43%`), recomputed from hover polygons when the camera stops — not from a dot sample, and not from the active filter (hiding Parda does not make Branca 100%). A place that only peeks into the frame is counted in full. On short viewports (e.g. 1366×768) **only this list scrolls** (`overflow-y: auto` + flex `min-height: 0`), so the panel never overflows the viewport.
6. **Docked stats slot** (`#panel-stats`) + a quiet hint (`Clique em uma área do mapa para ver os números aqui`) — see hover/click below.

Search is **not** inside the panel: the geocoder floats as a white pill **immediately to the right of the panel, top-aligned** (`#desk-search`, anchored to the stack with `left: calc(100% + 12px)` so it tracks the card width). Suggestions drop over the map, never clipped by the card.

The page `<title>` stays the plain **dotsbr** (tab labels should not churn on view switch); only the h1 carries the lens suffix. Share previews (WhatsApp, iMessage, Telegram, Slack) use the same name plus a static description and `card.jpg` — see [Link previews](#link-previews-whatsapp--imessage) below. The explainer (`p.intro-explainer`) is:

**Cada ponto é um grupo de pessoas. A cor mostra a raça que elas declararam no Censo de 2022. Quanto mais você aproxima o mapa, menos pessoas cada ponto representa.**

Renda: **Cada ponto é um grupo de domicílios. A cor mostra a renda típica de quem é responsável pelo domicílio em cada vizinhança, medida em salários mínimos (Censo de 2022). Quanto mais você aproxima o mapa, menos domicílios cada ponto representa.** Religião: **Cada ponto é um grupo de pessoas com 10 anos ou mais. A cor é a religião declarada no Censo de 2022, estimada para um conjunto de vizinhanças (não para cada quarteirão). Aproximar o mapa muda só quantas pessoas cada ponto representa, não o recorte da cor.** Mortes (hidden): **Cada ponto é um grupo de pessoas que morreram entre janeiro de 2019 e julho de 2022. A cor mostra a idade com que morreram (Censo de 2022). Quanto mais você aproxima o mapa, menos pessoas cada ponto representa.**

Body copy never says “(IBGE)” or “Censo Demográfico 2022” — those stay in the footer/sheet credits. Do not say “um ponto por pessoa”: one dot is N units and N changes with zoom. Do not restore the old h1 “Distribuição Racial no Brasil” (too close to Pata’s 2015 *Mapa Racial do Brasil*) or the previous product name “Onde o Brasil mora”. The income, religion, and mortality views rewrite the explanation and swap the h1's `por <label>` suffix (Mortes when that view is un-hidden); the product name before “por” never changes.

## Link previews (WhatsApp / iMessage)

Crawlers do not run the map JS. WhatsApp also **rejects query strings on `og:url`** (so never share `?v=2`) and may time out on the 120KB map HTML. The share card is therefore:

1. **Static tags at the very top of `index.html` `<head>`** (title, description, url, image — no query strings).
2. **`og.html`** — a &lt;1KB document with the same tags. Nginx serves it to `WhatsApp/*`, `facebookexternalhit`, and other share bots hitting `/dotsbr/`; browsers still get the map.
3. **`card.jpg`** — 1200×630 stripped JPEG (no EXIF/ICC) at `https://carabetta.xyz/dotsbr/card.jpg`.

| Tag | Value |
|---|---|
| `og:title` / `<title>` | **dotsbr** |
| `og:description` | **O Brasil em pontos. Cada ponto é um grupo de pessoas do Censo de 2022.** (≤80 characters; WhatsApp's documented length. The longer hook stays on `meta name="description"` / Twitter.) |
| `og:url` | `https://carabetta.xyz/dotsbr/` (undecorated — no `?v=`) |
| `og:image` | `https://carabetta.xyz/dotsbr/card.jpg` |
| `twitter:card` | `summary_large_image` (Slack / X also read this) |

The tab icon is a five-dot cluster in the census colors (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png` 180×180), linked relatively so localhost resolves. WhatsApp's large card uses `og:image`, not the favicon.

`card.jpg` is a crop of the live map at the Brazil frame (no panel, no search, no footer), re-encoded as a baseline JFIF. Replace it the same way: hide chrome, screenshot, crop to 1200×630, strip metadata. Share **`https://carabetta.xyz/dotsbr/`** in a **new** WhatsApp chat — an old thread and any `?v=` URL keep a stale or generic preview. The in-app **Compartilhar** button is a different path: it builds a JPEG of the *current* camera.

## Share button

Not a FAB (mobile chrome forbids on-map zoom/FAB). Same control, two mounts:

- **Desktop:** `#desk-share` on the title row of `.intro-card`.
- **Mobile:** `#m-share` in `#sheet-header`, right of the title, visible in **peek**. `pointerdown`/`click` stop at the button so the header drag and peek/half toggle do not fire.

The glyph is the three-node share mark (not the iOS box+arrow, which reads as export).

Tap composes a **4:5** JPEG (up to 2160px wide, quality 0.92) in Canvas 2D — not a DOM screenshot. Width follows the live map canvas so a phone is not upscaled (that blur is worse than a smaller file); a wide Retina canvas is stepwise-downsampled, never stretched.

| Band | Content |
|---|---|
| Map | `map.getCanvas()` of the current camera (filters and view included). Needs `preserveDrawingBuffer: true` or the frame is already cleared. A white pill at the lower-left names the place: **Brasil** below zoom 6 (country frame — the geographic center would otherwise be a random cerrado município); at 6+ `municipio · UF` from `queryRenderedFeatures` at the camera center (`municipios-fill` z3–9, `setores-fill` z≥10; Religião uses `aponds-fill`). No hit / no `municipio` field: no pill. Never “Setor Censitário”. |
| Caption | `dotsbr por <view>`, the same `formatDotScale()` string as the hero line (including `Só` / `Mostrando N de M grupos`), swatches for **active** categories with the current viewport `%` when it is ready, the share hook, `carabetta.xyz/dotsbr` |

Município/setor **numbers** stay off the card (the pill is a name only). The live map shows city and bairro labels from the basemap; the pill is still drawn on the JPEG. `html2canvas` is not used (WebGL + live chrome would fail or look messy).

On a phone, tap always opens the **OS share sheet** (`navigator.share`) so the person picks WhatsApp / Mensagens / AirDrop. The JPEG goes in `files` when the browser accepts it; if that call fails, the same sheet still opens with title + text. URL stays **inside `text`** because iOS WhatsApp drops `url` when a file is present. Do not wait for `canShare({ files })` — several mobile browsers return false and would skip the sheet. Download `dotsbr.jpg` only when `navigator.share` is missing (typical desktop Chrome/macOS). If `toDataURL` throws (Mapbox raster tainted the canvas), the sheet still opens with text+URL.

Search sits in the floating pill **to the right of the panel** on desktop (on phones the same geocoder pins to the top of the screen — see the mobile chrome section), powered by [`mapbox-gl-geocoder`](https://github.com/mapbox/mapbox-gl-geocoder) v5 against Mapbox Temporary Geocoding — the same token as the basemap, no Google key. Placeholder: **Busque por cidade, bairro, estado ou CEP**. Results are Brazil-only (`countries: 'br'`) inside the national camera bbox (`[-74, -34, -32, 6]`), with proximity at the national camera center `[-51.9, -14.2]` rather than Rio. Selecting a result `fitBounds` the map; there is no persistent pin. On a phone, choosing a result, clearing the field, or dragging the map blurs the geocoder so the software keyboard drops. Full Brazilian CEPs (`XXXXX-XXX`) are resolved via [BrasilAPI](https://brasilapi.com.br/) (`/cep/v2`). Any UF with valid lat/lng inside the national box is accepted; CEPs are not dropped for being outside Rio.

Do not restore a standalone search chrome.

## Hover, click, and the stats surfaces

The legend `%` is the mix of **every** hover unit touching the camera (see the filter section). Hover numbers live in the Mapbox **popup on the map** following the cursor (município below zoom 10, setor from zoom 10 — titled **Vizinhança (recorte do Censo)**). Religião always reads the weighting-area layer (`aponds`), never setor or município, and shows the weighted `P0410` breakdown plus **estimativa instável** on thin cells. Raça shows shares and population; Renda shows represented households and **Renda do domicílio** (the setor median; mean is omitted so the two figures cannot be confused); Mortes (hidden) would show counts/shares by age with no sex breakdown. The popup sits at `z-index: 115` — above the fixed panel (114) — so hovering near the left edge is not hidden behind it.

A **click** on a polygon (desktop) additionally **docks the same numbers into the panel's bottom slot** (`#panel-stats`), mirroring the mobile tap dock: the reading stays put for comparison while the mouse keeps hovering elsewhere. An empty-map click, the **✕**, or a view switch dismisses it; it deliberately survives `clearHoverState` (mouseout/empty hover), pans, and zooms. All three surfaces (popup, panel slot, mobile dock) are fed by one query, `detailsAtPoint()`.

On phones (≤640px) a **tap** on a polygon runs the same lookup, but the result renders in the **docked stats card** (`#stats-dock`) fixed above the peeked sheet — never under the finger, never off-screen. The tapped polygon stays highlighted; **✕** or a tap on empty map/water dismisses. While the dock is open the chip rail hides (they share the same strip). `mousemove` is ignored on the phone layout so the synthesized mouse events of a tap cannot bypass the sheet-collapse behavior below.

There is no logo. Zoom is the Mapbox `NavigationControl` at the bottom-right; the public page has no on-screen “Zoom level: N” badge. The public URL slug is `dotsbr` (`/dataviz/brazildots/` 301s there).

## Mobile chrome (≤640px): the bottom sheet

On phones the chrome follows the **Waze grammar** (user-provided reference): the map owns the screen and every piece of UI lives in **one bottom sheet** plus a few floating on-map controls. The desktop panel and footer are `display: none` on this breakpoint — hidden, not restyled — and all of the mobile chrome sits in the `.m-chrome` block of `index.html` (hidden on desktop). No libraries: the sheet is pointer events + CSS transforms.

### Sheet states (`#sheet`)

The sheet snaps between three `translateY` offsets, recomputed from live heights on resize/rotation:

| State | What shows | How you get there |
|---|---|---|
| **peek** | drag handle + **dotsbr por Raça/Renda/Religião** (title carries the active lens, updated live on view switch; label matches the switcher) + live `1 ponto = N unidades` line + **Compartilhar** | drag down, tap header, or tap the map while open |
| **half** (~52vh, ≤400px) | + Raça/Renda/Religião switcher, explainer | drag, or tap header from peek |
| **full** (92dvh) | + 44px legend rows with **S** solo buttons, **credits** | drag up |

- **First visit opens at half** so the story (title, scale, lens, explainer) shows once; afterwards the last snap state wins for the session (`sessionStorage` key `dotmap-sheet-state`).
- Drag only works from the **header** (handle + title strip, `touch-action: none`); the **Compartilhar** button is the exception (`stopPropagation` + `touch-action: manipulation`). The content area keeps native scrolling, which only unlocks in the full state (`body.m-sheet-full`) so scroll and drag never fight.
- Tapping the **map** while the sheet is at half/full collapses it to peek first; details come on the next tap.
- The product name is never hidden — it is the first line of every state, suffixed with the active view (`#sheet-title`, e.g. **dotsbr por Renda**). The desktop `h1` (`#intro-title`) uses the same `por <label>` suffix; only the page `<title>` stays the plain product name.

### Chip rail (`#chip-rail`, peek state only)

The always-visible legend while exploring: one pill chip per group of the active view (swatch + name + viewport `%`, ≥44px tall, horizontal scroll for Renda's 7 and Religião's 8). Renda chips use short labels (`Até 1`, `1 a 2`, … `10+`, `Sem info`); Religião chips shorten Umbanda e Candomblé / Tradições indígenas / Sem informação to Afro / Indígena / Sem info. The full legend and the explainer still say “salário mínimo” on Renda. **Tap toggles** the group; **long-press (500ms) solos** it (context menu suppressed; a moving finger cancels the press so rail scrolling works). The rail hides when the sheet expands (the full legend list takes over) or while a stats card is docked. The sheet headline reports filters so the map never lies silently: `Só Parda · …` when soloed, `Mostrando k de n grupos · …` for partial sets.

### Floating controls

- **Top search bar** (`#m-search-bar`): the geocoder pins to the top of the screen as a floating white pill (Waze's map screen does the same), fixed to the viewport with `--chrome-inset` margins and `safe-area-inset-top`. Input is 44px tall; suggestions drop over the map, never clipped by the sheet. It sits **above** the sheet in z-order so search stays reachable in every snap state — it used to be buried inside the sheet's full state. Nothing else is top-anchored in production; the localhost-only dev chip may overlap the bar's right edge and that is fine — the dev HUD is a tool, not part of the design.
- **No zoom buttons, no recenter FAB on phones.** Pinch/double-tap zoom the map; on-screen buttons would only cover dots. The NavigationControl still mounts (desktop uses it) but is `display: none` on ≤640px, which also removes it from hit-testing — touches pass straight to the map. Mapbox attribution (compact ⓘ, bottom-right) stays, lifted above the chip rail. `jumpToBrazilOverview` remains for startup and the dev HUD jump `1`.
- **Docked stats card** — see the popup section above.

### Everything else

- **No mobile footer.** Credits (`Dados: IBGE · Censo Demográfico 2022 · GitHub · Carabetta.xyz · © 2026`) live at the end of the sheet's full state; Mapbox attribution stays on-map.
- **Viewport & safe areas:** meta viewport declares `width=device-width` and `viewport-fit=cover`; the search bar, sheet header, rail, dock, and dev HUD pad with `env(safe-area-inset-*)`. `#map` uses a `100dvh` fallback because iOS Safari's collapsing toolbar makes `100vh` taller than the visible viewport. Dependent chrome positions key off the CSS variable `--m-peek-h` (the measured sheet-header height, set by JS).
- **One geocoder instance** moves between the desktop pill (right of the panel) and the mobile top bar (`placeGeocoder()` re-parents it on breakpoint change); two instances would double Mapbox requests.
- **Dev HUD:** still injected only on loopback hosts — a real phone hitting carabetta.xyz never sees it. On ≤640px the chip and the panel compact (`min(300px, 100vw - 20px)`, 45vh max height).

# Local dev panel

A compact HUD is injected only on loopback hosts (`localhost`, `127.0.0.1`, `::1`, `*.localhost`). Production (`carabetta.xyz`) never gets the toggle or the panel.

- Off by default. Toggle with the top-right **dev** button or `D` / `` ` `` (ignored while typing in the search field). `sessionStorage` key `dotmap-dev-panel` keeps it open across refresh.
- Live fields, updated on `move` / `zoom`: unidades/ponto (active-view table), center, bbox, hover layer (`município` below zoom 10, `setor` from 10), and **fonte** (tile-generation unit from `makefiles.sh`: setor agrupado at z3–6, setor at z7–14, setor overzoom at 15). Fonte is not hover.
- **Zoom** and **raio** are editable (localhost only). Zoom is a slider + number (2–15) that calls `map.setZoom`. Raio is a **multiplier** (0.5×–3×, default 1) on top of the coded interpolate (so the z13 ×1.5 bump stays). `reset` returns the multiplier to 1. The effective px is shown next to the control. Multiplier is stored in `sessionStorage` key `dotmap-dev-radius-mult`. Keyboard shortcuts ignore these inputs the same way as the geocoder.
- **Cores** (localhost, Raça only): a select of 5-hue presets mapped to `branca`, `preta`, `amarela`, `parda`, `indigena`. The controls are hidden in Renda and Óbitos.
- Camera jumps (localhost only, ignored while typing in search): **1** Brasil (`fitBounds` of the default country bbox), **2** Rio center `[-43.1729, -22.9068]` at zoom **15**. Same actions as the two HUD buttons.
- Monospace overlay, not a product card. All logic stays in `index.html`. The panel scrolls if the color block would otherwise cover zoom/footer.

# Remotion video example

`video/` is a short Remotion promo (compositions `Dotsbr` 1920×1080 and `DotsbrMobile` 1080×1920, ~20s) that retells the race-view story on live MapLibre plates of `censo2022.pmtiles`: national view, then a direct flyTo to Rio at z11 (50 people/dot) with no hold or zoom-out. The 9:16 cut keeps type and the legend inside the Reels/Stories safe zone (below the username, above the caption, left of the like rail). Camera is `jumpTo` per frame, not MapLibre `flyTo()`. Basemap is the same Mapbox light-v10 as the product when `REMOTION_MAPBOX_TOKEN` is set in `video/.env`. Preview and tile URLs: [`video.md`](video.md).

# Analytics

Production loads the shared Umami tracker at `analytics.carabetta.xyz` (website **dotsbr-prod**). Loopback hosts never inject it. There is no Google Analytics / GTM. Events and the dashboard are documented in [`user-analytics.md`](user-analytics.md).

# Credits

On desktop, credits sit in `.map-footer`, a slim full-width bar (~32px), not in either card and not as a second explainer. The bar is two-sided: **left** is data/IBGE (`Dados: IBGE · Censo Demográfico 2022`); **right** is the credit cluster (`GitHub · Carabetta.xyz · © 2026 Carabetta.xyz`), flush to the right edge via `justify-content: space-between` plus `margin-left: auto` on `.footer-right`. On ≤640px the footer is hidden and the same credits render as `.sheet-credits` at the end of the bottom sheet's full state (Mapbox attribution stays on the map). “Dados: IBGE” links to the official [Agregados por Setores Censitários 2022](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/) FTP collection (the source documented in [`fontes.md`](fontes.md)), not the IBGE homepage. “Censo Demográfico 2022” links to the [Censo 2022 dataset on Base dos Dados](https://basedosdados.org/dataset/08a1546e-251f-4546-9fe0-b1e6ab2b203d) (the 2022-specific page, not the older `br-ibge-censo-demografico` collection). Then: [GitHub](https://github.com/JoaoCarabetta/dotsbr) (this repo), [Carabetta.xyz](https://carabetta.xyz), and `© 2026 Carabetta.xyz`.
