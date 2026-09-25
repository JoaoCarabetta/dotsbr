# dotmap

Mapa de densidade de pontos do Censo 2022 / IBGE. A UI mostra **Raça**, **Renda** e **Religião** (27 UFs). Religião vem da amostra (área de ponderação), não do agregado por setor. Óbitos está no pipeline/tiles mas oculto no seletor até a view ficar pronta. Frontend MapLibre GL JS; tiles em PMTiles servidos da mesma origem (HTTP Range).

Ao vivo: [https://carabetta.xyz/dotsbr/](https://carabetta.xyz/dotsbr/). Código: [github.com/JoaoCarabetta/dotsbr](https://github.com/JoaoCarabetta/dotsbr). `main` e `master` são produção ([docs/deploy.md](docs/deploy.md)).

Guia completo: [docs/local-setup.md](docs/local-setup.md). Fontes e caveats: [docs/fontes.md](docs/fontes.md). Microdados da amostra (acesso controlado): [docs/dicionario-microdados.md](docs/dicionario-microdados.md). Exemplo de vídeo em Remotion: [docs/video.md](docs/video.md) (`cd video && npx remotion studio`).

## Run locally (tiles already in the repo)

A fresh clone does **not** include `data/` (gitignored). Merge the versioned per-zoom MBTiles into national PMTiles first.

Dependencies: [tippecanoe](https://github.com/felt/tippecanoe) (`brew install tippecanoe`), [uv](https://docs.astral.sh/uv/). Node.js is only needed if you rebuild dots with mapshaper via `npx`.

```sh
mkdir -p data/tiles
# --no-tile-size-limit: default 500KB/tile drops SP+MG at z7 (~508KB).
# The .pmtiles extension is what the browser range-requests; do not gzip the file.
tile-join -f --no-tile-size-limit -o data/tiles/censo2022.pmtiles tiles/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_income.pmtiles tiles/income/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_deaths.pmtiles tiles/deaths/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_religion.pmtiles tiles/religion/*/*/tiles.mbtiles

python3 scripts/serve.py
```

Open `http://localhost:8000`. Tiles come from `/data/tiles/censo2022.pmtiles` on the same port (HTTP 206 Range). Do not use `python -m http.server`: some Python 3.12 builds ignore `Range` and would send the whole archive.

`python3 scripts/serve.py --port 8001` if 8000 is taken. `uv run python server.py` is the Flask alternative.

Without restoring extra files from elsewhere:

- **Works:** light-v10 basemap (no labels, no satellite) + national **Raça** dots (zooms 3–14; 3–6 clustered setor). **Renda** and **Religião** need a local `tile-join` of `tiles/income/` / `tiles/religion/` (theme MBTiles are built locally, not versioned here). **Óbitos** is hidden in the UI.
- **404:** hover tiles (`data/tiles/hover.pmtiles`) until `python3 scripts/ibge_uf.py tiles`

## Create the dataset from scratch

Needs the national race CSV under `data/` (see [docs/fontes.md](docs/fontes.md)). Do not run this just to view the map: a full `./makefiles.sh UF` regenerates zooms 7–14 for that state (expensive). Other UFs already in `tiles/` are left alone.

Add or rebuild one UF (all 27 are already in `tiles/`, including SP and MG):

```sh
python3 scripts/build_municipality.py RR
python3 scripts/build_census_tract.py RR
python3 scripts/build_density_clusters.py RR   # clustered setores for zooms 3–6
./makefiles.sh RR            # all zooms 3–14 for that UF, then tile-join every UF
./makefiles.sh RR 3,4,5,6    # clustered zooms only (needs the cluster GeoJSON)
```

Income and death themes use the same builders with a theme argument. National loop (two UFs at a time, join once at the end):

```sh
./scripts/build_theme_pair.sh RR
SKIP_TILE_JOIN=1 ./makefiles.sh RR income   # already done by the pair script

printf '%s\n' AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO \
  | xargs -P 2 -n 1 ./scripts/build_theme_pair.sh
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_income.pmtiles tiles/income/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_deaths.pmtiles tiles/deaths/*/*/tiles.mbtiles
python3 scripts/ibge_uf.py
```

Religion (controlled sample in Downloads; never commit those CSVs):

```sh
python3 scripts/build_religion_apond.py expand
./scripts/build_theme_uf.sh RR religion
printf '%s\n' AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO \
  | xargs -P 2 -n 1 -I{} ./scripts/build_theme_uf.sh {} religion
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_religion.pmtiles tiles/religion/*/*/tiles.mbtiles
python3 scripts/build_religion_apond.py hover
python3 scripts/ibge_uf.py aponds
```
