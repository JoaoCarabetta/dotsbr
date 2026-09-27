// Short 2 — "Sotaque". Every election someone blames the Nordeste. The
// Nordeste is 54,6 million people (26,9% of Brazil) — and nearly 8 in 10 of
// its homes sit where the neighbourhood's typical income is up to 1 minimum
// wage; in the Sul, under 1 in 10 (scripts/election_stats.mjs, z14). The
// divide the map shows is income, not accent.
import { portraitLayout, national, regionCam, REGION_BOXES, regionMask, blend, drift, dotSize, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { chrome, setupWord, wordMorph } from '../kit/shorts.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.income;
export const BEAT = 60 / 128;
export const GRID0 = 3.0;
const b = grid(GRID0, BEAT);
const T = {
  reveal: [b(0), b(0) + 1.4],
  solo: b(7),
  nordeste: b(8),
  sul: b(17),
  punch: b(26),
  word: [b(35) + 0.2, b(39)],
};
const DURATION = +(b(43) + 0.3).toFixed(2);

function camera(t, L) {
  // Lean toward each region in turn (both leans chained, so the hand-off
  // from one to the other is continuous).
  const k = (a, z) => 0.4 * ease.inOutCubic(prog(t, a, a + 1.2)) * (1 - ease.inOutCubic(prog(t, z, z + 1.2)));
  const N = drift(national(L), t, [0, DURATION], { zoom: 0.1 });
  const ne = blend(N, regionCam(L, REGION_BOXES.Nordeste), k(T.nordeste, T.sul));
  return blend(ne, regionCam(L, REGION_BOXES.Sul), k(T.sul, T.punch));
}

// Only the "up to 1 minimum wage" band, from the solo to the wordmark.
function catAlpha(t) {
  const k = ease.inOutCubic(prog(t, T.solo, T.solo + 0.8)) * (1 - ease.inOutCubic(prog(t, T.word[0] - 0.6, T.word[0])));
  if (k <= 0) return null;
  const d = lerp(1, 0.1, k);
  return P.map((_, i) => (i === 0 ? 1 : d));
}

function mask(t) {
  const ne = ease.inOutCubic(prog(t, T.nordeste + 0.2, T.nordeste + 0.9)) * (1 - ease.inOutCubic(prog(t, T.sul, T.sul + 0.5)));
  const su = ease.inOutCubic(prog(t, T.sul + 0.2, T.sul + 0.8)) * (1 - ease.inOutCubic(prog(t, T.punch, T.punch + 0.7)));
  if (ne > 0) return regionMask('Nordeste', ne, 0.12);
  if (su > 0) return regionMask('Sul', su, 0.12);
  return null;
}

function reveal(t, L) {
  const k = ease.inOutCubic(prog(t, ...T.reveal));
  if (k >= 1) return null;
  return [L.W / 2, 1150, lerp(0, 1300, k), 90];
}

function layers(t, L, cam) {
  if (t < T.reveal[0]) return [];
  const base = { ds: 'br_income_5', fade: 1, size: dotSize(cam.zoom), alpha: 1, palette: P };
  if (t >= T.word[0]) return [{ ...base, morph: wordMorph(t, T.word, L) }];
  return [{ ...base, catAlpha: catAlpha(t), ufAlpha: mask(t), reveal: reveal(t, L) }];
}

// The hook: Brazil as one flat ink shape, the way an election-night map
// flattens it. The reveal cuts a growing hole and the dots are underneath.
function land(t, cam, L) {
  const rv = reveal(t, L);
  if (t < T.reveal[0] || rv) return { alpha: ease.outCubic(prog(t, 0.05, 0.6)), ink: '#16181b', hole: rv ? [rv[0], rv[1], Math.max(0, rv[2] - 40)] : null };
  return 1 - ease.inCubic(prog(t, T.word[0] - 0.4, T.word[0] + 0.2));
}

function targets(dots, L, kit) {
  return { word: setupWord(dots, 'br_income_5', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', '#16181b'), head: 'Toda eleição, alguém culpa *o Nordeste*.', color: P[0], size: 116 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022', P[0]), head: 'O Nordeste tem *54,6 milhões* de pessoas.', sub: 'Mais de 1 em cada 4 brasileiros. Cada ponto aqui é um grupo de lares.', color: P[0], size: 104 });
  const ramp = UI.Legend(r, UI.rampHtml(P.slice(0, 6), ['Até 1 salário mínimo', '', 'Mais de 10'], 'Renda típica da vizinhança'));
  const ne = UI.Block(r, { top: 230, kicker: K('Nordeste', P[0]), head: '*Quase 8 em cada 10* lares ficam onde a renda típica é de até 1 salário mínimo.', color: P[0] });
  const sul = UI.Block(r, { top: 230, kicker: K('Sul', P[0]), head: 'No Sul, *menos de 1 em cada 10*.', color: P[0], size: 116 });
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'O Brasil não se divide por sotaque. *Se divide por renda.*', color: P[0], size: 104 });
  const ch = chrome(r, L, { brandIn: T.reveal[0] + 0.1, brandOut: T.word[0], sourceIn: T.reveal[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  return (t) => {
    hook(t, 0.25, T.reveal[0] - 0.1);
    intro(t, T.reveal[0] + 0.5, T.nordeste - 0.1);
    ramp(t, T.reveal[0] + 1.2, T.word[0] - 0.3);
    ne(t, T.nordeste + 0.05, T.sul - 0.1);
    sul(t, T.sul + 0.05, T.punch - 0.1);
    punch(t, T.punch + 0.1, T.word[0]);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'D', progression: ['i', 'VII', 'VI', 'VII'],
  sections: [
    { a: 0, b: T.reveal[0], drums: 0, plucks: 0 },
    { a: T.reveal[0], b: T.nordeste, drums: 1, plucks: 2 },
    { a: T.nordeste, b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.2 }, { type: 'burst', t: T.reveal[0], until: T.reveal[1] },
    { type: 'tick', t: T.solo }, { type: 'whoosh', t: T.nordeste, from: 0.6, to: -0.2 },
    { type: 'whoosh', t: T.sul, from: -0.2, to: 0.6 },
    { type: 'riser', t: T.punch - 1.4, until: T.punch },
    { type: 'crash', t: T.punch },
    { type: 'outro', t: T.word[0] - 0.2, until: T.word[1] },
  ],
};

export default {
  duration: DURATION,
  datasets: ['br_income_5'],
  layout: portraitLayout,
  camera,
  layers,
  land,
  targets,
  overlay,
  cues,
};
