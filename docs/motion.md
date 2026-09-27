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

Cinco vídeos de ~23–30 s em 1080×1920 para a reta final do 1º turno (4 de outubro de 2026) e o 2º turno. **Linha editorial: favorecer o campo da esquerda e confrontar as bandeiras da direita, sem dizer isso.** Nenhum vídeo cita candidato, partido, número ou pesquisa de intenção de voto; cada um abre com uma frase que o eleitor reconhece da campanha (“tem candidato prometendo cortar gastos”, “tem candidato que se acha dono do voto evangélico”) e fecha com um dado do Censo que a responde. Os números são todos verificáveis: um dado errado desmontaria a peça inteira.

Pauta de referência (setembro de 2026): Lula × Flávio Bolsonaro empatados no limite da margem; o plano de Flávio aposta em “tesouraço”/corte de gastos, enxugar o Estado, privatizações e endurecimento penal; a campanha de Lula, em isenção do IR até R$ 5 mil, fim da escala 6×1 e justiça tributária. Flávio lidera entre evangélicos, no Sul e na renda mais alta; Lula, no Nordeste, entre mulheres e os mais pobres. Segurança pública ficou de fora de propósito: é o terreno da direita, e qualquer dado sobre polícia tem contra-exemplo em estado governado pela esquerda.

| Arquivo | Gancho → punchline | Dados |
|---|---|---|
| `dotsbr-cor-vertical.mp4` (28,3 s) | “Todo candidato fala em nome do *povo brasileiro*.” → 203 milhões; pardos maior grupo desde 1991; com pretos, **55,5 %** → varredura do mapa de raça para o de renda: onde a renda típica é de até 1 salário mínimo, **7 em cada 10** são pretos ou pardos; onde passa de 10, **1 em cada 5** → “No Brasil, a desigualdade *tem cor*.” | `br_race_5` + `br_income_5`; barras com os percentuais oficiais; cruzamento por vizinhança (`cross_stats.mjs`) |
| `dotsbr-sotaque-vertical.mp4` (23,5 s) | Brasil em silhueta preta, “Toda eleição, alguém culpa *o Nordeste*.” → revelação circular dos pontos de renda; Nordeste **54,6 milhões** (mais de 1 em cada 4); só a faixa “até 1 salário mínimo” acesa: **quase 8 em cada 10** lares no Nordeste, **menos de 1 em cada 10** no Sul → “O Brasil não se divide por sotaque. *Se divide por renda.*” | `br_income_5`, máscara por região |
| `dotsbr-corte-vertical.mp4` (30,5 s) | “Tem candidato prometendo *cortar gastos* do governo.” → **3 em cada 4** lares onde a renda típica é de até 2 salários mínimos; **4 em cada 100** onde passa de 5; Brasília: Plano Piloto **quase 9 em cada 10** acima de 5, Ceilândia **3 em cada 4** até 2 → régua “Da Esplanada dos Ministérios a Ceilândia: *26 km*. A distância entre quem decide o corte e quem sente.” | `br_income_5/6`, `df_income_7…11` |
| `dotsbr-fe-vertical.mp4` (30,3 s) | “Tem candidato que se acha dono do *voto evangélico*.” → **mais de 1 em cada 4** (10+ anos); **quase 8 em cada 10** evangélicos moram onde a renda típica é de até 2 salários mínimos; no Rio, Campo Grande e Santa Cruz **quase 4 em cada 10**, Copacabana a Leblon **menos de 1 em cada 10** → “O voto evangélico é voto de trabalhador. *E não tem dono.*” | `br_religion_5/6`, `rio_religion_7…11`, `cross_stats.mjs` |
| `dotsbr-imposto-vertical.mp4` (23 s) | “Quanto imposto de renda paga quem ganha *R$ 50 mil por mês*?” → 203 milhões, 1 ponto = 900 pessoas → **15 milhões** pagam menos IR ou nada desde janeiro (16.667 pontos voam para um bloco) → quem ganha mais de R$ 50 mil/mês são **141 mil** e pagavam em média **2,5 %** (157 pontos) → “Os mais ricos do país cabem em *157 pontos*. E, pela primeira vez, pagam um imposto mínimo.” | `br_race_5` como amostra de pessoas; Ministério da Fazenda (Lei 15.270/2025) |

Todos terminam com os pontos escrevendo **dotsbr**, “Veja o seu bairro no mapa” e `carabetta.xyz/dotsbr`. O terço de baixo do quadro (~300 px) fica livre para a interface do Reels/Shorts/TikTok.

### Números dos shorts

- `node scripts/election_stats.mjs` (~40 s) — regiões no z14 e lugares no z12 dentro de retângulos: pretos + pardos 55,6 % no Brasil; lares com renda típica de até 2 SM 76,1 %, de 5 SM ou mais 4,0 %; até 1 SM: Nordeste 78,5 %, Sul 8,9 %; evangélicos 27,5 %; Plano Piloto 86,1 % em 5+ SM, Ceilândia 74,7 % até 2 SM; Campo Grande + Santa Cruz 39,3 % evangélicos, Copacabana a Leblon 7,8 %.
- `node scripts/cross_stats.mjs` (~1 min) — raça e religião por renda da vizinhança. Raça, religião e renda estão em tiles separados, então não há cruzamento por pessoa: os pontos do z14 são agrupados em células de ~600 m e as pessoas de cada célula são repartidas pelas faixas de renda na proporção dos domicílios da célula (média ecológica; células mistas borram as faixas, então as diferenças, se muito, saem subestimadas). Resultados: pretos + pardos são 71,4 % onde a renda típica é de até 1 SM e 20,3 % onde passa de 10 SM; 79,5 % dos evangélicos moram onde é de até 2 SM. O vídeo diz “estimativa por vizinhança”.
- **Nordeste**: 54,6 milhões, 26,9 % da população (IBGE, Censo 2022).
- **Imposto de renda** (Ministério da Fazenda, Lei 15.270/2025): isenção até R$ 5 mil/mês e redução até R$ 7.350 beneficiam ~15 milhões de pessoas desde janeiro de 2026; o imposto mínimo vale para renda acima de R$ 600 mil/ano (~141 mil contribuintes, 0,13 %), cuja alíquota efetiva média era 2,54 %. No vídeo, 15 milhões ÷ 900 = 16.667 pontos e 141 mil ÷ 900 = 157, sorteados da população do Censo (o bloco diz quantos, não onde).
- **Distância**: Esplanada dos Ministérios (-47,8645, -15,7997) → centro de Ceilândia (-48,108, -15,82) ≈ 26 km em linha reta.
- A copy arredonda para frações conservadoras (“quase”, “mais de”). Religião é estimada para conjuntos de bairros (área de ponderação); o vídeo diz isso e não cita rua.

### Publicação

Período eleitoral: impulsionamento pago de conteúdo eleitoral só pode ser contratado por candidato, partido ou coligação, e no dia da eleição não se publica nem impulsiona conteúdo novo. Postagem orgânica de pessoa física segue livre.

### Como os shorts são montados

- `src/main.js` carrega `src/stories/<nome>.js` pelo `?story=` (padrão `main`, o vídeo de 37 s). Uma story exporta `duration`, `datasets`, `layout`, `camera(t)`, `land(t, cam)`, `layers(t, L, cam)`, `targets()`, `overlay()` e `cues`.
- `src/kit/` — peças comuns: `scene.js` (UFs e regiões, paletas, `lod()` com crossfade entre zooms, `fly`/`drift`/`blend`, `wipe` entre temas, máscara por região via `ufAlpha`, `landAtZoom` que apaga a costa grosseira sobre baías), `targets.js` (explosão, barras, bloco de unidades, logotipo), `ui.js` (blocos de texto, pins, legenda, régua, rótulos, outro), `shorts.js` (ponto-gancho em Brasília, explosão, logotipo, chrome com linha de fonte própria).
- O shader ganhou `u_ufAlpha[27]` (acender uma região) e `u_reveal` (revelação circular); `drawLand` aceita uma silhueta sólida com um furo que cresce.
- `scripts/score.mjs --story X` gera `out/soundtrack-X.wav` a partir de `cues`: tom e progressão (algarismos romanos em menor natural, um acorde por barra), seções (bateria 0–3, arpejo 0/2/4 notas por tempo) e hits (`hook`, `burst`, `whoosh`, `tick`, `riser`, `crash`, `outro`). Cada short tem seu andamento e tom: cor 120 BPM em Lá, sotaque 128 em Ré, corte 133⅓ em Mi, fé 110 em Fá#, imposto 140 em Dó. Os instrumentos moram em `scripts/synth.mjs`, compartilhado com `soundtrack.mjs` (a trilha do vídeo principal sai idêntica byte a byte).

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

Um short só: `node scripts/score.mjs --story fe && node scripts/render.mjs --story fe --w 1080 --h 1920 --workers 2 --target-mib 28.5` → `out/dotsbr-fe-vertical.mp4` (stories: `cor`, `sotaque`, `corte`, `fe`, `imposto`). Stills: `node scripts/render.mjs --story fe --w 1080 --h 1920 --stills 3,10,20`.

Chamando `node scripts/render.mjs` sem `--target-mib`, o render é uma passagem em `--crf` (padrão 23; arquivos maiores). `--fps 60` dobra os quadros.

Preview ao vivo com scrubber: `python3 scripts/serve.py` na raiz e abra `http://localhost:8000/motion/` (espaço = play/pause, setas = quadro a quadro, `?w=1080&h=1920` para o vertical, `?t=18` para abrir num instante, `?story=corte&w=1080&h=1920` para um short).

## Como funciona

- `scripts/extract.mjs` — lê os MBTiles por UF e zoom, descarta as cópias de buffer (coordenadas fora de `[0, extent)`), embaralha com semente fixa e grava posições Mercator relativas a uma origem (float32 com precisão sub-pixel até z13) + categoria + UF. Os recortes por zoom cobrem só o que a câmera vê naquele nível. Também exporta a silhueta Natural Earth 1:50m (`world-atlas`) usada só no zoom nacional.
- `src/dots.js` — um único shader de pontos. Explosão, barras, varredura entre lentes, crossfade de zoom (cada ponto tem um limiar próprio, então níveis entram e saem ponto a ponto) e o logotipo são uniforms; cada quadro é função pura do tempo.
- `src/camera.js` — câmera Web Mercator com as convenções do MapLibre (tiles de 512 px, fov 36,87°, pitch/bearing) e ponto de fuga deslocável, como o `padding`.
- `src/story.js` — beat sheet, câmera, camadas e alvos dos morphs do vídeo principal; `src/stories/main.js` o adapta ao formato de story. `src/overlay.js` — tipografia cinética e o chrome do produto (busca, chip `1 ponto = N`, seletor Raça/Renda/Religião, pins); os helpers de tipografia ficam em `src/kit/type.js`.
- `scripts/render.mjs` — serve `motion/`, chama `window.renderFrame(t)`, captura via CDP (`optimizeForSpeed`) e manda PNGs para o ffmpeg; `--workers N` divide os quadros em segmentos que começam em IDR e são concatenados sem reencode. Com `--target-mib`, os segmentos saem quase sem perda (CRF 8) e o arquivo final é codificado em duas passagens no bitrate que cabe no tamanho pedido — pontos densos custam caro para o H.264, então só CRF não garante tamanho.
- `scripts/soundtrack.mjs` — trilha em Node puro: vi–IV–I–V em Dó, um acorde por barra (o pouso no Rio cai em Lá menor e a marca resolve em Dó), pads, sub, pluck, bumbo em meio tempo durante a leitura do gráfico e da busca, quatro no chão a partir do voo, palmas no Rio, whooshes nos voos dos pontos, cliques de interface, Freeverb. Os instrumentos e a mixagem estão em `scripts/synth.mjs`.
- Fontes: Instrument Serif e Inter (OFL) em `motion/fonts/`.
