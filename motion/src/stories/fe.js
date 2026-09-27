// Short 4 — "O voto evangélico" (religião). Every campaign courts it; the
// census shows it is more than 1 in 4 Brazilians (10+), nearly 4 in 10 in
// the Norte, and inside Rio it swings from nearly 4 in 10 in Campo Grande
// and Santa Cruz to under 1 in 10 in Copacabana, Ipanema and Leblon.
// Religion is a sample estimate mixed per group of neighbourhoods, so the
// copy says so and never quotes a single street.
import { portraitLayout, national, regionMask, place, fly, drift, lod, dotSize, topFade, landAtZoom, LEGEND, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { chrome, setupBurst, setupWord, burstMorph, wordMorph, hookAt } from '../kit/shorts.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.religion;
const EV = P[1];
export const BEAT = 60 / 110;
export const GRID0 = +(5 * BEAT).toFixed(3);
const b = grid(GRID0, BEAT);
const T = {
  burst: [b(0), b(0) + 1.6],
  solo: b(3),
  norte: b(9),
  nordeste: b(13),
  fly: [b(17), b(23)],
  oeste: b(23),
  sul: b(28.5),
  punch: b(34),
  word: [b(42) + 0.2, b(46)],
};
const DURATION = +(b(50) + 0.3).toFixed(2);

const RIO = place({ lon: -43.36, lat: -22.9, zoom: 9.95, px: 560, py: 1180, pitch: 30, bearing: -8 });
const LEVELS = { 5: 'br_religion_5', 6: 'br_religion_6', 7: 'rio_religion_7', 8: 'rio_religion_8', 9: 'rio_religion_9', 10: 'rio_religion_10', 11: 'rio_religion_11' };
const CAMPO_GRANDE = [-43.561, -22.903];
const COPACABANA = [-43.187, -22.971];

function camera(t, L) {
  const N = drift(national(L), t, [0, T.fly[0]], { zoom: 0.1 });
  if (t < T.fly[0]) return N;
  return drift(fly(t, T.fly, N, RIO), t, [T.oeste, T.word[0]], { zoom: 0.3, bearing: 6 });
}

// Evangélicos soloed over Brazil. In Rio the dots overlap so densely that a
// full solo turns every district orange, so the others come back halfway
// (the Zona Sul reads blue, the Zona Oeste orange) and fully at the punch.
function catAlpha(t) {
  const on = ease.inOutCubic(prog(t, T.solo, T.solo + 0.8));
  const rio = ease.inOutCubic(prog(t, T.fly[0] + 2.5, T.oeste));
  const off = ease.inOutCubic(prog(t, T.punch + 0.2, T.punch + 1.2));
  const d = lerp(1, lerp(0.14, 0.5, rio), on * (1 - off));
  if (d >= 1) return null;
  return P.map((_, i) => (i === 1 ? 1 : d));
}

function mask(t) {
  const no = ease.inOutCubic(prog(t, T.norte + 0.2, T.norte + 0.9)) * (1 - ease.inOutCubic(prog(t, T.nordeste, T.nordeste + 0.5)));
  const ne = ease.inOutCubic(prog(t, T.nordeste + 0.2, T.nordeste + 0.8)) * (1 - ease.inOutCubic(prog(t, T.fly[0], T.fly[0] + 0.7)));
  if (no > 0) return regionMask('Norte', no, 0.1);
  if (ne > 0) return regionMask('Nordeste', ne, 0.1);
  return null;
}

function layers(t, L, cam) {
  if (t < T.burst[0]) return [];
  const size = dotSize(cam.zoom);
  const base = { size, alpha: 1, palette: P };
  if (t < T.solo) return [{ ...base, ds: 'br_religion_5', fade: 1, morph: burstMorph(t, T.burst) }];
  if (t >= T.word[0]) return [{ ...base, ds: 'rio_religion_11', fade: 1, morph: wordMorph(t, T.word, L) }];
  const tf = topFade(cam, L);
  const ca = catAlpha(t);
  const ufAlpha = mask(t);
  return lod(cam.zoom, LEVELS).map(([ds, w]) => ({ ...base, ds, fade: w, catAlpha: ca, ufAlpha, topFade: tf }));
}

const land = (t, cam) => landAtZoom(cam.zoom) * ease.outCubic(prog(t, T.burst[0] + 0.1, T.burst[0] + 1.1)) * (1 - ease.inCubic(prog(t, T.word[0], T.word[0] + 0.5)));

function targets(dots, L, kit) {
  setupBurst(dots, 'br_religion_5', camera(T.burst[0], L), L);
  return { word: setupWord(dots, 'rio_religion_11', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const hookDot = UI.HookDot(r, hookAt(camera(0, L), L), EV, T.burst[0], '1 ponto = 790 pessoas');
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', EV), head: 'Todo candidato quer o *voto evangélico*.', color: EV, size: 108 });
  const intro = UI.Block(r, { top: 230, kicker: K('Religião · Censo 2022', EV), head: 'Evangélicos são *mais de 1 em cada 4* brasileiros.', fine: 'Pessoas com 10 anos ou mais.', color: EV, size: 104 });
  const legend = UI.Legend(r, LEGEND.religion);
  const norte = UI.Block(r, { top: 230, kicker: K('Norte', EV), head: 'No Norte, *quase 4 em cada 10*.', color: EV, size: 108 });
  const nordeste = UI.Block(r, { top: 230, kicker: K('Nordeste', EV), head: 'No Nordeste, *pouco mais de 2 em cada 10*.', color: EV, size: 108 });
  const oeste = UI.Block(r, { top: 230, kicker: K('Rio de Janeiro · Zona Oeste', EV), head: 'Em Campo Grande e Santa Cruz, *quase 4 em cada 10*.', color: EV });
  const sul = UI.Block(r, { top: 230, kicker: K('Rio de Janeiro · Zona Sul', EV), head: 'Em Copacabana, Ipanema e Leblon, *menos de 1 em cada 10*.', fine: 'Religião estimada para conjuntos de bairros.', color: EV });
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'Não é um bloco. *É um mapa.*', color: EV, size: 132 });
  const pins = UI.Pins(r, [
    { key: 'oeste', name: 'Campo Grande', lon: CAMPO_GRANDE[0], lat: CAMPO_GRANDE[1] },
    { key: 'sul', name: 'Copacabana', lon: COPACABANA[0], lat: COPACABANA[1] },
  ]);
  const ch = chrome(r, L, { brandIn: T.burst[0] + 0.1, brandOut: T.word[0], sourceIn: T.burst[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  return (t, view) => {
    hookDot(t);
    hook(t, 0.15, T.burst[0] - 0.1);
    intro(t, T.burst[0] + 0.5, T.norte - 0.1);
    legend(t, T.burst[0] + 1.2, T.word[0] - 0.3);
    norte(t, T.norte + 0.05, T.nordeste - 0.1);
    nordeste(t, T.nordeste + 0.05, T.fly[0] + 0.3);
    oeste(t, T.oeste - 0.3, T.sul - 0.1);
    sul(t, T.sul + 0.05, T.punch - 0.1);
    pins(t, view, { oeste: [T.oeste - 0.2, T.sul + 0.2], sul: [T.sul + 0.1, T.punch] });
    punch(t, T.punch + 0.1, T.word[0]);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'F#', progression: ['i', 'VI', 'VII', 'i'],
  sections: [
    { a: 0, b: T.burst[0], drums: 0, plucks: 0 },
    { a: T.burst[0], b: T.norte, drums: 0, plucks: 2 },
    { a: T.norte, b: T.fly[0], drums: 1, plucks: 2 },
    { a: T.fly[0], b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.1 }, { type: 'burst', t: T.burst[0], until: T.burst[1] },
    { type: 'tick', t: T.norte }, { type: 'tick', t: T.nordeste },
    { type: 'riser', t: T.fly[0] - 1.2, until: T.fly[0] + 0.2 },
    { type: 'whoosh', t: T.fly[0], from: 0.6, to: -0.6 },
    { type: 'tick', t: T.sul },
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
