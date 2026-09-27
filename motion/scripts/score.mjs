// Score for a short, generated from the story's own `cues` (key, chord
// progression, sections and hits), so the music changes where the picture
// cuts. Each short sets its own tempo and key; the instruments are shared.
//
//   node scripts/score.mjs --story povo   → out/soundtrack-povo.wav
//
// cues = {
//   duration, beat, grid0, key: 'A', progression: ['i', 'VI', 'III', 'VII'],
//   sections: [{ a, b, drums: 0–3, plucks: 0|2|4, bright }],
//   hits: [{ type: hook|burst|whoosh|tick|riser|crash|outro, t, until?, from?, to? }],
// }
// drums: 0 none · 1 half-time kick · 2 four on the floor + offbeat hat ·
// 3 plus claps on 2 and 4 and 16th hats. plucks = arpeggio notes per beat.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { studio, hz } from './synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const STORY = arg('story');
if (!STORY) throw new Error('usage: node scripts/score.mjs --story <name>');
const { cues } = await import(`../src/stories/${STORY}.js`);
if (!cues) throw new Error(`src/stories/${STORY}.js exports no cues`);
const { duration: DURATION, beat: BEAT, grid0: GRID0 } = cues;

// A different seed per short: same instruments, different noise and voicing.
const seed = [...STORY].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const S = studio(DURATION, seed);
const { rnd, kicks, mix, mixSweep, filter, kick, hat, clap, pluck, padChord, bass, impact, crash, whoosh, riser, blip, bell } = S;

// ---- harmony: roman numerals in natural minor ----
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const DEGREE = { i: [0, 'm'], ii: [2, 'm'], III: [3, 'M'], iv: [5, 'm'], v: [7, 'm'], V: [7, 'M'], VI: [8, 'M'], VII: [10, 'M'] };
const tonic = PC[cues.key];
const inRange = (pc, lo) => lo + ((((pc - lo) % 12) + 12) % 12);
function chord(numeral) {
  const [deg, q] = DEGREE[numeral];
  const r = (tonic + deg) % 12;
  const third = (r + (q === 'm' ? 3 : 4)) % 12;
  const fifth = (r + 7) % 12;
  const color = (r + (q === 'm' ? 10 : 2)) % 12; // m7 on minor chords, add9 on major
  const low = [r, third, fifth].map((pc) => inRange(pc, 55)).sort((a, b) => a - b);
  return { root: inRange(r, 36), pad: [...low, inRange(color, 67)], arp: [...low, inRange(r, 67), inRange(third, 67)].map((m) => m + 12), q, r };
}
const BAR = 4 * BEAT;
const outro = cues.hits.find((h) => h.type === 'outro');
const END = outro ? outro.until : DURATION;
const BARS = [];
for (let n = 0; GRID0 + n * BAR < END - 0.01; n++) {
  BARS.push({ a: GRID0 + n * BAR, b: Math.min(GRID0 + (n + 1) * BAR, END), chord: chord(cues.progression[n % cues.progression.length]) });
}
const sectionAt = (t) => cues.sections.find((s) => t >= s.a - 1e-6 && t < s.b - 1e-6);
const TONIC = chord('i');
const RELMAJ = chord('III');

// ---- drums first, so pads and bass can duck under the kicks ----
for (let n = 0; GRID0 + n * BEAT < END - 0.01; n++) {
  const t = +(GRID0 + n * BEAT).toFixed(4);
  const s = sectionAt(t);
  if (!s || !s.drums) continue;
  const inBar = n % 4;
  if (s.drums === 1 && inBar % 2) continue;
  kicks.push(t);
  mix(kick(), t, { gain: s.drums === 1 ? 0.34 : 0.42 });
  if (s.drums >= 2) mix(hat(), t + BEAT / 2, { gain: 0.18, pan: 0.25 });
  if (s.drums >= 3) {
    mix(hat(), t + BEAT / 4, { gain: 0.07, pan: -0.3 });
    mix(hat(), t + (3 * BEAT) / 4, { gain: 0.07, pan: 0.3 });
    if (inBar === 1 || inBar === 3) mix(clap(), t, { gain: 0.34, send: 0.25 });
  }
  // A fill into every section change: an open hat on the last offbeat.
  const next = sectionAt(t + BEAT);
  if (next && next !== s && next.drums > s.drums) mix(hat(true), t + BEAT / 2, { gain: 0.12, pan: -0.2, send: 0.2 });
}
kicks.sort((a, b) => a - b);

// ---- pads: tonic swell before the grid, then one chord per bar ----
mix(padChord(TONIC.pad.map(hz), GRID0, { attack: Math.min(1.2, GRID0 * 0.5), release: 0.3, cutoff: 1400 }), 0, { gain: 0.24, send: 0.4 });
for (const { a, b, chord: c } of BARS) {
  const s = sectionAt(a) || {};
  mix(padChord(c.pad.map(hz), b - a, { attack: 0.08, release: 0.5, cutoff: s.bright ? 2900 : 2000 }), a, { gain: 0.42, send: 0.35, duck: s.drums ? 0.5 : 0 });
}

// ---- bass: long notes while the drums rest, an offbeat pulse under them ----
for (const { a, b, chord: c } of BARS) {
  const s = sectionAt(a) || {};
  const f = hz(c.root);
  if (!s.drums) { mix(bass(f, b - a), a, { gain: 0.2 }); continue; }
  for (let t = a; t < b - 0.01; t += BEAT) mix(bass(f, BEAT * 0.9), t + BEAT * 0.5, { gain: 0.24, duck: 0.3 });
}

// ---- plucked arpeggio: the dots, audible; denser as the story builds ----
let k = 0;
for (const { a, b, chord: c } of BARS) {
  for (let t = a; t < b - 0.01; k++) {
    const s = sectionAt(t);
    const per = s ? s.plucks : 0;
    if (!per) { t += BEAT; continue; }
    const m = c.arp[(k * 3 + (k >> 2)) % c.arp.length] + (k % 8 === 7 ? 12 : 0);
    const accent = k % 4 === 0 ? 1 : 0.7;
    mix(pluck(hz(m), 0.6, s.bright ? 1.4 : 1.1), t, { gain: 0.14 * accent, pan: (k % 2 ? 0.45 : -0.45) * (0.6 + 0.4 * rnd()), send: 0.4 });
    t += BEAT / per;
  }
}

// ---- hits ----
const firstBurst = cues.hits.find((h) => h.type === 'burst');
for (const h of cues.hits) {
  if (h.type === 'hook') {
    // One note for the dot, a second for its caption, a riser into the burst.
    const top = inRange(tonic, 76);
    mix(pluck(hz(top), 1.2, 1.4), h.t, { gain: 0.22, send: 0.5 });
    mix(blip(hz(top + 12), 0.2, 30), h.t, { gain: 0.05, send: 0.6 });
    mix(pluck(hz(top - 5), 1.0, 1.2), h.t + 0.7, { gain: 0.14, pan: 0.3, send: 0.5 });
    const to = firstBurst ? firstBurst.t : GRID0;
    if (to - h.t > 1) mix(riser(to - h.t - 0.45, 200, 2500), h.t + 0.45, { gain: 0.08 });
  } else if (h.type === 'burst') {
    mix(impact(1), h.t, { gain: 0.5, send: 0.25 });
    mixSweep(whoosh(0.9, 3000, 300, 0.9), h.t - 0.02, 0.35, -0.2, 0.3, 0.3);
    for (let i = 0; i < 240; i++) {
      const t = h.t + 0.05 + (h.until - h.t) * rnd() ** 2.2;
      mix(blip(2400 + rnd() * 5200, 0.025, 260), t, { gain: 0.03 + 0.05 * rnd(), pan: rnd() * 1.6 - 0.8, send: 0.35 });
    }
  } else if (h.type === 'whoosh') {
    const up = h.from > h.to;
    mixSweep(whoosh(1.0, up ? 500 : 3800, up ? 4200 : 500), h.t - 0.05, 0.28, h.from, h.to, 0.3);
  } else if (h.type === 'tick') {
    // A number lands: a short rising arpeggio and a soft thump.
    const notes = [TONIC.arp[0], TONIC.arp[2], TONIC.arp[3]].map((m) => m + 12);
    notes.forEach((m, i) => mix(blip(hz(m), 0.09, 50), h.t + i * 0.055, { gain: 0.07, pan: -0.4 + i * 0.4, send: 0.45 }));
    mix(filter(kick(), 'lp', 900), h.t, { gain: 0.16 });
  } else if (h.type === 'riser') {
    mix(riser(h.until - h.t, 250, 7000), h.t, { gain: 0.2, send: 0.2 });
    for (let i = 0; i < 8; i++) mix(clap(), h.until - BEAT * 2 + (i * BEAT) / 4, { gain: 0.04 + 0.024 * i, send: 0.2 });
  } else if (h.type === 'crash') {
    mix(impact(0.8), h.t, { gain: 0.45, send: 0.3 });
    mix(crash(2.2), h.t, { gain: 0.2, send: 0.3 });
  } else if (h.type === 'outro') {
    // Drop, swell while the dots write the name, land on the relative major.
    mix(riser(h.until - h.t, 400, 9000), h.t, { gain: 0.16, send: 0.4 });
    const arp = RELMAJ.arp.slice(0, 4);
    for (let i = 0; i < 12; i++) {
      const t = h.t + (h.until - h.t) * (1 - (1 - i / 12) ** 1.6);
      mix(pluck(hz(arp[i % 4] + (i >= 6 ? 12 : 0) - 12), 0.8, 1.3), t, { gain: 0.08 + 0.006 * i, pan: i % 2 ? 0.5 : -0.5, send: 0.5 });
    }
    mix(impact(0.6), h.until, { gain: 0.36, send: 0.35 });
    const bells = [RELMAJ.pad[0] + 12, RELMAJ.pad[1] + 12, RELMAJ.pad[2] + 12, RELMAJ.pad[3] + 12];
    bells.forEach((m, i) => mix(bell(hz(m)), h.until + i * 0.018, { gain: 0.19, pan: (i - 1.5) * 0.3, send: 0.6 }));
    mix(crash(2.4), h.until, { gain: 0.12, send: 0.4 });
    mix(padChord([...RELMAJ.pad, RELMAJ.pad[0] + 12].map(hz), DURATION - h.until, { attack: 0.02, release: 0.4, cutoff: 3200 }), h.until, { gain: 0.48, send: 0.6 });
  }
}

const out = path.join(ROOT, 'out', `soundtrack-${STORY}.wav`);
const { rms } = S.write(out);
console.log(`out/soundtrack-${STORY}.wav  ${DURATION}s  ${(60 / BEAT).toFixed(1)} BPM in ${cues.key} minor  rms ${rms.toFixed(1)} dBFS`);
