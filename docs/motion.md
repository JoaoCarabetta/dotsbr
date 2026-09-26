# Motion graphics de 15 segundos

Pasta [`motion/`](../motion/). Vídeo curto do dotsbr feito do zero com os **pontos reais** dos MBTiles versionados em `tiles/`, desenhados em WebGL e capturados quadro a quadro no Chromium headless. Não usa Remotion nem MapLibre, e não substitui o exemplo antigo em `video/`.

Saídas (versionadas em `motion/renders/`):

| Arquivo | Formato |
|---|---|
| `dotsbr-15s.mp4` | 1920×1080, 60 fps, H.264 (CRF 23) + AAC 256k, ~26 MB |
| `dotsbr-15s-vertical.mp4` | 1080×1920 (Reels/Shorts/TikTok), 60 fps, H.264 (CRF 23) + AAC 256k |

## Roteiro

Os cortes caem numa grade de 133⅓ BPM (tempo de 0,45 s) que começa na explosão, em 0,8 s. A trilha sai do mesmo `T` de `motion/src/story.js`, então som e imagem não se desalinham.

| Tempo | Cena | Dados |
|---|---|---|
| 0–0,8 s | Um ponto só: **1 ponto = 900 pessoas** | escala do z5 de raça |
| 0,8–2,6 s | O ponto explode em ~204 mil pontos e forma o Brasil; contador até **203.080.756** | `br_race_5` (todas as UFs) |
| 2,6–4,4 s | Os pontos saem do mapa e montam as barras: **parda 45,3 %, branca 43,5 %, preta 10,2 %, indígena 0,6 %, amarela 0,4 %** — “pela 1ª vez desde 1991, os pardos são o maior grupo” | percentuais **oficiais do IBGE**, não a contagem de pontos (ver abaixo) |
| 4,4–5,3 s | A busca do produto digita “Rio de Janeiro” | — |
| 5,3–7,1 s | Voo Brasil → Rio (curva de van Wijk, a mesma do `flyTo`), com inclinação de 30°; o chip **1 ponto = N** rola de 900 a 35 | z5 → z11 com crossfade por dither |
| 7,1–8,9 s | Raça no Rio: **Zona Sul, quase 8 em cada 10 brancos; Baixada Fluminense, 1 em cada 3** | `rio_race_11` |
| 8,9–10,7 s | Cursor troca a lente para **Renda**; frente de varredura: **Zona Sul, mais de 5 salários mínimos; Baixada, até 2** | `rio_income_11` |
| 10,7–12,5 s | **Religião**: evangélicos **4 em cada 10 na Zona Oeste, 1 em cada 10 na Zona Sul** | `rio_religion_11` (amostra, mistura por área de ponderação) |
| 12,5–15 s | Os pontos do Rio escrevem **dotsbr**; “O Brasil em pontos · Censo 2022” e `carabetta.xyz/dotsbr` | `rio_race_11` |

### De onde vêm os números

- **Nacionais** (203.080.756 e as cinco barras): Censo 2022, IBGE, cor ou raça. As barras usam uma subamostra dos pontos na proporção oficial.
- **Por que não a contagem de pontos**: quando o vídeo foi renderizado, os zooms baixos vinham de um `mapshaper -dots` que arredondava cada polígono, e os grupos pequenos sumiam (z5 nacional: `preta` 4,5 % dos pontos, oficial 10,2 %). Os tiles foram corrigidos depois (z3–13 agora são subconjuntos do z14; ver [`docs.md`](docs.md#why-zooms-are-thinned-from-z14-undercount-fix)); `npm run data` e um novo render deixam o mapa nacional do vídeo igual ao do site.
- **Rio** (`npm run stats` → `scripts/rio_stats.mjs`): pontos do z12 dentro de retângulos aproximados (“Zona Sul orla” = Botafogo a Leblon; “Baixada” = Caxias, Belford Roxo, São João de Meriti, Nilópolis e parte de Nova Iguaçu; “Zona Oeste” = Bangu a Santa Cruz). Os resultados foram arredondados para frações de propósito: Zona Sul 78 % branca, Baixada 32 %; Zona Sul 74 % dos domicílios em vizinhanças de 5+ SM, Baixada 94 % até 2 SM; evangélicos 9 % na Zona Sul e 38 % na Zona Oeste.
- Renda é a renda típica do responsável na vizinhança (`V06006`), não renda individual. Religião vem da amostra (10+ anos) e não tem resolução de setor.

## Como gerar

Requer Node 20+, um Chromium (padrão: `/opt/pw-browsers/chromium_headless_shell-1194/...`; troque com `CHROME=`) e um `ffmpeg` com libx264 (`FFMPEG=`; o wheel `imageio-ffmpeg` do PyPI traz um).

```sh
cd motion
npm i
npm run data              # tiles/**/*.mbtiles → motion/data/*.bin (~3 s, gitignored)
npm run sound             # out/soundtrack.wav (síntese, sem samples)
npm run render -- --workers 2            # out/dotsbr-15s.mp4 (~6 min em 4 CPUs, SwiftShader)
npm run render:vertical -- --workers 2   # out/dotsbr-15s-vertical.mp4
npm run stills            # PNGs em out/stills/ para revisar
```

Preview ao vivo com scrubber: `python3 scripts/serve.py` na raiz e abra `http://localhost:8000/motion/` (espaço = play/pause, setas = quadro a quadro, `?w=1080&h=1920` para o vertical, `?t=8.4` para abrir num instante).

## Como funciona

- `scripts/extract.mjs` — lê os MBTiles por UF e zoom, descarta as cópias de buffer (coordenadas fora de `[0, extent)`), embaralha com semente fixa e grava posições Mercator relativas a uma origem (float32 com precisão sub-pixel até z13) + categoria + UF. Os recortes por zoom cobrem só o que a câmera vê naquele nível. Também exporta a silhueta Natural Earth 1:50m (`world-atlas`) usada só no zoom nacional.
- `src/dots.js` — um único shader de pontos. Explosão, barras, varredura entre lentes, crossfade de zoom (cada ponto tem um limiar próprio, então níveis entram e saem ponto a ponto) e o logotipo são uniforms; cada quadro é função pura do tempo.
- `src/camera.js` — câmera Web Mercator com as convenções do MapLibre (tiles de 512 px, fov 36,87°, pitch/bearing) e ponto de fuga deslocável, como o `padding`.
- `src/story.js` — beat sheet, câmera, camadas e alvos dos morphs. `src/overlay.js` — tipografia cinética e o chrome do produto (busca, chip `1 ponto = N`, seletor Raça/Renda/Religião, pins).
- `scripts/render.mjs` — serve `motion/`, chama `window.renderFrame(t)`, captura via CDP (`optimizeForSpeed`) e manda PNGs para o ffmpeg; `--workers N` divide os quadros em segmentos que começam em IDR e são concatenados sem reencode. `--crf` muda a qualidade (23 mantém o arquivo abaixo de 30 MB; pontos densos custam caro para o H.264). `scripts/soundtrack.mjs` — trilha em Node puro (vi–IV–I–V em Dó, pads, sub, pluck, bumbo a partir do gráfico, whooshes nos voos dos pontos, cliques de interface, Freeverb).
- Fontes: Instrument Serif e Inter (OFL) em `motion/fonts/`.
