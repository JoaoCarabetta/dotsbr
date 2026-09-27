# AGENTS.md

Instruções para agentes que trabalham neste repositório. Leia isto antes de editar código, dados ou documentação.

## O que é este projeto

**dotsbr** (repo `JoaoCarabetta/dotsbr`; checkout local ainda pode se chamar `dotmap`) é um mapa de densidade de pontos do Censo Demográfico 2022 (IBGE). Raça, renda do responsável e religião (amostra, área de ponderação) cobrem as 27 UFs; idade ao falecer existe no pipeline mas fica oculta na UI. A unidade do ponto muda por view e zoom. Religião não afina o recorte da cor no zoom.

Produto associado ao Escritório de Dados.

## Stack

| Camada | Tecnologia |
|---|---|
| Mapa / UI | HTML + MapLibre GL JS 4.7.1 + `pmtiles.js` (lógica hoje inline em `index.html`) |
| Servidor da página | `python3 scripts/serve.py` (stdlib + Range) ou Flask (`server.py`) — **uma porta**; os `.pmtiles` vêm da mesma origem |
| Tiles | PMTiles estático em `data/tiles/*.pmtiles` (HTTP Range; sem tileserver) |
| Pipeline de pontos | `makefiles.sh` (mapshaper, tippecanoe, tile-join) — **não** rode só para ver o mapa |
| Tratamento de dados | `notebooks/treat_2022.ipynb` (pandas, geopandas, geobr) |
| Python | 3.12+, gerenciado com `uv` (`pyproject.toml`) |
| Vídeo (exemplo) | Remotion 4 em `video/` — promo com PMTiles reais, flyTo Brasil→Rio, light-v10 opcional |
| Motion graphics | `motion/` — vídeo de 37s + 5 shorts verticais de eleição (`src/stories/`), pontos reais dos MBTiles em WebGL próprio, capturados quadro a quadro (playwright-core + ffmpeg), trilha sintetizada em Node; sem Remotion |

## Comandos locais

Um clone fresco **não** tem `data/`. Os MBTiles por zoom estão em `tiles/`. Junte-os em PMTiles antes de servir (`tile-join` usa `-f`, não `--force`; `--no-tile-size-limit` evita dropar o tile SP+MG de z7, ~508 KB vs limite padrão de 500 KB; a extensão `.pmtiles` escolhe o container):

```sh
mkdir -p data/tiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022.pmtiles tiles/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_income.pmtiles tiles/income/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_deaths.pmtiles tiles/deaths/*/*/tiles.mbtiles
tile-join -f --no-tile-size-limit -o data/tiles/censo2022_religion.pmtiles tiles/religion/*/*/tiles.mbtiles
python3 scripts/serve.py
```

A página fica em `http://localhost:8000` (`python3 scripts/serve.py --port 8001` se 8000 estiver ocupada). Os tiles vêm do mesmo host: `/data/tiles/censo2022.pmtiles` (Range GET / 206). Não use `python -m http.server`: alguns Python 3.12 ignoram `Range` e mandam o arquivo inteiro. **Não** gzipar o arquivo inteiro.

Sem restaurar arquivos extras: pontos funcionam; hover (`data/tiles/hover.pmtiles`) dá 404 até `python3 scripts/ibge_uf.py tiles`. Detalhes em `docs/local-setup.md`.

Público: https://carabetta.xyz/dotsbr/ (repo `carabetta.xyz`; o slug antigo `/dataviz/brazildots/` redireciona). Push em `main` ou `master` neste repo publica o `index.html`, o `og.html`, o `card.jpg` e os favicons (`.github/workflows/deploy.yml`). Nginx no `carabetta.xyz` entrega `og.html` ao user-agent do WhatsApp. O HTML pede `data/tiles/*.pmtiles` relativo à página; no VPS servir os arquivos como estáticos com `Accept-Ranges: bytes` e `gzip off` — o container tileserver-gl-light deixa de ser necessário. A CSP do site precisa de `worker-src 'self' blob:` (e `blob:` em `script-src` / `img-src`): sem isso o MapLibre 4.7 não decodifica tiles e o mapa em produção fica em branco. Detalhes em [`docs/deploy.md`](docs/deploy.md).

Não rode `./makefiles.sh` só para visualizar: exige UF (`./makefiles.sh RR`), precisa de GeoJSON que não está no git, e um run completo redesenha o z14 daquela UF a partir dos polígonos (caro) e refaz 3–13 desbastando o z14. Tiles de outras UFs não são apagados. Para refazer só zooms abaixo de 14 a partir do z14 versionado (sem GeoJSON; precisa de `tippecanoe`): `./makefiles.sh RR 3,4,5,6` ou `python3 scripts/dot_tiles.py thin race RR`. Loop nacional: `SKIP_TILE_JOIN=1` por UF e um `tile-join` no fim.

Dataset do zero (CSV nacional + `python3 scripts/build_municipality.py UF` + `python3 scripts/build_census_tract.py UF` + `./makefiles.sh UF`): ver `README.md`.

Servidor: `python3 scripts/serve.py` (Range em `.pmtiles`). Alternativa: `uv run python server.py`.

## Mapa de arquivos

- `docs/user-analytics.md` — Umami em produção (`analytics.carabetta.xyz`, site **dotsbr-prod**); loopback não envia eventos. Não há Google Analytics.
- `docs/video.md` — exemplo Remotion (`video/`): preview no Studio, o que é ilustração vs tiles.
- `docs/motion.md` — motion graphics de 37s e a série **Eleições 2026** (5 shorts com linha editorial de esquerda, sem citar candidato: cor, sotaque, corte, fé, imposto) (`motion/`): roteiro, fonte de cada número, retângulos e cruzamentos usados nas estatísticas, como gerar, por que as barras usam os percentuais oficiais e não a contagem de pontos.
- `motion/` — `scripts/extract.mjs` (MBTiles → `data/*.bin`, gitignored), `src/` (shader de pontos, câmera Mercator, beat sheet do vídeo principal em `story.js`, tipografia/chrome em `overlay.js`), `src/stories/` (uma story por vídeo, escolhida por `?story=` / `--story`; `main` = 37 s), `src/kit/` (câmera, LOD, máscara por região, componentes de texto/pins/régua/cartela compartilhados pelos shorts), `scripts/render.mjs` (Chromium headless → ffmpeg), `scripts/soundtrack.mjs` (trilha do principal) e `scripts/score.mjs --story X` (trilha de cada short a partir de `cues`), ambos sobre `scripts/synth.mjs`; `scripts/election_stats.mjs` e `scripts/cross_stats.mjs` (raça/religião × renda da vizinhança) imprimem os números citados nos shorts. Renders finais em `motion/renders/`. Independente de `video/`.
- `video/` — composições `Dotsbr` (1920×1080) e `DotsbrMobile` (1080×1920), ~20s: MapLibre + `censo2022.pmtiles`, flyTo Brasil→Rio (z11) via `jumpTo` por frame. Fundo light-v10 se `video/.env` tiver `REMOTION_MAPBOX_TOKEN` (não copie o token para o source). Precisa de `python3 scripts/serve.py` ou da URL pública. Detalhes em `docs/video.md`.
- `index.html` — UI, estilo, tags Open Graph / Twitter Card no `<head>` (preview do WhatsApp; tags no topo do head porque o crawler para cedo), favicon (`favicon.svg` / `.ico` / `apple-touch-icon.png`), tracker Umami só fora de localhost, botão **Compartilhar** (card 4:5 da câmera atual + pill do lugar + `navigator.share`), **um painel único** flutuante no desktop (story-first: h1 com a view, linha-herói `1 ponto = N` com estado de filtro, seletor, explainer, legenda com scroll próprio em telas baixas, e slot de stats fixado por **clique** — hover mantém o popup no cursor; clique vazio/✕/troca de view fecham o slot; a **busca é uma pill flutuante logo à direita do painel, alinhada ao topo**, `#desk-search`), rodapé fino, detalhes de hover e **toda** a lógica do mapa. O painel tem seletor **Raça / Renda / Religião** (**Óbitos existe no pipeline/tiles mas está oculto na UI** via `HIDDEN_VIEWS` em `index.html`; para reexibir, restaure o botão nos dois seletores e tire `deaths` do set). Religião é amostra (`P0410` × `P0111`, 10+); hover lê `aponds`, nunca setor. Basemap único: `light-v10` com labels só de cidade e bairro (`settlement-label` / `settlement-subdivision-label`; rua/POI/UF/país ficam off). A legenda e `1 ponto = N unidades` mudam por view. Cada linha da legenda (e os chips no mobile) mostra a **% do recorte visível** — soma dos polígonos de hover na tela (município abaixo de zoom 10, setor a partir de 10, APOND na Religião), independente do filtro; Renda usa a mediana da vizinhança × domicílios. Painel **dev** só em loopback (`localhost` / `127.0.0.1` / `::1` / `*.localhost`): botão no canto superior direito ou `D` / `` ` ``, `sessionStorage` `dotmap-dev-panel`; mostra unidades/ponto, centro, bbox, hover e fonte dos tiles; ferramentas de paleta aparecem só em Raça. Mapa full-bleed (`#map` 100vw/100vh, com fallback `100dvh`), sem header em barra nem rail esquerdo. Título: o `h1` do desktop e o título do sheet mobile carregam a view ativa — **dotsbr por Raça/Renda/Religião** (Óbitos oculto) — reescritos no switch; o `<title>` da página permanece só **dotsbr**. Cada view reescreve também o explainer. Rodapé slim em duas pontas: esquerda = créditos de dados/IBGE; direita = GitHub · Carabetta.xyz · ©. **Mobile (≤640px)**: gramática Waze — cards e rodapé do desktop somem e tudo vive em **um bottom sheet** (`.m-chrome`, estados peek/half/full por drag no header, pointer events + transform, `sessionStorage` `dotmap-sheet-state`, primeira visita abre em half). Peek mostra título + `1 ponto = N` + **Compartilhar** — o título do sheet (`#sheet-title`) carrega a view ativa (**dotsbr por Raça/Renda/Religião**, atualizado no switch; Óbitos oculto); half soma seletor de view + explainer; full soma legenda com linhas de 44px + solo e os **créditos** (não há rodapé mobile). A **busca fica fixa no topo da tela** (`#m-search-bar`, pill branca flutuante, safe-area-top; o geocoder único é re-parented para lá no mobile e volta à pill à direita do painel no desktop; o chip dev de localhost pode sobrepor a barra — não é parte do design). Sobre o mapa: **chip rail** de legenda (tap filtra, long-press = só); **sem** botões de zoom nem FAB no mobile (pinch faz o zoom; o NavigationControl fica `display:none` em ≤640px, atribuição Mapbox permanece). **Tap** no polígono mostra um card de stats **ancorado** acima do sheet (✕ ou tap no vazio fecha); tap com sheet aberto só o recolhe. Safe-areas via `env(safe-area-inset-*)` + `viewport-fit=cover`. Detalhes em `docs/docs.md`.
- `js/map.js` e `js/events.js` — arquivos vazios; não assumir que a lógica mora aí.
- `config.json` — relíquia do tileserver-gl; **não** é necessário para abrir o mapa.
- `makefiles.sh` — raça usa `tiles/{UF}/`; temas usam `tiles/{theme}/{UF}/`. Aceita `./makefiles.sh RR income` e `./makefiles.sh RR 3,4,5,6 deaths` / `religion`. Loop nacional: `./scripts/build_theme_pair.sh` (renda+óbitos) ou `./scripts/build_theme_uf.sh UF religion` com `xargs -P 2`, depois um `tile-join` por tema (saída nacional `.pmtiles`).
- `scripts/themes.py` — fontes, campos, categorias, unidades e escalas de raça/renda/óbitos/religião.
- `scripts/build_religion_apond.py` — amostra controlada (`P0111` × `P0410`, 10+) → `apond_religion.csv`; dasimétrico em setor; hover APOND. `expand` \| `<UF>` \| `all-geo` \| `hover`. Dissolve descarta malha sem `id_apond` (células de água). Não republicar `*_controlado.csv`.
- `scripts/build_municipality.py` — CSV nacional + malha municipal IBGE → `municipality_{UF}.geojson` (stdlib; sem geopandas).
- `scripts/build_census_tract.py` — CSV nacional + malha de setor IBGE por UF → `census_tract_{UF}.geojson`.
- `scripts/dot_tiles.py` — `audit <tema>` (participação de cada categoria e total implícito por zoom, lendo os MBTiles) e `thin <tema> [UF…] [zN…]` (refaz 3–13 como subconjuntos aleatórios aninhados do z14; stdlib + `tippecanoe`). Também serve `per-dot` e as flags de tippecanoe ao `makefiles.sh`.
- `scripts/serve.py` — servidor estático com HTTP Range (necessário para PMTiles).
- `scripts/ibge_uf.py` — códigos IBGE, download, merge do hover concatenado e `tiles` / `aponds` (PMTiles de hover, layer `aponds` na view Religião).
- `scripts/build_municipality_rj.py` — wrapper que chama `build_municipality.py RJ`.
- `notebooks/treat_2022.ipynb` — cruza microdados do censo com geometria de setores.
- `docs/docs.md` — zoom, densidade, schema demográfico, filtro na legenda, basemap **light-v10 com labels de cidade/bairro, sem satellite**, chrome (painel único top-left, busca à direita, bottom sheet no mobile, rodapé slim; sem rail/FAB/zoom no mobile), preview de link (Open Graph + `card.jpg` / `og.html`), botão Compartilhar (card 4:5 + pill do município + Web Share), ordem da legenda de raça parda → branca → preta → indígena → amarela, paleta de renda invertida (pobre vermelho → rico azul), Religião (APOND, `P0410`), Óbitos oculto na UI, painel dev localhost-only.
- `og.jpg` — crop legado 1200×630; o card do WhatsApp passou a ser `card.jpg`.
- `card.jpg` — JPEG 1200×630 sem EXIF/ICC para Open Graph / WhatsApp.
- `og.html` — documento mínimo de Open Graph; o nginx entrega isso ao crawler do WhatsApp.
- `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` — ícone da aba (cinco pontos nas cores do censo).
- `docs/dicionario-microdados.md` — dicionário dos **microdados da amostra** (acesso controlado, 4 registros, 330 variáveis). Não é o agregado por setor do mapa; menor geografia = área de ponderação. CSV irmão: `docs/dicionario-microdados.csv`.
- `docs/fontes.md` — URLs e caveats dos arquivos brutos do IBGE (agregados por setor + microdados da amostra).
- `docs/local-setup.md` — como juntar os tiles versionados e servir o mapa.
- `docs/deploy.md` — CI (`main`/`master` → prod) e o path público `/dotsbr/`.
- `docs/structure.md` — árvore do repositório.
- `.github/workflows/deploy.yml` — push de `index.html` / `og.html` / `card.jpg` / favicons em `main`/`master` → VPS `/dotsbr/`.
- `deploy.sh` — equivalente local (`index.html` + `og.html` + `card.jpg` + favicons); `./deploy.sh --tiles` sobe os PMTiles.
- `debugger.html` — visualizador OpenLayers legado (XYZ na :8080); não é o caminho do mapa.
- `tiles/` — MBTiles versionados por UF (`tiles/{UF}/zoomN-N/tiles.mbtiles`). Cobertura atual: todas as 27 UFs (AC–TO, inclusive MG e SP).
- `data/` — gitignored. GeoJSON e PMTiles nacionais mesclados não entram no git.
- `dots/`, `output/` — intermediários do pipeline; também gitignored.

## Dados e camadas do mapa

Categorias raciais (keys estáveis no código e nos tiles): `branca`, `preta`, `amarela`, `parda`, `indigena`. **Ordem de exibição** na legenda, chips e breakdowns (população decrescente, Censo 2022): **parda → branca → preta → indígena → amarela**. `RACE_KEYS` no HUD é só a ordem da paleta, não a da UI.

Cores atuais dos pontos:

| Categoria | Cor |
|---|---|
| branca | `#4daf4a` |
| preta | `#ff7f00` |
| amarela | `#377eb8` |
| parda | `#e41a1c` |
| indigena | `#984ea3` |

Religião (`P0410`, não reutilizar as cores de raça):

| Categoria | Cor |
|---|---|
| relig_catolica | `#2c7fb8` |
| relig_evangelica | `#e6550d` |
| relig_sem_religiao | `#737373` |
| relig_afro | `#756bb1` |
| relig_espirita | `#31a354` |
| relig_indigena | `#8c510a` |
| relig_outras | `#f768a1` |
| relig_sem_info | `#bdbdbd` |

Sources no mapa:

- `points` — PMTiles `censo2022.pmtiles` (`source-layer: points`), atributo `race`.
- `income-points` / `deaths-points` / `religion-points` — 27 UFs, atributo `cat`; layers `points-income` / `points-deaths` / `points-religion` (`censo2022_income.pmtiles` / `censo2022_deaths.pmtiles` / `censo2022_religion.pmtiles`). `points-deaths` não é adicionado no mapa enquanto Óbitos está oculto.
- `setores` — `hover.pmtiles` (`source-layer: setores`), zoom 10–12 (overzoom até 14). O GeoJSON nacional não entra no browser (trava no zoom alto).
- `municipios` — o mesmo `hover.pmtiles` (`source-layer: municipios`), zoom 3–9.
- `aponds` — o mesmo `hover.pmtiles` (`source-layer: aponds`), zoom 3–12; visível só na view Religião.

Atributos esperados nos GeoJSON de polígonos: `populacao`, `branca`, `preta`, `amarela`, `parda`, `indigena`; municípios também têm `municipio`, `id_municipio`, `sigla_uf`.

Basemap único: estilo Mapbox **light-v10** carregado via REST (`api.mapbox.com/styles/v1/mapbox/light-v10`) no MapLibre (**sem satellite**, sem toggle de estilo). Só `settlement-label` e `settlement-subdivision-label` ficam visíveis (cidade e bairro, `name_pt`); rua/POI/água/aeroporto/UF/país ficam `visibility: none`. fill/line/background ficam. Hover é `#202124`/8%; em touch, o **tap** no polígono dispara a mesma lógica (`map.on('click')` compartilha `updateHoverDetails` com o mousemove), mas no layout de celular o resultado vai para o card ancorado `#stats-dock` (não um popup sob o dedo) e tap no vazio fecha. Cores dos pontos são ColorBrewer Set1 permutadas (HUD test; contraste no light-v10): `branca` `#4daf4a`, `preta` `#ff7f00`, `amarela` `#377eb8`, `parda` `#e41a1c`, `indigena` `#984ea3`. HUD **Atual** / reset usa as mesmas; produção não carrega o HUD.

Zoom do mapa: `minZoom` 3 no construtor (MapLibre é inclusivo; o primeiro tileset de pontos é z=3), `maxZoom` 15 (atalho local Rio; tiles PBF param em 14). A câmera inicial é o Brasil inteiro: fallback `center [-51.9, -14.2]` / zoom 3.5 e, no `load`, `fitBounds` `[[-74, -34], [-32, 6]]`. Em viewports estreitos o fit cai abaixo de z3 e os pontos somem; nesses casos o zoom fica em 3 no mesmo centro. A source `points` declara `minzoom: 3` / `maxzoom: 14`. Scroll zoom está desligado; navegação pelo `NavigationControl` no canto inferior direito (`+/-`). Painel dev local: `1` Brasil, `2` Rio @ 15.

A escala da legenda (`1 ponto = N pessoas`) em `index.html` **bate com** `per_dot` em `scripts/themes.py` em 3–14 (4500 / 2000 / 900 / 400 / 150 / 120 / 90 / 70 / 50 / 35 / 25 / 20); `makefiles.sh` e `scripts/dot_tiles.py` leem de lá. Zoom 15 da câmera usa o N do z14 (20). Ao mudar densidade, atualize `themes.py`, a legenda (`peoplePerDot`) e `docs/docs.md` juntos e refaça 3–13 com `dot_tiles.py thin` (o z14 só precisa voltar aos polígonos se o `per_dot` do z14 mudar).

Renda nacional usa domicílios/ponto (1500 / 700 / 300 / 130 / 50 / 40 / 30 / 24 / 17 / 12 / 8 / 7) — cerca de 1/3 da escala de raça, para ~72,4M de domicílios renderizarem com a mesma densidade visual que ~202M de pessoas. Cor = faixa da mediana `V06006` (ColorBrewer RdBu invertido: **pobre = vermelho `#b2182b`**, **rico = azul `#2166ac`**; `income_sem_dado` `#777777`); quantidade = responsáveis/domicílios `V06001`. Não interpretar como renda individual ou per capita. Óbitos usa 200 / 100 / 50 / 25 / 12 / 10 / 8 / 6 / 4 / 3 / 2 / 1 e fica mais esparso de propósito (~3,63M de óbitos visíveis, ~1/56 da população); categorias etárias somam sexos e incluem `death_age_suppressed`, porque `X`/`.` não são zeros observados. Religião usa pessoas de 10+/ponto (3900 / 1750 / 790 / 350 / 130 / 105 / 80 / 60 / 44 / 31 / 22 / 18) — um pouco mais esparsa que raça porque o universo é ~pessoas 10+, não 202 M. A mistura é da APOND em todo zoom; todo zoom é subconjunto dos pontos por setor do z14, então nenhum zoom mistura APONDs.

Tiles gerados em `makefiles.sh` (não o hover): só o **z14** sai dos polígonos (`census_tract_*.geojson`, `per_dot` 20) com **arredondamento estocástico** dentro do mapshaper (`-each` com hash determinístico: um grupo que vale 0,3 ponto ganha um ponto 30% das vezes; o GeoJSON em disco mantém as contagens exatas porque o hover as lê). Os zooms **3–13** são subconjuntos aleatórios aninhados do z14 (`scripts/dot_tiles.py thin`, probabilidade `per_dot[14] / per_dot[z]`): sem viés por categoria nem por lugar, pontos sempre dentro do setor, e aproximar só acrescenta pontos. tippecanoe roda com `--no-feature-limit --no-tile-size-limit -x r` — nenhum tile descarta pontos. Isso corrigiu a subcontagem antiga: `mapshaper -dots` faz `Math.round(valor / per_dot)` por polígono e apagava grupos pequenos (z5 nacional: preta 4,5% dos pontos vs 10,2%), e o `--drop-fraction-as-needed` afinava tiles densos de metrópole (z7–9 perdiam ~10% das pessoas). Verificar com `python3 scripts/dot_tiles.py audit <tema>`. Zoom 15 da câmera só faz overzoom do z=14. Tabela completa em [`docs/docs.md`](docs/docs.md). Hover no mapa é outro corte (município < 10, setor ≥ 10; na view Religião, APOND em todo zoom). O z14 versionado ainda vem do `Math.round` antigo (raça a ≤0,1 pp do IBGE; **Religião ainda desenha menos os grupos pequenos no z14**) até o próximo rebuild a partir dos polígonos.

## Convenções

- Atualize `docs/` junto com qualquer feature, mudança de zoom/densidade, schema de dados ou comportamento de UI.
- Comentários no código explicam o **porquê**, não o óbvio.
- Implemente o pedido por completo; não deixe stubs, TODOs no lugar de código, nem extraia para `js/` sem mover de fato a lógica e atualizar o HTML.
- Não commitar `data/`, tiles intermediários, `.env` ou tokens. O token Mapbox hoje está inline em `index.html`; não espalhe em mais lugares e não o coloque em docs públicos novos.
- UI e copy do mapa em português (Brasil), jornalística: sem jargão ("mediana", "SM", "setor censitário", "área de ponderação") e sem "(IBGE)" nos textos correntes — a fonte oficial fica só nos créditos. O nome do produto é **dotsbr**; o `h1` do painel e o título do sheet mobile ganham o sufixo da view ativa (**por Raça / por Renda / por Religião**, reescrito no switch; **por Mortes** quando a view for reexibida), e o `<title>` da página fica só com o nome do produto. O explainer no painel é **Cada ponto é um grupo de pessoas. A cor mostra a raça que elas declararam no Censo de 2022. Quanto mais você aproxima o mapa, menos pessoas cada ponto representa.** (Religião: *estimada para um conjunto de vizinhanças*; outras views reescrevem a explicação e o sufixo, nunca o nome antes do "por"). Nomes de categoria racial no código ficam sem acento (`indigena`, `preta`) para bater com os tiles. Religião usa `relig_*` e `P0410`, não as 33 denominações de `P0411`.
- Preferir `uv` para Python. Não adicionar dependências sem necessidade.
- Mudanças de UI (layout, estado, rotas, dados renderizados) precisam ser verificadas no browser, não só por leitura de código.

## O que não fazer

- Não apagar `tiles/` ou `data/tiles/*.{mbtiles,pmtiles}` sem confirmação: regenerar é caro.
- Não tratar `docs/docs.md` e `TODO` como source of truth da densidade — o código em `makefiles.sh` e `index.html` é o que roda.
- Pontos cobrem as 27 UFs. A busca é nacional (Brasil, `countries: 'br'`, bbox alinhado à câmera `[-74, -34, -32, 6]`); CEP via BrasilAPI não filtra por UF. Hover no browser é `data/tiles/hover.pmtiles`, não o GeoJSON concatenado.
- Não inventar novas categorias raciais além das cinco do IBGE usadas aqui.
- Não commitar `*_controlado.csv` nem fingir resolução de setor na view Religião (mistura da APOND; hover = `aponds`).
