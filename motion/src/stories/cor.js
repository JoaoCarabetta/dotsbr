// Short 1 — "A desigualdade tem cor". Every campaign speaks for "o povo";
// the census says who that is (majority negra: 55,5%) and where that
// majority lives: the same map wiped from race to neighbourhood income.
// Where the typical income is up to 1 minimum wage, 7 in 10 residents are
// pretos or pardos; where it passes 10, 1 in 5 (scripts/cross_stats.mjs).
import { portraitLayout, national, dotSize, wipe, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { barTargets } from '../kit/targets.js';
import { chrome, setupBurst, setupWord, burstMorph, wordMorph, hookAt } from '../kit/shorts.js';
import { makeView } from '../camera.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.race;
export const BEAT = 0.5;
export const GRID0 = 2.5;
const b = grid(GRID0, BEAT);
const T = {
  burst: [b(0), b(0) + 1.6],
  chartIn: [b(9), b(9) + 1.2],
  chartB: b(14.5),
  chartOut: [b(20), b(20) + 1.0],
  map: b(21),
  toIncome: [b(22), b(22) + 1.4],
  punch: b(33),
  toRace: [b(33), b(33) + 1.4],
  word: [b(43) + 0.2, b(47)],
};
const DURATION = +(b(51) + 0.3).toFixed(2);

// Pardos and pretos side by side so one bracket can hold them.
const ORDER = [0, 2, 1, 3, 4];
const SHARES = [45.3, 10.2, 43.5, 0.6, 0.4];
const ROWS = [['Parda', P[0]], ['Preta', P[2]], ['Branca', P[1]], ['Indígena', P[3]], ['Amarela', P[4]]];
const CHART = { x: 80, y: 700, rowH: 100, labelW: 222, barW: 470, barH: 56, pitch: 2.8 };

const camera = (t, L) => national(L, 0.14 * ease.inOutSine(prog(t, 0, DURATION)));

function layers(t, L, cam) {
  if (t < T.burst[0]) return [];
  const size = dotSize(cam.zoom);
  const base = { ds: 'br_race_5', fade: 1, size, alpha: 1, palette: P };
  if (t < T.chartIn[0]) return [{ ...base, morph: burstMorph(t, T.burst) }];
  if (t < T.chartOut[0]) {
    // Bars: the other dots wait at 13%; at the bracket, the non-negro rows dim.
    const others = lerp(1, 0.28, ease.inOutCubic(prog(t, T.chartB, T.chartB + 0.4)));
    const dim = lerp(1, 0.13, ease.outCubic(prog(t, T.chartIn[0], T.chartIn[0] + 0.5)));
    return [{ ...base, catAlpha: [1, others, 1, others, others], morph: { target: 'bars', t: prog(t, ...T.chartIn), dir: 'out', ease: 'cubic', stagger: 0.45, arc: 0.45, size: 2.6, dimOthers: dim } }];
  }
  if (t < T.map) {
    const dim = lerp(0.13, 1, ease.inOutCubic(prog(t, T.chartOut[1] - 0.45, T.chartOut[1])));
    return [{ ...base, morph: { target: 'bars', t: prog(t, ...T.chartOut), dir: 'in', ease: 'cubic', stagger: 0.4, arc: 0.4, size: 2.6, dimOthers: dim } }];
  }
  // Pretos + pardos lit on the race map, before and after the income wipe.
  const lit = ease.inOutCubic(prog(t, T.map + 0.1, T.map + 0.8)) * (1 - ease.inOutCubic(prog(t, T.word[0] - 0.6, T.word[0])));
  const d = lerp(1, 0.12, lit);
  const race = { ...base, catAlpha: [1, d, 1, d, d] };
  // On the income map only the "up to 1 minimum wage" band stays lit, so it
  // can be read against the pretos + pardos map it was wiped from.
  const low = lerp(1, 0.12, ease.inOutCubic(prog(t, T.toIncome[1] - 0.2, T.toIncome[1] + 0.6)));
  const income = { ...base, ds: 'br_income_5', palette: PALETTE.income, catAlpha: [1, low, low, low, low, low, low] };
  if (t < T.toIncome[0]) return [race];
  if (t < T.toIncome[1]) {
    const w = wipe(t, T.toIncome, [0.35, 1], L);
    return [{ ...race, wipe: { ...w, side: 1 } }, { ...income, wipe: { ...w, side: -1 } }];
  }
  if (t < T.toRace[0]) return [income];
  if (t < T.toRace[1]) {
    const w = wipe(t, T.toRace, [-0.35, -1], L);
    return [{ ...income, wipe: { ...w, side: 1 } }, { ...race, wipe: { ...w, side: -1 } }];
  }
  return [{ ...race, morph: wordMorph(t, T.word, L) }];
}

const land = (t) => ease.outCubic(prog(t, T.burst[0] + 0.1, T.burst[0] + 1.1)) * (1 - ease.inCubic(prog(t, T.word[0], T.word[0] + 0.5)));

let ends = [];
function targets(dots, L, kit) {
  setupBurst(dots, 'br_race_5', camera(T.burst[0], L), L);
  ends = barTargets(dots, 'br_race_5', makeView(camera(T.chartIn[0], L), L.W, L.H), { order: ORDER, shares: SHARES, ...CHART });
  return { word: setupWord(dots, 'br_race_5', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const hookDot = UI.HookDot(r, hookAt(camera(0, L), L), P[0], T.burst[0], '1 ponto = 900 pessoas');
  const K = (s, c) => UI.kicker(s, c);
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026'), head: 'Todo candidato fala em nome do *povo brasileiro*.', color: P[0], size: 104 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022'), head: 'Ele tem *203 milhões* de rostos.', sub: '203.080.756 pessoas. Cada ponto é um grupo delas.', color: P[0], size: 104 });
  const chartA = UI.Block(r, { top: 230, kicker: K('Cor ou raça · Brasil'), head: 'Pela 1ª vez desde 1991, os *pardos* são o maior grupo.', color: P[0] });
  const chartB = UI.Block(r, { top: 230, kicker: K('Cor ou raça · Brasil'), head: 'Com os pretos, são *55,5%*.', sub: 'A maioria do Brasil é *negra*.', color: P[2], size: 110 });
  const bars = UI.BarLabels(r, ROWS, CHART, SHARES, ends);
  const bracket = UI.Bracket(r, { x: Math.max(ends[0], ends[1]) + 150, y0: CHART.y + (CHART.rowH - CHART.barH) / 2, y1: CHART.y + CHART.rowH + (CHART.rowH + CHART.barH) / 2, text: '', color: '#16181b' });
  const negra = [['Parda', P[0]], ['Preta', P[2]]];
  const raceLegend = UI.Legend(r, negra);
  const raceLegend2 = UI.Legend(r, negra);
  const cross = UI.Block(r, {
    top: 230,
    kicker: K('Cor e renda', PALETTE.income[0]),
    head: 'Onde a renda típica é de até 1 salário mínimo, *7 em cada 10* são pretos ou pardos.',
    sub: 'Onde passa de 10 salários, *1 em cada 5*.',
    color: PALETTE.income[0],
  });
  const ramp = UI.Legend(r, UI.rampHtml(PALETTE.income.slice(0, 6), ['Até 1 salário mínimo', '', 'Mais de 10'], 'Renda típica da vizinhança'));
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'No Brasil, a desigualdade *tem cor*.', color: P[0], size: 124 });
  const ch = chrome(r, L, { brandIn: T.burst[0] + 0.1, brandOut: T.word[0], sourceIn: T.burst[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  return (t) => {
    hookDot(t);
    hook(t, 0.15, T.burst[0] - 0.1);
    intro(t, T.burst[0] + 0.5, T.chartIn[0] - 0.1);
    chartA(t, T.chartIn[0] - 0.05, T.chartB - 0.05);
    chartB(t, T.chartB + 0.05, T.chartOut[0] + 0.1);
    bars(t, T.chartIn[0], T.chartOut[0] + 0.2, { dimRows: [2, 3, 4], dimAt: T.chartB });
    bracket(t, T.chartB + 0.1, T.chartOut[0] + 0.1);
    raceLegend(t, T.map + 0.2, T.toIncome[0] + 0.5);
    cross(t, T.toIncome[0] + 0.3, T.punch - 0.05);
    ramp(t, T.toIncome[0] + 0.9, T.toRace[0] + 0.5);
    raceLegend2(t, T.toRace[0] + 0.9, T.word[0] - 0.3);
    punch(t, T.punch + 0.3, T.word[0]);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'A', progression: ['i', 'VI', 'III', 'VII'],
  sections: [
    { a: 0, b: T.burst[0], drums: 0, plucks: 0 },
    { a: T.burst[0], b: T.chartIn[0], drums: 0, plucks: 2 },
    { a: T.chartIn[0], b: T.map, drums: 1, plucks: 2 },
    { a: T.map, b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.1 }, { type: 'burst', t: T.burst[0], until: T.burst[1] },
    { type: 'whoosh', t: T.chartIn[0], from: 0.7, to: -0.7 }, { type: 'tick', t: T.chartB },
    { type: 'whoosh', t: T.chartOut[0], from: -0.7, to: 0.7 },
    { type: 'whoosh', t: T.toIncome[0], from: -0.6, to: 0.6 }, { type: 'tick', t: T.toIncome[1] },
    { type: 'crash', t: T.punch }, { type: 'whoosh', t: T.toRace[0], from: 0.6, to: -0.6 },
    { type: 'outro', t: T.word[0] - 0.2, until: T.word[1] },
  ],
};

export default {
  duration: DURATION,
  datasets: ['br_race_5', 'br_income_5'],
  layout: portraitLayout,
  camera,
  layers,
  land,
  targets,
  overlay,
  cues,
};
