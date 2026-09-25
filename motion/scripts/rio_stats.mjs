// Neighbourhood contrasts inside Rio, read off z12 dots (bboxes are rough
// rectangles, good enough to check the direction and size of a claim).
import { readDots, THEMES } from './extract.mjs';
const AREAS = {
  'Zona Sul orla': [-43.235, -22.99, -43.165, -22.935],
  'Leblon-Gávea': [-43.235, -22.99, -43.215, -22.97],
  'Rocinha': [-43.254, -22.994, -43.240, -22.982],
  'Tijuca': [-43.25, -22.935, -43.215, -22.915],
  'ZN subúrbio': [-43.40, -22.88, -43.25, -22.80],
  'Baixada': [-43.50, -22.82, -43.28, -22.70],
  'Zona Oeste': [-43.72, -22.95, -43.45, -22.85],
  'Barra': [-43.42, -23.02, -43.30, -22.99],
  'Maré': [-43.255, -22.87, -43.235, -22.845],
};
for (const theme of ['race', 'income', 'religion']) {
  const keys = THEMES[theme].keys;
  console.log(`\n== ${theme}`);
  for (const [name, bbox] of Object.entries(AREAS)) {
    const { cats } = readDots({ theme, zoom: 12, ufs: ['RJ'], bbox });
    const c = new Array(keys.length).fill(0); cats.forEach((k) => c[k]++);
    const t = cats.length;
    console.log(name.padEnd(14), String(t).padStart(6), keys.map((k, i) => `${k.replace(/^(income_|relig_)/, '')} ${(100 * c[i] / t).toFixed(0)}`).join(' '));
  }
}
