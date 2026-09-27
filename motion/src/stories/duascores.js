// Short 2 — "Duas cores". Election night paints Brazil in two colours; the
// census paints it in 203 million dots. The Sul is nearly 3 in 4 white, the
// Norte 2 in 3 pardo, and inside one city the mix changes street by street.
import { portraitLayout, national, regionCam, REGION_BOXES, regionMask, blend, fly, drift, place, lod, dotSize, topFade, landAtZoom, LEGEND, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { chrome, setupWord, wordMorph } from '../kit/shorts.js';
import { makeView } from '../camera.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.race;
export const BEAT = 60 / 128;
export const GRID0 = 3.0;
const b = grid(GRID0, BEAT);
const T = {
  reveal: [b(0), b(0) + 1.4],
  sul: [b(9), b(18)],
  norte: [b(18), b(27)],
  fly: [b(27), b(33)],
  city: b(33),
  punch: b(40),
  back: [b(40), b(44)],
  word: [b(48) + 0.2, b(52)],
};
const DURATION = +(b(56) + 0.3).toFixed(2);

const SP = place({ lon: -46.63, lat: -23.56, zoom: 10.3, px: 540, py: 1180, pitch: 32, bearing: -10 });
const LEVELS = { 5: 'br_race_5', 6: 'br_race_6', 7: 'sp_race_7', 8: 'sp_race_8', 9: 'sp_race_9', 10: 'sp_race_10', 11: 'sp_race_11' };

function camera(t, L) {
  const N = national(L);
  if (t < T.sul[0]) return drift(N, t, [0, T.sul[0]], { zoom: 0.08 });
  const S = regionCam(L, REGION_BOXES.Sul);
  const No = regionCam(L, REGION_BOXES.Norte);
  const N1 = drift(N, T.sul[0], [0, T.sul[0]], { zoom: 0.08 });
  if (t < T.norte[0]) {
    // Lean toward the Sul, not all the way: the rest of Brazil stays in frame
    // (dimmed) so the contrast reads.
    return blend(N1, S, 0.55 * ease.inOutCubic(prog(t, T.sul[0], T.sul[0] + 1.2)));
  }
  const S1 = blend(N1, S, 0.55);
  if (t < T.fly[0]) return blend(S1, blend(N, No, 0.45), ease.inOutCubic(prog(t, T.norte[0], T.norte[0] + 1.2)));
  const No1 = blend(N, No, 0.45);
  if (t < T.back[0]) return drift(fly(t, T.fly, No1, SP), t, [T.city, T.back[0]], { zoom: 0.25, bearing: 6 });
  const S2 = drift(SP, T.back[0], [T.city, T.back[0]], { zoom: 0.25, bearing: 6 });
  return fly(t, T.back, S2, national(L, 0.05));
}

function mask(t) {
  const sul = ease.inOutCubic(prog(t, T.sul[0] + 0.2, T.sul[0] + 1.0)) * (1 - ease.inOutCubic(prog(t, T.norte[0], T.norte[0] + 0.6)));
  const norte = ease.inOutCubic(prog(t, T.norte[0] + 0.2, T.norte[0] + 1.0)) * (1 - ease.inOutCubic(prog(t, T.fly[0], T.fly[0] + 0.8)));
  if (sul > 0) return regionMask('Sul', sul, 0.12);
  if (norte > 0) return regionMask('Norte', norte, 0.12);
  return null;
}

function reveal(t, L) {
  const k = ease.inOutCubic(prog(t, ...T.reveal));
  if (k >= 1) return null;
  return [L.W / 2, 1150, lerp(0, 1300, k), 90];
}

function layers(t, L, cam) {
  if (t < T.reveal[0]) return [];
  const size = dotSize(cam.zoom);
  const tf = topFade(cam, L);
  const ufAlpha = mask(t);
  const rv = reveal(t, L);
  // Back at the national camera the LOD is pure br_race_5, the set the word
  // targets were built from, so the hand-off is seamless.
  if (t >= T.word[0]) return [{ ds: 'br_race_5', fade: 1, size, alpha: 1, palette: P, morph: wordMorph(t, T.word, L) }];
  return lod(cam.zoom, LEVELS).map(([ds, w]) => ({ ds, fade: w, size, alpha: 1, palette: P, topFade: tf, ufAlpha, reveal: rv }));
}

// The hook: Brazil as one flat ink shape. The reveal cuts a growing hole in it
// and the dots are what's underneath.
function land(t, cam, L) {
  const rv = reveal(t, L);
  const out = 1 - ease.inCubic(prog(t, T.word[0] - 0.4, T.word[0] + 0.2));
  if (t < T.reveal[0] || rv) {
    return { alpha: ease.outCubic(prog(t, 0.05, 0.6)), ink: '#16181b', hole: rv ? [rv[0], rv[1], Math.max(0, rv[2] - 40)] : null };
  }
  return landAtZoom(cam.zoom) * out;
}

function targets(dots, L, kit) {
  return { word: setupWord(dots, 'br_race_5', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', '#16181b'), head: 'Em outubro, o Brasil vai virar um mapa de *duas cores*.', color: '#16181b', size: 104 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022'), head: 'Mas ele é feito de *203 milhões* de pontos.', sub: 'A cor de cada um mostra a raça que as pessoas declararam.', color: P[0], size: 104 });
  const legend = UI.Legend(r, LEGEND.race, { bottom: 330 });
  const sul = UI.Block(r, { top: 230, kicker: K('Sul', P[1]), head: 'No Sul, *quase 3 em cada 4* se declaram brancos.', color: P[1] });
  const norte = UI.Block(r, { top: 230, kicker: K('Norte', P[0]), head: 'No Norte, *2 em cada 3* se declaram pardos.', color: P[0] });
  const city = UI.Block(r, { top: 230, kicker: K('São Paulo', '#16181b'), head: 'E dentro das cidades, a mistura muda de *rua em rua*.', color: P[2] });
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'O Brasil não cabe em *duas cores*.', color: P[0], size: 124 });
  const ch = chrome(r, L, { brandIn: T.reveal[0] + 0.1, brandOut: T.word[0], sourceIn: T.reveal[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  return (t) => {
    hook(t, 0.25, T.reveal[0] - 0.1);
    intro(t, T.reveal[0] + 0.5, T.sul[0] - 0.1);
    legend(t, T.reveal[0] + 1.2, T.word[0] - 0.3);
    sul(t, T.sul[0] + 0.05, T.norte[0] - 0.1);
    norte(t, T.norte[0] + 0.05, T.fly[0] + 0.3);
    city(t, T.fly[0] + 1.6, T.punch - 0.1);
    punch(t, T.punch + 0.1, T.word[0]);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'D', progression: ['i', 'VII', 'VI', 'VII'],
  sections: [
    { a: 0, b: T.reveal[0], drums: 0, plucks: 0 },
    { a: T.reveal[0], b: T.sul[0], drums: 1, plucks: 2 },
    { a: T.sul[0], b: T.fly[0], drums: 2, plucks: 4 },
    { a: T.fly[0], b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.2 }, { type: 'burst', t: T.reveal[0], until: T.reveal[1] },
    { type: 'tick', t: T.sul[0] }, { type: 'tick', t: T.norte[0] },
    { type: 'riser', t: T.fly[0] - 1.2, until: T.fly[0] + 0.2 },
    { type: 'whoosh', t: T.fly[0], from: -0.6, to: 0.6 },
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
