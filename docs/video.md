# Exemplo de vídeo (Remotion)

Pasta [`video/`](../video/) — promo curto do dotsbr em [Remotion](https://www.remotion.dev/) 4, com o [plugin oficial para Cursor](https://www.remotion.dev/docs/ai/cursor-plugin).

Não entra no deploy de `https://carabetta.xyz/dotsbr/`. Não substitui o mapa ao vivo. O fundo é o mesmo **light-v10** do produto (MapLibre + estilo Mapbox via REST), com labels só de cidade/bairro. Sem `REMOTION_MAPBOX_TOKEN` no `video/.env`, cai na placa `#f0f0f0`.

## O que o vídeo faz

Composições **Dotsbr** (1920×1080) e **DotsbrMobile** (1080×1920, Stories/Reels/Shorts/TikTok), 30 fps, 594 frames ≈ 20s, com os **PMTiles reais** (`censo2022.pmtiles`, source-layer `points`):

No 9:16 o chrome fica na **zona segura** do feed: abaixo do username/notch (~320px), acima da legenda do app (~500px do rodapé) e à esquerda do trilho de likes (~132px). O `1 ponto = N` é o título visual; a legenda de raça usa linhas de 44px.

1. **Open** — o Brasil nacional (fitBounds, 1 ponto = 4.500) aparece; entra *dotsbr / O Brasil em pontos*.
2. **Legend** — o painel do produto sobre a mesma placa.
3. **Zoom** — **flyTo direto** Brasil → Rio (~6,4s de viagem + aterrissagem): centro em great-circle (Turf) e zoom nacional → 11 no mesmo progresso, sem pausa nem zoom-out. `1 ponto = N` acompanha o zoom. Remotion não usa `map.flyTo()`; cada frame faz `jumpTo` + `idle`.
4. **End** — wordmark + `carabetta.xyz/dotsbr`.

Cenas de teste isoladas: **TilesBrazil**, **TilesRio** e **SceneZoom** em `Dotsbr-Scenes`. No 9:16: **SceneOpenMobile**, **SceneLegendMobile**, **SceneZoomMobile**, **SceneEndMobile**.

O recorte em canvas (`BrazilMap` + `lib/dots.ts`) continua no repo como ilustração; o vídeo principal não o usa.

## Tiles

O MapLibre no Studio (:3000) busca o arquivo com HTTP Range. Ordem:

1. `http://127.0.0.1:8000/data/tiles/censo2022.pmtiles` se `python3 scripts/serve.py` estiver no ar (CORS liberado nesse servidor justamente para o Studio).
2. Senão `https://carabetta.xyz/dotsbr/data/tiles/censo2022.pmtiles` (já manda `Access-Control-Allow-Origin: *` e `Accept-Ranges: bytes`).

O fly é câmera WebGL ao vivo. A skill de mapas do Remotion avisa que isso pode shimmer no MP4 (tiles recarregam a cada frame). Uma placa CSS única em z11 não cabe o Brasil inteiro (≫ 4096 px), então o `jumpTo` por frame é o caminho. Render: `--gl=angle --concurrency=1`.

## Preview

Num terminal, o servidor de Range:

```sh
python3 scripts/serve.py
```

Noutro:

```sh
cd video
cp .env.example .env   # cole o token do index.html em REMOTION_MAPBOX_TOKEN
npm i
npx remotion studio --no-open
```

Studio: `http://localhost:3000/Dotsbr` (paisagem) ou `http://localhost:3000/DotsbrMobile` (celular). Render WebGL:

```sh
npx remotion render Dotsbr out/dotsbr.mp4 --gl=angle --concurrency=1
npx remotion render DotsbrMobile out/dotsbr-mobile.mp4 --gl=angle --concurrency=1
```

## Relação com o mapa

| Mapa (`index.html`) | Este exemplo |
|---|---|
| MapLibre + PMTiles nacionais | o mesmo archive |
| `flyTo` no tempo do browser | `jumpTo` por frame do Remotion (Brasil → Rio) |
| Zoom contínuo muda o `per_dot` | o card `1 ponto = N` acompanha o zoom do fly |
| light-v10 + labels de cidade | o mesmo estilo, se `REMOTION_MAPBOX_TOKEN` estiver no `video/.env` |
