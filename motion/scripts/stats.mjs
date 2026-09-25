// Cross-checks the numbers the video quotes against the dots themselves
// (per_dot × dots at a high zoom). Official IBGE totals stay the source for
// national claims; this only proves the map and the copy agree.
import { readDots, THEMES, UFS } from './extract.mjs';

const REGION = { AC: 'N', AM: 'N', AP: 'N', PA: 'N', RO: 'N', RR: 'N', TO: 'N', AL: 'NE', BA: 'NE', CE: 'NE', MA: 'NE', PB: 'NE', PE: 'NE', PI: 'NE', RN: 'NE', SE: 'NE', ES: 'SE', MG: 'SE', RJ: 'SE', SP: 'SE', PR: 'S', RS: 'S', SC: 'S', DF: 'CO', GO: 'CO', MS: 'CO', MT: 'CO' };
const theme = process.argv[2] || 'race';
const zoom = Number(process.argv[3] || 10);
const perDot = { race: [4500, 2000, 900, 400, 150, 120, 90, 70, 50, 35, 25, 20], income: [1500, 700, 300, 130, 50, 40, 30, 24, 17, 12, 8, 7], religion: [3900, 1750, 790, 350, 130, 105, 80, 60, 44, 31, 22, 18] }[theme][zoom - 3];
const keys = THEMES[theme].keys;
const tally = {};
const add = (k, c) => { tally[k] ??= new Array(keys.length).fill(0); tally[k][c]++; };
for (const uf of UFS) {
  const { cats } = readDots({ theme, zoom, ufs: [uf] });
  for (const c of cats) { add('BR', c); add(REGION[uf], c); add(uf, c); }
}
const fmt = (arr) => { const t = arr.reduce((a, b) => a + b, 0); return `${(t * perDot / 1e6).toFixed(2)}M  ` + keys.map((k, i) => `${k.replace(/^(income_|relig_)/, '')} ${(100 * arr[i] / t).toFixed(1)}%`).join('  '); };
for (const k of ['BR', 'N', 'NE', 'SE', 'S', 'CO', 'RJ', 'SP', 'BA', 'RS', 'SC', 'PR', 'AM', 'RR', 'PA']) console.log(k.padEnd(3), fmt(tally[k]));
