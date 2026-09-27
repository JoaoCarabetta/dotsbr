// Tiny offline synth shared by the soundtracks: a stereo bus with a reverb
// send, sidechain ducking, biquads and the handful of instruments the scores
// use. Pure Node, deterministic (seeded noise), 48 kHz / 16-bit WAV out.
//
//   const s = studio(DURATION);
//   s.mix(s.kick(), 1.0, { gain: 0.4 });
//   s.write('out/x.wav');
import fs from 'node:fs';
import path from 'node:path';

export const SR = 48000;
const TAU = Math.PI * 2;
export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function studio(DURATION, seed0 = 20220801) {
  const N = Math.ceil(DURATION * SR);
  const dryL = new Float32Array(N), dryR = new Float32Array(N);
  const sendL = new Float32Array(N), sendR = new Float32Array(N);

  let seed = seed0;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---- mixing ----
  // Sidechain: anything mixed with `duck` dips under the kicks pushed so far.
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

  // ---- filters ----
  function biquad(type, f, q) {
    const w = (TAU * f) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
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

  // ---- master: reverb, ~20 Hz high-pass, soft clip, peak to -1 dBFS ----
  function write(file) {
    const wetL = freeverb(sendL, 0), wetR = freeverb(sendR, 23);
    const L = new Float32Array(N), R = new Float32Array(N);
    let hpL = 0, hpR = 0, pl = 0, pr = 0;
    for (let i = 0; i < N; i++) {
      let l = dryL[i] + wetL[i] * 2.2, r = dryR[i] + wetR[i] * 2.2;
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
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return { rms: 20 * Math.log10(rms) };
  }

  return { N, rnd, kicks, mix, mixSweep, filter, noise, kick, hat, clap, pluck, padChord, bass, impact, crash, whoosh, riser, blip, key, bell, write };
}
