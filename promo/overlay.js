/* Motion graphics on top of the map.
 *
 * The markup lives in index.html; this file only sets style and text for one
 * frame at a time. Nothing is a CSS transition, so a captured frame is always a
 * finished picture, and any frame can be painted out of order (the capture
 * script and the ?frame= URL both rely on that). */

/* Downtown Rio. The pointer, its ripple and the stats popup are placed with
   map.project() on this point, so they stay glued to the same ground while the
   camera keeps drifting under them. */
const CLICK_LNGLAT = [-43.215, -22.918];
const POINTER_ENTRY = { x: 1540, y: 930 };

const MAX_RACE = Math.max.apply(null, CENSUS.brazilRace.map((row) => row.count));

let legendLens = null;

/** One-time DOM: the repeated rows, built from the same tables as the map. */
function buildOverlay() {
    const shares = el('shares-rows');
    LENSES.race.categories.forEach((cat) => {
        const row = document.createElement('div');
        row.className = 'share-row';
        row.dataset.key = cat.key;
        row.innerHTML =
            '<i class="share-swatch" style="background:' + cat.color + '"></i>' +
            '<span class="share-label">' + cat.label + '</span>' +
            '<span class="share-track"><i class="share-fill" style="background:' + cat.color + '"></i></span>' +
            '<span class="share-pct"></span>';
        shares.appendChild(row);
    });

    const stats = el('stats-rows');
    LENSES.race.categories.forEach((cat) => {
        const count = findCount(CENSUS.rioRace, cat.key);
        /* Same rounding as tooltipData() in index.html: whole percents. */
        const pct = Math.round((count / TOTALS.rioPeople) * 100);
        const row = document.createElement('div');
        row.className = 'stats-row';
        row.innerHTML =
            '<i style="background:' + cat.color + '"></i>' +
            '<span>' + cat.label + '</span><b>' + pct + '%</b>';
        stats.appendChild(row);
    });
    el('stats-total-value').textContent = asInt(TOTALS.rioPeople);

    const religion = el('religion-rows');
    ['relig_catolica', 'relig_evangelica', 'relig_sem_religiao'].forEach((key) => {
        const cat = category('religion', key);
        const row = document.createElement('div');
        row.className = 'religion-row';
        row.dataset.key = key;
        row.innerHTML =
            '<i style="background:' + cat.color + '"></i>' +
            '<span class="name">' + cat.label + '</span>' +
            '<span class="track"><i class="fill" style="background:' + cat.color + '"></i></span>' +
            '<span class="pct"></span>';
        religion.appendChild(row);
    });

    LENSES.race.categories.forEach((cat) => {
        const dot = document.createElement('i');
        dot.style.background = cat.color;
        el('end-dots').appendChild(dot);
    });

    el('income-note').innerHTML =
        'Renda típica de quem responde pela casa, por vizinhança. No país, <b>' +
        asPct(UP_TO_2_WAGES, 0) + '</b> das casas ficam até ' +
        asMoney(CENSUS.minWage2022 * 2) + '.';
    el('shares-foot').textContent =
        asMillions(TOTALS.brazilPeople) + ' de pessoas · 27 estados';
    el('end-credit').textContent =
        asMillions(TOTALS.brazilPeople) + ' de pessoas · Censo Demográfico 2022 · IBGE';
}

/** Legend rows belong to the active lens, so they are rebuilt on a switch. */
function buildLegend(lensId) {
    if (legendLens === lensId) return;
    legendLens = lensId;
    const host = el('legend-rows');
    host.innerHTML = '';
    LENSES[lensId].categories.forEach((cat) => {
        const row = document.createElement('div');
        row.className = 'legend-row';
        row.dataset.key = cat.key;
        row.innerHTML =
            '<i class="legend-swatch" style="background:' + cat.color + '"></i>' +
            '<span class="legend-label">' + cat.label + '</span>' +
            '<span class="legend-pct"></span>';
        host.appendChild(row);
    });
}

/* Legend percentages describe what is on screen: the national shares while
   Brazil is in frame, Rio's own shares once the camera is over the city. On the
   other two lenses the figure is national and the caption says so, so a row
   never implies a scope it does not have. */
function legendValues(frame, lensId) {
    const lens = LENSES[lensId];
    if (lensId !== 'race') {
        return {
            scope: '% no Brasil',
            values: lens.categories.map(
                (cat) => findCount(lens.national, cat.key) / lens.nationalTotal,
            ),
        };
    }
    const toRio = interp(frame, [BEAT.fly + 46, BEAT.fly + 88], [0, 1], EASE.soft);
    return {
        scope: '% do que está na tela',
        values: lens.categories.map((cat) => {
            const national = findCount(CENSUS.brazilRace, cat.key) / TOTALS.brazilPeople;
            const rio = findCount(CENSUS.rioRace, cat.key) / TOTALS.rioPeople;
            return national + (rio - national) * toRio;
        }),
    };
}

function paintOpening(state) {
    const frame = state.frame;

    setOpacity(el('scrim'), interp(frame, [BEAT.fly - 10, BEAT.fly + 22], [1, 0], EASE.out));

    const title = el('open-title');
    setOpacity(title, interp(frame, [BEAT.shares - 6, BEAT.shares + 8], [1, 0], EASE.out));
    const kicker = interp(frame, [6, 20], [0, 1], EASE.out);
    el('kicker-rule').style.width = 46 * kicker + 'px';
    const kickerRow = title.querySelector('.kicker');
    setOpacity(kickerRow, kicker);
    shift(kickerRow, -14 * (1 - kicker), 0);
    [el('title-line-1'), el('title-line-2')].forEach((line, i) => {
        const appear = interp(frame, [14 + i * 6, 38 + i * 6], [0, 1], EASE.out);
        setOpacity(line, appear);
        shift(line, 0, 96 * (1 - appear));
    });

    const counter = el('counter');
    const demote = interp(frame, [BEAT.shares - 8, BEAT.shares + 10], [0, 1], EASE.out);
    const appear = interp(frame, [24, 40], [0, 1], EASE.out);
    const leave = interp(frame, [BEAT.fly - 18, BEAT.fly - 2], [1, 0], EASE.out);
    counter.style.top = 434 + (166 - 434) * demote + 'px';
    setOpacity(counter, appear * leave);
    el('counter-value').textContent = asInt(
        interp(frame, [26, 56], [0, TOTALS.brazilPeople], EASE.count),
    );
    el('counter-value').style.fontSize = 76 + (40 - 76) * demote + 'px';
    el('counter-label').style.fontSize = 22 + (17 - 22) * demote + 'px';
}

function paintShares(state) {
    const frame = state.frame;
    const solo = state.solo;
    setOpacity(
        el('shares'),
        trapezoid(frame, BEAT.shares + 2, BEAT.shares + 18, BEAT.fly - 16, BEAT.fly - 2),
    );
    el('shares-rows').querySelectorAll('.share-row').forEach((row, i) => {
        const cat = LENSES.race.categories[i];
        const count = findCount(CENSUS.brazilRace, cat.key);
        const value = count / TOTALS.brazilPeople;
        const grow = interp(
            frame,
            [BEAT.shares + 8 + i * 4, BEAT.shares + 34 + i * 4],
            [0, 1],
            EASE.out,
        );
        const isSolo = solo.key === cat.key;
        setOpacity(row, solo.key && !isSolo ? 1 - solo.strength * 0.72 : 1);
        /* Normalised to the largest group, so 0,4% is still a visible sliver. */
        row.querySelector('.share-fill').style.width = (count / MAX_RACE) * 300 * grow + 'px';
        row.querySelector('.share-pct').textContent = asPct(
            value * grow,
            value < 0.01 ? 2 : 1,
        );
        row.querySelector('.share-swatch').style.scale = isSolo
            ? String(1 + 0.5 * solo.strength)
            : '1';
        row.querySelector('.share-label').style.fontWeight = isSolo ? '700' : '500';
    });

    const soloBox = el('solo');
    setOpacity(soloBox, solo.strength);
    shift(soloBox, 0, 14 * (1 - solo.strength));
    if (solo.key) {
        const cat = category('race', solo.key);
        const count = findCount(CENSUS.brazilRace, solo.key);
        const name = el('solo-name');
        name.textContent = cat.label;
        name.style.color = cat.color;
        el('solo-count').textContent =
            asInt(count) + ' pessoas · ' + asPct(count / TOTALS.brazilPeople) + ' do país';
    }
}

function paintPanel(state) {
    const frame = state.frame;
    const lensId = state.activeLens;
    const lens = LENSES[lensId];
    buildLegend(lensId);

    const panel = el('panel');
    const enter = interp(frame, [BEAT.fly - 8, BEAT.fly + 14], [0, 1], EASE.out);
    const exit = interp(frame, [BEAT.end - 4, BEAT.end + 12], [1, 0], EASE.out);
    setOpacity(panel, enter * exit);
    shift(panel, -28 * (1 - enter), 0);

    /* The panel rewrites itself on a switch, like clicking the real control. */
    const rewrite = interp(frame, [state.segmentStart, state.segmentStart + 14], [0, 1], EASE.out);
    const title = el('panel-title');
    title.textContent = lensTitle(lensId);
    setOpacity(title, interp(rewrite, [0, 0.5, 1], [0.15, 0.6, 1]));
    shift(title, 0, 6 * (1 - rewrite));

    el('dot-scale').textContent = dotScaleLine(lensId, state.camera.zoom);

    const slots = el('switcher').querySelectorAll('.switcher-slot');
    const low = Math.max(0, Math.min(slots.length - 1, Math.floor(state.switcherPos)));
    const high = Math.max(0, Math.min(slots.length - 1, Math.ceil(state.switcherPos)));
    const frac = state.switcherPos - low;
    const chip = el('switcher-chip');
    /* Measured from the laid-out slots, so the chip lands on them exactly
       whatever the label widths or the --ui scale turn out to be. */
    chip.style.left = slots[low].offsetLeft + (slots[high].offsetLeft - slots[low].offsetLeft) * frac + 'px';
    chip.style.width = slots[low].offsetWidth + 'px';
    slots.forEach((slot) => {
        slot.classList.toggle('is-active', slot.dataset.lens === lensId);
    });

    const explainer = el('explainer');
    explainer.textContent = lens.explainer;
    setOpacity(explainer, interp(rewrite, [0, 0.6, 1], [0, 0.5, 1]));

    const legend = legendValues(frame, lensId);
    el('legend-scope').textContent = legend.scope;
    el('legend-rows').querySelectorAll('.legend-row').forEach((row, i) => {
        const rowIn = interp(
            frame,
            [state.segmentStart + i * 2, state.segmentStart + i * 2 + 12],
            [0, 1],
            EASE.out,
        );
        const dimmed =
            state.solo.key && row.dataset.key !== state.solo.key
                ? 1 - state.solo.strength * 0.7
                : 1;
        setOpacity(row, rowIn * dimmed);
        shift(row, 10 * (1 - rowIn), 0);
        const value = legend.values[i];
        row.querySelector('.legend-pct').textContent = asPct(value, value < 0.01 ? 2 : 1);
    });

    const search = el('search');
    const searchIn = interp(frame, [BEAT.fly + 6, BEAT.fly + 26], [0, 1], EASE.out);
    setOpacity(search, searchIn * interp(frame, [BEAT.end - 4, BEAT.end + 10], [1, 0], EASE.out));
    shift(search, 0, -14 * (1 - searchIn));

    setOpacity(
        el('footer'),
        interp(frame, [BEAT.fly + 14, BEAT.fly + 34], [0, 1], EASE.out) *
            interp(frame, [BEAT.end - 6, BEAT.end + 8], [1, 0], EASE.out),
    );

    const caption = el('fly-caption');
    const captionShow = trapezoid(
        frame,
        BEAT.fly + 16,
        BEAT.fly + 34,
        BEAT.click - 34,
        BEAT.click - 18,
    );
    setOpacity(caption, captionShow);
    caption.style.translate = '-50% ' + 18 * (1 - captionShow) + 'px';

    const pill = el('place-pill');
    const pillShow = trapezoid(
        frame,
        BEAT.click - 26,
        BEAT.click - 8,
        BEAT.income - 16,
        BEAT.income - 2,
    );
    setOpacity(pill, pillShow);
    pill.style.translate = '-50% ' + 16 * (1 - pillShow) + 'px';
}

function paintInteraction(state) {
    const frame = state.frame;
    const target = projectPoint(CLICK_LNGLAT);
    const travel = interp(frame, [BEAT.click - 30, BEAT.click - 2], [0, 1], EASE.pan);
    const x = POINTER_ENTRY.x + (target.x - POINTER_ENTRY.x) * travel;
    const y = POINTER_ENTRY.y + (target.y - POINTER_ENTRY.y) * travel;

    const pointer = el('pointer');
    pointer.style.left = x + 'px';
    pointer.style.top = y + 'px';
    setOpacity(
        pointer,
        interp(
            frame,
            [BEAT.click - 32, BEAT.click - 24, BEAT.income - 22, BEAT.income - 10],
            [0, 1, 1, 0],
        ),
    );
    /* Press and release on the click frame. */
    pointer.style.scale = String(
        interp(frame, [BEAT.click - 2, BEAT.click + 1, BEAT.click + 7], [1, 0.86, 1], EASE.out),
    );

    const ripple = el('ripple');
    const rip = interp(frame, [BEAT.click, BEAT.click + 18], [0, 1], EASE.out);
    const rippleOn = frame >= BEAT.click && frame < BEAT.click + 20;
    ripple.style.left = target.x + 'px';
    ripple.style.top = target.y + 'px';
    setOpacity(ripple, rippleOn ? 1 - rip : 0);
    ripple.style.scale = String(0.12 + 0.88 * rip);

    const card = el('stats-card');
    const show = trapezoid(
        frame,
        BEAT.click + 1,
        BEAT.click + 13,
        BEAT.income - 18,
        BEAT.income - 6,
    );
    card.style.left = target.x + 20 + 'px';
    card.style.top = target.y + 18 + 'px';
    setOpacity(card, show);
    card.style.scale = String(0.92 + 0.08 * show);
    el('stats-rows').querySelectorAll('.stats-row').forEach((row, i) => {
        setOpacity(
            row,
            interp(frame, [BEAT.click + 4 + i * 2, BEAT.click + 14 + i * 2], [0, 1], EASE.out),
        );
    });
}

function paintInsights(state) {
    const frame = state.frame;

    const incomeFrom = BEAT.income + 12;
    const incomeTo = BEAT.religion - 2;
    const incomeCard = el('insight-income');
    const incomeShow = trapezoid(frame, incomeFrom, incomeFrom + 14, incomeTo - 12, incomeTo);
    setOpacity(incomeCard, incomeShow);
    shift(incomeCard, 0, 26 * (1 - incomeShow));
    const reveal = interp(frame, [incomeFrom + 8, incomeFrom + 30], [0, 1], EASE.out);
    el('income-bar-low').style.width = 100 * reveal + '%';
    el('income-bar-high').style.width = 100 * reveal + '%';
    el('income-bar-low').style.background = category('income', 'income_ate_1sm').color;
    el('income-bar-high').style.background = category('income', 'income_5_10sm').color;
    /* Both ends count up together, so the gap itself grows on screen. */
    el('income-value-low').textContent = asMoney(
        interp(frame, [incomeFrom + 8, incomeFrom + 30], [0, CENSUS.rioIncome.p10], EASE.count),
    );
    el('income-value-high').textContent = asMoney(
        interp(frame, [incomeFrom + 8, incomeFrom + 30], [0, CENSUS.rioIncome.p90], EASE.count),
    );
    const ratio = el('income-ratio');
    ratio.textContent = RIO_INCOME_RATIO.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '×';
    setOpacity(ratio, interp(reveal, [0.6, 1], [0, 1]));

    const religionFrom = BEAT.religion + 12;
    const religionTo = BEAT.end - 2;
    const religionCard = el('insight-religion');
    const religionShow = trapezoid(
        frame,
        religionFrom,
        religionFrom + 14,
        religionTo - 12,
        religionTo,
    );
    setOpacity(religionCard, religionShow);
    shift(religionCard, 0, 26 * (1 - religionShow));
    el('religion-rows').querySelectorAll('.religion-row').forEach((row, i) => {
        const value =
            findCount(CENSUS.brazilReligion, row.dataset.key) / TOTALS.brazilTenPlus;
        const grow = interp(
            frame,
            [religionFrom + 6 + i * 5, religionFrom + 30 + i * 5],
            [0, 1],
            EASE.out,
        );
        row.querySelector('.fill').style.width = value * 100 * grow + '%';
        row.querySelector('.pct').textContent = asPct(value * grow);
    });
}

function paintEnd(state) {
    const frame = state.frame;
    const card = el('end-card');
    const veil = interp(frame, [BEAT.end - 6, BEAT.end + 16], [0, 0.88], EASE.out);
    card.style.background = 'rgba(255,255,255,' + veil + ')';
    setOpacity(card, frame > BEAT.end - 20 ? 1 : 0);

    el('end-dots').querySelectorAll('i').forEach((dot, i) => {
        const pop = interp(frame, [BEAT.end + 2 + i * 3, BEAT.end + 20 + i * 3], [0, 1], EASE.out);
        setOpacity(dot, pop);
        dot.style.scale = String(0.2 + 0.8 * pop);
    });

    const wordmark = el('end-wordmark');
    const rise = interp(frame, [BEAT.end + 8, BEAT.end + 30], [0, 1], EASE.out);
    setOpacity(wordmark, rise);
    shift(wordmark, 0, 150 * (1 - rise));

    const tail = interp(frame, [BEAT.end + 22, BEAT.end + 42], [0, 1], EASE.out);
    setOpacity(el('end-tagline'), tail);
    setOpacity(el('end-url'), tail);
    shift(el('end-url'), 0, 10 * (1 - tail));
    setOpacity(el('end-credit'), tail);
}

function paintOverlay(state) {
    paintOpening(state);
    paintShares(state);
    paintPanel(state);
    paintInteraction(state);
    paintInsights(state);
    paintEnd(state);
}
