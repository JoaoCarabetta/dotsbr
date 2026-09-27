// Numbers quoted by the election-themed shorts (src/stories/*), read off the
// corrected tiles. Regions use z14 (unbiased); places use z12 dots inside
// rough rectangles, so the copy only quotes rounded fractions.
import { readDots, THEMES, UFS } from './extract.mjs';

const REGION = { AC: 'Norte', AM: 'Norte', AP: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte', AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste', ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste', PR: 'Sul', RS: 'Sul', SC: 'Sul', DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste' };
const pct = (c, keys) => { const t = c.reduce((a, b) => a + b, 0); return keys.map((k, i) => `${k.replace(/^(income_|relig_)/, '')} ${(100 * c[i] / t).toFixed(1)}`).join('  '); };

for (const theme of ['race', 'religion', 'income']) {
  const keys = THEMES[theme].keys;
  const reg = {};
  const br = new Array(keys.length).fill(0);
  for (const uf of UFS) {
    const { cats } = readDots({ theme, zoom: 14, ufs: [uf] });
    const r = (reg[REGION[uf]] ??= new Array(keys.length).fill(0));
    for (const c of cats) { r[c]++; br[c]++; }
  }
  console.log(`\n== ${theme} z14`);
  console.log('Brasil'.padEnd(13), pct(br, keys));
  for (const [k, v] of Object.entries(reg)) console.log(k.padEnd(13), pct(v, keys));
}

const PLACES = {
  race: {
    Manaus: [-60.10, -3.15, -59.90, -2.95],
    Salvador: [-38.53, -13.02, -38.33, -12.85],
    // Roughly the whole municipality (the centre alone reads ~61% branca,
    // which would overstate the city).
    'São Paulo': [-46.83, -23.85, -46.36, -23.36],
    'Porto Alegre': [-51.25, -30.15, -51.10, -29.98],
  },
  income: {
    'Lago Sul': [-47.88, -15.88, -47.78, -15.82],
    'Plano Piloto': [-47.93, -15.84, -47.86, -15.73],
    'Ceilândia': [-48.15, -15.86, -48.07, -15.78],
  },
  religion: {
    'Campo Grande + Santa Cruz': [-43.80, -22.97, -43.50, -22.85],
    'Copacabana a Leblon': [-43.24, -22.99, -43.17, -22.96],
  },
};
for (const [theme, places] of Object.entries(PLACES)) {
  console.log(`\n== ${theme} places (z12)`);
  for (const [name, bbox] of Object.entries(places)) {
    const { cats } = readDots({ theme, zoom: 12, ufs: UFS, bbox });
    const c = new Array(THEMES[theme].keys.length).fill(0);
    cats.forEach((k) => c[k]++);
    console.log(name.padEnd(26), String(cats.length).padStart(7), pct(c, THEMES[theme].keys));
  }
}
