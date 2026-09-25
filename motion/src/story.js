// The 15-second storyboard: camera path, dot layers and morph targets as a
// pure function of time. Copy and numbers live in overlay.js.
import { makeView, fitBounds, flyPath, lon2x, lat2y } from './camera.js';
import { prog, lerp, ease, mulberry32 } from './util.js';

export const DURATION = 15;

// Beat sheet (seconds), locked to a 133⅓ BPM grid (0.45 s beats) that
// starts on the burst, so every cut lands on a downbeat of the soundtrack.
export const BEAT = 0.45;
export const GRID0 = 0.8;
const b = (n) => +(GRID0 + n * BEAT).toFixed(3);
export const T = {
  hook: [0, 0.8],
  burst: [b(0), 2.3],
  chartIn: [b(4), b(4) + 1.05],
  chartOut: [b(8), b(8) + 0.85],
  search: [b(8), b(10)],
  fly: [b(10), b(14)],
  race: b(14),
  income: [b(18), b(18) + 0.65],
  religion: [b(22), b(22) + 0.65],
  outro: b(26),
  word: [b(26) + 0.2, b(29)],
};

export const PALETTE = {
  race: ['#e41a1c', '#4daf4a', '#ff7f00', '#984ea3', '#377eb8'],
  income: ['#b2182b', '#d6604d', '#f4a582', '#92c5de', '#4393c3', '#2166ac', '#777777'],
  religion: ['#2c7fb8', '#e6550d', '#737373', '#756bb1', '#31a354', '#8c510a', '#f768a1', '#bdbdbd'],
};

// Official Censo 2022 shares (IBGE, cor ou raça), not dot counts: low-zoom
// tiles round small groups away, so the chart subsamples dots to these.
export const RACE_SHARES = [45.3, 43.5, 10.2, 0.6, 0.4];

const BRAZIL = [-74, -33.8, -34.7, 5.3];
const BRASILIA = [-47.93, -15.78];
export const PLACES = {
  zonaSul: [-43.19, -22.972],
  baixada: [-43.36, -22.765],
  zonaOeste: [-43.565, -22.905],
};

export function layoutFor(W, H) {
  if (W >= H) {
    return {
      W, H, portrait: false,
      brazilRect: [800, 60, 1840, 1020],
      rio: { lon: -43.42, lat: -22.875, zoom: 10.22, px: 1200, py: 610 },
      chart: { x: 110, y: 486, rowH: 84, labelW: 176, barW: 440, barH: 48, pitch: 2.8 },
      word: { x: W / 2, y: H * 0.41, size: 330 },
      hook: [W / 2 - 170, H / 2],
      topFade: 0.24,
    };
  }
  return {
    W, H, portrait: true,
    brazilRect: [50, 760, 1030, 1640],
    rio: { lon: -43.36, lat: -22.87, zoom: 9.95, px: 560, py: 1180 },
    chart: { x: 80, y: 660, rowH: 96, labelW: 190, barW: 600, barH: 56, pitch: 2.8 },
    word: { x: W / 2, y: H * 0.4, size: 250 },
    hook: [W / 2 - 140, H * 0.46],
    topFade: 0.42,
  };
}

// ---------- camera ----------

export function cameraAt(t, L) {
  const N = fitBounds(BRAZIL, L.brazilRect);
  const R = { x: lon2x(L.rio.lon), y: lat2y(L.rio.lat), zoom: L.rio.zoom, px: L.rio.px, py: L.rio.py };
  // Intro: open centred on the hook dot (Brasília), then drift so Brazil
  // settles right of the copy; a slow push continues under the chart.
  const H0 = { x: lon2x(BRASILIA[0]), y: lat2y(BRASILIA[1]), zoom: N.zoom + 0.32, px: L.hook[0], py: L.hook[1] };
  const k0 = ease.inOutCubic(prog(t, T.burst[0] - 0.05, 1.8));
  const push = prog(t, 2.0, T.fly[0]) * 0.07;
  const national = {
    x: lerp(H0.x, N.x, k0), y: lerp(H0.y, N.y, k0), px: lerp(H0.px, N.px, k0), py: lerp(H0.py, N.py, k0),
    zoom: lerp(H0.zoom, N.zoom, k0) + push, bearing: 0, pitch: 0,
  };
  if (t < T.fly[0]) return national;

  const k = ease.inOutCubic(prog(t, ...T.fly));
  const path = flyPath(national0(N), R);
  const c = path(k);
  const tilt = ease.inOutSine(prog(k, 0.45, 1));
  const cam = {
    ...c,
    px: lerp(N.px, R.px, ease.inOutSine(k)),
    py: lerp(N.py, R.py, ease.inOutSine(k)),
    pitch: 30 * tilt,
    bearing: -14 * tilt,
  };
  if (t <= T.fly[1]) return cam;

  // Rio: a continuous slow orbit so the three lenses never sit still.
  const d = ease.inOutSine(prog(t, T.fly[1], DURATION));
  return { ...cam, zoom: R.zoom + 0.42 * d, pitch: 30 + 8 * d, bearing: -14 + 20 * d };
}
const national0 = (N) => ({ ...N, zoom: N.zoom + 0.07 });

export function hookPoint(L) {
  const v = makeView(cameraAt(0, L), L.W, L.H);
  return v.project(lon2x(BRASILIA[0]), lat2y(BRASILIA[1]));
}

// ---------- dot layers ----------

const RACE_LEVELS = { 5: 'br_race_5', 6: 'br_race_6', 7: 'race_7', 8: 'race_8', 9: 'race_9', 10: 'race_10', 11: 'rio_race_11' };
const smooth = (a, b, x) => { const u = prog(x, a, b); return u * u * (3 - 2 * u); };

// Which zoom level(s) of dots to show: one level ahead of the camera, like
// the product at high DPI, with a dither crossfade between neighbours.
export const RACE_PER_DOT = { 5: 900, 6: 400, 7: 150, 8: 120, 9: 90, 10: 70, 11: 35 };
// Geometric blend of the per-dot scale across the levels on screen, so the
// "1 ponto = N" chip rolls smoothly while the dots crossfade.
export function perDotAt(zoom) {
  let s = 0;
  for (const [lvl, w] of Object.entries(lodWeights(zoom))) s += w * Math.log(RACE_PER_DOT[lvl] ?? 35);
  return Math.round(Math.exp(s));
}

function lodWeights(zoom) {
  const Ld = Math.min(11, Math.max(5, zoom + 0.95));
  const L0 = Math.floor(Ld);
  const tt = L0 >= 11 ? 0 : smooth(0.3, 0.9, Ld - L0);
  return { [L0]: 1 - tt, [L0 + 1]: tt };
}

function sizeAt(zoom, L) {
  const stops = [[4, 1.85], [6, 1.9], [8, 2.0], [10, 2.1], [11, 2.35]];
  let s = stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z0, s0] = stops[i - 1];
    const [z1, s1] = stops[i];
    if (zoom >= z0) s = lerp(s0, s1, prog(zoom, z0, z1));
  }
  return s * (L.portrait ? 1.1 : 1);
}

// Screen-space wipe front that sweeps a direction across the whole frame.
function wipe(t, [a, b], dir, L) {
  const n = Math.hypot(dir[0], dir[1]);
  const d = [dir[0] / n, dir[1] / n];
  const proj = [[0, 0], [L.W, 0], [0, L.H], [L.W, L.H]].map(([x, y]) => x * d[0] + y * d[1]);
  const lo = Math.min(...proj) - 160;
  const hi = Math.max(...proj) + 160;
  return { dir: d, offset: lerp(lo, hi, ease.inOutCubic(prog(t, a, b))), jitter: 150, pop: 1.3 };
}

export function layersAt(t, L, cam) {
  const out = [];
  const size = sizeAt(cam.zoom, L);
  const topFade = cam.pitch > 0 ? [lerp(-2, 0, cam.pitch / 30), lerp(-1, L.H * L.topFade, cam.pitch / 30)] : null;
  const race = (ds, fade, extra = {}) => out.push({ ds, fade, size, alpha: 1, palette: PALETTE.race, topFade, ...extra });

  if (t < T.fly[0]) {
    // Intro burst out of the hook dot, then map ↔ chart.
    if (t < T.burst[0]) return out;
    let morph = null;
    if (t < T.chartIn[0]) {
      morph = { target: 'hook', t: prog(t, ...T.burst), dir: 'in', ease: 'expo', stagger: 0.5, arc: 0.35, size: 1.2 };
    } else if (t < T.chartOut[0]) {
      const dim = lerp(1, 0.13, ease.outCubic(prog(t, T.chartIn[0], T.chartIn[0] + 0.5)));
      morph = { target: 'chart', t: prog(t, ...T.chartIn), dir: 'out', ease: 'cubic', stagger: 0.45, arc: 0.45, size: 2.5, dimOthers: dim };
    } else {
      const dim = lerp(0.13, 1, ease.inOutCubic(prog(t, T.chartOut[1] - 0.45, T.chartOut[1])));
      morph = { target: 'chart', t: prog(t, ...T.chartOut), dir: 'in', ease: 'cubic', stagger: 0.4, arc: 0.4, size: 2.5, dimOthers: dim };
    }
    race('br_race_5', 1, { morph });
    return out;
  }

  if (t < T.income[0]) {
    for (const [lvl, w] of Object.entries(lodWeights(cam.zoom))) if (w > 0) race(RACE_LEVELS[lvl], w);
    return out;
  }
  // Rio lenses: race → income → religion by sweeping fronts.
  if (t >= T.income[0] && t < T.income[1]) {
    const w = wipe(t, T.income, [1, 0.42], L);
    race('rio_race_11', 1, { wipe: { ...w, side: 1 } });
    out.push({ ds: 'rio_income_11', fade: 1, size, alpha: 1, palette: PALETTE.income, topFade, wipe: { ...w, side: -1 } });
  } else if (t >= T.income[1] && t < T.religion[0]) {
    out.push({ ds: 'rio_income_11', fade: 1, size, alpha: 1, palette: PALETTE.income, topFade });
  } else if (t >= T.religion[0] && t < T.religion[1]) {
    const w = wipe(t, T.religion, [-1, -0.42], L);
    out.push({ ds: 'rio_income_11', fade: 1, size, alpha: 1, palette: PALETTE.income, topFade, wipe: { ...w, side: 1 } });
    out.push({ ds: 'rio_religion_11', fade: 1, size, alpha: 1, palette: PALETTE.religion, topFade, wipe: { ...w, side: -1 } });
  } else if (t >= T.religion[1]) {
    // Outro: religion dissolves back into race dots, which then become the wordmark.
    const x = ease.inOutSine(prog(t, T.outro, T.outro + 0.3));
    if (x < 1) out.push({ ds: 'rio_religion_11', fade: 1 - x, size, alpha: 1, palette: PALETTE.religion, topFade });
    if (x > 0) {
      const dim = 1 - ease.inOutCubic(prog(t, T.word[0], T.word[0] + 0.45));
      const morph = t >= T.word[0] ? { target: 'word', t: prog(t, ...T.word), dir: 'out', ease: 'cubic', stagger: 0.38, arc: 0.55, size: L.portrait ? 2.6 : 2.45, dimOthers: dim } : null;
      race('rio_race_11', x, { morph, topFade: morph ? null : topFade });
    }
  }
  return out;
}

export function landAlpha(t, cam) {
  return ease.outCubic(prog(t, 0.9, 1.9)) * (1 - prog(cam.zoom, 5.6, 7.2));
}

// ---------- morph targets (screen px, flag) ----------

export function buildTargets(dots, L, glyphSampler) {
  const rand = mulberry32(7);

  // Hook: every national dot starts inside a tiny disc at Brasília.
  const nat = dots.sets.br_race_5;
  const [hx, hy] = hookPoint(L);
  const hook = new Float32Array(nat.count * 3);
  for (let i = 0; i < nat.count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 7;
    hook.set([hx + Math.cos(a) * r, hy + Math.sin(a) * r, 1], i * 3);
  }
  dots.setTarget('br_race_5', 'hook', hook);

  // Chart: a bar per race, built from dots in official proportion. Western
  // dots fill the left of each bar so the flight reads as a flow, not noise.
  const C = L.chart;
  const rows = Math.floor(C.barH / C.pitch);
  const maxCols = Math.floor(C.barW / C.pitch);
  const chart = new Float32Array(nat.count * 3);
  const viewChart = makeView(cameraAt(T.chartIn[0], L), L.W, L.H);
  RACE_SHARES.forEach((share, cat) => {
    const cols = Math.max(1, Math.round((share / RACE_SHARES[0]) * maxCols));
    const want = cols * rows;
    const idx = [];
    for (let i = 0; i < nat.count && idx.length < want; i++) if (nat.cats[i] === cat) idx.push(i);
    const sx = idx.map((i) => viewChart.project(nat.origin[0] + nat.xy[i * 2] / dots.SCALE, nat.origin[1] + nat.xy[i * 2 + 1] / dots.SCALE)[0]);
    const order = idx.map((_, k) => k).sort((a, b) => sx[a] - sx[b]);
    const y0 = C.y + cat * C.rowH + (C.rowH - C.barH) / 2 + 12;
    order.forEach((k, slot) => {
      const col = Math.floor(slot / rows);
      const row = slot % rows;
      const jx = (rand() - 0.5) * C.pitch * 0.35;
      const jy = (rand() - 0.5) * C.pitch * 0.35;
      chart.set([C.x + C.labelW + col * C.pitch + jx, y0 + row * C.pitch + jy, 1], idx[k] * 3);
    });
  });
  dots.setTarget('br_race_5', 'chart', chart);

  // Wordmark: sample the glyphs, then hand each sample to an on-screen Rio
  // dot, matched left-to-right so the dots stream into the letters.
  const rio = dots.sets.rio_race_11;
  const samples = glyphSampler(L);
  const viewWord = makeView(cameraAt(T.word[0], L), L.W, L.H);
  const onScreen = [];
  for (let i = 0; i < rio.count; i++) {
    const [x, y, w] = viewWord.project(rio.origin[0] + rio.xy[i * 2] / dots.SCALE, rio.origin[1] + rio.xy[i * 2 + 1] / dots.SCALE);
    if (w > 0 && x > 0 && x < L.W && y > L.H * L.topFade * 0.6 && y < L.H) onScreen.push([i, x, y]);
  }
  // Spread the pick evenly over the visible dots.
  const pick = [];
  const step = onScreen.length / samples.length;
  for (let k = 0; k < samples.length && k * step < onScreen.length; k++) pick.push(onScreen[Math.floor(k * step)]);
  pick.sort((a, b) => a[1] - b[1]);
  samples.sort((a, b) => a[0] - b[0]);
  const word = new Float32Array(rio.count * 3);
  pick.forEach(([i], k) => word.set([samples[k][0], samples[k][1], 1], i * 3));
  dots.setTarget('rio_race_11', 'word', word);
  return { wordDots: pick.length, samples: samples.length };
}
