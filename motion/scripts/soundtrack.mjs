// Synthesised score + sound design, generated from the same beat sheet as
// the picture (src/story.js), so hits land on the cuts by construction.
// vi–IV–I–V in C at 133⅓ BPM, one chord per bar: pads, sub, plucks, a
// half-time kick under the chart, four on the floor from the fly, whooshes
// for every dot flight, UI clicks for the product.
//
//   node scripts/soundtrack.mjs   → out/soundtrack.wav (48 kHz stereo)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, BEAT, GRID0, DURATION } from '../src/story.js';
import { studio, hz } from './synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { rnd, kicks, mix, mixSweep, filter, kick, hat, clap, pluck, padChord, bass, impact, crash, whoosh, riser, blip, key, bell, write } = studio(DURATION);

// ---- harmony ----
const CHORDS = {
  Am: { root: 45, pad: [57, 60, 64, 71] },
  F: { root: 41, pad: [53, 57, 60, 64] },
  C: { root: 48, pad: [55, 60, 64, 62 + 12] },
  G: { root: 43, pad: [55, 59, 62, 69] },
};
const beatAt = (n) => GRID0 + n * BEAT;
const BAR = 4 * BEAT;
// vi–IV–I–V, one chord per bar from the burst. Every cut in story.js sits on
// a bar line, so the landing in Rio falls on Am and the logo resolves on C.
const PROGRESSION = ['Am', 'F', 'C', 'G'];
const BARS = [];
for (let n = 0; GRID0 + n * BAR < T.word[1] - 0.01; n++) {
  BARS.push({ a: GRID0 + n * BAR, b: Math.min(GRID0 + (n + 1) * BAR, T.word[1]), chord: CHORDS[PROGRESSION[n % 4]] });
}

// ---- arrangement ----
// Hook: a single dot appears; a second note lands with "= 900 pessoas".
mix(pluck(hz(81), 1.2, 1.4), 0.05, { gain: 0.22, send: 0.5 });
mix(blip(hz(93), 0.2, 30), 0.05, { gain: 0.05, send: 0.6 });
mix(pluck(hz(76), 1.0, 1.2), 0.75, { gain: 0.14, pan: 0.3, send: 0.5 });
mix(padChord(CHORDS.Am.pad.map(hz), GRID0, { attack: 1.2, release: 0.3, cutoff: 1400 }), 0, { gain: 0.24, send: 0.4 });
mix(riser(GRID0 - 0.55, 200, 2500), 0.55, { gain: 0.08 });

// Pads: one chord per bar, brighter once the story reaches Rio.
for (const { a, b, chord } of BARS) {
  mix(padChord(chord.pad.map(hz), b - a, { attack: 0.08, release: 0.5, cutoff: a >= T.race ? 2800 : 2000 }), a, { gain: 0.44, send: 0.35, duck: 0.5 });
}
mix(padChord([60, 64, 67, 74, 79].map(hz), DURATION - T.word[1], { attack: 0.02, release: 0.4, cutoff: 3200 }), T.word[1], { gain: 0.5, send: 0.6 });

// Burst: the dot explodes into 225k.
mix(impact(1), T.burst[0], { gain: 0.5, send: 0.25 });
mixSweep(whoosh(0.9, 3000, 300, 0.9), T.burst[0] - 0.02, 0.35, -0.2, 0.3, 0.3);
for (let i = 0; i < 260; i++) {
  const t = T.burst[0] + 0.05 + (T.burst[1] - T.burst[0]) * rnd() ** 2.2;
  mix(blip(2400 + rnd() * 5200, 0.025, 260), t, { gain: 0.03 + 0.05 * rnd(), pan: rnd() * 1.6 - 0.8, send: 0.35 });
}

// Drums: half-time while the chart and the search are read, four on the
// floor from the fly, claps and extra hats in Rio, dropped for the outro.
for (let n = 8; beatAt(n) < T.outro - 0.01; n++) {
  const t = beatAt(n);
  const inBar = n % 4;
  const reading = t < T.fly[0];
  if (reading && inBar % 2) continue;
  kicks.push(t);
  const flying = t >= T.fly[0] && t < T.race;
  mix(kick(), t, { gain: flying ? 0.34 : reading ? 0.36 : 0.44 });
  if (t >= T.search[0]) mix(hat(), t + BEAT / 2, { gain: 0.2, pan: 0.25 });
  if (t >= T.race) {
    mix(hat(), t + BEAT / 4, { gain: 0.07, pan: -0.3 });
    mix(hat(), t + (3 * BEAT) / 4, { gain: 0.07, pan: 0.3 });
    if (inBar === 1 || inBar === 3) mix(clap(), t, { gain: 0.36, send: 0.25 });
  }
}
kicks.sort((a, b) => a - b);

// Sub bass: long notes until the chart, then an offbeat pulse.
for (const { a, b, chord } of BARS) {
  const f = hz(chord.root);
  if (a < T.chartIn[0]) { mix(bass(f, b - a), a, { gain: 0.2 }); continue; }
  for (let t = a; t < b - 0.01; t += BEAT) mix(bass(f, BEAT * 0.9), t + BEAT * 0.5, { gain: 0.24, duck: 0.3 });
}

// Plucked arpeggio: the dots, audible. Denser as the story zooms in.
let k = 0;
for (const { a, b, chord } of BARS) {
  if (a >= T.outro) continue;
  const notes = chord.pad.map((m) => m + 12);
  const step = a >= T.race ? BEAT / 4 : BEAT / 2;
  for (let t = Math.max(a, T.burst[0] + BEAT); t < b - 0.01; t += step, k++) {
    const m = notes[(k * 3 + (k >> 2)) % notes.length] + (k % 8 === 7 ? 12 : 0);
    const accent = k % 4 === 0 ? 1 : 0.7;
    mix(pluck(hz(m), 0.6, 1.1), t, { gain: 0.15 * accent, pan: (k % 2 ? 0.45 : -0.45) * (0.6 + 0.4 * rnd()), send: 0.4 });
  }
}

// Dots fly to the chart (right → left) and back.
mixSweep(whoosh(1.0, 500, 4200), T.chartIn[0] - 0.05, 0.3, 0.7, -0.7, 0.3);
mixSweep(whoosh(0.9, 3800, 500), T.chartOut[0] - 0.05, 0.26, -0.7, 0.7, 0.3);
// Bars fill: little ticks as the percentages count up.
for (let i = 0; i < 5; i++) mix(blip(hz(88 + [0, 2, 4, 7, 9][i]), 0.08, 60), T.chartIn[0] + 0.35 + i * 0.07, { gain: 0.06, pan: -0.5, send: 0.4 });

// Search: typing, then enter.
// Same timings as the pill in overlay.js (typing 0.3–0.95 s, enter at 1.2 s).
for (let i = 0; i < 14; i++) mix(key(), T.search[0] + 0.3 + (i * 0.65) / 14 + (rnd() - 0.5) * 0.01, { gain: 0.16, pan: -0.45 });
mix(filter(key(), 'lp', 1800), T.search[0] + 1.2, { gain: 0.5, pan: -0.45 });

// Fly: riser into the landing, with a snare roll on the last beat.
mix(riser(T.fly[1] - T.fly[0], 250, 7000), T.fly[0], { gain: 0.22, send: 0.2 });
mixSweep(whoosh(T.fly[1] - T.fly[0] + 0.2, 180, 2400, 0.8), T.fly[0], 0.3, -0.5, 0.5, 0.15);
for (let i = 0; i < 8; i++) mix(clap(), T.fly[1] - BEAT * 2 + (i * BEAT) / 4, { gain: 0.05 + 0.028 * i, send: 0.2 });
mix(impact(0.8), T.race, { gain: 0.45, send: 0.3 });
mix(crash(2.2), T.race, { gain: 0.22, send: 0.3 });

// Lens switches: a click from the cursor, a swoosh with the wipe front.
for (const [w, dir] of [[T.income, 1], [T.religion, -1]]) {
  mix(blip(2300, 0.012, 500), w[0] - 0.03, { gain: 0.3, pan: -0.5 });
  mix(blip(1150, 0.02, 300), w[0] - 0.02, { gain: 0.2, pan: -0.5 });
  mixSweep(whoosh(w[1] - w[0] + 0.15, 350, 3800, 1.4), w[0], 0.26, -0.8 * dir, 0.8 * dir, 0.35);
  mix(crash(1.2), w[0], { gain: 0.08, send: 0.2 });
}

// Outro: drop, swell while the dots write the name, land on C.
mix(riser(T.word[1] - T.outro, 400, 9000), T.outro, { gain: 0.16, send: 0.4 });
for (let i = 0; i < 12; i++) {
  const t = T.outro + (T.word[1] - T.outro) * (1 - (1 - i / 12) ** 1.6);
  mix(pluck(hz([72, 76, 79, 83, 84, 88][i % 6] + (i >= 6 ? 12 : 0) - 12), 0.8, 1.3), t, { gain: 0.08 + 0.006 * i, pan: i % 2 ? 0.5 : -0.5, send: 0.5 });
}
mix(impact(0.6), T.word[1], { gain: 0.36, send: 0.35 });
[72, 76, 79, 86].forEach((m, i) => mix(bell(hz(m)), T.word[1] + i * 0.018, { gain: 0.2, pan: (i - 1.5) * 0.3, send: 0.6 }));
mix(crash(2.4), T.word[1], { gain: 0.12, send: 0.4 });

const { rms } = write(path.join(ROOT, 'out', 'soundtrack.wav'));
console.log(`out/soundtrack.wav  ${DURATION}s  peak→-1 dBFS  rms ${rms.toFixed(1)} dBFS`);
