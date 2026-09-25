export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// Progress of t through [a, b], clamped.
export const prog = (t, a, b) => clamp01((t - a) / (b - a));

export const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuint: (t) => 1 - (1 - t) ** 5,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, c1 = 1.7) => 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2,
};

// Critically-damped-ish spring from 0 to 1 (seconds since start).
export function spring(s, { freq = 2.2, damping = 0.55 } = {}) {
  if (s <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damping;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + ((z * w) / wd) * Math.sin(wd * s));
}

// Envelope that rises over [a, a+inDur] and falls over [b-outDur, b].
export function env(t, a, b, inDur = 0.3, outDur = 0.3, e = ease.outCubic) {
  if (t < a || t > b) return 0;
  return Math.min(e(prog(t, a, a + inDur)), 1 - ease.inCubic(prog(t, b - outDur, b)));
}

export const fmtInt = (n) => Math.round(n).toLocaleString('pt-BR');
export const fmtPct = (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
