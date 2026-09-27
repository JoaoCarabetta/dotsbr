// Synthesised score + sound design, generated from the same beat sheet as
// the picture (src/story.js), so hits land on the cuts by construction.
// vi–IV–I–V in C at 133⅓ BPM, one chord per bar: pads, sub, plucks, a
// half-time kick under the chart, four on the floor from the fly, whooshes
// for every dot flight, UI clicks for the product.
//
//   node scripts/soundtrack.mjs   → out/soundtrack.wav (48 kHz stereo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, BEAT, GRID0, DURATION } from '../src/story.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000;
const N = Math.ceil(DURATION * SR);
const dryL = new Float32Array(N), dryR = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N);
const TAU = Math.PI * 2;

let seed = 20220801;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// ---- mixing ----
function mix(x, t0, { gain = 1, pan = 0, send = 0, duck = 0 } = {}) {
  const s0 = Math.round(t0 * SR);
  const a = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(a) * gain, gr = Math.sin(a) * gain;
  for (let i = 0; i < x.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    const v = x[i] * (duck ? duckAt(j / SR, duck) : 1);
    dryL[j] += v * gl; dryR[j] += v * gr;
    if (send) { sendL[j] += v * gl * send; sendR[j] += v * gr * send; }
  }
}
// Stereo sweep: pan moves from p0 to p1 over the sound.
function mixSweep(x, t0, gain, p0, p1, send = 0) {
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < x.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= N) continue;
    const p = p0 + (p1 - p0) * (i / x.length);
    const a = ((p + 1) * Math.PI) / 4;
    const v = x[i] * gain;
    dryL[j] += v * Math.cos(a); dryR[j] += v * Math.sin(a);
    if (send) { sendL[j] += v * Math.cos(a) * send; sendR[j] += v * Math.sin(a) * send; }
  }
}

// Sidechain: pads and bass dip under every kick.
const kicks = [];
function duckAt(t, depth) {
  let g = 1;
  for (const k of kicks) {
    if (k > t) break;
    const d = t - k;
    if (d < 0.4) g = Math.min(g, 1 - depth * Math.exp(-d * 11));
  }
  return g;
}

// ---- filters ----
function biquad(type, f, q) {
  const w = (TAU * f) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filter(x, type, f, q = 0.707) {
  const [b0, b1, b2, a1, a2] = biquad(type, f, q);
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
// Band-pass whose centre follows fn(progress) — whooshes and risers.
function sweep(x, fn, q) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, co;
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) co = biquad('bp', fn(i / x.length), q);
    const [b0, b1, b2, a1, a2] = co;
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const noise = (dur) => Float32Array.from({ length: Math.round(dur * SR) }, () => rnd() * 2 - 1);

// ---- instruments ----
function kick() {
  const n = Math.round(0.42 * SR), y = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (46 + 120 * Math.exp(-t * 30))) / SR;
    const click = i < 200 ? (rnd() - 0.5) * (1 - i / 200) * 0.5 : 0;
    y[i] = Math.tanh(1.6 * Math.sin(ph) * Math.exp(-t * 7)) + click;
  }
  return y;
}
function hat(open = false) {
  const x = filter(filter(noise(open ? 0.22 : 0.07), 'hp', 7000), 'hp', 7000);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-(i / SR) * (open ? 14 : 70));
  return x;
}
function clap() {
  const x = filter(noise(0.25), 'bp', 1400, 0.9);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const burst = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 180) : 0), 0);
    x[i] *= 2.2 * (burst * 0.6 + Math.exp(-t * 16) * 0.5);
  }
  return x;
}
function pluck(f, dur = 0.7, bright = 1) {
  const n = Math.round(dur * SR), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 1; k <= 7; k++) v += (Math.sin(TAU * f * k * t) / k ** 1.3) * Math.exp(-t * (4 + 3.2 * k / bright));
    y[i] = v * Math.min(1, t / 0.002);
  }
  return y;
}
function padChord(freqs, dur, { attack = 0.35, release = 0.6, cutoff = 1700 } = {}) {
  const n = Math.round((dur + release) * SR), y = new Float32Array(n);
  for (const f of freqs) {
    for (const det of [-0.0045, 0.0045]) {
      const ff = f * (1 + det);
      const ph = rnd() * TAU;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        let v = 0;
        for (let k = 1; k <= 10; k++) if (ff * k < 9000) v += Math.sin(TAU * ff * k * t + ph * k) / k ** 1.15;
        y[i] += v;
      }
    }
  }
  const out = filter(filter(y, 'lp', cutoff), 'lp', cutoff * 1.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * (t > dur ? Math.exp(-(t - dur) / (release / 3)) : 1);
    out[i] *= (env * (1 + 0.04 * Math.sin(TAU * 0.35 * t))) / (freqs.length * 2.2);
  }
  return out;
}
function bass(f, dur) {
  const n = Math.round(dur * SR), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.008) * Math.exp(-t * 2.2) * Math.min(1, (dur - t) / 0.03);
    y[i] = Math.tanh(1.4 * (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t))) * env;
  }
  return y;
}
function impact(big = 1) {
  const n = Math.round(1.8 * SR), y = new Float32Array(n);
  let ph = 0;
  const body = filter(noise(1.8), 'lp', 520);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (30 + 55 * Math.exp(-t * 5))) / SR;
    y[i] = Math.sin(ph) * Math.exp(-t * 2.4) * 1.1 + body[i] * Math.exp(-t * 7) * 1.6 * big;
  }
  return y;
}
function crash(dur = 1.8) {
  const x = filter(noise(dur), 'hp', 3500);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-(i / SR) * 2.6) * Math.min(1, i / 60);
  return x;
}
function whoosh(dur, f0, f1, q = 1.2) {
  const x = sweep(noise(dur), (p) => f0 * (f1 / f0) ** p, q);
  for (let i = 0; i < x.length; i++) x[i] *= Math.sin(Math.PI * (i / x.length)) ** 1.6 * 3;
  return x;
}
function riser(dur, f0, f1) {
  const x = sweep(noise(dur), (p) => f0 * (f1 / f0) ** (p * p), 2.2);
  for (let i = 0; i < x.length; i++) {
    const p = i / x.length;
    x[i] = x[i] * 3.5 * p ** 2.2 + Math.sin(TAU * (180 + 520 * p * p) * (i / SR)) * 0.18 * p ** 3;
  }
  return x;
}
function blip(f, dur = 0.03, decay = 180) {
  const n = Math.round(dur * SR), y = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; y[i] = Math.sin(TAU * f * t) * Math.exp(-t * decay) * Math.min(1, i / 24); }
  return y;
}
function key() {
  const x = filter(noise(0.03), 'bp', 2600 + rnd() * 1200, 1.4);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-(i / SR) * 260) * 2.5;
  return x;
}
function bell(f, dur = 2.6) {
  const n = Math.round(dur * SR), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = 2.2 * Math.exp(-t * 3);
    y[i] = Math.sin(TAU * f * t + idx * Math.sin(TAU * f * 2 * t)) * Math.exp(-t * 1.7) * Math.min(1, i / 60);
  }
  return y;
}

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

// ---- reverb (Freeverb) on the send bus ----
function freeverb(inp, spread) {
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((l) => ({ buf: new Float32Array(Math.round((l + spread) * k)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((l) => ({ buf: new Float32Array(Math.round((l + spread) * k)), i: 0 }));
  const out = new Float32Array(inp.length);
  const fb = 0.86, damp = 0.28;
  for (let n = 0; n < inp.length; n++) {
    const x = inp[n] * 0.015;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.f = o * (1 - damp) + c.f * damp;
      c.buf[c.i] = x + c.f * fb;
      if (++c.i >= c.buf.length) c.i = 0;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      y = o - y;
    }
    out[n] = y;
  }
  return out;
}
const wetL = freeverb(sendL, 0), wetR = freeverb(sendR, 23);

// ---- master ----
const L = new Float32Array(N), R = new Float32Array(N);
let hpL = 0, hpR = 0, pl = 0, pr = 0;
for (let i = 0; i < N; i++) {
  let l = dryL[i] + wetL[i] * 2.2, r = dryR[i] + wetR[i] * 2.2;
  // DC / rumble high-pass (~20 Hz).
  hpL = 0.9974 * (hpL + l - pl); pl = l; l = hpL;
  hpR = 0.9974 * (hpR + r - pr); pr = r; r = hpR;
  const t = i / SR;
  const fade = Math.min(1, t / 0.01) * Math.min(1, (DURATION - t) / 0.5);
  L[i] = Math.tanh(l * 1.15) * fade;
  R[i] = Math.tanh(r * 1.15) * fade;
}
let peak = 0, sum = 0;
for (let i = 0; i < N; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sum += L[i] ** 2 + R[i] ** 2; }
const norm = 0.89 / peak;
const rms = Math.sqrt(sum / (2 * N)) * norm;

const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
}
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out', 'soundtrack.wav'), buf);
console.log(`out/soundtrack.wav  ${DURATION}s  peak→-1 dBFS  rms ${(20 * Math.log10(rms)).toFixed(1)} dBFS`);
