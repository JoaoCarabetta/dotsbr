/* Numbers and lenses. Two hard rules:
 *
 * 1. Every count below was aggregated from the same raw IBGE files the tile
 *    pipeline reads (scripts/themes.py), never recalled from memory:
 *      race, and the Rio breakdown
 *        → data/censo2022/raw/Agregados_por_setores_cor_ou_raca_BR.csv,
 *          summing V01317…V01321 over all setores with "X" → 0 (the rule in
 *          scripts/ibge_uf.py:num). The national sum is 202.321.691 — exactly
 *          the figure docs/fontes.md records. IBGE's official 2022 population
 *          is ~203,1M; the ~0,8M gap is confidentiality suppression, which is
 *          why the film says "contadas no Censo de 2022" and never claims to
 *          be the official population total.
 *      income
 *        → data/censo2022/raw/Agregados_por_setores_renda_responsavel_BR_20260508.csv,
 *          V06001 households bucketed by their setor's V06006 typical income
 *          against the 2022 minimum wage of R$ 1.212 (income_bin in
 *          scripts/themes.py). The Rio figures are household-weighted
 *          percentiles inside CD_SETOR prefix 3304557.
 *      religion
 *        → data/censo2022/output/tiles/religion/apond_religion.csv, the
 *          allocated sample table, people aged 10 or over.
 *    Percentages are computed from the counts at render time, so a label can
 *    never drift from its own number.
 *
 * 2. Labels, colors, units and dot densities are copied from VIEW_CONFIGS in
 *    index.html. If the product repaints a category or changes a density, this
 *    table has to be updated from it — otherwise the film would make a false
 *    claim about what one dot is worth. */

const CENSUS = {
    minWage2022: 1212,

    brazilRace: [
        { key: 'parda', count: 91823323 },
        { key: 'branca', count: 88092854 },
        { key: 'preta', count: 20554615 },
        { key: 'indigena', count: 1103891 },
        { key: 'amarela', count: 747008 },
    ],

    brazilIncome: [
        { key: 'income_ate_1sm', count: 25990136 },
        { key: 'income_1_2sm', count: 29107329 },
        { key: 'income_2_3sm', count: 9611882 },
        { key: 'income_3_5sm', count: 4799080 },
        { key: 'income_5_10sm', count: 2417540 },
        { key: 'income_mais_10sm', count: 505152 },
        { key: 'income_sem_dado', count: 4800 },
    ],

    brazilReligion: [
        { key: 'relig_catolica', count: 100202018 },
        { key: 'relig_evangelica', count: 47448320 },
        { key: 'relig_sem_religiao', count: 16381613 },
        { key: 'relig_afro', count: 1849363 },
        { key: 'relig_espirita', count: 3252400 },
        { key: 'relig_indigena', count: 99514 },
        { key: 'relig_outras', count: 7077496 },
        { key: 'relig_sem_info', count: 296054 },
    ],

    /* Município of Rio de Janeiro — the card the pointer opens on screen. */
    rioRace: [
        { key: 'parda', count: 2391526 },
        { key: 'branca', count: 2814861 },
        { key: 'preta', count: 962038 },
        { key: 'indigena', count: 2927 },
        { key: 'amarela', count: 7135 },
    ],

    /* Household-weighted percentiles of the typical income of whoever answers
       for the home, inside the city of Rio. p10 lands exactly on one minimum
       wage; p90 on R$ 8.000. */
    rioIncome: { p10: 1212, p50: 2000, p90: 8000, households: 2436472 },
};

const sumCounts = (rows) => rows.reduce((total, row) => total + row.count, 0);

const TOTALS = {
    brazilPeople: sumCounts(CENSUS.brazilRace),
    brazilHouseholds: sumCounts(CENSUS.brazilIncome),
    brazilTenPlus: sumCounts(CENSUS.brazilReligion),
    rioPeople: sumCounts(CENSUS.rioRace),
};

/** Share of homes whose neighbourhood's typical income is up to two wages. */
const UP_TO_2_WAGES =
    (CENSUS.brazilIncome[0].count + CENSUS.brazilIncome[1].count) /
    TOTALS.brazilHouseholds;

const RIO_INCOME_RATIO = CENSUS.rioIncome.p90 / CENSUS.rioIncome.p10;

/* The three lenses the product exposes (Óbitos exists in the tiles but is
   hidden in the UI, so the film does not show it either). */
const LENSES = {
    race: {
        id: 'race',
        label: 'Raça',
        unit: 'pessoas',
        explainer:
            'Cada ponto é um grupo de pessoas. A cor mostra a raça que elas declararam no Censo de 2022. Quanto mais você aproxima o mapa, menos pessoas cada ponto representa.',
        archive: 'censo2022.pmtiles',
        sourceId: 'points',
        layerId: 'points',
        property: 'race',
        categories: [
            { key: 'parda', label: 'Parda', color: '#e41a1c' },
            { key: 'branca', label: 'Branca', color: '#4daf4a' },
            { key: 'preta', label: 'Preta', color: '#ff7f00' },
            { key: 'indigena', label: 'Indígena', color: '#984ea3' },
            { key: 'amarela', label: 'Amarela', color: '#377eb8' },
        ],
        perDot: [4500, 2000, 900, 400, 150, 120, 90, 70, 50, 35, 25, 20],
        national: CENSUS.brazilRace,
        nationalTotal: TOTALS.brazilPeople,
    },
    income: {
        id: 'income',
        label: 'Renda',
        unit: 'domicílios',
        explainer:
            'Cada ponto é um grupo de domicílios. A cor mostra a renda típica de quem é responsável pelo domicílio em cada vizinhança, medida em salários mínimos (Censo de 2022).',
        archive: 'censo2022_income.pmtiles',
        sourceId: 'income-points',
        layerId: 'points-income',
        property: 'cat',
        categories: [
            { key: 'income_ate_1sm', label: 'Até 1 salário mínimo', color: '#b2182b' },
            { key: 'income_1_2sm', label: '1 a 2 salários mínimos', color: '#d6604d' },
            { key: 'income_2_3sm', label: '2 a 3 salários mínimos', color: '#f4a582' },
            { key: 'income_3_5sm', label: '3 a 5 salários mínimos', color: '#92c5de' },
            { key: 'income_5_10sm', label: '5 a 10 salários mínimos', color: '#4393c3' },
            { key: 'income_mais_10sm', label: 'Mais de 10 salários mínimos', color: '#2166ac' },
            { key: 'income_sem_dado', label: 'Sem informação', color: '#777777' },
        ],
        perDot: [1500, 700, 300, 130, 50, 40, 30, 24, 17, 12, 8, 7],
        national: CENSUS.brazilIncome,
        nationalTotal: TOTALS.brazilHouseholds,
    },
    religion: {
        id: 'religion',
        label: 'Religião',
        unit: 'pessoas de 10+',
        explainer:
            'Cada ponto é um grupo de pessoas com 10 anos ou mais. A cor é a religião declarada no Censo de 2022, estimada para um conjunto de vizinhanças — não para cada quarteirão.',
        archive: 'censo2022_religion.pmtiles',
        sourceId: 'religion-points',
        layerId: 'points-religion',
        property: 'cat',
        categories: [
            { key: 'relig_catolica', label: 'Católica', color: '#2c7fb8' },
            { key: 'relig_evangelica', label: 'Evangélicas', color: '#e6550d' },
            { key: 'relig_sem_religiao', label: 'Sem religião', color: '#737373' },
            { key: 'relig_afro', label: 'Umbanda e Candomblé', color: '#756bb1' },
            { key: 'relig_espirita', label: 'Espírita', color: '#31a354' },
            { key: 'relig_indigena', label: 'Tradições indígenas', color: '#8c510a' },
            { key: 'relig_outras', label: 'Outras', color: '#f768a1' },
            { key: 'relig_sem_info', label: 'Sem informação', color: '#bdbdbd' },
        ],
        perDot: [3900, 1750, 790, 350, 130, 105, 80, 60, 44, 31, 22, 18],
        national: CENSUS.brazilReligion,
        nationalTotal: TOTALS.brazilTenPlus,
    },
};

const LENS_ORDER = ['race', 'income', 'religion'];

/** Same rounding as the live legend, so the film quotes the tile on screen. */
function perDot(lensId, zoom) {
    const z = Math.min(14, Math.max(3, parseInt(Number(zoom).toFixed(0), 10)));
    return LENSES[lensId].perDot[z - 3];
}

const dotScaleLine = (lensId, zoom) =>
    '1 ponto = ' + perDot(lensId, zoom).toLocaleString('pt-BR') + ' ' + LENSES[lensId].unit;

const lensTitle = (lensId) => 'dotsbr por ' + LENSES[lensId].label;

const findCount = (rows, key) => {
    const row = rows.find((item) => item.key === key);
    return row ? row.count : 0;
};

const category = (lensId, key) =>
    LENSES[lensId].categories.find((item) => item.key === key);
