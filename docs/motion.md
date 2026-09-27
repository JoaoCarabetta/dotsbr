# Motion graphics do dotsbr (37 s + 5 shorts de eleição)

Pasta [`motion/`](../motion/). Vídeo do dotsbr feito do zero com os **pontos reais** dos MBTiles versionados em `tiles/`, desenhados em WebGL e capturados quadro a quadro no Chromium headless. Não usa Remotion nem MapLibre, e não substitui o exemplo antigo em `video/`.

Saídas (versionadas em `motion/renders/`):

| Arquivo | Formato |
|---|---|
| `dotsbr.mp4` | 1920×1080, 30 fps, H.264 em duas passagens + AAC 192k, ≤ 28,5 MiB |
| `dotsbr-vertical.mp4` | 1080×1920 (Reels/Shorts/TikTok), 30 fps, mesmo encode |

O teto de 28,5 MiB cabe nos limites de envio de chat/WhatsApp; `--target-mib` muda isso.

## Ritmo

A primeira versão tinha 15 s e não dava tempo de ler. Esta tem **37 s**: cada manchete fica ~5 s na tela (12 tempos), o voo até o Rio dura 3,6 s para dar para acompanhar, e o endereço fica ~3 s no fim. No vertical a tipografia é maior (sub de 39 px, legenda de 29 px), porque o 9:16 é visto num celular a ~1/3 do tamanho em pixels.

## Roteiro

Os cortes caem numa grade de 133⅓ BPM (tempo de 0,45 s) que começa na explosão, em 1,8 s; todo corte cai numa barra de 4 tempos. A trilha sai do mesmo `T` de `motion/src/story.js`, então som e imagem não se desalinham.

| Tempo | Cena | Dados |
|---|---|---|
| 0–1,8 s | Um ponto só: **1 ponto = 900 pessoas** | escala do z5 de raça |
| 1,8–5,4 s | O ponto explode em ~225 mil pontos e forma o Brasil; contador até **203.080.756** | `br_race_5` (todas as UFs) |
| 5,4–10,8 s | Os pontos saem do mapa e montam as barras: **parda 45,3 %, branca 43,5 %, preta 10,2 %, indígena 0,6 %, amarela 0,4 %** — “pela 1ª vez desde 1991, os pardos são o maior grupo” | percentuais **oficiais do IBGE** |
| 10,8–12,6 s | A busca do produto digita “Rio de Janeiro” | — |
| 12,6–16,2 s | Voo Brasil → Rio (curva de van Wijk, a mesma do `flyTo`), com inclinação de 30°; o chip **1 ponto = N** rola de 900 a 35 | z5 → z11 com crossfade por dither |
| 16,2–21,6 s | Raça no Rio: **Zona Sul, 3 em cada 4 brancos; Baixada Fluminense, 1 em cada 3** | `rio_race_11` |
| 21,6–27 s | Cursor troca a lente para **Renda**; frente de varredura: **renda típica acima de 5 salários mínimos na Zona Sul, até 2 na Baixada** | `rio_income_11` |
| 27–32,4 s | **Religião**: evangélicos **quase 4 em cada 10 na Zona Oeste, menos de 1 em cada 10 na Zona Sul** | `rio_religion_11` (amostra, mistura por área de ponderação) |
| 32,4–37 s | Os pontos do Rio escrevem **dotsbr**; “O Brasil em pontos · Censo 2022” e `carabetta.xyz/dotsbr` | `rio_race_11` |

### De onde vêm os números

- **Tiles**: o vídeo usa os tiles corrigidos (z3–13 são subconjuntos sem viés do z14; ver [`docs.md`](docs.md#why-zooms-are-thinned-from-z14-undercount-fix)). O mapa nacional do vídeo agora mostra a mesma proporção de preta, indígena e amarela que o site.
- **Nacionais** (203.080.756 e as cinco barras): Censo 2022, IBGE, cor ou raça. As barras usam uma subamostra dos pontos na proporção oficial; nos tiles corrigidos os pontos já batem com ela a ≤0,1 pp (indígena 0,5 %, amarela 0,3 % no z14).
- **Rio** (`npm run stats` → `scripts/rio_stats.mjs`, pontos do z12 dos tiles corrigidos) dentro de retângulos aproximados (“Zona Sul orla” = Botafogo a Leblon; “Baixada” = Caxias, Belford Roxo, São João de Meriti, Nilópolis e parte de Nova Iguaçu; “Zona Oeste” = Bangu a Santa Cruz). Os resultados foram arredondados para frações de propósito: Zona Sul 76 % branca, Baixada 31 %; Zona Sul 75 % dos domicílios em vizinhanças de 5+ salários mínimos, Baixada 94 % até 2; evangélicos 8 % na Zona Sul e 37 % na Zona Oeste.
- Renda é a renda típica do responsável na vizinhança (`V06006`), não renda individual. Religião vem da amostra (10+ anos) e não tem resolução de setor; os grupos grandes citados (evangélicos) não dependem do z14 de religião, que ainda desenha menos os grupos pequenos.

## Série Eleições 2026 (5 shorts verticais)

Cinco vídeos de ~28–32 s em 1080×1920 para divulgar o dotsbr na campanha de 2026 (1º turno em 4 de outubro). Cada um abre com uma frase que todo eleitor já ouviu de candidato e fecha com um dado do Censo que a contradiz ou complica. São **apartidários**: nenhum candidato, partido, número ou cor partidária; a “punchline” é sempre um fato do Censo sobre quem vota.

| Arquivo | Tema | Gancho → punchline | Dados |
|---|---|---|---|
| `dotsbr-povo-vertical.mp4` (27,8 s) | Raça | “Todo candidato fala em nome do *povo brasileiro*.” → pardos maior grupo pela 1ª vez desde 1991; com pretos, **55,5 %**; **mais de 7 em cada 10** no Norte e no Nordeste, pouco mais de 1 em cada 4 no Sul → “2026 é a primeira eleição geral desde que o Censo mostrou *esse Brasil*.” | `br_race_5`; barras com os percentuais oficiais |
| `dotsbr-duascores-vertical.mp4` (29,6 s) | Raça | “Em outubro, o Brasil vai virar um mapa de *duas cores*.” (silhueta preta) → revelação circular dos pontos; Sul **quase 3 em cada 4** brancos, Norte **2 em cada 3** pardos; voo até São Paulo, “a mistura muda de rua em rua” → “O Brasil não cabe em *duas cores*.” | `br_race_5/6`, `sp_race_7…11` |
| `dotsbr-bolso-vertical.mp4` (30,5 s) | Renda | “Todo candidato promete mexer no *seu bolso*.” → **3 em cada 4** lares onde a renda típica é de até 2 salários mínimos; só **4 em cada 100** onde passa de 5 (desenhados maiores para aparecerem); voo a Brasília: Plano Piloto **quase 9 em cada 10** acima de 5, Ceilândia **3 em cada 4** até 2 → régua “Da Esplanada dos Ministérios a Ceilândia: *26 km*. E outro Brasil.” | `br_income_5/6`, `df_income_7…11` |
| `dotsbr-fe-vertical.mp4` (30,3 s) | Religião | “Todo candidato quer o *voto evangélico*.” → evangélicos **mais de 1 em cada 4** (10+ anos); Norte **quase 4 em cada 10**, Nordeste pouco mais de 2; no Rio, Campo Grande e Santa Cruz **quase 4 em cada 10**, Copacabana a Leblon **menos de 1 em cada 10** → “Não é um bloco. *É um mapa.*” | `br_religion_5/6`, `rio_religion_7…11` |
| `dotsbr-seuestado-vertical.mp4` (32 s) | Raça | “Em outubro, você também escolhe quem governa *o seu estado*. Você conhece quem mora nele?” → cartelas por capital: Manaus **7 em cada 10** pardos; Salvador **1 em cada 3** pretos (país: 1 em 10); São Paulo **mais da metade** brancos; Porto Alegre **quase 3 em cada 4** brancos e 1 em cada 8 pretos → cartela “Brasil · 27 estados · 5.570 municípios”, “E você está em *um desses pontos*.” | `br_race_5`, `{manaus,salvador,sp,poa}_race_10/11` |

Todos terminam com os pontos escrevendo **dotsbr**, “Veja o seu bairro no mapa” e `carabetta.xyz/dotsbr`. O terço de baixo do quadro (~300 px) fica livre para a interface do Reels/Shorts/TikTok.

### Números dos shorts

`node scripts/election_stats.mjs` (tiles corrigidos; ~40 s) imprime todos:

- **Regiões** (z14, sem viés): pretos + pardos 76,3 % no Norte e 72,7 % no Nordeste, 26,8 % no Sul; brancos 72,8 % no Sul; pardos 67,4 % no Norte. Evangélicos 27,5 % no Brasil, 37,6 % no Norte, 22,9 % no Nordeste. Renda típica até 2 SM: 76,1 % dos domicílios; 5 SM ou mais: 4,0 %.
- **Lugares** (z12, retângulos aproximados em `election_stats.mjs`): Manaus 69,7 % pardos; Salvador 34,2 % pretos; São Paulo 53,8 % brancos (retângulo ≈ município — só o centro daria 61 %, por isso a copy diz “mais da metade”); Porto Alegre 74,7 % brancos e 12,3 % pretos; Plano Piloto 86,1 % em 5+ SM; Ceilândia 74,7 % até 2 SM; Campo Grande + Santa Cruz 39,3 % evangélicos; Copacabana a Leblon 7,8 %.
- **Distância**: Esplanada dos Ministérios (-47,8645, -15,7997) → centro de Ceilândia (-48,108, -15,82) ≈ 26 km em linha reta.
- A copy arredonda para frações conservadoras (“quase”, “mais de”, “pouco mais de”). Religião é estimada para conjuntos de bairros (área de ponderação); o vídeo diz isso e não cita rua.

### Como os shorts são montados

- `src/main.js` carrega `src/stories/<nome>.js` pelo `?story=` (padrão `main`, o vídeo de 37 s). Uma story exporta `duration`, `datasets`, `layout`, `camera(t)`, `land(t, cam)`, `layers(t, L, cam)`, `targets()`, `overlay()` e `cues`.
- `src/kit/` — peças comuns: `scene.js` (UFs e regiões, paletas, `lod()` com crossfade entre zooms, `fly`/`drift`/`blend`, máscara por região via `ufAlpha`, `landAtZoom` que apaga a costa grosseira sobre baías), `targets.js` (explosão, barras, logotipo), `ui.js` (blocos de texto, pins, legenda, régua, cartela de cidade, outro), `shorts.js` (ponto-gancho em Brasília, explosão, logotipo, chrome).
- O shader ganhou `u_ufAlpha[27]` (acender uma região) e `u_reveal` (revelação circular); `drawLand` aceita uma silhueta sólida com um furo que cresce.
- `scripts/score.mjs --story X` gera `out/soundtrack-X.wav` a partir de `cues`: tom e progressão (algarismos romanos em menor natural, um acorde por barra), seções (bateria 0–3, arpejo 0/2/4 notas por tempo) e hits (`hook`, `burst`, `whoosh`, `tick`, `riser`, `crash`, `outro`). Cada short tem seu andamento e tom: povo 120 BPM em Lá, duascores 128 em Ré, bolso 133⅓ em Mi, fé 110 em Fá#, seuestado 140 em Dó. Os instrumentos moram em `scripts/synth.mjs`, compartilhado com `soundtrack.mjs` (a trilha do vídeo principal sai idêntica byte a byte).

## Como gerar

Requer Node 20+, um Chromium (padrão: `/opt/pw-browsers/chromium_headless_shell-1194/...`; troque com `CHROME=`) e um `ffmpeg` com libx264 (`FFMPEG=`; o wheel `imageio-ffmpeg` do PyPI traz um).

```sh
cd motion
npm i
npm run data              # tiles/**/*.mbtiles → motion/data/*.bin (~30 s, gitignored)
npm run sound             # out/soundtrack.wav (síntese, sem samples)
npm run render            # out/dotsbr.mp4 (2 workers, ≤ 28,5 MiB; minutos em 4 CPUs, SwiftShader)
npm run render:vertical   # out/dotsbr-vertical.mp4
npm run stills            # PNGs em out/stills/ para revisar
npm run render:shorts     # os 5 shorts: trilha (score.mjs) + render vertical ≤ 28,5 MiB cada
```

Um short só: `node scripts/score.mjs --story fe && node scripts/render.mjs --story fe --w 1080 --h 1920 --workers 2 --target-mib 28.5` → `out/dotsbr-fe-vertical.mp4`. Stills: `node scripts/render.mjs --story fe --w 1080 --h 1920 --stills 3,10,20`.

Chamando `node scripts/render.mjs` sem `--target-mib`, o render é uma passagem em `--crf` (padrão 23; arquivos maiores). `--fps 60` dobra os quadros.

Preview ao vivo com scrubber: `python3 scripts/serve.py` na raiz e abra `http://localhost:8000/motion/` (espaço = play/pause, setas = quadro a quadro, `?w=1080&h=1920` para o vertical, `?t=18` para abrir num instante, `?story=bolso&w=1080&h=1920` para um short).

## Como funciona

- `scripts/extract.mjs` — lê os MBTiles por UF e zoom, descarta as cópias de buffer (coordenadas fora de `[0, extent)`), embaralha com semente fixa e grava posições Mercator relativas a uma origem (float32 com precisão sub-pixel até z13) + categoria + UF. Os recortes por zoom cobrem só o que a câmera vê naquele nível. Também exporta a silhueta Natural Earth 1:50m (`world-atlas`) usada só no zoom nacional.
- `src/dots.js` — um único shader de pontos. Explosão, barras, varredura entre lentes, crossfade de zoom (cada ponto tem um limiar próprio, então níveis entram e saem ponto a ponto) e o logotipo são uniforms; cada quadro é função pura do tempo.
- `src/camera.js` — câmera Web Mercator com as convenções do MapLibre (tiles de 512 px, fov 36,87°, pitch/bearing) e ponto de fuga deslocável, como o `padding`.
- `src/story.js` — beat sheet, câmera, camadas e alvos dos morphs do vídeo principal; `src/stories/main.js` o adapta ao formato de story. `src/overlay.js` — tipografia cinética e o chrome do produto (busca, chip `1 ponto = N`, seletor Raça/Renda/Religião, pins); os helpers de tipografia ficam em `src/kit/type.js`.
- `scripts/render.mjs` — serve `motion/`, chama `window.renderFrame(t)`, captura via CDP (`optimizeForSpeed`) e manda PNGs para o ffmpeg; `--workers N` divide os quadros em segmentos que começam em IDR e são concatenados sem reencode. Com `--target-mib`, os segmentos saem quase sem perda (CRF 8) e o arquivo final é codificado em duas passagens no bitrate que cabe no tamanho pedido — pontos densos custam caro para o H.264, então só CRF não garante tamanho.
- `scripts/soundtrack.mjs` — trilha em Node puro: vi–IV–I–V em Dó, um acorde por barra (o pouso no Rio cai em Lá menor e a marca resolve em Dó), pads, sub, pluck, bumbo em meio tempo durante a leitura do gráfico e da busca, quatro no chão a partir do voo, palmas no Rio, whooshes nos voos dos pontos, cliques de interface, Freeverb. Os instrumentos e a mixagem estão em `scripts/synth.mjs`.
- Fontes: Instrument Serif e Inter (OFL) em `motion/fonts/`.
