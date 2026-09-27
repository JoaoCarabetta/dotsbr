// Short 5 — "Imposto". A unit chart on the census map (1 ponto = 900
// pessoas). Since January 2026 ~15 million people pay less income tax or
// none (exemption up to R$ 5 mil/month); the ~141 thousand who make more
// than R$ 50 mil/month paid 2,54% on average and now owe a minimum tax
// (Ministério da Fazenda, Lei 15.270/2025). 15 million = 16.667 dots; 141
// thousand = 157. The dots are a random sample of the census population:
// the chart says how many, never where.
import { portraitLayout, national, dotSize, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { blockTargets } from '../kit/targets.js';
import { chrome, setupBurst, setupWord, burstMorph, wordMorph, hookAt } from '../kit/shorts.js';
import { makeView } from '../camera.js';
import { prog, lerp, ease } from '../util.js';

const INK = '#4a4d52';
const EXEMPT = '#1b9e77';
const RICH = '#d95f02';
const all = (c) => [c, c, c, c, c];
export const BEAT = 60 / 140;
export const GRID0 = +(7 * BEAT).toFixed(3);
const b = grid(GRID0, BEAT);
const T = {
  burst: [b(0), b(0) + 1.6],
  exempt: [b(8), b(8) + 1.8],
  rich: [b(18), b(18) + 1.5],
  punch: b(28),
  word: [b(38) + 0.2, b(42)],
};
const DURATION = +(b(46) + 0.3).toFixed(2);

const PER_DOT = 900;
const N_EXEMPT = Math.round(15e6 / PER_DOT);
const N_RICH = Math.round(141e3 / PER_DOT);
const BLOCK_A = { from: 0, count: N_EXEMPT, x: 90, y: 790, cols: 290, pitch: 3.1 };
// Same unit size for both blocks: the point is how small the second one is.
const BLOCK_B = { from: N_EXEMPT, count: N_RICH, x: 515, y: 1115, cols: 16, pitch: 3.1 };

const camera = (t, L) => national(L, 0.1 * ease.inOutSine(prog(t, 0, DURATION)));

function layers(t, L, cam) {
  if (t < T.burst[0]) return [];
  const size = dotSize(cam.zoom);
  const base = { ds: 'br_race_5', fade: 1, size, palette: all(INK) };
  if (t < T.exempt[0]) return [{ ...base, alpha: 1, morph: burstMorph(t, T.burst) }];
  if (t >= T.word[0]) return [{ ...base, alpha: 1, morph: wordMorph(t, T.word, L) }];
  // The map steps back when a block flies out, and again for the punchline.
  const map = lerp(1, 0.07, ease.inOutCubic(prog(t, T.exempt[0], T.exempt[0] + 0.8)));
  const back = lerp(map, 1, ease.inOutCubic(prog(t, T.word[0] - 0.9, T.word[0])));
  const out = [{ ...base, alpha: back }];
  const gone = 1 - ease.inOutCubic(prog(t, T.word[0] - 0.9, T.word[0] - 0.2));
  const exemptA = lerp(1, 0.3, ease.inOutCubic(prog(t, T.rich[0], T.rich[0] + 0.6))) * lerp(1, 0.4, ease.inOutCubic(prog(t, T.punch, T.punch + 0.8)));
  out.push({ ...base, palette: all(EXEMPT), alpha: exemptA * gone, morph: { target: 'exempt', t: prog(t, ...T.exempt), dir: 'out', ease: 'cubic', stagger: 0.55, arc: 0.3, size: 2.7, dimOthers: 0 } });
  if (t >= T.rich[0]) {
    out.push({ ...base, palette: all(RICH), alpha: gone, morph: { target: 'rich', t: prog(t, ...T.rich), dir: 'out', ease: 'cubic', stagger: 0.4, arc: 0.5, size: 2.7, dimOthers: 0 } });
  }
  return out;
}

const land = (t) => ease.outCubic(prog(t, T.burst[0] + 0.1, T.burst[0] + 1.1)) * (1 - ease.inCubic(prog(t, T.word[0], T.word[0] + 0.5)));

let boxA, boxB;
function targets(dots, L, kit) {
  setupBurst(dots, 'br_race_5', camera(T.burst[0], L), L);
  boxA = blockTargets(dots, 'br_race_5', makeView(camera(T.exempt[0], L), L.W, L.H), BLOCK_A, 'exempt');
  boxB = blockTargets(dots, 'br_race_5', makeView(camera(T.rich[0], L), L.W, L.H), BLOCK_B, 'rich');
  return { word: setupWord(dots, 'br_race_5', camera(T.word[0], L), L, kit), exempt: N_EXEMPT, rich: N_RICH };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const hookDot = UI.HookDot(r, hookAt(camera(0, L), L), INK, T.burst[0], '1 ponto = 900 pessoas');
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', '#16181b'), head: 'Quanto imposto de renda paga quem ganha *R$ 50 mil por mês*?', color: RICH, size: 100 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022', '#16181b'), head: 'O Brasil tem *203 milhões* de pessoas.', sub: 'Cada ponto aqui são 900 delas.', color: '#16181b', size: 108 });
  const exempt = UI.Block(r, { top: 230, kicker: K('Imposto de renda · 2026', EXEMPT), head: 'Desde janeiro, *15 milhões* pagam menos imposto de renda. Ou nada.', sub: 'Quem ganha até R$ 5 mil por mês ficou isento.', color: EXEMPT, size: 96 });
  const rich = UI.Block(r, { top: 230, kicker: K('Imposto de renda · 2026', RICH), head: 'Quem ganha mais de R$ 50 mil por mês são *141 mil*.', sub: 'Pagavam, em média, *2,5%* de imposto de renda.', color: RICH, size: 96 });
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'Os mais ricos do país cabem em *157 pontos*.', sub: 'E, pela primeira vez, pagam um imposto mínimo.', color: RICH, size: 108, subSize: 46 });
  const labA = UI.Label(r, { x: boxA.x, y: boxA.y + boxA.h + 16, html: `15 milhões<small>${N_EXEMPT.toLocaleString('pt-BR')} pontos</small>`, color: EXEMPT });
  const cx = boxB.x + boxB.w / 2;
  const cy = boxB.y + boxB.h / 2;
  const ring = UI.Ring(r, { x: cx, y: cy, d: 150, color: RICH });
  const labB = UI.Label(r, { x: cx + 100, y: cy - 44, html: `141 mil<small>${N_RICH} pontos</small>`, color: RICH });
  const ch = chrome(r, L, {
    brandIn: T.burst[0] + 0.1, brandOut: T.word[0], sourceIn: T.burst[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05,
    source: 'Fontes: IBGE, Censo 2022; Ministério da Fazenda',
  });
  return (t) => {
    hookDot(t);
    hook(t, 0.15, T.burst[0] - 0.1);
    intro(t, T.burst[0] + 0.5, T.exempt[0] - 0.1);
    exempt(t, T.exempt[0] + 0.05, T.rich[0] - 0.1);
    rich(t, T.rich[0] + 0.05, T.punch - 0.1);
    punch(t, T.punch + 0.1, T.word[0] - 0.1);
    labA(t, T.exempt[1] - 0.2, T.word[0] - 0.6);
    labB(t, T.rich[1] - 0.1, T.word[0] - 0.6);
    ring(t, T.rich[1] - 0.3, T.word[0] - 0.6);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'C', progression: ['i', 'VI', 'III', 'VII'],
  sections: [
    { a: 0, b: T.burst[0], drums: 0, plucks: 0 },
    { a: T.burst[0], b: T.exempt[0], drums: 0, plucks: 2 },
    { a: T.exempt[0], b: T.rich[0], drums: 1, plucks: 2 },
    { a: T.rich[0], b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.1 }, { type: 'burst', t: T.burst[0], until: T.burst[1] },
    { type: 'whoosh', t: T.exempt[0], from: 0.7, to: -0.7 }, { type: 'tick', t: T.exempt[1] - 0.2 },
    { type: 'whoosh', t: T.rich[0], from: -0.7, to: 0.4 }, { type: 'tick', t: T.rich[1] - 0.1 },
    { type: 'riser', t: T.punch - 1.4, until: T.punch },
    { type: 'crash', t: T.punch },
    { type: 'outro', t: T.word[0] - 0.2, until: T.word[1] },
  ],
};

export default {
  duration: DURATION,
  datasets: ['br_race_5'],
  layout: portraitLayout,
  camera,
  layers,
  land,
  targets,
  overlay,
  cues,
};
