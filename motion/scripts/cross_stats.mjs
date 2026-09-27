// Neighbourhood crosses quoted by the shorts: race and religion by the
// typical income of the neighbourhood. Race, religion and income live in
// separate tiles, so there is no person-level cross: dots are binned into
// ~600 m cells (2^16 per world width) and each cell's people are split
// across income bands in proportion to the cell's households. That is an
// ecological average; mixed cells blur the bands, so the gaps it reports
// are, if anything, understated.
//
//   node scripts/cross_stats.mjs
import { readDots, THEMES, UFS } from './extract.mjs';

const K = 2 ** 16;
const cells = new Map();
const cell = (x, y) => {
  const key = Math.floor(x * K) * K + Math.floor(y * K);
  let c = cells.get(key);
  if (!c) cells.set(key, (c = { inc: new Float64Array(7), race: new Float64Array(5), rel: new Float64Array(8) }));
  return c;
};

for (const uf of UFS) {
  for (const [theme, field] of [['income', 'inc'], ['race', 'race'], ['religion', 'rel']]) {
    const { xs, ys, cats } = readDots({ theme, zoom: 14, ufs: [uf] });
    for (let i = 0; i < xs.length; i++) cell(xs[i], ys[i])[field][cats[i]]++;
  }
}

const BANDS = THEMES.income.keys.slice(0, 6).map((k) => k.replace('income_', ''));
const race = BANDS.map(() => new Float64Array(5));
const rel = BANDS.map(() => new Float64Array(8));
let lost = 0;
for (const c of cells.values()) {
  const tot = c.inc.slice(0, 6).reduce((a, b) => a + b, 0);
  if (!tot) { lost += c.race.reduce((a, b) => a + b, 0); continue; }
  for (let b = 0; b < 6; b++) {
    const s = c.inc[b] / tot;
    for (let k = 0; k < 5; k++) race[b][k] += c.race[k] * s;
    for (let k = 0; k < 8; k++) rel[b][k] += c.rel[k] * s;
  }
}
const pct = (a, i) => (100 * a[i]) / a.reduce((x, y) => x + y, 0);
console.log(`cells ${cells.size}, race dots in cells without households ${lost}`);
console.log('\nband        people  pretos+pardos  branca   evangélica  católica');
BANDS.forEach((b, i) => {
  const n = race[i].reduce((x, y) => x + y, 0);
  console.log(`${b.padEnd(10)} ${String(Math.round(n * 20)).padStart(10)}   ${(pct(race[i], 0) + pct(race[i], 2)).toFixed(1).padStart(6)}   ${pct(race[i], 1).toFixed(1).padStart(6)}   ${pct(rel[i], 1).toFixed(1).padStart(8)}   ${pct(rel[i], 0).toFixed(1).padStart(8)}`);
});
// Grouped the way the copy says it: up to 2, 2–5, more than 5.
const group = (rows, idx) => { const s = new Float64Array(rows[0].length); idx.forEach((i) => rows[i].forEach((v, k) => (s[k] += v))); return s; };
for (const [name, idx] of [['até 2 SM', [0, 1]], ['5+ SM', [4, 5]], ['10+ SM', [5]]]) {
  const r = group(race, idx), g = group(rel, idx);
  console.log(`${name.padEnd(10)} pretos+pardos ${(pct(r, 0) + pct(r, 2)).toFixed(1)}  evangélica ${pct(g, 1).toFixed(1)}`);
}
// Of all pretos + pardos (and of all brancos), how many live where the typical income is up to 2 SM?
const all = group(race, [0, 1, 2, 3, 4, 5]);
const low = group(race, [0, 1]);
console.log(`\npretos+pardos in ≤2 SM neighbourhoods: ${((100 * (low[0] + low[2])) / (all[0] + all[2])).toFixed(1)}%   brancos: ${((100 * low[1]) / all[1]).toFixed(1)}%`);
const rall = group(rel, [0, 1, 2, 3, 4, 5]);
const rlow = group(rel, [0, 1]);
console.log(`evangélicos in ≤2 SM neighbourhoods: ${((100 * rlow[1]) / rall[1]).toFixed(1)}%   católicos: ${((100 * rlow[0]) / rall[0]).toFixed(1)}%`);
