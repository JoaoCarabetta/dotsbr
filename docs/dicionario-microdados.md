# Dicionário — microdados da amostra do Censo 2022

Catálogo das variáveis dos **microdados da amostra** (acesso **controlado**) baixados em 2026-09-08. Isto **não** é o arquivo de agregados por setor que o mapa usa (`Agregados_por_setores_*.csv`). A amostra não identifica o setor censitário: o recorte geográfico mais fino é a **área de ponderação**.

## Fonte oficial

| Campo | Valor |
|---|---|
| Nome | Microdados da amostra do Censo Demográfico 2022 — acesso controlado |
| Portal | [Documentação IBGE](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/) |
| Layout | [Layout Microdados CD2022 – acesso Controlado.xlsx](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Layout%20e%20dicion%C3%A1rio/Layout%20Microdados%20CD2022%20-%20acesso%20Controlado.xlsx) |
| Conceitos | [Dicionário de Variáveis – Microdados CD2022.pdf](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Layout%20e%20dicion%C3%A1rio/Dicion%C3%A1rio%20de%20Vari%C3%A1veis%20-%20Microdados%20CD2022.pdf) |
| Notas | [Notas metodológicas 05-2026](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Notas%20metodol%C3%B3gicas/Notas%20metodol%C3%B3gicas%2005-2026%20-%20Microdados%20da%20amostra%20do%20CD2022.pdf) · [confidencialidade 03-2026](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Microdados_e_Areas_de_Ponderacao/Documentacao/Notas%20metodol%C3%B3gicas/Notas%20metodol%C3%B3gicas%2003-2026%20-%20Controle%20estat%C3%ADstico%20de%20confidencialidade%20dos%20microdados%20do%20CD2022.pdf) |
| Cópia local | `~/Downloads/microdados_censo_amostra_2022_csv_20260908_231350/{UF}/` |
| Formato | CSV `;`, `latin-1`, um arquivo por UF e por registro |
| Data de referência | 31 de julho de 2022 (óbitos: jan/2019–jul/2022) |
| Acesso | controlado (gov.br + termo). Arquivos são rastreáveis. Não republicar o microdado bruto. |

## Como isto se relaciona com o mapa

O dotsbr desenha Raça, Renda e Óbitos a partir dos **agregados do universo** por setor. Religião **não existe** nesse agregado: a view Religião expande a amostra (`P0410` × `P0111`, 10+ anos) até a área de ponderação e só então posiciona pontos dentro dos setores dessa APOND. Os microdados também respondem a cruzamentos no nível da pessoa/domicílio (raça × renda individual, ocupação, deslocamento, deficiência) até a **área de ponderação**, nunca até o setor.

| Tema do mapa | Campo no agregado (setor) | Campo na amostra (pessoa/domicílio) |
|---|---|---|
| Raça | `V01317`–`V01321` | `P0210` (pessoa), `F0200` (responsável da família) |
| Renda | mediana do responsável `V06006` | `P1080` / `P1100` / `P1110` (pessoa); `D0350` / `D0360` (domicílio); `F0260` (família) |
| Óbitos | faixas etárias no setor | `M0151` (mês/ano), `M0160` (sexo), `M0171` (idade em anos) |
| Religião | *não há agregado por setor* | `P0410` (9 grupos oficiais) + peso `P0111`; branco = menos de 10 anos. Não usar `P0411` na legenda. |

A view Religião: `scripts/build_religion_apond.py` soma `P0111` por `P0090` × `P0410`, funde códigos 8+9 em Sem informação, suprime células finas (&lt;400 ponderado ou n&lt;30) e aloca a mistura da APOND nos polígonos de setor/cluster já usados pelo mapa. Hover lê o layer `aponds`, nunca o setor. Não republicar os `*_controlado.csv` — só o CSV agregado APOND×religião (gitignored em `data/`).

## Quatro registros

Contagem local dos CSVs `_controlado` (27 UFs): **7,689,963** domicílios, **6,550,293** famílias, **21,539,579** pessoas, **430,965** óbitos. São registros amostrais — qualquer total populacional precisa do peso.

| Registro | Arquivo | Grain | Chave | Peso | Geografia mais fina | Colunas no CSV |
|---|---|---|---|---|---|---:|
| Domicilios | `Domicilios_{UF}_controlado.csv` | um domicílio da amostra | `D0100` | `D0111` | `D0090` área de ponderação | 64 |
| Pessoas | `Pessoas_{UF}_controlado.csv` | uma pessoa moradora de um domicílio da amostra | `P0100 + P0101` | `P0111` | `P0090` área de ponderação | 210 |
| Familia | `Familia_{UF}_controlado.csv` | uma família (única ou convivente) em um domicílio da amostra | `F0100 + F0101` | `F0111` | `F0090` área de ponderação | 31 |
| Mortalidade | `Mortalidade_{UF}_controlado.csv` | uma pessoa falecida reportada no domicílio (jan/2019–jul/2022) | `M0100 + M0101` | `M0111` | `M0090` área de ponderação | 25 |

### Ligação entre arquivos

- `D0100` = `P0100` = `F0100` = `M0100`: identificador do domicílio (só dentro desta divulgação; não é endereço).
- Pessoa: `P0100` + `P0101` (ordem do morador).
- Família: `F0100` + `F0101` (ordem da família).
- Óbito: `M0100` + `M0101` (ordem da pessoa falecida).
- Peso de acesso controlado: `D0111` / `P0111` / `F0111` / `M0111`. Não use `*0110` (público) nem `*0112` (sala de sigilo) — não vêm neste CSV.
- Geografia compartilhada: Grande Região `*0010`, UF `*0020`, mesorregião `*0030`, microrregião `*0040`, RG intermediária `*0050`, RG imediata `*0060`, concentração urbana `*0070`, município `*0080`, área de ponderação `*0090`.
- `*0099` (setor) existe no dicionário conceitual do IBGE só para a **sala de sigilo**. Não está nestes CSVs.

## Regras que quebram análise se ignoradas

1. **Sem peso, o número está errado.** Cada linha é um caso amostral. Some `peso` para estimar o universo.
2. **Não é o universo do mapa.** Os agregados por setor cobrem todos os setores com gente. A amostra é um subconjunto de domicílios com questionário longo, depois tratado por confidencialidade.
3. **Não há `CD_SETOR`.** Não dá para pontilhar estes microdados no mesmo polígono de setor do mapa.
4. **Subamostra de 50%** em setores com fração amostral de 100%, com recalibração da área de ponderação. Totais da amostra controlada não batem 1:1 com as tabulações oficiais da amostra sem esse ajuste.
5. **Códigos `9` / `99` / branco** misturam *não se aplica*, *ignorado* e *suprimido por sigilo*. Leia a categoria no layout antes de tratar como missing.
6. **`MD*` / `MP*` / `MF*` / `MM*`** (prefixo `M` + letra do registro) são **marcas de imputação**: o valor da variável-mãe foi preenchido pelo IBGE, não declarado. `M0010`–`M0171` são o registro de mortalidade, não marcas. Filtre ou reporte a taxa de imputação em cruzamentos sensíveis.
7. **Par `xx10` vs `xx11`.** O sufixo `0` costuma ser a versão *restringida* (faixas / categorias colapsadas do acesso público). O sufixo `1` é a versão *original* liberada no acesso controlado (`P0181` idade em anos, `P0411` religião detalhada, `M0171` idade ao morrer).
8. **Encoding e delimitador.** Apesar do texto genérico do IBGE falar em vírgula, estes CSVs usam `;` e `latin-1`. Em RO, `P0210` (raça) aparece como 1, 4, 2, 3, 5; `D0111` (peso) é float, ex. 2.6576378614471, 2.4465639463599, 4.6451958771801.

## Contagem por UF

| Código | UF | Domicílios | Famílias | Pessoas | Óbitos |
|---:|---|---:|---:|---:|---:|
| 11 | RO | 60,461 | 51,935 | 170,240 | 2,772 |
| 12 | AC | 36,049 | 32,576 | 116,783 | 1,616 |
| 13 | AM | 98,377 | 102,858 | 389,199 | 5,749 |
| 14 | RR | 24,135 | 22,370 | 85,986 | 1,168 |
| 15 | PA | 249,992 | 236,716 | 833,378 | 12,973 |
| 16 | AP | 18,403 | 18,522 | 68,341 | 1,126 |
| 17 | TO | 93,447 | 80,483 | 274,941 | 4,753 |
| 21 | MA | 244,256 | 228,292 | 797,135 | 14,334 |
| 22 | PI | 166,500 | 150,843 | 500,931 | 10,279 |
| 23 | CE | 304,110 | 268,045 | 883,087 | 17,530 |
| 24 | RN | 152,368 | 135,508 | 440,132 | 9,117 |
| 25 | PB | 202,443 | 177,641 | 585,741 | 12,457 |
| 26 | PE | 320,267 | 275,243 | 912,267 | 18,595 |
| 27 | AL | 114,514 | 103,380 | 347,165 | 6,601 |
| 28 | SE | 92,393 | 79,059 | 261,720 | 4,915 |
| 29 | BA | 574,488 | 487,877 | 1,612,463 | 31,850 |
| 31 | MG | 954,632 | 791,195 | 2,582,000 | 53,401 |
| 32 | ES | 157,289 | 128,535 | 418,200 | 7,814 |
| 33 | RJ | 431,769 | 345,758 | 1,129,683 | 26,594 |
| 35 | SP | 1,376,934 | 1,148,813 | 3,716,773 | 78,485 |
| 41 | PR | 510,057 | 432,090 | 1,382,737 | 29,106 |
| 42 | SC | 350,018 | 299,603 | 947,947 | 16,780 |
| 43 | RS | 547,278 | 444,701 | 1,396,115 | 33,119 |
| 50 | MS | 107,533 | 90,728 | 303,624 | 5,663 |
| 51 | MT | 155,761 | 132,249 | 445,147 | 7,031 |
| 52 | GO | 295,465 | 243,176 | 796,342 | 14,982 |
| 53 | DF | 51,024 | 42,097 | 141,502 | 2,155 |
| | **BR** | **7,689,963** | **6,550,293** | **21,539,579** | **430,965** |

## Domicilios

Uma linha = um domicílio da amostra. CSV de RO tem **64** colunas; o layout controlado descreve **64**.

| Código | Nome | Tipo | Grupo | Categorias / notas |
|---|---|---|---|---|
| `D0010` | Grande Região | C | geografia | 1- Região Norte (uf=11 a 17)<br>2- Região Nordeste (uf=21 a 29)<br>3- Região Sudeste (uf=31 a 33 e 35)<br>4- Região Sul (uf=41 a 43)<br>5- Região Centro-oeste (uf=50 a 53) |
| `D0020` | Unidade da Federação | A | geografia | 11- Rondônia<br>12- Acre<br>13- Amazonas<br>14- Roraima<br>15- Pará<br>16- Amapá<br>17- Tocantins<br>21- Maranhão<br>22- Piauí<br>23- Ceará<br>24- Rio Grande do Norte<br>25- Paraíba<br>26- Pernambuco<br>27- Alagoas<br>28- Sergipe<br>29- Bahia<br>31- Minas Gerais<br>32- Espírito Santo<br>33- Rio de Janeiro<br>35- São Paulo<br>41- Paraná<br>42- Santa Catarina<br>43- Rio Grande do Sul<br>50- Mato Grosso do Sul<br>51- Mato Grosso<br>52- Goiás<br>53- Distrito Federal |
| `D0030` | Mesorregião | A | geografia | — |
| `D0040` | Microrregião | A | geografia | — |
| `D0050` | Região Geográfica Intermediária | A | geografia | — |
| `D0060` | Região Geográfica Imediata | A | geografia | — |
| `D0070` | Concentração urbana | A | geografia | — |
| `D0080` | Município | A | geografia | — |
| `D0090` | Área de Ponderação | A | geografia | — |
| `D0100` | Controle | N | identificação | — |
| `D0111` | Peso Amostral (Versão acesso Controlado) | N (dec=13) | peso | — |
| `D0120` | Situação do Setor | C | contexto do domicílio | 01  - Área urbana de alta densidade de edificações<br>02  - Área urbana de baixa densidade de edificações<br>03  - Núcleo urbano<br>05  - Povoado<br>06  - Núcleo rural<br>07  - Lugarejo<br>08  - Área rural (exclusive aglomerados) |
| `D0130` | Espécie da unidade visitada | C | contexto do domicílio | 01  - Domicílio particular permanente ocupado<br>05  - Domicílio particular improvisado ocupado<br>06  - Domicílio coletivo com morador |
| `D0140` | Situação do domicílio | C | contexto do domicílio | 1  - Urbana<br>2  - Rural |
| `D0150` | Moradores do domicílio, número | N | moradores e responsável | — |
| `D0160` | Crianças do domicílio, número | N | moradores e responsável | — |
| `D0170` | Sexo do morador responsável pelo domicílio | C | moradores e responsável | 1  - Masculino<br>2  - Feminino<br>9 - Ignorado |
| `D0171` | Sexo do morador responsável pelo domicílio | C | moradores e responsável | 1  - Masculino<br>2  - Feminino |
| `D0180` | Idade da pessoa responsável pelo domicílio, categoria | C | moradores e responsável | 01 - 0 a 4 anos<br>02 - 5 a 9 anos<br>03 - 10 a 14 anos<br>04 - 15 a 19 anos<br>05 - 20 a 24 anos<br>06 - 25 a 29 anos<br>07 - 30 a 34 anos<br>08 - 35 a 39 anos<br>09 - 40 a 44 anos<br>10 - 45 a 49 anos<br>11 - 50 a 54 anos<br>12 - 55 a 59 anos<br>13 - 60 a 64 anos<br>14 - 65 a 69 anos<br>15 - 70 a 74 anos<br>16 - 75 a 79 anos<br>17 - 80 anos ou mais<br>99 - Ignorado |
| `D0181` | Idade da pessoa responsável pelo domicílio | N | moradores e responsável | — |
| `D0190` | Condição de ocupação do domicílio, categoria | C | características do domicílio | 1  - Próprio de algum morador Já pago, herdado ou ganho<br>2  - Próprio de algum morador Ainda pagando<br>3  - Alugado<br>4  - Cedido ou emprestado Por empregador<br>5  - Cedido ou emprestado Por familiar<br>6  - Cedido ou emprestado Outra forma<br>7  - Outra condição<br>Branco |
| `D0200` | Tipo de espécie | C | características do domicílio | 11 - (Permanente ocupada) Casa<br>12 - (Permanente ocupada) Casa de vila ou em condomínio<br>13 - (Permanente ocupada) Apartamento<br>14 - (Permanente ocupada) Habitação em casa de cômodos ou cortiço<br>15 - (Permanente ocupada) Habitação indígena sem paredes ou maloca<br>16 - (Permanente ocupada) Estrutura residencial permanente degradada ou inacabada<br>51 - (Improvisado ocupada) Tenda ou barraca de lona, plástico ou Tecido ou estrutura improvisada em logradouro público<br>52 - (Improvisado ocupada) Dentro de estabelecimento em Funcionamento<br>53 - (Improvisado ocupada) Estrutura não residencial permanente degradada ou inacabada<br>54 - (Improvisado ocupada) Outros (veículos, abrigos naturais e outras estruturas improvisadas)<br>61 - (Coletivo com morador) Asilo ou outra instituição de longa permanência para idosos<br>62 - (Coletivo com morador) Hotel ou pensão<br>63 - (Coletivo com m… |
| `D0210` | Material das paredes do domicílio, categoria | C | características do domicílio | 1  - Alvenaria ou taipa COM revestimento<br>2  - Alvenaria SEM revestimento<br>3  - Taipa sem revestimento<br>4  - Madeira para construção<br>5  - Madeira aproveitada de tapume, embalagens, andaimes<br>6  - Outro material<br>7  - Sem parede<br>Branco |
| `D0220` | Cômodos no domicílio, número | N | características do domicílio | — |
| `D0230` | Cômodos servindo de dormitório no domicílio, número | N | características do domicílio | — |
| `D0240` | Número de moradores por cômodo utilizado como dormitório | N (dec=2) | características do domicílio | — |
| `D0250` | Tipo de esgotamento sanitário do domicílio | C | características do domicílio | 1 - Rede geral ou pluvial<br>2 - Fossa séptica ou fossa filtro Ligada à rede<br>3 - Fossa séptica ou fossa filtro Não ligada à rede<br>4 - Fossa rudimentar ou buraco<br>5 - Vala<br>6 - Rio, lago, córrego ou mar<br>7 - Outra forma<br>9 - Não tem banheiro nem sanitário<br>Branco |
| `D0260` | Abastecimento de água do domicílio, categoria | C | características do domicílio | 1  - Rede geral de distribuição<br>2  - Poço  Profundo ou artesiano<br>3  - Poço  Raso, freático ou cacimba<br>4  - Fonte, nascente ou mina<br>5  - Carro-pipa<br>6  - Água da chuva armazenada<br>7  - Rios, açudes, córregos, lagos e igarapés<br>8  - Outra<br>Branco |
| `D0270` | Existência de banheiro ou sanitário e número de banheiros de uso exclusivo do domicílio | C | características do domicílio | 1 - Tem banheiro de uso exclusivo do domicílio - 1 banheiro<br>2 - Tem banheiro de uso exclusivo do domicílio - 2 banheiros<br>3 - Tem banheiro de uso exclusivo do domicílio - 3 banheiros<br>4 - Tem banheiro de uso exclusivo do domicílio - 4 banheiros ou mais<br>5 - Apenas banheiro de uso comum a mais de um domicílio<br>6 - Apenas sanitário ou buraco para dejeções, inclusive os localizados no terreno<br>7 - Não tem banheiro nem sanitário<br>Branco |
| `D0280` | Banheiros de uso exclusivo com chuveiro e vaso sanitário no domicílio, inclusive os localizados no terreno, número | N | características do domicílio | — |
| `D0290` | Acesso à rede geral de distribuição de água do domicílio, categoria | C | características do domicílio | 1  - Sim<br>2  - Não<br>Branco |
| `D0300` | Existência de água canalizada do domicílio, categoria | C | características do domicílio | 1  - Encanada até dentro da casa, apartamento ou habitação<br>2  - Encanada, mas apenas no terreno<br>3  - Não chega encanada<br>Branco |
| `D0310` | Destino do lixo do domicílio, categoria | C | características do domicílio | 1  - Coletado no domicílio por serviço de limpeza<br>2  - Depositado em caçamba de serviço de limpeza<br>3  - Queimado na propriedade<br>4  - Enterrado na propriedade<br>5  - Jogado em terreno baldio, encosta ou área pública<br>6  - Outro destino<br>Branco |
| `D0320` | Existência de máquina de lavar roupa no domicílio, categoria | C | características do domicílio | 1  - Sim<br>2  - Não<br>Branco |
| `D0330` | Acesso à internet, existência | C | características do domicílio | 1  - Sim<br>2  - Não<br>Branco |
| `D0340` | Ocorrência de óbito de morador do domicílio (de janeiro de 2019 a julho de 2022), categoria | C | óbito no domicílio | 1  - Sim<br>2  - Não<br>9 - Ignorado<br>Branco |
| `D0350` | Rendimento domiciliar | N | rendimento | — |
| `D0360` | Rendimento domiciliar per capita | N (dec=2) | rendimento | — |
| `D0370` | Total de homens no domicílio | N | composição e deficiência | — |
| `D0380` | Total de mulheres no domicílio | N | composição e deficiência | — |
| `D0390` | Total de moradores com deficiência no domicílio | N | composição e deficiência | — |
| `D0400` | Total de moradores adultos com deficiência no domicílio | N | composição e deficiência | — |
| `D0410` | Total de moradores crianças com deficiência no domicílio | N | composição e deficiência | — |
| `MD0130` | MARCA DE IMPUTAÇÃO NA D0130 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0150` | MARCA DE IMPUTAÇÃO NA D0150 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0160` | MARCA DE IMPUTAÇÃO NA D0160 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0170` | MARCA DE IMPUTAÇÃO NA D0170 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0180` | MARCA DE IMPUTAÇÃO NA D0180 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0190` | MARCA DE IMPUTAÇÃO NA D0190 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0200` | MARCA DE IMPUTAÇÃO NA D0200 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MD0210` | MARCA DE IMPUTAÇÃO NA D0210 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0220` | MARCA DE IMPUTAÇÃO NA D0220 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0230` | MARCA DE IMPUTAÇÃO NA D0230 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0240` | MARCA DE IMPUTAÇÃO NA D0240 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0250` | MARCA DE IMPUTAÇÃO NA D0250 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0260` | MARCA DE IMPUTAÇÃO NA D0260 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0270` | MARCA DE IMPUTAÇÃO NA D0270 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0280` | MARCA DE IMPUTAÇÃO NA D0280 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0290` | MARCA DE IMPUTAÇÃO NA D0290 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0300` | MARCA DE IMPUTAÇÃO NA D0300 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0310` | MARCA DE IMPUTAÇÃO NA D0310 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0320` | MARCA DE IMPUTAÇÃO NA D0320 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0330` | MARCA DE IMPUTAÇÃO NA D0330 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MD0340` | MARCA DE IMPUTAÇÃO NA D0340 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |

## Pessoas

Uma linha = uma pessoa moradora de um domicílio da amostra. CSV de RO tem **210** colunas; o layout controlado descreve **210**.

| Código | Nome | Tipo | Grupo | Categorias / notas |
|---|---|---|---|---|
| `P0010` | Grande Região | C | geografia | 1- Região Norte (uf=11 a 17)<br>2- Região Nordeste (uf=21 a 29)<br>3- Região Sudeste (uf=31 a 33 e 35)<br>4- Região Sul (uf=41 a 43)<br>5- Região Centro-oeste (uf=50 a 53) |
| `P0020` | Unidade da Federação | A | geografia | 11- Rondônia<br>12- Acre<br>13- Amazonas<br>14- Roraima<br>15- Pará<br>16- Amapá<br>17- Tocantins<br>21- Maranhão<br>22- Piauí<br>23- Ceará<br>24- Rio Grande do Norte<br>25- Paraíba<br>26- Pernambuco<br>27- Alagoas<br>28- Sergipe<br>29- Bahia<br>31- Minas Gerais<br>32- Espírito Santo<br>33- Rio de Janeiro<br>35- São Paulo<br>41- Paraná<br>42- Santa Catarina<br>43- Rio Grande do Sul<br>50- Mato Grosso do Sul<br>51- Mato Grosso<br>52- Goiás<br>53- Distrito Federal |
| `P0030` | Mesorregião | A | geografia | — |
| `P0040` | Microrregião | A | geografia | — |
| `P0050` | Região Geográfica Intermediária | A | geografia | — |
| `P0060` | Região Geográfica Imediata | A | geografia | — |
| `P0070` | Concentração urbana | A | geografia | — |
| `P0080` | Município | A | geografia | — |
| `P0090` | Área de Ponderação | A | geografia | — |
| `P0100` | Controle | N | identificação | — |
| `P0101` | Número de ordem do morador | N | identificação | — |
| `P0111` | Peso Amostral (Versão acesso Controlado) | N (dec=13) | peso | — |
| `P0120` | Situação do Setor | C | contexto do domicílio | 01  - Área urbana de alta densidade de edificações<br>02  - Área urbana de baixa densidade de edificações<br>03  - Núcleo urbano<br>05  - Povoado<br>06  - Núcleo rural<br>07  - Lugarejo<br>08  - Área rural (exclusive aglomerados) |
| `P0130` | Espécie da unidade visitada | C | contexto do domicílio | 01  - Domicílio particular permanente ocupado<br>05  - Domicílio particular improvisado ocupado<br>06  - Domicílio coletivo com morador |
| `P0140` | Situação do domicílio | C | contexto do domicílio | 1  - Urbana<br>2  - Rural |
| `P0150` | Sexo | C | sexo, idade e condição no domicílio | 1  - Masculino<br>2  - Feminino<br>9 - Ignorado |
| `P0160` | Sexo | C | sexo, idade e condição no domicílio | 1  - Masculino<br>2  - Feminino |
| `P0170` | Condição no domicílio da pessoa, categoria | C | sexo, idade e condição no domicílio | 01  - Pessoa responsável pelo domicílio<br>02  - Cônjuge ou companheiro(a) de sexo diferente<br>03  - Cônjuge ou companheiro(a) do mesmo sexo<br>04  - Filho(a) do responsável e do cônjuge<br>05  - Filho(a) somente do responsável<br>06  - Enteado(a)<br>07  - Genro ou nora<br>08  - Pai, mãe, padrasto ou madrasta<br>09  - Sogro(a)<br>10  - Neto(a)<br>11  - Bisneto(a)<br>12  - Irmão ou irmã<br>13  - Avô ou avó<br>14  - Outro parente<br>15  - Agregado(a)<br>16  - Convivente<br>17  - Pensionista<br>18  - Empregado(a) doméstico(a)<br>19  - Parente do(a) empregado(a)  doméstico(a)<br>20  - Individual em domicílio coletivo |
| `P0180` | Idade calculada em anos da pessoa, categoria | C | sexo, idade e condição no domicílio | 01 - 0 a 4 anos<br>02 - 5 a 9 anos<br>03 - 10 a 14 anos<br>04 - 15 a 19 anos<br>05 - 20 a 24 anos<br>06 - 25 a 29 anos<br>07 - 30 a 34 anos<br>08 - 35 a 39 anos<br>09 - 40 a 44 anos<br>10 - 45 a 49 anos<br>11 - 50 a 54 anos<br>12 - 55 a 59 anos<br>13 - 60 a 64 anos<br>14 - 65 a 69 anos<br>15 - 70 a 74 anos<br>16 - 75 a 79 anos<br>17 - 80 anos ou mais<br>99 - Ignorado |
| `P0181` | Idade calculada em anos da pessoa, número | N | sexo, idade e condição no domicílio | — |
| `P0190` | Idade calculada em meses da pessoa, número | N | sexo, idade e condição no domicílio | — |
| `P0200` | Forma de declaração de idade | C | sexo, idade e condição no domicílio | 1 - Data de nascimento<br>2 - Idade declarada |
| `P0210` | Cor ou raça da pessoa, categoria | C | raça, indígena, quilombola e registro | 1  - Branca<br>2  - Preta<br>3  - Amarela<br>4  - Parda<br>5  - Indígena<br>9 - Ignorado |
| `P0220` | Pessoa Indígena, categoria | C | raça, indígena, quilombola e registro | 1 - Sim<br>0 - Não<br>9 - Ignorado |
| `P0230` | Uso da língua portuguesa no domicílio da pessoa, categoria. | C | raça, indígena, quilombola e registro | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0240` | Status de declaração de etnia | C | raça, indígena, quilombola e registro | 1 - Declarou uma etnia<br>2 - Declarou duas etnias<br>3 - Declaração não-determinada<br>4 - Declaração mal definida<br>5 - Não sabe<br>6 - Não declarou<br>Branco |
| `P0250` | Status de declaração de língua indígena | C | raça, indígena, quilombola e registro | 1 - Declarou uma língua indígena<br>2 - Declarou duas línguas indígenas<br>3 - Declarou três línguas indígenas<br>4 - Declaração não-determinada<br>5 - Declaração mal definida<br>6 - Não sabe<br>7 - Não fala língua indígena no domicílio<br>Branco |
| `P0260` | Pessoa quilombola, categoria | C | raça, indígena, quilombola e registro | 1  - Sim<br>2  - Não |
| `P0270` | Existência e tipo de registro de nascimento da pessoa, categoria | C | raça, indígena, quilombola e registro | 1  - Do cartório<br>2  - Registro Administrativo de Nascimento Indígena (RANI)<br>3  - Não tem<br>4  - Não sabe<br>9  - Ignorado<br>Branco |
| `P0280` | Convivência com cônjuge ou companheiro da pessoa, categoria | C | união, parentesco e fecundidade | 1  - Sim<br>2  - Não Já viveu antes<br>3  - Não Nunca viveu<br>Branco |
| `P0290` | Natureza da união, categoria | C | união, parentesco e fecundidade | 1  - Casamento civil e religioso<br>2  - Só casamento civil<br>3  - Só casamento religioso<br>4  - União consensual<br>Branco |
| `P0300` | Moradia da mãe ou madrasta no domicílio da pessoa, categoria | C | união, parentesco e fecundidade | 1  - Sim<br>2  - Não |
| `P0310` | Moradia do pai ou padrasto no domicílio da pessoa, categoria | C | união, parentesco e fecundidade | 1  - Sim<br>2  - Não |
| `P0320` | Filhos homens nascidos vivos da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0330` | Filhas mulheres nascidas vivas da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0340` | Filhos nascidos vivos da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0350` | Filhos homens vivos da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0360` | Filhas mulheres vivas da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0370` | Filhos vivos da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0380` | Idade calculada do último filho nascido vivo da pessoa, categoria | C | união, parentesco e fecundidade | 01 - 0 a 4 anos<br>02 - 5 a 9 anos<br>03 - 10 a 14 anos<br>04 - 15 a 19 anos<br>05 - 20 a 24 anos<br>06 - 25 a 29 anos<br>07 - 30 a 34 anos<br>08 - 35 a 39 anos<br>09 - 40 a 44 anos<br>10 - 45 a 49 anos<br>11 - 50 a 54 anos<br>12 - 55 a 59 anos<br>13 - 60 a 64 anos<br>14 - 65 a 69 anos<br>15 - 70 a 74 anos<br>16 - 75 a 79 anos<br>17 - 80 anos ou mais<br>99 - Ignorado |
| `P0381` | Idade calculada do último filho nascido vivo da pessoa, número | N | união, parentesco e fecundidade | — |
| `P0390` | Forma de declaração de idade do último filho tido nascido vivo | C | união, parentesco e fecundidade | 1 - Data de nascimento<br>2 - Idade declarada<br>Branco |
| `P0400` | Existência de filho nascido vivo no período de 12 meses, categoria | C | união, parentesco e fecundidade | 1  - Sim<br>2  - Não<br>Branco |
| `P0410` | Religião ou culto, categoria | A | religião | 1 - Católica Apostólica Romana<br>2 - Evangélicas<br>3 - Espírita<br>4 - Umbanda e Candomblé<br>5 - Tradições indígenas<br>6 - Outras religiosidades<br>7 - Sem religião<br>8 - Não sabe<br>9 - Sem declaração |
| `P0411` | Religião ou culto, categoria | A | religião | 1 - Católica Apostólica Romana<br>2 - Católica Apostólica Brasileira<br>3 - Católica Ortodoxa<br>4 - Evangélicas de Missão<br>5 - Evangélicas de origem pentecostal<br>6 - Igrejas evangélicas indígenas<br>7 - Evangélica não determinada<br>8 - Outras religiosidades cristãs<br>9 - Igreja de Jesus Cristo dos Santos dos Últimos Dias<br>10 - Testemunhas de Jeová<br>11 - Espiritualista<br>12 - Espírita<br>13 - Umbanda<br>14 - Candomblé<br>15 - Outras declarações de religiosidades afrobrasileira<br>16 - Judaísmo<br>17 - Hinduísmo<br>18 - Budismo<br>19 - Igreja Messiânica Mundial<br>20 - Outras novas religiões orientais<br>21 - Outras religiões orientais<br>22 - Islamismo<br>23 - Tradições esotéricas<br>24 - Tradições indígenas<br>25 - Religiões Ayahuasqueiras<br>26 - LBV<br>27 - Sem religião - Sem religião<br>28 - Sem religião - Ateu<br>29 - Sem religião - Agnóstico<br>30 - Múltiplo pertenciment… |
| `P0420` | Existência de deficiência visual da pessoa, categoria | C | deficiência e autismo | 1  - Tem, não consegue de modo algum<br>2  - Tem muita dificuldade<br>3  - Tem alguma dificuldade<br>4  - Não tem dificuldade<br>9  - Ignorado<br>Branco |
| `P0430` | Existência de deficiência auditiva da pessoa, categoria | C | deficiência e autismo | 1  - Tem, não consegue de modo algum<br>2  - Tem muita dificuldade<br>3  - Tem alguma dificuldade<br>4  - Não tem dificuldade<br>9  - Ignorado<br>Branco |
| `P0440` | Existência de deficiência motora da pessoa, categoria | C | deficiência e autismo | 1  - Tem, não consegue de modo algum<br>2  - Tem muita dificuldade<br>3  - Tem alguma dificuldade<br>4  - Não tem dificuldade<br>9  - Ignorado<br>Branco |
| `P0450` | Existência de dificuldade em pegar objetos da pessoa, categoria | C | deficiência e autismo | 1  - Tem, não consegue de modo algum<br>2  - Tem muita dificuldade<br>3  - Tem alguma dificuldade<br>4  - Não tem dificuldade<br>9  - Ignorado<br>Branco |
| `P0460` | Existência de deficiência mental ou intelectual da pessoa, categoria | C | deficiência e autismo | 1  - Tem, não consegue de modo algum<br>2  - Tem muita dificuldade<br>3  - Tem alguma dificuldade<br>4  - Não tem dificuldade<br>9  - Ignorado<br>Branco |
| `P0470` | Variável indicadora da Existência de Deficiência | C | deficiência e autismo | 1 - Pessoa COM Deficiência<br>2 - Pessoa SEM Deficiência<br>9 - Não aplicável - Pessoa com menos de 2 anos de idade |
| `P0480` | Local de nascimento da pessoa, categoria | C | migração e nascimento | 1  - Neste município<br>2  - Em outro município do Brasil<br>3  - Em outro país<br>9  - Ignorado<br>Branco |
| `P0490` | Unidade da Federação de nascimento da pessoa, código | A | migração e nascimento | — |
| `P0500` | Município de nascimento da pessoa, código | A | migração e nascimento | — |
| `P0510` | País de nascimento da pessoa, código | A | migração e nascimento | — |
| `P0520` | Nacionalidade da pessoa, categoria | C | migração e nascimento | 1  - Brasileiro nato<br>2  - Naturalizado brasileiro<br>3  - Estrangeiro<br>Branco |
| `P0530` | Moradia em outro município ou país estrangeiro da pessoa, categoria | C | migração e nascimento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0540` | Ano de fixação de residência da pessoa, número | N | migração e nascimento | — |
| `P0550` | Tempo de moradia no município da pessoa, número | N | migração e nascimento | — |
| `P0560` | Unidade da Federação e município ou país estrangeiro de moradia anterior da pessoa, categoria | C | migração e nascimento | 1  - Estado/Município<br>2  - País estrangeiro<br>9  - Ignorado<br>Branco |
| `P0570` | Unidade da Federação de moradia anterior da pessoa, código | A | migração e nascimento | — |
| `P0580` | Município de moradia anterior da pessoa, código | A | migração e nascimento | — |
| `P0590` | País estrangeiro de moradia anterior da pessoa, código | A | migração e nascimento | — |
| `P0600` | Unidade da Federação e município ou país estrangeiro de moradia há 5 anos da pessoa, categoria | C | migração e nascimento | 1  - Neste município<br>2  - Outro município do Brasil<br>3  - Outro país<br>9  - Ignorado<br>Branco |
| `P0610` | Unidade da Federação de moradia há 5 anos da pessoa, código | A | migração e nascimento | — |
| `P0620` | Município de moradia da pessoa há 5 anos, código | A | migração e nascimento | — |
| `P0630` | País de moradia há 5 anos da pessoa, código | A | migração e nascimento | — |
| `P0640` | Alfabetização da pessoa, categoria | C | educação | 1  - Sim<br>2  - Não<br>Branco |
| `P0650` | Frequência escolar da pessoa, categoria | C | educação | 1  - Sim<br>2  - Não Mas já frequentou<br>3  - Não Nunca frequentou<br>Branco |
| `P0660` | Curso frequentado pela pessoa, categoria | C | educação | 01  - Creche<br>02  - Pré escola<br>03  - Alfabetização de jovens e adultos<br>04  - Regular do ensino fundamental<br>05  - Educação de jovens e adultos (EJA) do ensino fundamental<br>06  - Regular do ensino médio<br>07  - Educação de jovens e adultos (EJA) do ensino médio<br>08  - Superior de graduação<br>09  - Especialização de nível superior (duração mínima de 360 horas)<br>10  - Mestrado<br>11  - Doutorado<br>99  - Ignorado<br>Branco |
| `P0670` | Ano do curso frequentado pela pessoa, categoria | C | educação | 01  - Primeiro<br>02  - Segundo<br>03  - Terceiro<br>04  - Quarto<br>05  - Quinto<br>06  - Sexto<br>07  - Sétimo<br>08  - Oitavo<br>09  - Nono<br>10  - Curso não classificado em anos<br>99  - Ignorado<br>Branco |
| `P0680` | Série do curso frequentado pela pessoa, categoria | C | educação | 01  - Primeira<br>02  - Segunda<br>03  - Terceira<br>04  - Quarta<br>05  - Quinta<br>06  - Sexta<br>07  - Sétima<br>08  - Oitava<br>09  - Nona<br>10  - Curso não classificado em séries<br>99  - Ignorado<br>Branco |
| `P0690` | Conclusão de outro curso superior de graduação da pessoa, categoria | C | educação | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0700` | Curso mais elevado frequentado anteriormente da pessoa, categoria | C | educação | 01  - Creche<br>02  - Pré escola<br>03  - Classe de alfabetização<br>04  - Alfabetização de jovens e adultos<br>05  - Antigo primário (elementar)<br>06  - Antigo ginasial (médio 1º ciclo)<br>07  - Regular do ensino fundamental ou do 1º grau<br>08  - Educação de jovens e adultos (EJA) do ensino fundamental ou supletivo do 1º grau<br>09  - Antigo científico, clássico, etc. (médio 2º ciclo)<br>10  - Regular do ensino médio ou do 2º grau<br>11  - Educação de jovens e adultos (EJA) do ensino médio ou supletivo do 2º grau<br>12  - Superior de graduação<br>13  - Especialização de nível superior (duração mínima de 360 horas)<br>14  - Mestrado<br>15  - Doutorado<br>99  - Ignorado<br>Branco |
| `P0710` | Duração do curso frequentado anteriormente da pessoa, categoria | C | educação | 1  - 8 séries<br>2  - 9 anos<br>9  - Ignorado<br>Branco |
| `P0720` | Último ano concluído com aprovação no curso frequentado anteriormente da pessoa, categoria | C | educação | 01  - Nenhum<br>02  - Primeiro<br>03  - Segundo<br>04  - Terceiro<br>05  - Quarto<br>06  - Quinto<br>07  - Sexto<br>08  - Sétimo<br>09  - Oitavo<br>10  - Nono<br>11  - Curso não era classificado em anos<br>99  - Ignorado<br>Branco |
| `P0730` | Última série concluída com aprovação no curso frequentado anteriormente da pessoa, categoria | C | educação | 01  - Nenhuma<br>02  - Primeira<br>03  - Segunda<br>04  - Terceira<br>05  - Quarta<br>06  - Quinta<br>07  - Sexta<br>08  - Sétima<br>09  - Oitava<br>10  - Nona<br>11  - Curso não classificado em séries<br>99  - Ignorado<br>Branco |
| `P0740` | Conclusão de curso frequentado anteriormente pela pessoa, categoria | C | educação | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0750` | Área detalhada do curso superior de graduação cursado pela pessoa | A | educação | — |
| `P0760` | Morador, nível de instrução de ensino | C | educação | 1 - Sem instrução e menos de 1 ano<br>2 - Ensino fundamental incompleto ou equivalente<br>3 - Ensino fundamental completo ou equivalente<br>4 - Ensino médio incompleto ou equivalente<br>5 - Ensino médio completo ou equivalente<br>6 - Superior incompleto ou equivalente<br>7 - Superior completo<br>8 - Não determinado<br>9 - Ignorado "se frequenta curso"<br>901 - Ignorado "curso que frequenta"<br>902 - Ignorado "ano/serie que frequenta<br>903 - Ignorado "se concluiu outro curso de graduação"<br>911 - Ignorado "curso que frequentou"<br>912 - Ignorado "se concluiu o curso que frequentou"<br>913 - Ignorado "ano/série que frequentou"<br>914 - Ignorado "duração do curso regular de Ensino Fundamental" |
| `P0770` | Morador, nível de instrução de ensino, compatível com o Censo Demográfico de 2010 | C | educação | 1 - Sem instrução e fundamental incompleto<br>2 - Fundamental completo e médio incompleto<br>3 - Médio completo e superior incompleto<br>4 - Superior completo<br>5 - Não determinado |
| `P0780` | Variável indicadora de frequência escolar em nível adequado à idade | C | educação | 1 - Adequado<br>2 - Não adequado<br>9 - Não aplicável - Pessoa com menos de 6 anos ou maior que 24 anos de idade |
| `P0790` | Anos de estudo da pessoa | N | educação | — |
| `P0800` | Unidade da Federação e município ou país estrangeiro da escola da pessoa, categoria | C | educação | 1  - Neste município<br>2  - Em outro município do Brasil<br>3  - Em outro país<br>9  - Ignorado<br>Branco |
| `P0810` | Unidade da Federação do local de estudo da pessoa, categoria | A | educação | — |
| `P0820` | Município do local de estudo da pessoa, categoria | A | educação | — |
| `P0830` | País estrangeiro do local de estudo da pessoa, categoria | A | educação | — |
| `P0840` | Existência de trabalho remunerado em dinheiro da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0850` | Existência de trabalho remunerado em produtos, mercadorias ou benefícios da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0860` | Existência de bico ou atividade ocasional remunerada da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0870` | Existência de trabalho não remunerado como ajuda na atividade remunerada de morador do domicílio da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0880` | Existência de afastamento temporário do trabalho remunerado da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0890` | Existência de trabalho na plantação, criação de animais ou pesca, para alimentação dos moradores do domicílio, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P0900` | Trabalhos da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Um<br>2  - Dois<br>3  - Três ou mais<br>9  - Ignorado<br>Branco |
| `P0910` | Pessoa de 10 anos ou mais de idade, categoria | C | trabalho, rendimento e deslocamento | 0 - Pessoa de menos de 10 anos de idade<br>1 - Pessoa de 10 anos ou mais de idade<br>Branco |
| `P0920` | Pessoa de 14 anos ou mais de idade, categoria | C | trabalho, rendimento e deslocamento | 0 - Pessoa de menos de 14 anos de idade<br>1 - Pessoa de 14 anos ou mais de idade<br>Branco |
| `P0930` | Pessoa de 14 anos ou mais de idade na força de trabalho, categoria | C | trabalho, rendimento e deslocamento | 0 - Pessoa de 14 anos ou mais de idade FORA da força de trabalho<br>1 - Pessoa de 14 anos ou mais de idade na força de trabalho<br>Branco |
| `P0940` | Pessoa de 14 anos ou mais, ocupada, contribuinte de instituto de previdência no trabalho principal, catogoria | C | trabalho, rendimento e deslocamento | 0 - Pessoa de 14 anos ou mais de idade ocupada NÃO contribuinte de instituto de previdência no trabalho principal<br>1 - Pessoa de 14 anos ou mais de idade ocupada contribuinte de instituto de previdência no trabalho principal<br>Branco |
| `P0950` | Pessoas de 14 anos ou mais ocupada, categoria | C | trabalho, rendimento e deslocamento | 0 - Desocupada<br>1 - Ocupada<br>Branco |
| `P0960` | Pessoas de 10 anos ou mais ocupada, categoria | C | trabalho, rendimento e deslocamento | 0 - Não ocupada<br>1 - Ocupada<br>Branco |
| `P0970` | Ocupação – código: | A | trabalho, rendimento e deslocamento | - A relação de códigos encontra-se no arquivo: “Codificação_Ocupação CD2022.xls” |
| `P0980` | Atividade – código | A | trabalho, rendimento e deslocamento | - A relação de códigos encontra-se no arquivo: “Codificação_Atividade CD2022.xls” |
| `P0990` | Posição na ocupação do trabalho principal da pessoa, categoria | C | trabalho, rendimento e deslocamento | 01  - Trabalhador doméstico (inclusive diarista)<br>02  - Militar do exército, da marinha, da aeronáutica, da polícia militar ou do corpo de bombeiros militar<br>03  - Empregado do setor privado<br>04  - Empregado do setor público _ funcionário estatutário<br>05  - Empregado do setor público _ empregado não estatutário<br>06  - Empregado de empresas estatais<br>07  - Empregador (com pelo menos um empregado)<br>08  - Conta própria (sem empregados)<br>09  - Trabalhador não remunerado em ajuda a morador do domicílio ou parente<br>99  - Ignorado<br>Branco |
| `P1000` | Existência de carteira de trabalho assinada no trabalho principal da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P1010` | Existência de registro no CNPJ do negócio ou empresa da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não |
| `P1020` | Posição na ocupação no trabalho principal, semana de referência, pessoas de 10 anos ou mais | C | trabalho, rendimento e deslocamento | 01 - Empregado no setor privado COM carteira de trabalho assinada<br>02 - Empregado no setor privado SEM carteira de trabalho assinada<br>03 - Trabalhador doméstico COM carteira de trabalho assinada<br>04 - Trabalhador doméstico SEM carteira de trabalho assinada<br>05 -  Empregado no setor público COM carteira de trabalho assinada<br>06 -  Empregado no setor público SEM carteira de trabalho assinada<br>07 - Militar e servidor estatutário<br>08 - Empregador<br>09 - Conta própria<br>10 - Trabalhador familiar auxiliar |
| `P1030` | Atividade principal, no trabalho principal, semana de referência, pessoas de 10 anos ou mais | C | trabalho, rendimento e deslocamento | 01 - Agricultura, pecuária, produção florestal, pesca e aquicultura<br>02 - Indústrias extrativas<br>03 - Indústrias de transformação<br>04 - Eletricidade e gás<br>05 - Água, esgoto, atividades de gestão de resíduos e descontaminação<br>06 - Construção<br>07 - Comércio, reparação de veículos automotores e motocicletas<br>08 - Transporte, armazenagem e correio<br>09 - Alojamento e alimentação<br>10 - Informação e comunicação<br>11 - Atividades financeiras, de seguros e serviços relacionados<br>12 - Atividades imobiliárias<br>13 - Atividades profissionais, científicas e técnicas<br>14 - Atividades administrativas e serviços complementares<br>15 - Administração pública, defesa e seguridade social<br>16 - Educação<br>17 - Saúde humana e serviços sociais<br>18 - Artes, cultura, esporte e recreação<br>19 - Outras atividades de serviços<br>20 - Serviços domésticos<br>21 - Organismos internacion… |
| `P1040` | Grandes Grupos Ocupacionais, trabalho principal, semana de referência, pessoas de 10 anos ou mais | C | trabalho, rendimento e deslocamento | 01 - Diretores e gerentes<br>02 - Profissionais das ciências e intelectuais<br>03 - Técnicos e profissionais de nível médio<br>04 - Trabalhadores de apoio administrativo<br>05 - Trabalhadores dos serviços, vendedores dos comércios e mercados<br>06 - Trabalhadores qualificados da agropecuária, florestais, da caça e da pesca<br>07 - Trabalhadores qualificados, operários e artesões da construção, das artes mecânicas e outros ofícios<br>08 - Operadores de instalações e máquinas e montadores<br>09 - Ocupações elementares<br>10 - Membros das forças armadas, policiais e bombeiros militares<br>11 - Ocupações maldefinidas |
| `P1050` | Existência de providência para conseguir trabalho no período de 30 dias da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado |
| `P1060` | Disponibilidade para começar a trabalhar da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P1070` | Tipo de rendimento bruto mensal habitualmente recebido em todos os trabalhos para pessoas de 10 anos ou mais | C | trabalho, rendimento e deslocamento | 1  - Valor em dinheiro, produtos ou mercadorias<br>2  - Outra forma (Moradia, Alimentação, Treinamento, etc.) |
| `P1080` | Valor do Rendimento bruto mensal habitual de todos os trabalhos para pessoas de 10 anos ou mais | N | trabalho, rendimento e deslocamento | — |
| `P1090` | Existência de rendimento bruto mensal, Aposentadoria/Pensão/Bolsa Família/BPC/Aluguel, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado |
| `P1100` | Rendimento bruto mensal, Aposentadoria/Pensão/Bolsa Família/BPC/Aluguel, Valor | N | trabalho, rendimento e deslocamento | — |
| `P1110` | Rendimento recebido em todas as fontes | N | trabalho, rendimento e deslocamento | — |
| `P1120` | Unidade da Federação e município ou país estrangeiro do local de trabalho da pessoa, categoria | C | trabalho, rendimento e deslocamento | 1  - Em casa ou na propriedade<br>2  - Fora de casa e da propriedade<br>3  - Em outro município do Brasil<br>4  - Em outro país<br>5  - Em mais de um município ou país<br>9  - Ignorado<br>Branco |
| `P1130` | Unidade da Federação do local de trabalho da pessoa, código | A | trabalho, rendimento e deslocamento | — |
| `P1140` | Município do local de trabalho da pessoa, código | A | trabalho, rendimento e deslocamento | — |
| `P1150` | País estrangeiro do local de trabalho da pessoa, categoria | A | trabalho, rendimento e deslocamento | — |
| `P1160` | Retorna do trabalho para casa 3 dias ou mais na semana, categoria | C | trabalho, rendimento e deslocamento | 1  - Sim<br>2  - Não<br>9  - Ignorado<br>Branco |
| `P1170` | Meios de transporte de deslocamento para o local de trabalho da pessoa, categoria | C | trabalho, rendimento e deslocamento | 01  - A pé<br>02  - Bicicleta<br>03  - Motocicleta<br>04  - Mototáxi<br>05  - Automóvel<br>06  - Táxi ou assemelhados<br>07  - Van, perua ou assemelhados<br>08  - Ônibus<br>09  - BRT ou ônibus de trânsito rápido<br>10  - Trem ou metrô<br>11  - Caminhonete ou caminhão adaptado (pau de arara)<br>12  - Embarcação de médio e grande porte (acima de 20 pessoas)<br>13  - Embarcação de pequeno porte (até 20 pessoas)<br>14  - Outros<br>99 - Ignorado |
| `P1180` | Tempo em que a pessoa leva entre sua casa e o local de trabalho normalmente, categoria | C | trabalho, rendimento e deslocamento | 0 - Não se desloca para local de trabalho<br>1 - Até cinco minutos<br>2 - De seis minutos até quinze minutos<br>3 - Mais de quinze minutos até meia hora<br>4 - Mais de meia hora até uma hora<br>5 - Mais de uma hora até duas horas<br>6 - Mais de duas horas até quatro horas<br>7 - Mais de quatro horas<br>9 - Tempo não informado (ignorado) |
| `P1190` | Tempo do deslocamento para trabalho, calculado em minutos | N | trabalho, rendimento e deslocamento | — |
| `P1200` | Existência de diagnóstico de autismo por profissional de saúde | C | deficiência e autismo | 1  - Sim<br>2  - Não<br>Branco |
| `P1210` | Quem prestou as informações da pessoa, categoria | C | informante | 1  - A própria pessoa<br>2  - Outro morador<br>3  - Não morador<br>9 - Ignorado<br>Branco |
| `P1220` | Número de ordem de quem prestou as informações da pessoa, código | A | informante | — |
| `MP0150` | MARCA DE IMPUTAÇÃO NA P0150 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0170` | MARCA DE IMPUTAÇÃO NA P0170 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0180` | MARCA DE IMPUTAÇÃO NA P0180 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0181` | MARCA DE IMPUTAÇÃO NA P0181 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0190` | MARCA DE IMPUTAÇÃO NA P0190 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0210` | MARCA DE IMPUTAÇÃO NA P0210 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0230` | MARCA DE IMPUTAÇÃO NA P0230 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0260` | MARCA DE IMPUTAÇÃO NA P0260 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0270` | MARCA DE IMPUTAÇÃO NA P0270 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0280` | MARCA DE IMPUTAÇÃO NA P0280 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0290` | MARCA DE IMPUTAÇÃO NA P0290 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0300` | MARCA DE IMPUTAÇÃO NA P0300 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0310` | MARCA DE IMPUTAÇÃO NA P0310 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0320` | MARCA DE IMPUTAÇÃO NA P0320 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0330` | MARCA DE IMPUTAÇÃO NA P0330 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0350` | MARCA DE IMPUTAÇÃO NA P0350 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0360` | MARCA DE IMPUTAÇÃO NA P0360 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0410` | MARCA DE IMPUTAÇÃO NA P0410 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0411` | MARCA DE IMPUTAÇÃO NA P0411 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0420` | MARCA DE IMPUTAÇÃO NA P0420 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0430` | MARCA DE IMPUTAÇÃO NA P0430 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0440` | MARCA DE IMPUTAÇÃO NA P0440 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0450` | MARCA DE IMPUTAÇÃO NA P0450 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0460` | MARCA DE IMPUTAÇÃO NA P0460 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0480` | MARCA DE IMPUTAÇÃO NA P0480 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0490` | MARCA DE IMPUTAÇÃO NA P0490 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0500` | MARCA DE IMPUTAÇÃO NA P0500 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0510` | MARCA DE IMPUTAÇÃO NA P0510 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0520` | MARCA DE IMPUTAÇÃO NA P0520 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0530` | MARCA DE IMPUTAÇÃO NA P0530 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0540` | MARCA DE IMPUTAÇÃO NA P0540 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0550` | MARCA DE IMPUTAÇÃO NA P0550 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0560` | MARCA DE IMPUTAÇÃO NA P0560 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0570` | MARCA DE IMPUTAÇÃO NA P0570 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0580` | MARCA DE IMPUTAÇÃO NA P0580 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0590` | MARCA DE IMPUTAÇÃO NA P0590 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0600` | MARCA DE IMPUTAÇÃO NA P0600 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0610` | MARCA DE IMPUTAÇÃO NA P0610 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0620` | MARCA DE IMPUTAÇÃO NA P0620 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0630` | MARCA DE IMPUTAÇÃO NA P0630 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0640` | MARCA DE IMPUTAÇÃO NA P0640 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0650` | MARCA DE IMPUTAÇÃO NA P0650 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP0660` | MARCA DE IMPUTAÇÃO NA P0660 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0670` | MARCA DE IMPUTAÇÃO NA P0670 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0680` | MARCA DE IMPUTAÇÃO NA P0680 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0690` | MARCA DE IMPUTAÇÃO NA P0690 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0700` | MARCA DE IMPUTAÇÃO NA P0700 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0710` | MARCA DE IMPUTAÇÃO NA P0710 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0720` | MARCA DE IMPUTAÇÃO NA P0720 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0730` | MARCA DE IMPUTAÇÃO NA P0730 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0740` | MARCA DE IMPUTAÇÃO NA P0740 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0750` | MARCA DE IMPUTAÇÃO NA P0750 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0800` | MARCA DE IMPUTAÇÃO NA P0800 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0810` | MARCA DE IMPUTAÇÃO NA P0810 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0820` | MARCA DE IMPUTAÇÃO NA P0820 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0830` | MARCA DE IMPUTAÇÃO NA P0830 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0840` | MARCA DE IMPUTAÇÃO NA P0840 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0850` | MARCA DE IMPUTAÇÃO NA P0850 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0860` | MARCA DE IMPUTAÇÃO NA P0860 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0870` | MARCA DE IMPUTAÇÃO NA P0870 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0880` | MARCA DE IMPUTAÇÃO NA P0880 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0890` | MARCA DE IMPUTAÇÃO NA P0890 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0900` | MARCA DE IMPUTAÇÃO NA P0900 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0970` | MARCA DE IMPUTAÇÃO NA P0970 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0980` | MARCA DE IMPUTAÇÃO NA P0980 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP0990` | MARCA DE IMPUTAÇÃO NA P0990 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1000` | MARCA DE IMPUTAÇÃO NA P1000 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1010` | MARCA DE IMPUTAÇÃO NA P1010 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MP1050` | MARCA DE IMPUTAÇÃO NA P1050 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1060` | MARCA DE IMPUTAÇÃO NA P1060 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1070` | MARCA DE IMPUTAÇÃO NA P1070 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1080` | MARCA DE IMPUTAÇÃO NA P1080 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1090` | MARCA DE IMPUTAÇÃO NA P1090 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1100` | MARCA DE IMPUTAÇÃO NA P1100 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1120` | MARCA DE IMPUTAÇÃO NA P1120 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1130` | MARCA DE IMPUTAÇÃO NA P1130 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1140` | MARCA DE IMPUTAÇÃO NA P1140 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1150` | MARCA DE IMPUTAÇÃO NA P1150 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1160` | MARCA DE IMPUTAÇÃO NA P1160 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1170` | MARCA DE IMPUTAÇÃO NA P1170 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1180` | MARCA DE IMPUTAÇÃO NA P1180 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1200` | MARCA DE IMPUTAÇÃO NA P1200 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1210` | MARCA DE IMPUTAÇÃO NA P1210 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |
| `MP1220` | MARCA DE IMPUTAÇÃO NA P1220 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado<br>9 - Não aplicável |

## Familia

Uma linha = uma família (única ou convivente) em um domicílio da amostra. CSV de RO tem **31** colunas; o layout controlado descreve **31**.

| Código | Nome | Tipo | Grupo | Categorias / notas |
|---|---|---|---|---|
| `F0010` | Grande Região | C | geografia | 1- Região Norte (uf=11 a 17)<br>2- Região Nordeste (uf=21 a 29)<br>3- Região Sudeste (uf=31 a 33 e 35)<br>4- Região Sul (uf=41 a 43)<br>5- Região Centro-oeste (uf=50 a 53) |
| `F0020` | Unidade da Federação | A | geografia | 11- Rondônia<br>12- Acre<br>13- Amazonas<br>14- Roraima<br>15- Pará<br>16- Amapá<br>17- Tocantins<br>21- Maranhão<br>22- Piauí<br>23- Ceará<br>24- Rio Grande do Norte<br>25- Paraíba<br>26- Pernambuco<br>27- Alagoas<br>28- Sergipe<br>29- Bahia<br>31- Minas Gerais<br>32- Espírito Santo<br>33- Rio de Janeiro<br>35- São Paulo<br>41- Paraná<br>42- Santa Catarina<br>43- Rio Grande do Sul<br>50- Mato Grosso do Sul<br>51- Mato Grosso<br>52- Goiás<br>53- Distrito Federal |
| `F0030` | Mesorregião | A | geografia | — |
| `F0040` | Microrregião | A | geografia | — |
| `F0050` | Região Geográfica Intermediária | A | geografia | — |
| `F0060` | Região Geográfica Imediata | A | geografia | — |
| `F0070` | Concentração urbana | A | geografia | — |
| `F0080` | Município | A | geografia | — |
| `F0090` | Área de Ponderação | A | geografia | — |
| `F0100` | Controle | N | identificação | — |
| `F0101` | Número de ordem da Família | A | identificação | — |
| `F0111` | Peso Amostral (Versão acesso Controlado) | N (dec=13) | peso | — |
| `F0120` | Situação do Setor | C | contexto do domicílio | 01  - Área urbana de alta densidade de edificações<br>02  - Área urbana de baixa densidade de edificações<br>03  - Núcleo urbano<br>05  - Povoado<br>06  - Núcleo rural<br>07  - Lugarejo<br>08  - Área rural (exclusive aglomerados) |
| `F0130` | Espécie da unidade visitada | C | contexto do domicílio | 01  - Domicílio particular permanente ocupado<br>05  - Domicílio particular improvisado ocupado<br>06  - Domicílio coletivo com morador |
| `F0140` | Situação do domicílio | C | contexto do domicílio | 1  - Urbana<br>2  - Rural |
| `F0150` | Família, identificação | C | composição da família | 01  - Única<br>02  - Convivente - principal<br>03  - Convivente - segunda<br>04  - Convivente - terceira<br>05  - Convivente - quarta<br>06  - Convivente - quinta<br>07  - Convivente - sexta<br>08  - Convivente - sétima<br>09  - Convivente - oitava<br>10 - Convivente - nona |
| `F0160` | Pessoas na família, número | N | composição da família | — |
| `F0170` | Sexo do responsável pela família única ou convivente principal [Para as famílias conviventes secundárias a variável ficará em branco] | C | composição da família | 1 - Masculino<br>2 - Feminino |
| `F0180` | Idade em anos do responsável pela família única ou convivente principal, categoria [Para as famílias conviventes secundárias a variável ficará em branco] | C | composição da família | 01 - 0 a 4 anos<br>02 - 5 a 9 anos<br>03 - 10 a 14 anos<br>04 - 15 a 19 anos<br>05 - 20 a 24 anos<br>06 - 25 a 29 anos<br>07 - 30 a 34 anos<br>08 - 35 a 39 anos<br>09 - 40 a 44 anos<br>10 - 45 a 49 anos<br>11 - 50 a 54 anos<br>12 - 55 a 59 anos<br>13 - 60 a 64 anos<br>14 - 65 a 69 anos<br>15 - 70 a 74 anos<br>16 - 75 a 79 anos<br>17 - 80 anos ou mais<br>99 - Ignorado |
| `F0181` | Idade em anos do responsável pela família única ou convivente principal, número [Para as famílias conviventes secundárias a variável ficará em branco] | N | composição da família | — |
| `F0190` | Nível de instrução do responsável pela família única ou convivente principal [Para as famílias conviventes secundárias a variável ficará em branco] | C | perfil do responsável e tipologia | 1 - Sem instrução e fundamental incompleto<br>2 - Fundamental completo e médio incompleto<br>3 - Médio completo e superior incompleto<br>4 - Superior completo |
| `F0200` | Cor ou raça do responsável pela família única ou convivente principal [Para as famílias conviventes secundárias a variável ficará em branco] | C | perfil do responsável e tipologia | 1 - Branca<br>2 - Preta<br>3 - Amarela<br>4 - Parda<br>5 - Indígena<br>9 - Ignorado |
| `F0210` | Família únicas e conviventes principais, tipologia [Para as famílias conviventes secundárias a variável ficará em branco] | C | perfil do responsável e tipologia | 01  - Casal sem filhos<br>02  - Casal sem filhos e com parentes<br>03  - Casal com filhos<br>04  - Casal com filhos e com parentes<br>05  - Mulher sem cônjuge com filhos<br>06  - Mulher sem cônjuge com filhos e com parentes<br>07  - Homem sem cônjuge com filhos<br>08  - Homem sem cônjuge com filhos e com parentes<br>09  - Mulher ou homem com dois ou mais cônjuges<br>10 - Outro |
| `F0220` | Famílias conviventes secundárias, tipologia [Para as famílias únicas ou conviventes principais a variável ficará em branco] | C | perfil do responsável e tipologia | 1 - Casal sem filhos<br>2 - Casal com filhos<br>3 - Mulher sem cônjuge com filhos<br>4 - Homem sem cônjuge com filhos |
| `F0230` | Filhos menores de 10 anos ou não economicamente ativos das Famílias únicas e conviventes principais, número [Para as famílias conviventes secundárias a variável ficará em branco] | N | rendimento e composição | — |
| `F0240` | Integrantes da família, homens, número | N | rendimento e composição | — |
| `F0250` | Integrantes da família, mulheres, número | N | rendimento e composição | — |
| `F0260` | Rendimento familiar per capita | N (dec=2) | rendimento e composição | — |
| `F0270` | Rendimento familiar, participação | N | rendimento e composição | 1 - Ambos com rendimento<br>2 - Responsável com rendimento e cônjuge ou companheiro(a) sem rendimento<br>3 - Responsável sem rendimento e cônjuge ou companheiro(a) com rendimento<br>4 - Ambos sem rendimento |
| `MF0190` | MARCA DE IMPUTAÇÃO NA F019 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MF0200` | MARCA DE IMPUTAÇÃO NA F0200 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |

## Mortalidade

Uma linha = uma pessoa falecida reportada no domicílio (jan/2019–jul/2022). CSV de RO tem **25** colunas; o layout controlado descreve **25**.

| Código | Nome | Tipo | Grupo | Categorias / notas |
|---|---|---|---|---|
| `M0010` | Grande Região | C | geografia | 1- Região Norte (uf=11 a 17)<br>2- Região Nordeste (uf=21 a 29)<br>3- Região Sudeste (uf=31 a 33 e 35)<br>4- Região Sul (uf=41 a 43)<br>5- Região Centro-oeste (uf=50 a 53) |
| `M0020` | Unidade da Federação | A | geografia | 11- Rondônia<br>12- Acre<br>13- Amazonas<br>14- Roraima<br>15- Pará<br>16- Amapá<br>17- Tocantins<br>21- Maranhão<br>22- Piauí<br>23- Ceará<br>24- Rio Grande do Norte<br>25- Paraíba<br>26- Pernambuco<br>27- Alagoas<br>28- Sergipe<br>29- Bahia<br>31- Minas Gerais<br>32- Espírito Santo<br>33- Rio de Janeiro<br>35- São Paulo<br>41- Paraná<br>42- Santa Catarina<br>43- Rio Grande do Sul<br>50- Mato Grosso do Sul<br>51- Mato Grosso<br>52- Goiás<br>53- Distrito Federal |
| `M0030` | Mesorregião | A | geografia | — |
| `M0040` | Microrregião | A | geografia | — |
| `M0050` | Região Geográfica Intermediária | A | geografia | — |
| `M0060` | Região Geográfica Imediata | A | geografia | — |
| `M0070` | Concentração urbana | A | geografia | — |
| `M0080` | Município | A | geografia | — |
| `M0090` | Área de Ponderação | A | geografia | — |
| `M0100` | Controle | N | identificação | — |
| `M0101` | Número de ordem da pessoa falecida | A | identificação | — |
| `M0111` | Peso Amostral (Versão acesso Controlado) | N (dec=13) | peso | — |
| `M0120` | Situação do Setor | C | contexto do domicílio | 01  - Área urbana de alta densidade de edificações<br>02  - Área urbana de baixa densidade de edificações<br>03  - Núcleo urbano<br>05  - Povoado<br>06  - Núcleo rural<br>07  - Lugarejo<br>08  - Área rural (exclusive aglomerados) |
| `M0130` | Espécie da unidade visitada | C | contexto do domicílio | 01  - Domicílio particular permanente ocupado<br>05  - Domicílio particular improvisado ocupado<br>06  - Domicílio coletivo com morador |
| `M0140` | Situação do domicílio | C | contexto do domicílio | 1  - Urbana<br>2  - Rural |
| `M0150` | Ano de ocorrência do óbito de morador do domicílio, categoria | C | características do óbito | 1 - 2019<br>2 - 2020<br>3 - 2021<br>4 - 2022<br>9 - Ignorado<br>Branco |
| `M0151` | Mês e ano de ocorrência do óbito de morador do domicílio, categoria | C | características do óbito | 01 - Janeiro de 2019<br>02 - Fevereiro de 2019<br>03 - Março de 2019<br>04 - Abril de 2019<br>05 - Maio de 2019<br>06 - Junho de 2019<br>07 - Julho de 2019<br>08 - Agosto de 2019<br>09 - Setembro de 2019<br>10 - Outubro de 2019<br>11 - Novembro de 2019<br>12 - Dezembro de 2019<br>13 - Janeiro de 2020<br>14 - Fevereiro de 2020<br>15 - Março de 2020<br>16 - Abril de 2020<br>17 - Maio de 2020<br>18 - Junho de 2020<br>19 - Julho de 2020<br>20 - Agosto de 2020<br>21 - Setembro de 2020<br>22 - Outubro de 2020<br>23 - Novembro de 2020<br>24 - Dezembro de 2020<br>25 - Janeiro de 2021<br>26 - Fevereiro de 2021<br>27 - Março de 2021<br>28 - Abril de 2021<br>29 - Maio de 2021<br>30 - Junho de 2021<br>31 - Julho de 2021<br>32 - Agosto de 2021<br>33 - Setembro de 2021<br>34 - Outubro de 2021<br>35 - Novembro de 2021<br>36 - Dezembro de 2021<br>37 - Janeiro de 2022<br>38 - Fevereiro de 2022<br>39 - Ma… |
| `M0160` | Sexo da pessoa falecida do domicílio, categoria | C | características do óbito | 1  - Masculino<br>2  - Feminino<br>9 - Ignorado |
| `M0170` | Pessoa falecida, idade calculada, categoria | C | características do óbito | 01 - 0 a 4 anos<br>02 - 5 a 9 anos<br>03 - 10 a 14 anos<br>04 - 15 a 19 anos<br>05 - 20 a 24 anos<br>06 - 25 a 29 anos<br>07 - 30 a 34 anos<br>08 - 35 a 39 anos<br>09 - 40 a 44 anos<br>10 - 45 a 49 anos<br>11 - 50 a 54 anos<br>12 - 55 a 59 anos<br>13 - 60 a 64 anos<br>14 - 65 a 69 anos<br>15 - 70 a 74 anos<br>16 - 75 a 79 anos<br>17 - 80 anos ou mais<br>99 - Idade ao falecer ignorada |
| `M0171` | Pessoa falecida, idade calculada, número | N | características do óbito | — |
| `MM0150` | MARCA DE IMPUTAÇÃO NA M0150 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MM0151` | MARCA DE IMPUTAÇÃO NA M0151 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MM0160` | MARCA DE IMPUTAÇÃO NA M0160 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MM0170` | MARCA DE IMPUTAÇÃO NA M0170 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |
| `MM0171` | MARCA DE IMPUTAÇÃO NA M0171 | C | marca de imputação | 0 - Não Imputado<br>1 - Imputado |

## Campos úteis para o dotsbr

Atalho das variáveis que mais se cruzam com as views do mapa.

### Raça

| Código | Onde | Uso |
|---|---|---|
| `P0210` | Pessoas | Cor ou raça da pessoa (1 branca, 2 preta, 3 amarela, 4 parda, 5 indígena) |
| `P0220` | Pessoas | Pessoa indígena (declaração específica) |
| `P0260` | Pessoas | Pessoa quilombola |
| `F0200` | Família | Cor ou raça do responsável pela família |

### Renda

| Código | Onde | Uso |
|---|---|---|
| `D0350` | Domicílios | Rendimento domiciliar |
| `D0360` | Domicílios | Rendimento domiciliar per capita |
| `P1080` | Pessoas | Rendimento bruto mensal habitual de todos os trabalhos (10+ anos) |
| `P1100` | Pessoas | Rendimento de aposentadoria/pensão/Bolsa Família/BPC/aluguel |
| `P1110` | Pessoas | Rendimento de todas as fontes |
| `F0260` | Família | Rendimento familiar per capita |

No mapa, a cor de renda é a **mediana do responsável no setor** (`V06006`), não a renda da pessoa. Aqui a renda é do indivíduo, do domicílio ou da família — não misture os denominadores.

### Óbitos

| Código | Onde | Uso |
|---|---|---|
| `D0340` | Domicílios | Houve óbito de morador no período |
| `M0151` | Mortalidade | Mês e ano do óbito (versão detalhada do controlado) |
| `M0160` | Mortalidade | Sexo da pessoa falecida |
| `M0170` | Mortalidade | Idade ao morrer, faixa |
| `M0171` | Mortalidade | Idade ao morrer, em anos |

A view Mortes do mapa usa agregados do **universo** por setor e soma os sexos. Nestes microdados o óbito tem sexo e idade no nível da pessoa falecida, mas só até a área de ponderação, e não traz cor/raça de quem morreu.

## Tabela máquina

A mesma lista, uma linha por variável, está em [`dicionario-microdados.csv`](dicionario-microdados.csv) (UTF-8, `;`).

