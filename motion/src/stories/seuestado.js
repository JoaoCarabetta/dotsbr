// Short 5 — "O seu estado". In October you also pick your governor: four
// capitals, four different Brazils. Manaus is 7 in 10 pardo, Salvador 1 in 3
// preto (the country: 1 in 10), São Paulo more than half branco, Porto
// Alegre nearly 3 in 4 branco — then back to 27 states, 5.570 municipalities, and the viewer.
import { portraitLayout, national, place, drift, lod, dotSize, topFade, landAtZoom, LEGEND, PALETTE, grid } from '../kit/scene.js';
import * as UI from '../kit/ui.js';
import { chrome, setupBurst, setupWord, burstMorph, wordMorph, hookAt } from '../kit/shorts.js';
import { prog, lerp, ease } from '../util.js';

const P = PALETTE.race;
export const BEAT = 60 / 140;
export const GRID0 = +(6 * BEAT).toFixed(3);
const b = grid(GRID0, BEAT);
const T = {
  burst: [b(0), b(0) + 1.6],
  pins: b(4),
  punch: b(52),
  word: [b(60) + 0.2, b(64)],
};
const DURATION = +(b(68) + 0.3).toFixed(2);

// cat = the category the line is about (soloed after the card clears).
const CITIES = [
  { key: 'manaus', name: 'Manaus', uf: 'Amazonas', lon: -60.01, lat: -3.07, zoom: [10.75, 11.25], bearing: -6, cat: 0, head: 'Em Manaus, *7 em cada 10* se declaram pardos.', color: P[0] },
  { key: 'salvador', name: 'Salvador', uf: 'Bahia', lon: -38.45, lat: -12.94, zoom: [10.55, 11.05], bearing: 8, cat: 2, head: 'Em Salvador, *1 em cada 3* se declara preto.', sub: 'No país, 1 em cada 10.', color: P[2] },
  { key: 'sp', name: 'São Paulo', uf: 'São Paulo', lon: -46.63, lat: -23.58, zoom: [9.95, 10.6], bearing: -10, cat: 1, head: 'Em São Paulo, *mais da metade* se declara branca.', color: P[1] },
  { key: 'poa', name: 'Porto Alegre', uf: 'Rio Grande do Sul', lon: -51.17, lat: -30.07, zoom: [10.45, 10.95], bearing: 6, cat: 1, head: 'Em Porto Alegre, *quase 3 em cada 4* se declaram brancos.', sub: 'E 1 em cada 8, pretos.', color: P[1] },
].map((c, i) => ({ ...c, at: b(12 + i * 10), until: b(22 + i * 10) }));

const cityAt = (t) => CITIES.find((c) => t >= c.at && t < c.until);

function camera(t, L) {
  const c = cityAt(t);
  if (!c) return drift(national(L), t, [0, DURATION], { zoom: 0.12 });
  const k = ease.inOutSine(prog(t, c.at, c.until));
  return place({ lon: c.lon, lat: c.lat, zoom: lerp(c.zoom[0], c.zoom[1], k), px: 540, py: 1180, pitch: 28, bearing: c.bearing + 5 * k });
}

function layers(t, L, cam) {
  if (t < T.burst[0]) return [];
  const size = dotSize(cam.zoom);
  const base = { size, alpha: 1, palette: P };
  if (t < T.pins) return [{ ...base, ds: 'br_race_5', fade: 1, morph: burstMorph(t, T.burst) }];
  if (t >= T.word[0]) return [{ ...base, ds: 'br_race_5', fade: 1, morph: wordMorph(t, T.word, L) }];
  const c = cityAt(t);
  if (!c) return [{ ...base, ds: 'br_race_5', fade: 1 }];
  const k = ease.inOutCubic(prog(t, c.at + 1.1, c.at + 1.8)) * (1 - ease.inOutCubic(prog(t, c.until - 0.9, c.until - 0.45)));
  const catAlpha = P.map((_, i) => (i === c.cat ? 1 : lerp(1, 0.16, k)));
  const tf = topFade(cam, L);
  return lod(cam.zoom, { 10: `${c.key}_race_10`, 11: `${c.key}_race_11` }).map(([ds, w]) => ({ ...base, ds, fade: w, catAlpha, topFade: tf }));
}

const land = (t, cam) => landAtZoom(cam.zoom) * ease.outCubic(prog(t, T.burst[0] + 0.1, T.burst[0] + 1.1)) * (1 - ease.inCubic(prog(t, T.word[0], T.word[0] + 0.5)));

function targets(dots, L, kit) {
  setupBurst(dots, 'br_race_5', camera(T.burst[0], L), L);
  return { word: setupWord(dots, 'br_race_5', camera(T.word[0], L), L, kit) };
}

function overlay(stage, L) {
  stage.classList.add('short');
  const r = UI.root(stage);
  const K = (s, c) => UI.kicker(s, c);
  const hookDot = UI.HookDot(r, hookAt(camera(0, L), L), P[0], T.burst[0], '1 ponto = 900 pessoas');
  const hook = UI.Block(r, { top: 230, kicker: K('Eleições 2026', '#16181b'), head: 'Em outubro, você também escolhe quem governa *o seu estado*.', sub: 'Você conhece quem mora nele?', color: P[0], size: 100, subSize: 52 });
  const intro = UI.Block(r, { top: 230, kicker: K('Censo Demográfico 2022'), head: 'Cada ponto é um *grupo de pessoas*.', sub: 'A cor mostra a raça que elas declararam no Censo.', color: P[0], size: 104 });
  const legend = UI.Legend(r, LEGEND.race);
  const pins = UI.Pins(r, CITIES.map((c) => ({ key: c.key, name: c.name, lon: c.lon, lat: c.lat })));
  const blocks = CITIES.map((c) => UI.Block(r, { top: 230, kicker: K(`${c.name} · ${c.uf}`, c.color), head: c.head, sub: c.sub, color: c.color, subSize: 52 }));
  const punch = UI.Block(r, { top: 250, center: true, kicker: K('Eleições 2026', '#16181b'), head: 'E você está em *um desses pontos*.', color: P[0], size: 118 });
  const cards = UI.TitleCard(r, L, [...CITIES.map((c) => ({ at: c.at, name: c.name, uf: c.uf })), { at: T.punch, name: 'Brasil', uf: '27 estados · 5.570 municípios' }]);
  const ch = chrome(r, L, { brandIn: T.burst[0] + 0.1, brandOut: T.word[0], sourceIn: T.burst[0] + 0.4, duration: DURATION, outroAt: T.word[1] - 0.05 });
  const pinWin = Object.fromEntries(CITIES.map((c, i) => [c.key, [T.pins + 0.6 + i * 0.35, CITIES[0].at - 0.3]]));
  return (t, view) => {
    hookDot(t);
    hook(t, 0.15, T.burst[0] - 0.1);
    intro(t, T.burst[0] + 0.5, CITIES[0].at - 0.3);
    legend(t, T.burst[0] + 1.2, T.word[0] - 0.3);
    pins(t, view, pinWin);
    CITIES.forEach((c, i) => blocks[i](t, c.at + 0.35, c.until - 0.4));
    punch(t, T.punch + 0.45, T.word[0]);
    cards(t);
    ch(t);
  };
}

export const cues = {
  duration: DURATION, beat: BEAT, grid0: GRID0, key: 'C', progression: ['i', 'VI', 'III', 'VII'],
  sections: [
    { a: 0, b: T.burst[0], drums: 0, plucks: 0 },
    { a: T.burst[0], b: CITIES[0].at, drums: 0, plucks: 2 },
    { a: CITIES[0].at, b: CITIES[2].at, drums: 1, plucks: 4 },
    { a: CITIES[2].at, b: T.punch, drums: 2, plucks: 4 },
    { a: T.punch, b: T.word[0] - 0.2, drums: 3, plucks: 4, bright: true },
  ],
  hits: [
    { type: 'hook', t: 0.1 }, { type: 'burst', t: T.burst[0], until: T.burst[1] },
    ...CITIES.map((c, i) => ({ type: 'whoosh', t: c.at - 0.45, from: 0.8, to: -0.8 })),
    ...CITIES.map((c) => ({ type: 'tick', t: c.at + 1.1 })),
    { type: 'riser', t: T.punch - 1.7, until: T.punch - 0.45 },
    { type: 'whoosh', t: T.punch - 0.45, from: 0.8, to: -0.8 },
    { type: 'crash', t: T.punch },
    { type: 'outro', t: T.word[0] - 0.2, until: T.word[1] },
  ],
};

export default {
  duration: DURATION,
  datasets: ['br_race_5', ...CITIES.flatMap((c) => [`${c.key}_race_10`, `${c.key}_race_11`])],
  layout: portraitLayout,
  camera,
  layers,
  land,
  targets,
  overlay,
  cues,
};
