// Morph targets (screen px + flag per dot) for the dot choreography: the
// explosion out of one dot, dots stacking into bars, dots writing a word.
import { mulberry32 } from '../util.js';

const mercOf = (dots, set, i) => [set.origin[0] + set.xy[i * 2] / dots.SCALE, set.origin[1] + set.xy[i * 2 + 1] / dots.SCALE];

// Every dot starts inside a small disc at `point` (the hook dot).
export function burstTargets(dots, ds, [hx, hy], key = 'hook', radius = 7) {
  const set = dots.sets[ds];
  const rand = mulberry32(7);
  const out = new Float32Array(set.count * 3);
  for (let i = 0; i < set.count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * radius;
    out.set([hx + Math.cos(a) * r, hy + Math.sin(a) * r, 1], i * 3);
  }
  dots.setTarget(ds, key, out);
}

// One bar per category in `order`, `shares` in %, bars scaled to the first
// share. Dots are picked per category in the official proportion (tiles can
// be off by rounding) and western dots fill the left of each bar, so the
// flight reads as a flow. Returns each bar's end x for the value labels.
export function barTargets(dots, ds, view, { order, shares, x, y, rowH, labelW, barW, barH, pitch }, key = 'bars') {
  const set = dots.sets[ds];
  const rand = mulberry32(9);
  const rows = Math.floor(barH / pitch);
  const maxCols = Math.floor(barW / pitch);
  const out = new Float32Array(set.count * 3);
  const ends = [];
  order.forEach((cat, r) => {
    const cols = Math.max(1, Math.round((shares[r] / Math.max(...shares)) * maxCols));
    const want = cols * rows;
    const idx = [];
    for (let i = 0; i < set.count && idx.length < want; i++) if (set.cats[i] === cat) idx.push(i);
    const sx = idx.map((i) => view.project(...mercOf(dots, set, i))[0]);
    const byX = idx.map((_, k) => k).sort((a, b) => sx[a] - sx[b]);
    const y0 = y + r * rowH + (rowH - barH) / 2;
    byX.forEach((k, slot) => {
      const col = Math.floor(slot / rows);
      const row = slot % rows;
      out.set([x + labelW + col * pitch + (rand() - 0.5) * pitch * 0.35, y0 + row * pitch + (rand() - 0.5) * pitch * 0.35, 1], idx[k] * 3);
    });
    ends.push(x + labelW + cols * pitch);
  });
  dots.setTarget(ds, key, out);
  return ends;
}

// Hand each glyph sample to an on-screen dot, matched left-to-right so the
// dots stream into the letters instead of crossing.
export function wordTargets(dots, ds, view, samples, L, key = 'word') {
  const set = dots.sets[ds];
  const onScreen = [];
  for (let i = 0; i < set.count; i++) {
    const [x, y, w] = view.project(...mercOf(dots, set, i));
    if (w > 0 && x > 0 && x < L.W && y > L.H * (L.topFade || 0) * 0.6 && y < L.H) onScreen.push([i, x]);
  }
  const pick = [];
  const step = onScreen.length / samples.length;
  for (let k = 0; k < samples.length && k * step < onScreen.length; k++) pick.push(onScreen[Math.floor(k * step)]);
  pick.sort((a, b) => a[1] - b[1]);
  const sorted = [...samples].sort((a, b) => a[0] - b[0]);
  const out = new Float32Array(set.count * 3);
  pick.forEach(([i], k) => out.set([sorted[k][0], sorted[k][1], 1], i * 3));
  dots.setTarget(ds, key, out);
  return pick.length;
}
