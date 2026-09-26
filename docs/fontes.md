# Sources

Log of census files used by this project. Raw downloads stay under `data/` (gitignored).

## Censo 2022 — cor ou raça por setor (universo)

- **Official name:** Agregados por Setores Censitários — Pessoas, Cor ou Raça (resultados do universo)
- **URL:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_cor_ou_raca_BR.zip
- **Downloaded:** 2026-09-01
- **Local path:** `data/censo2022/raw/Agregados_por_setores_cor_ou_raca_BR.csv` (zip kept beside it)
- **Format:** CSV, `;` delimiter, quoted headers, `latin-1`
- **Grain:** one row = one setor censitário (`CD_SETOR`)
- **Coverage:** 458,772 setores (IBGE malha has ~468,097; missing rows are setores with no people in this table). National race sums with `X`→0: 202,321,691 people. Official 2022 total is ~203.1M; the gap is IBGE suppression (`X`), not a download error.
- **Race columns (same keys as the current map):** `V01317` branca, `V01318` preta, `V01319` amarela, `V01320` parda, `V01321` indígena
- **License / republication:** IBGE public statistical data; cite IBGE / Censo Demográfico 2022
- **Caveats:** `X` is a confidentiality mark, not a true zero. The notebook currently replaces `X` with `0` so dots can be generated. That undercounts small groups (especially amarela and indígena).

## Dictionary

- **Official name:** Dicionário de dados — Agregados por Setores Censitários 2022
- **URL:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx
- **Downloaded:** 2026-09-01
- **Local path:** `data/censo2022/raw/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx`

## Censo 2022 — renda do responsável por setor (universo)

- **Official name:** Agregados por Setores Censitários — Rendimento do Responsável
- **URL:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip
- **Local CSV:** `data/censo2022/raw/Agregados_por_setores_renda_responsavel_BR_20260508.csv`
- **Grain:** one row per setor (`CD_SETOR`); 458,772 rows nationally.
- **Fields used:** `V06001` responsible persons in occupied permanent private households; `V06004` mean nominal monthly income among responsible persons with income; `V06006` median.
- **Map interpretation:** dot quantity represents households via `V06001`; every dot in a setor receives the setor's `V06006` class. It does not reconstruct each household's income.
- **Bins:** fixed multiples of the 2022 minimum wage (R$ 1,212): up to 1, 1–2, 2–3, 3–5, 5–10, over 10; unavailable median is separate.
- **Coverage in this repo:** income dots for all 27 UFs.

## Censo 2022 — óbitos por setor (universo)

- **URL:** https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_obitos_BR.zip
- **Local CSV:** `data/censo2022/raw/Agregados_por_setores_obitos_BR.csv`
- **Period:** January 2019 through July 2022.
- **Categories:** age at death `0–14`, `15–29`, `30–59`, `60+`; male and female columns are summed and gender is not exposed.
- **Suppression:** age cells are heavily suppressed. Nationally, visible sex totals contain about 3.63M deaths, while about 1.91M have visible detailed ages. The residual is mapped as **Idade suprimida**, not zero.
- **Limitations:** no cause of death and no race of the deceased. Race columns in this theme refer to the household responsible person.
- **Coverage in this repo:** mortality dots for all 27 UFs.

## Malha municipal 2022 — por UF (polígonos de hover)

- **Official name:** Malha Municipal Digital 2022 — municípios por UF
- **URL pattern:** `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/{UF}/{UF}_Municipios_2022.zip`
- **Used by:** `scripts/build_municipality.py` (hover polygons z3–9; dots at every zoom come from setores)
- **Fields used:** `CD_MUN` → `id_municipio`, `NM_MUN` → `municipio`, `SIGLA_UF` → `sigla_uf`
- **Built so far:** all 27 UFs

## Malha de setores 2022 — por UF (polígonos para dots 3–14)

- **Official name:** Malha de Setores Censitários 2022 (oficial, não a preliminar)
- **URL pattern:** `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/shp/UF/{UF}_setores_CD2022.zip`
- **Used by:** `scripts/build_census_tract.py` (join on `CD_SETOR`; input for the z14 dots, which z3–13 are thinned from)
- **Why per-UF:** the national `BR_setores_CD2022.gpkg` is ~1.4 GB and is not downloaded
- **Join caveat:** malha has more setores than the race table (empty / no-people cells). Unmatched polygons get zero dots. All 27 UFs are built.

## Censo 2022 — microdados da amostra (acesso controlado)

- **Official name:** Microdados da amostra do Censo Demográfico 2022 — acesso controlado
- **Downloaded:** 2026-09-08 (folder timestamp `20260908_231350`)
- **Local path:** `~/Downloads/microdados_censo_amostra_2022_csv_20260908_231350/{UF}/` — four CSVs per UF (`Domicilios`, `Pessoas`, `Familia`, `Mortalidade`), suffix `_controlado`
- **Format:** CSV, `;` delimiter (not comma), `latin-1`
- **Grain:** one household / person / family / death in the long-form sample. National file counts in this download: 7,689,963 households, 21,539,579 people, 6,550,293 families, 430,965 deaths. These are sample rows; expand with the controlled weight (`D0111` / `P0111` / `F0111` / `M0111`).
- **Finest geography:** weighting area (`D0090` / `P0090` / `F0090` / `M0090`). There is **no** `CD_SETOR` in this release (setor is restricted-room only, `*0099`).
- **Join key:** household control `D0100` = `P0100` = `F0100` = `M0100`
- **Layout / concepts:** [acesso Controlado.xlsx](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Layout%20e%20dicion%C3%A1rio/Layout%20Microdados%20CD2022%20-%20acesso%20Controlado.xlsx) and [Dicionário de Variáveis PDF](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Layout%20e%20dicion%C3%A1rio/Dicion%C3%A1rio%20de%20Vari%C3%A1veis%20-%20Microdados%20CD2022.pdf)
- **Project dictionary:** [`dicionario-microdados.md`](dicionario-microdados.md) (human) and [`dicionario-microdados.csv`](dicionario-microdados.csv) (one row per variable)
- **License / republication:** controlled access (gov.br + termo). Files are traceable. Do not republish the raw microdata.
- **Caveats:** this is **not** the universe-by-setor file the map uses. A 50% subsample applies in 100% sampling-fraction setores, then weights are recalibrated. `MD*` / `MP*` / `MF*` / `MM*` are imputation flags. The `*011` suffix is the original (less collapsed) category; `*010` is the public-access collapse.

## Religião — amostra ponderada na área de ponderação

Religion is **not** on the basic questionnaire. There is no universe-by-setor file. The Religião view expands the controlled `Pessoas_*_controlado.csv` files.

- **Builder:** `python3 scripts/build_religion_apond.py expand` then `<UF>` / `all-geo`. `MICRODADOS_DIR` defaults to the Downloads folder above.
- **Weight / universe:** `sum(P0111)` by `P0090` × official group `P0410`. Blank `P0410` is under 10 years — not “sem religião”. Keep `MP0410 = 1` imputations.
- **Map classification:** the nine `P0410` codes; 8+9 merge into `relig_sem_info`. Do not put the 33 `P0411` denominations on the legend ([IBGE note](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Notas%20metodol%C3%B3gicas/Notas%20metodol%C3%B3gicas%2006-2026%20-%20Classifica%C3%A7%C3%A3o%20dos%20grupos%20de%20religi%C3%B5es%20adotada%20na%20divulga%C3%A7%C3%A3o%20dos%20microdados%20da%20amostra.pdf): Missão / pentecostal / indígena / “não determinada” are not comparable to 2010).
- **Suppression:** weighted cell &lt; ~400 or unweighted n &lt; 30 is not painted; hover says “estimativa instável”.
- **Dasymetric dots:** DePara setor→APOND + race `populacao` so dots sit on inhabited setor polygons, never sprayed across empty APOND interior. Same mix at every zoom.
- **Output (gitignored):** `data/censo2022/output/tiles/religion/apond_religion.csv` (~14k APOND rows). Do **not** commit `*_controlado.csv`.
- **Sanity check:** expander prints national shares vs the official sample (Católica 56.7%, Evangélicas 26.9%, Sem religião 9.3%). A small gap is the 50% subsample; a large one is a bug.
- **Malha APOND:** [APONDs2022 Geometrias](https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_areas_de_ponderacao/censo_demografico_2022/APONDs2022_Geometrias/) — hover dissolves setores by `id_apond` instead of downloading the 375 MB `Brasil.gpkg`. Cells with no `id_apond` (often water in the setor malha) are filtered out before dissolve so they do not become one leftover sea polygon.
- **DePara:** `https://geoftp.ibge.gov.br/recortes_para_fins_estatisticos/malha_de_areas_de_ponderacao/censo_demografico_2022/DePara_SetorCensit22xAPOND22/CSV/DePara_SetorCensit22xAPOND22_{code}_{UF}.csv` (`CD_SETOR`, `cd_apond`).
- **Tiles:** `tiles/religion/{UF}/` → `data/tiles/censo2022_religion.pmtiles`. Hover layer `aponds` on `hover.pmtiles` (`python3 scripts/ibge_uf.py aponds`).

## Not downloaded in this slice

- National setor malha (`BR_setores_CD2022.gpkg`, ~1.4 GB). Do not download it; use the per-UF SHP above.
- National APOND `Brasil.gpkg` (~375 MB). Hover dissolves setores; do not download it.
- Alfabetização and saneamento **universe** files (those themes exist on the **sample** microdata: `P0640`, `D0250`–`D0330`). Religião is sample-only (`P0410`); there is no universe-by-setor religion file.
- Public-access sample microdata (`*_publico`); this checkout has the controlled CSVs only. Do not republish them.

## Re-download

```sh
mkdir -p data/censo2022/raw
cd data/censo2022/raw
curl -fL -O https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_cor_ou_raca_BR.zip
curl -fL -O https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx
unzip -o Agregados_por_setores_cor_ou_raca_BR.zip
```
