// Short 3 — "O corte" (renda). There is a candidate promising to cut public
// spending: this is who lives with it. 3 in 4 homes sit where the typical
// income is up to 2 minimum wages; 4 in 100 where it passes 5. Then
// Brasília: the Plano Piloto and Ceilândia, 26 km apart in a straight line
// — the distance between where a cut is decided and where it is felt.
import { portraitLayout, national, place, fly, drift, lod, dotSize, topFade, landAtZoom, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { chrome, setupBurst, setupWord, burstMorph, wordMorph, hookAt } from '../kit/shorts.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.income;
export const BEAT = 0.45;
export const GRID0 = 2.7;
const b = grid(GRID0, BEAT);
const T = {
  burst: [b(0), b(0) + 1.6],
  poor: b(7),
  rich: b(16),
  fly: [b(24), b(30)],
  plano: b(30),
  ceil: b(37),
  punch: b(44),
  word: [b(53) + 0.2, b(57)],
};
const DURATION = +(b(61) + 0.3).toFixed(2);

const DF = place({ lon: -47.99, lat: -15.81, zoom: 10.35, px: 540, py: 1190, pitch: 30, bearing: 8 });
const LEVELS = { 5: 'br_income_5', 6: 'br_income_6', 7: 'df_income_7', 8: 'df_income_8', 9: 'df_income_9', 10: 'df_income_10', 11: 'df_income_11' };
const PLANO = [-47.89, -15.785];
const CEILANDIA = [-48.108, -15.82];
const ESPLANADA = [-47.8645, -15.7997];

function camera(t, L) {
  const N = drift(national(L), t, [0, T.fly[0]], { zoom: 0.1 });
  if (t < T.fly[0]) return N;
  return drift(fly(t, T.fly, N, DF), t, [T.plano, T.word[0]], { zoom: 0.3, bearing: 7 });
}

// Solo a band of the ramp: how far the poor (≤2) and rich (5+) solos are in.
function solo(t) {
  const on = (a, b) => ease.inOutCubic(prog(t, a + 0.15, a + 0.8)) * (1 - ease.inOutCubic(prog(t, b - 0.1, b + 0.5)));
  return { poor: on(T.poor, T.rich), rich: on(T.rich, T.fly[0]) };
}

function layers(t, L, cam) {
  if (t < T.burst[0]) return [];
  const size = dotSize(cam.zoom);
  const base = { size, alpha: 1, palette: P };
  if (t < T.poor) return [{ ...base, ds: 'br_income_5', fade: 1, morph: burstMorph(t, T.burst) }];
  if (t >= T.word[0]) return [{ ...base, ds: 'df_income_11', fade: 1, morph: wordMorph(t, T.word, L) }];
  const { poor, rich } = solo(t);
  const d = (k) => lerp(1, 0.07, k);
  const tf = topFade(cam, L);
  const out = [];
  for (const [ds, w] of lod(cam.zoom, LEVELS)) {
    const lay = { ...base, ds, fade: w, topFade: tf };
    if (poor > 0) out.push({ ...lay, catAlpha: [1, 1, d(poor), d(poor), d(poor), d(poor), d(poor)] });
    else if (rich > 0) {
      // The 5+ bands are 4% of the dots, a few specks at national scale: draw
      // them again on top, larger, so the few places they cluster pop.
      out.push({ ...lay, catAlpha: [d(rich), d(rich), d(rich), d(rich), 0, 0, d(rich)] });
      out.push({ ...lay, size: size * lerp(1, 2.3, rich), catAlpha: [0, 0, 0, 0, 1, 1, 0] });
    } else out.push(lay);
  }
  return out;
}

const land = (t, cam) => landAtZoom(cam.zoom) * ease.outCubic(prog(t, T.burst[0] + 0.1, T.burst[0] + 1.1)) * (1 - ease.inCubic(prog(t, T.word[0], T.word[0] + 0.5)));

function targets(dots, L, kit) {
  setupBurst(dots, 'br_income_5', camera(T.burst[0], L), L);
  return { word: setupWord(dots, 'df_income_11', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const ramp = UI.rampHtml(P.slice(0, 6), ['Até 1 salário mínimo', '', 'Mais de 10'], 'Renda típica da vizinhança');
  const hookDot = UI.HookDot(r, hookAt(camera(0, L), L), P[0], T.burst[0], '1 ponto = 300 lares');
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', P[0]), head: 'Tem candidato prometendo *cortar gastos* do governo.', color: P[0], size: 108 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022', P[0]), head: 'O Brasil tem *72 milhões* de lares.', sub: 'A cor mostra a renda típica de quem chefia as casas da vizinhança.', color: P[0], size: 108 });
  const legend = UI.Legend(r, ramp);
  const poor = UI.Block(r, { top: 230, kicker: K('Renda da vizinhança', P[0]), head: '*3 em cada 4* lares ficam onde a renda típica é de até 2 salários mínimos.', color: P[0] });
  const rich = UI.Block(r, { top: 230, kicker: K('Renda da vizinhança', P[5]), head: 'Só *4 em cada 100* estão onde ela passa de 5.', color: P[5], size: 108 });
  const plano = UI.Block(r, { top: 230, kicker: K('Brasília · Plano Piloto', P[5]), head: '*Quase 9 em cada 10* lares ficam onde a renda típica passa de 5 salários.', color: P[5] });
  const ceil = UI.Block(r, { top: 230, kicker: K('Brasília · Ceilândia', P[0]), head: '*3 em cada 4* ficam onde ela é de até 2.', color: P[0], size: 108 });
  const punch = UI.Block(r, { top: 230, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'Da Esplanada dos Ministérios a Ceilândia: *26\u00a0km*.', sub: 'A distância entre quem decide o corte *e quem sente.*', color: P[0], size: 96, subSize: 54 });
  const pins = UI.Pins(r, [
    { key: 'plano', name: 'Plano Piloto', lon: PLANO[0], lat: PLANO[1] },
    { key: 'ceil', name: 'Ceilândia', lon: CEILANDIA[0], lat: CEILANDIA[1] },
  ]);
  const ruler = UI.Ruler(r, { a: ESPLANADA, b: CEILANDIA, label: '26 km', labels: ['Esplanada', 'Ceilândia'], color: '#16181b' });
  const ch = chrome(r, L, { brandIn: T.burst[0] + 0.1, brandOut: T.word[0], sourceIn: T.burst[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  return (t, view) => {
    hookDot(t);
    hook(t, 0.15, T.burst[0] - 0.1);
    intro(t, T.burst[0] + 0.5, T.poor - 0.1);
    legend(t, T.burst[0] + 1.2, T.word[0] - 0.3);
    poor(t, T.poor + 0.05, T.rich - 0.1);
    rich(t, T.rich + 0.05, T.fly[0] + 0.3);
    plano(t, T.plano - 0.2, T.ceil - 0.1);
    ceil(t, T.ceil + 0.05, T.punch - 0.1);
    pins(t, view, { plano: [T.plano, T.ceil + 0.2], ceil: [T.ceil + 0.1, T.punch] });
    ruler(t, view, T.punch, T.word[0] - 0.1);
    punch(t, T.punch + 0.6, T.word[0]);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'E', progression: ['i', 'iv', 'VI', 'V'],
  sections: [
    { a: 0, b: T.burst[0], drums: 0, plucks: 0 },
    { a: T.burst[0], b: T.poor, drums: 0, plucks: 2 },
    { a: T.poor, b: T.fly[0], drums: 1, plucks: 2 },
    { a: T.fly[0], b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.1 }, { type: 'burst', t: T.burst[0], until: T.burst[1] },
    { type: 'tick', t: T.poor }, { type: 'tick', t: T.rich },
    { type: 'riser', t: T.fly[0] - 1.2, until: T.fly[0] + 0.2 },
    { type: 'whoosh', t: T.fly[0], from: -0.6, to: 0.6 },
    { type: 'tick', t: T.plano }, { type: 'tick', t: T.ceil },
    { type: 'crash', t: T.punch },
    { type: 'outro', t: T.word[0] - 0.2, until: T.word[1] },
  ],
};

export default {
  duration: DURATION,
  datasets: [...new Set(Object.values(LEVELS))],
  layout: portraitLayout,
  camera,
  layers,
  land,
  targets,
  overlay,
  cues,
};
