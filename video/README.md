# dotsbr — exemplo em Remotion

Promo curto (~20s) com os **PMTiles reais** da view Raça: Brasil nacional, depois um flyTo até o Rio em z11 (`1 ponto = 50`). Duas composições: **Dotsbr** (1920×1080) e **DotsbrMobile** (1080×1920, zona segura de Reels/Stories).

Fundo: Mapbox `light-v10` via MapLibre (igual ao mapa), se `video/.env` tiver `REMOTION_MAPBOX_TOKEN`. Sem o token, placa `#f0f0f0`. O fly é `jumpTo` por frame. Render: `--gl=angle --concurrency=1`.

## Preview

Num terminal:

```sh
python3 scripts/serve.py
```

Noutro:

```sh
cd video
npm i
npx remotion studio --no-open
```

Abre `http://localhost:3000/Dotsbr` ou `http://localhost:3000/DotsbrMobile`. Sem o `serve.py`, o preview cai no archive público (`carabetta.xyz/dotsbr/data/tiles/censo2022.pmtiles`).

Testes isolados: `TilesBrazil`, `TilesRio`, `SceneZoom`; no 9:16, `SceneZoomMobile`.

## Render

```sh
npx remotion render Dotsbr out/dotsbr.mp4 --gl=angle --concurrency=1
npx remotion render DotsbrMobile out/dotsbr-mobile.mp4 --gl=angle --concurrency=1
```
