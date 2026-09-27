// Pieces every election short shares: the dot that bursts into Brazil, the
// dots that write "dotsbr" at the end, and the standing chrome.
import { makeView, lon2x, lat2y } from '../camera.js';
import { prog, ease } from '../util.js';
import { burstTargets, wordTargets } from './targets.js';
import * as UI from './ui.js';

export const BRASILIA = [-47.93, -15.78];

// Screen point of Brasília for a camera: the hook dot sits there so the
// burst radiates from the middle of the country.
export function hookAt(cam, L) {
  const v = makeView(cam, L.W, L.H);
  const [x, y] = v.project(lon2x(BRASILIA[0]), lat2y(BRASILIA[1]));
  return [x, y];
}

export function setupBurst(dots, ds, cam, L) {
  burstTargets(dots, ds, hookAt(cam, L));
}

export function setupWord(dots, ds, camAtWord, L, kit) {
  const view = makeView(camAtWord, L.W, L.H);
  return wordTargets(dots, ds, view, kit.sampleGlyphs(L), L);
}

// Dots fly out of the hook dot to their places on the map.
export const burstMorph = (t, [a, b]) => ({ target: 'hook', t: prog(t, a, b), dir: 'in', ease: 'expo', stagger: 0.5, arc: 0.35, size: 1.2 });

// Dots write the wordmark; everything else fades away.
export function wordMorph(t, [a, b], L) {
  if (t < a) return null;
  const dim = 1 - ease.inOutCubic(prog(t, a, a + 0.45));
  return { target: 'word', t: prog(t, a, b), dir: 'out', ease: 'cubic', stagger: 0.38, arc: 0.55, size: L.portrait ? 2.6 : 2.45, dimOthers: dim };
}

// Brand bug, source line and the outro lockup, timed from the story's beats.
export function chrome(r, L, { brandIn, brandOut, sourceIn, duration, outroAt, cta }) {
  const brand = UI.Brand(r);
  const source = UI.Source(r);
  const outro = UI.Outro(r, L, { tagline: 'Veja o seu bairro no mapa', cta });
  return (t) => {
    brand(t, brandIn, brandOut);
    source(t, sourceIn, duration + 0.2);
    outro(t, outroAt, duration + 1);
  };
}
