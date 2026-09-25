// Kinetic type and the product's own chrome (search pill, "1 ponto = N"
// chip, lens switcher, map pins), all positioned as a pure function of t.
import { T, PALETTE, RACE_SHARES, PLACES, perDotAt, hookPoint } from './story.js';
import { lon2x, lat2y } from './camera.js';
import { prog, lerp, ease, env, spring, fmtInt, fmtPct } from './util.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};

// "*word*" marks the emphasised (italic, coloured) words of a headline.
function words(text, color) {
  return text
    .split(' ')
    .map((w) => {
      const em = w.startsWith('*');
      const clean = w.replace(/\*/g, '');
      return `<span class="w"><span class="wi${em ? ' em' : ''}"${em && color ? ` style="color:${color}"` : ''}>${clean}</span></span>`;
    })
    .join(' ');
}
// Emphasis can span several words: *8 em 10* → mark every word in between.
function markRuns(text) {
  let on = false;
  return text
    .split(' ')
    .map((w) => {
      const starts = w.startsWith('*');
      const ends = /\*[.,:]?$/.test(w);
      const mark = on || starts;
      if (starts) on = true;
      if (ends) on = false;
      const clean = w.replace(/\*/g, '');
      return mark ? `*${clean}*` : clean;
    })
    .join(' ');
}

// Word-by-word rise in, word-by-word lift out.
function animWords(el, t, tin, tout, { stagger = 0.032, dur = 0.62 } = {}) {
  const ws = el._ws || (el._ws = [...el.querySelectorAll('.wi')]);
  ws.forEach((w, i) => {
    const pin = ease.outExpo(prog(t, tin + i * stagger, tin + i * stagger + dur));
    const pout = ease.inCubic(prog(t, tout - 0.34 + i * 0.012, tout + i * 0.012));
    const y = (1 - pin) * 110 - pout * 110;
    w.style.transform = `translate3d(0, ${y}%, 0)`;
    w.style.opacity = t < tin || t > tout + 0.4 ? 0 : 1;
  });
}

function fade(el, t, tin, tout, { dy = 18, dur = 0.5, outDur = 0.3 } = {}) {
  const a = env(t, tin, tout, dur, outDur, ease.outCubic);
  const pin = ease.outExpo(prog(t, tin, tin + dur));
  const pout = ease.inCubic(prog(t, tout - outDur, tout));
  el.style.opacity = a;
  el.style.transform = `translate3d(0, ${(1 - pin) * dy - pout * dy * 0.6}px, 0)`;
  el.style.visibility = a > 0.001 ? 'visible' : 'hidden';
}

const RACE_ROWS = [
  ['Parda', PALETTE.race[0]],
  ['Branca', PALETTE.race[1]],
  ['Preta', PALETTE.race[2]],
  ['Indígena', PALETTE.race[3]],
  ['Amarela', PALETTE.race[4]],
];

export function createOverlay(stage, L) {
  const root = h('div', 'overlay');
  stage.appendChild(root);
  const add = (el) => (root.appendChild(el), el);

  const brand = add(h('div', 'brand', `${logoSvg(30)}<span>dotsbr</span>`));
  const source = add(h('div', 'source', 'Fonte: IBGE, Censo Demográfico 2022'));

  // Hook: one dot, one sentence.
  const [hx, hy] = hookPoint(L);
  const hookDot = add(h('div', 'hook-dot'));
  hookDot.style.left = `${hx}px`;
  hookDot.style.top = `${hy}px`;
  // Shockwave on the burst, in time with the boom.
  const rings = [0, 0.09].map(() => add(h('div', 'shock')));
  rings.forEach((r) => { r.style.left = `${hx}px`; r.style.top = `${hy}px`; });
  const hookText = add(h('div', 'hook-text', `<div class="hk-big">${words('1 ponto')}</div><div class="hk-small">${words('= 900 pessoas')}</div>`));
  hookText.style.left = `${hx + 46}px`;
  hookText.style.top = `${hy}px`;

  // Intro: the national count.
  const intro = add(h('div', 'block intro'));
  const introKick = intro.appendChild(h('div', 'kicker', `<i style="background:${PALETTE.race[0]}"></i>Censo Demográfico 2022`));
  const counter = intro.appendChild(h('div', 'counter'));
  const introSub = intro.appendChild(h('div', 'sub', words('pessoas. Cada ponto é um grupo delas.')));

  // National race chart.
  const race = add(h('div', 'block headline-block'));
  const raceKick = race.appendChild(h('div', 'kicker', `<i style="background:${PALETTE.race[0]}"></i>Cor ou raça · Brasil`));
  const raceHead = race.appendChild(h('div', 'headline', words(markRuns('Pela 1ª vez desde 1991, os *pardos* são o maior grupo.'), PALETTE.race[0])));
  const C = L.chart;
  const rows = RACE_ROWS.map(([name, color], i) => {
    const y = C.y + i * C.rowH + (C.rowH - C.barH) / 2 + 12 + C.barH / 2;
    const label = add(h('div', 'chart-label', `<i style="background:${color}"></i>${name}`));
    label.style.left = `${C.x}px`;
    label.style.top = `${y}px`;
    const value = add(h('div', 'chart-value'));
    const cols = Math.max(1, Math.round((RACE_SHARES[i] / RACE_SHARES[0]) * Math.floor(C.barW / C.pitch)));
    value.style.left = `${C.x + C.labelW + cols * C.pitch + 16}px`;
    value.style.top = `${y}px`;
    return { label, value };
  });

  // Search pill (the product's geocoder), typing "Rio de Janeiro".
  const search = add(h('div', 'search', `
    <div class="pill">${searchIcon()}<span class="q"></span><span class="caret"></span></div>
    <div class="result"><b>Rio de Janeiro</b><span>Rio de Janeiro, Brasil</span></div>`));
  const searchQ = search.querySelector('.q');
  const searchPill = search.querySelector('.pill');
  const searchResult = search.querySelector('.result');
  const caret = search.querySelector('.caret');

  // Rio: location kicker + one block per lens.
  const rioKick = add(h('div', 'kicker rio-kicker', `<i style="background:#202124"></i>Rio de Janeiro`));
  const lens = (kick, head, sub, legend, color) => {
    const b = add(h('div', 'block headline-block lens-block'));
    b.appendChild(h('div', 'kicker small', kick));
    const hd = b.appendChild(h('div', 'headline', words(markRuns(head), color)));
    const sb = b.appendChild(h('div', 'sub', words(sub)));
    const lg = b.appendChild(h('div', 'legend', legend));
    return { b, hd, sb, lg };
  };
  const fly = lens('', 'Aproxime e cada ponto vira *35 pessoas*.', 'Do país inteiro ao seu bairro.', '', '#202124');
  const rRace = lens('Cor ou raça', 'Zona Sul: quase *8 em cada 10* são brancos.', 'Na Baixada Fluminense, 1 em cada 3.', chips(RACE_ROWS), PALETTE.race[1]);
  const rInc = lens(
    'Renda',
    'A renda segue *a mesma fronteira.*',
    'Zona Sul: mais de 5 salários mínimos. Baixada: até 2.',
    `<div class="ramp">${PALETTE.income.slice(0, 6).map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="ramp-labels"><span>até 1</span><span>salários mínimos</span><span>10+</span></div>`,
    PALETTE.income[5],
  );
  const rRel = lens(
    'Religião',
    'Evangélicos: *4 em cada 10* na Zona Oeste.',
    'Na Zona Sul, 1 em cada 10.',
    chips([['Católica', PALETTE.religion[0]], ['Evangélicas', PALETTE.religion[1]], ['Sem religião', PALETTE.religion[2]], ['Outras', PALETTE.religion[6]]]),
    PALETTE.religion[1],
  );

  // Map pins.
  const pin = (name) => add(h('div', 'pin', `<div class="ring"></div><div class="stem"></div><div class="tag">${name}</div>`));
  const pins = {
    zonaSul: pin('Zona Sul'),
    baixada: pin('Baixada Fluminense'),
    zonaOeste: pin('Zona Oeste'),
  };

  // Product chrome.
  const chip = add(h('div', 'chip', `<span class="chip-dots">${logoSvg(22)}</span><span>1 ponto =</span><b class="n"></b><span class="u"></span>`));
  const chipN = chip.querySelector('.n');
  const chipU = chip.querySelector('.u');
  const lensSw = add(h('div', 'lens', `<div class="hi"></div><button>Raça</button><button>Renda</button><button>Religião</button>`));
  const lensHi = lensSw.querySelector('.hi');
  const lensBtns = [...lensSw.querySelectorAll('button')];
  const cursor = add(h('div', 'cursor', `${cursorSvg()}<div class="ripple"></div>`));
  const ripple = cursor.querySelector('.ripple');

  // Outro.
  const tagline = add(h('div', 'tagline', words('O Brasil em pontos · Censo 2022')));
  const url = add(h('div', 'url', `${logoSvg(26)}<span>carabetta.xyz/dotsbr</span>`));
  // Inter 800 with textBaseline 'middle' puts the baseline ~0.3em below y.
  const base = L.word.y + L.word.size * 0.31;
  tagline.style.top = `${base + L.word.size * 0.17}px`;
  url.style.top = `${base + L.word.size * 0.17 + 96}px`;

  const scrim = stage.querySelector('.scrim');
  const lensGeo = () => lensBtns.map((b) => [b.offsetLeft, b.offsetWidth]);
  let geo = null;

  return function update(t, view, cam) {
    geo ||= lensGeo();
    // Scrim keeps copy legible once dots go full-bleed.
    scrim.style.opacity = 0.35 + 0.6 * ease.inOutSine(prog(t, T.fly[0] + 0.6, T.fly[1] - 0.2)) - 0.95 * ease.inOutSine(prog(t, T.outro, T.outro + 0.5));
    fade(brand, t, 0.9, T.outro + 0.2, { dy: -10 });
    fade(source, t, 1.2, 15.2, { dy: 0 });

    // Hook.
    const s = spring(t - 0.05, { freq: 1.6, damping: 0.5 });
    const shrink = ease.inCubic(prog(t, T.burst[0] - 0.05, T.burst[0] + 0.14));
    hookDot.style.transform = `translate(-50%, -50%) scale(${Math.max(0, s * (1 - shrink))})`;
    hookDot.style.opacity = t < T.burst[0] + 0.15 ? 1 : 0;
    animWords(hookText, t, 0.16, T.hook[1] - 0.02, { stagger: 0.06 });
    rings.forEach((r, i) => {
      const p = prog(t, T.burst[0] + i * 0.09, T.burst[0] + i * 0.09 + 0.9);
      r.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      r.style.transform = `translate(-50%, -50%) scale(${0.05 + ease.outExpo(p) * (i ? 1.25 : 1)})`;
      r.style.opacity = (1 - ease.outCubic(p)) * (i ? 0.35 : 0.6);
    });

    // Intro counter.
    animWords(introSub, t, 1.45, T.chartIn[0] - 0.12);
    fade(introKick, t, 1.2, T.chartIn[0] - 0.2, { dy: 10 });
    const cp = ease.outQuint(prog(t, 1.1, 2.45));
    counter.innerHTML = digits(fmtInt(203080756 * cp));
    fade(counter, t, 1.2, T.chartIn[0] - 0.1, { dy: 30, dur: 0.6 });
    intro.style.visibility = t < T.chartIn[0] + 0.4 ? 'visible' : 'hidden';

    // Race chart.
    fade(raceKick, t, T.chartIn[0] - 0.12, T.search[0] + 0.05, { dy: 10 });
    animWords(raceHead, t, T.chartIn[0] - 0.05, T.search[0] + 0.05);
    rows.forEach(({ label, value }, i) => {
      const tin = T.chartIn[0] + 0.3 + i * 0.07;
      const a = env(t, tin, T.chartOut[0] + 0.25 + i * 0.03, 0.4, 0.25);
      label.style.opacity = a;
      label.style.transform = `translate3d(${(1 - ease.outExpo(prog(t, tin, tin + 0.6))) * -24}px, -50%, 0)`;
      const vp = ease.outCubic(prog(t, T.chartIn[0] + 0.35 + i * 0.07, T.chartIn[1] + 0.1));
      value.textContent = fmtPct(RACE_SHARES[i] * vp);
      value.style.opacity = env(t, T.chartIn[0] + 0.55 + i * 0.07, T.chartOut[0] + 0.25 + i * 0.03, 0.4, 0.25);
    });

    // Search.
    const typed = 'Rio de Janeiro';
    const n = Math.round(typed.length * prog(t, T.search[0] + 0.14, T.search[0] + 0.48));
    searchQ.textContent = n ? typed.slice(0, n) : '';
    searchQ.classList.toggle('ph', n === 0);
    if (n === 0) searchQ.textContent = 'Buscar lugar';
    caret.style.opacity = Math.floor(t * 4) % 2 === 0 || (t > T.search[0] + 0.1 && t < T.search[0] + 0.5) ? 1 : 0;
    const press = Math.sin(Math.PI * prog(t, T.search[0] + 0.56, T.search[0] + 0.66));
    const sIn = spring(t - T.search[0], { freq: 2, damping: 0.62 });
    const sOut = ease.inCubic(prog(t, T.search[1] - 0.12, T.search[1] + 0.18));
    search.style.opacity = t < T.search[0] ? 0 : 1 - sOut;
    search.style.transform = `translate3d(0, ${(1 - sIn) * 30 - sOut * 20}px, 0) scale(${0.96 + 0.04 * sIn - 0.02 * press})`;
    search.style.visibility = t > T.search[0] && t < T.search[1] + 0.2 ? 'visible' : 'hidden';
    searchResult.style.opacity = ease.outCubic(prog(t, T.search[0] + 0.42, T.search[0] + 0.52));
    searchResult.classList.toggle('on', t > T.search[0] + 0.56);
    searchPill.classList.toggle('focus', t > T.search[0] + 0.08);

    // Rio copy.
    fade(rioKick, t, T.fly[0] + 0.15, T.outro, { dy: 10 });
    const blocks = [
      [fly, T.fly[0] + 0.25, T.race - 0.05],
      [rRace, T.race + 0.02, T.income[0] + 0.12],
      [rInc, T.income[0] + 0.28, T.religion[0] + 0.12],
      [rRel, T.religion[0] + 0.28, T.outro + 0.05],
    ];
    for (const [blk, a, b] of blocks) {
      blk.b.style.visibility = t > a - 0.05 && t < b + 0.5 ? 'visible' : 'hidden';
      fade(blk.b.firstChild, t, a, b, { dy: 8 });
      animWords(blk.hd, t, a + 0.03, b);
      animWords(blk.sb, t, a + 0.22, b - 0.02, { stagger: 0.02 });
      fade(blk.lg, t, a + 0.35, b - 0.04, { dy: 12 });
    }

    // Pins follow the (tilting, orbiting) map.
    const pinWin = { zonaSul: [T.race + 0.25, T.outro], baixada: [T.race + 0.4, T.religion[0] + 0.1], zonaOeste: [T.religion[0] + 0.45, T.outro] };
    for (const [key, el] of Object.entries(pins)) {
      const [a, b] = pinWin[key];
      const [lon, lat] = PLACES[key];
      const [x, y] = view.project(lon2x(lon), lat2y(lat));
      const sp = spring(t - a, { freq: 1.9, damping: 0.55 });
      const out = ease.inCubic(prog(t, b - 0.25, b));
      const vis = t > a && t < b;
      el.style.visibility = vis ? 'visible' : 'hidden';
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.setProperty('--s', Math.max(0, sp * (1 - out)));
      el.style.setProperty('--stem', Math.max(0, ease.outCubic(prog(t, a + 0.05, a + 0.35)) * (1 - out)));
    }

    // "1 ponto = N" chip + lens switcher.
    const chromeIn = spring(t - (T.fly[0] - 0.05), { freq: 1.8, damping: 0.62 });
    const chromeOut = ease.inCubic(prog(t, T.outro - 0.1, T.outro + 0.25));
    const vis = t > T.fly[0] - 0.05 && t < T.outro + 0.3;
    chip.style.visibility = vis ? 'visible' : 'hidden';
    chip.style.transform = `translate3d(0, ${(1 - chromeIn) * 90 + chromeOut * 90}px, 0)`;
    const lensIn = spring(t - (T.fly[1] - 0.5), { freq: 1.8, damping: 0.62 });
    lensSw.style.visibility = t > T.fly[1] - 0.5 && t < T.outro + 0.3 ? 'visible' : 'hidden';
    lensSw.style.transform = `translate3d(0, ${(1 - lensIn) * 90 + chromeOut * 90}px, 0)`;
    if (t < T.income[0] + 0.3) {
      chipN.textContent = fmtInt(t < T.fly[0] ? 900 : perDotAt(cam.zoom));
      chipU.textContent = 'pessoas';
    } else if (t < T.religion[0] + 0.3) {
      chipN.textContent = '12';
      chipU.textContent = 'domicílios';
    } else {
      chipN.textContent = '31';
      chipU.textContent = 'pessoas de 10+ anos';
    }
    const k1 = ease.outBack(prog(t, T.income[0] - 0.05, T.income[0] + 0.3), 1.4);
    const k2 = ease.outBack(prog(t, T.religion[0] - 0.05, T.religion[0] + 0.3), 1.4);
    const pos = t < T.religion[0] - 0.05 ? k1 : 1 + k2;
    const i0 = Math.floor(Math.min(pos, 1.999));
    const f = pos - i0;
    const [x0, w0] = geo[i0];
    const [x1, w1] = geo[Math.min(2, i0 + 1)];
    lensHi.style.transform = `translateX(${lerp(x0, x1, f)}px)`;
    lensHi.style.width = `${lerp(w0, w1, f)}px`;
    const active = pos < 0.5 ? 0 : pos < 1.5 ? 1 : 2;
    lensBtns.forEach((b, i) => b.classList.toggle('on', i === active));

    // A cursor drives the switcher, so the lens change reads as the product.
    const lr = lensSw.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const k = sr.width / L.W;
    const btn = (i) => [(lr.left - sr.left) / k + geo[i][0] + geo[i][1] * 0.55, (lr.top - sr.top) / k + 30];
    const off = [L.W * 0.62, L.H + 80];
    const path = [
      [T.income[0] - 0.75, off],
      [T.income[0] - 0.08, btn(1)],
      [T.religion[0] - 0.62, btn(1)],
      [T.religion[0] - 0.08, btn(2)],
      [T.religion[0] + 0.45, btn(2)],
      [T.religion[0] + 1.05, [btn(2)[0] + 260, L.H + 80]],
    ];
    let cp2 = path[0][1];
    for (let i = 1; i < path.length; i++) {
      const [ta, pa] = path[i - 1];
      const [tb, pb] = path[i];
      if (t >= ta) cp2 = [lerp(pa[0], pb[0], ease.inOutCubic(prog(t, ta, tb))), lerp(pa[1], pb[1], ease.inOutCubic(prog(t, ta, tb)))];
    }
    cursor.style.visibility = t > path[0][0] && t < path[path.length - 1][0] ? 'visible' : 'hidden';
    const click = Math.max(Math.sin(Math.PI * prog(t, T.income[0] - 0.06, T.income[0] + 0.06)), Math.sin(Math.PI * prog(t, T.religion[0] - 0.06, T.religion[0] + 0.06)));
    cursor.style.transform = `translate3d(${cp2[0]}px, ${cp2[1]}px, 0) scale(${1 - 0.14 * click})`;
    const rp = Math.max(prog(t, T.income[0], T.income[0] + 0.45) * (t < T.income[0] + 0.45 ? 1 : 0), prog(t, T.religion[0], T.religion[0] + 0.45) * (t < T.religion[0] + 0.45 ? 1 : 0));
    ripple.style.transform = `translate(-50%, -50%) scale(${0.2 + 2.2 * ease.outCubic(rp)})`;
    ripple.style.opacity = rp > 0 ? 0.5 * (1 - rp) : 0;

    // Outro lockup under the dot wordmark.
    animWords(tagline, t, T.word[1] - 0.25, 16, { stagger: 0.04 });
    const uIn = spring(t - (T.word[1] - 0.05), { freq: 1.7, damping: 0.6 });
    url.style.opacity = t > T.word[1] - 0.05 ? Math.min(1, uIn * 1.4) : 0;
    url.style.transform = `translate(-50%, 0) translate3d(0, ${(1 - uIn) * 26}px, 0)`;
  };
}

function digits(s) {
  return s.split('').map((c) => (c === '.' ? '<span class="sep">.</span>' : `<span class="d">${c}</span>`)).join('');
}

function chips(items) {
  return items.map(([name, c]) => `<span class="lg"><i style="background:${c}"></i>${name}</span>`).join('');
}

export function logoSvg(size) {
  // favicon.svg's five census dots, without the grey tile.
  return `<svg width="${size}" height="${size}" viewBox="2 6 26 21" aria-hidden="true"><circle cx="13" cy="14" r="6.2" fill="#e41a1c"/><circle cx="20.5" cy="12.5" r="5.4" fill="#4daf4a"/><circle cx="16.5" cy="21" r="4.8" fill="#ff7f00"/><circle cx="8.2" cy="20.5" r="3.6" fill="#984ea3"/><circle cx="24.2" cy="20" r="3.4" fill="#377eb8"/></svg>`;
}
const searchIcon = () => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>`;
const cursorSvg = () => `<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.2 4 7.3-3 1.6-4-7.4L4 20.5z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
