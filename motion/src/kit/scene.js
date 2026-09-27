// Camera moves, level-of-detail blending and palettes shared by the stories.
import { fitBounds, flyPath, lon2x, lat2y } from '../camera.js';
import { prog, lerp, ease } from '../util.js';

export const BRAZIL = [-74, -33.8, -34.7, 5.3];

// Same order as scripts/extract.mjs UFS: the second meta byte of every dot.
export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const REGIONS = {
  Norte: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
  Sudeste: ['ES', 'MG', 'RJ', 'SP'],
  Sul: ['PR', 'RS', 'SC'],
};

// Per-UF alpha: 1 inside the region, `dim` elsewhere, eased by k (0 → all 1).
export function regionMask(region, k, dim = 0.1) {
  const on = new Set(REGIONS[region]);
  return UFS.map((uf) => (on.has(uf) ? 1 : lerp(1, dim, k)));
}

// Display order = extract.mjs THEMES keys, so index i is palette slot i.
export const PALETTE = {
  race: ['#e41a1c', '#4daf4a', '#ff7f00', '#984ea3', '#377eb8'],
  income: ['#b2182b', '#d6604d', '#f4a582', '#92c5de', '#4393c3', '#2166ac', '#777777'],
  religion: ['#2c7fb8', '#e6550d', '#737373', '#756bb1', '#31a354', '#8c510a', '#f768a1', '#bdbdbd'],
};
export const LEGEND = {
  race: [['Parda', PALETTE.race[0]], ['Branca', PALETTE.race[1]], ['Preta', PALETTE.race[2]], ['Indígena', PALETTE.race[3]], ['Amarela', PALETTE.race[4]]],
  religion: [['Católica', PALETTE.religion[0]], ['Evangélicas', PALETTE.religion[1]], ['Sem religião', PALETTE.religion[2]], ['Outras', PALETTE.religion[6]]],
};
// people (or households) per dot at z3…z14 — scripts/themes.py.
export const PER_DOT = {
  race: [4500, 2000, 900, 400, 150, 120, 90, 70, 50, 35, 25, 20],
  income: [1500, 700, 300, 130, 50, 40, 30, 24, 17, 12, 8, 7],
  religion: [3900, 1750, 790, 350, 130, 105, 80, 60, 44, 31, 22, 18],
};

const smooth = (a, b, x) => { const u = prog(x, a, b); return u * u * (3 - 2 * u); };

// Which level(s) to draw: one zoom ahead of the camera, dither-crossfaded.
// `levels` maps zoom level → dataset name; returns [[name, weight], …].
export function lod(zoom, levels, offset = 0.95) {
  const zs = Object.keys(levels).map(Number).sort((a, b) => a - b);
  const Ld = Math.min(zs[zs.length - 1], Math.max(zs[0], zoom + offset));
  const L0 = Math.floor(Ld);
  const tt = L0 >= zs[zs.length - 1] ? 0 : smooth(0.3, 0.9, Ld - L0);
  return [[levels[L0], 1 - tt], [levels[L0 + 1], tt]].filter(([ds, w]) => ds && w > 0);
}

export function perDot(theme, zoom, levels, offset = 0.95) {
  let s = 0;
  for (const [ds, w] of lod(zoom, levels, offset)) {
    const lvl = Number(Object.keys(levels).find((k) => levels[k] === ds));
    s += w * Math.log(PER_DOT[theme][lvl - 3]);
  }
  return Math.round(Math.exp(s));
}

export function dotSize(zoom, portrait = true) {
  const stops = [[4, 1.85], [6, 1.9], [8, 2.0], [10, 2.1], [11, 2.35]];
  let s = stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z0, s0] = stops[i - 1];
    const [z1, s1] = stops[i];
    if (zoom >= z0) s = lerp(s0, s1, prog(zoom, z0, z1));
  }
  return s * (portrait ? 1.1 : 1);
}

// The land layer is a coarse coastline: fine for Brazil, wrong over a city's
// bay. It fades out as the camera goes below the metro scale.
export const landAtZoom = (zoom) => 1 - ease.inOutCubic(prog(zoom, 7, 8.8));

// Pitched cameras fade dots toward the horizon (and away from the copy).
export function topFade(cam, L) {
  if (!cam.pitch) return null;
  const k = Math.min(1, cam.pitch / 30);
  return [lerp(-2, 0, k), lerp(-1, L.H * L.topFade, k)];
}

// ---------- cameras ----------

export const national = (L, zoomOffset = 0) => {
  const N = fitBounds(BRAZIL, L.brazilRect);
  return { ...N, zoom: N.zoom + zoomOffset, bearing: 0, pitch: 0 };
};

// Camera framing a lon/lat box inside the map area (for region beats).
export const regionCam = (L, bbox) => ({ ...fitBounds(bbox, L.brazilRect), bearing: 0, pitch: 0 });
export const REGION_BOXES = {
  Sul: [-57.7, -33.8, -48.0, -22.5],
  Norte: [-74, -13.7, -46, 5.3],
  Nordeste: [-48.8, -18.4, -34.7, -1.0],
};

export const place = ({ lon, lat, zoom, px, py, pitch = 0, bearing = 0 }) => ({ x: lon2x(lon), y: lat2y(lat), zoom, px, py, pitch, bearing });

export function blend(A, B, k) {
  const o = {};
  for (const key of ['x', 'y', 'zoom', 'px', 'py', 'pitch', 'bearing']) o[key] = lerp(A[key] ?? 0, B[key] ?? 0, k);
  return o;
}

// MapLibre-style flyTo between two cameras over [t0, t1], tilting in on arrival.
export function fly(t, [t0, t1], A, B) {
  const k = ease.inOutCubic(prog(t, t0, t1));
  const c = flyPath(A, B)(k);
  const tilt = ease.inOutSine(prog(k, 0.45, 1));
  const e = ease.inOutSine(k);
  return {
    ...c,
    px: lerp(A.px, B.px, e),
    py: lerp(A.py, B.py, e),
    pitch: lerp(A.pitch || 0, B.pitch || 0, tilt),
    bearing: lerp(A.bearing || 0, B.bearing || 0, tilt),
  };
}

// Slow continuous motion so held shots never freeze.
export function drift(cam, t, [t0, t1], { zoom = 0, pitch = 0, bearing = 0 } = {}) {
  const d = ease.inOutSine(prog(t, t0, t1));
  return { ...cam, zoom: cam.zoom + zoom * d, pitch: (cam.pitch || 0) + pitch * d, bearing: (cam.bearing || 0) + bearing * d };
}

// Screen-space wipe front sweeping a direction across the frame.
export function wipe(t, [a, b], dir, L) {
  const n = Math.hypot(dir[0], dir[1]);
  const d = [dir[0] / n, dir[1] / n];
  const proj = [[0, 0], [L.W, 0], [0, L.H], [L.W, L.H]].map(([x, y]) => x * d[0] + y * d[1]);
  return { dir: d, offset: lerp(Math.min(...proj) - 160, Math.max(...proj) + 160, ease.inOutCubic(prog(t, a, b))), jitter: 150, pop: 1.3 };
}

// A beat grid helper: b(n) = grid0 + n beats, rounded to the millisecond.
export const grid = (grid0, beat) => (n) => +(grid0 + n * beat).toFixed(3);

// Portrait layout shared by the election shorts (1080×1920): copy on top,
// map in the middle, the bottom ~300px left to the platform's own UI.
export function portraitLayout(W, H) {
  return {
    W, H, portrait: true,
    brazilRect: [60, 690, 1020, 1600],
    col: { x: 80, w: 920 },
    word: { x: W / 2, y: H * 0.4, size: 250 },
    hook: [W / 2, H * 0.62],
    topFade: 0.42,
  };
}
