/* Animation and formatting helpers for the promo.
 *
 * Every visible value is a pure function of the frame number: no CSS
 * transitions, no wall-clock timers, no randomness. That is what lets
 * scripts/capture_promo.mjs screenshot frame N and get the same picture the
 * browser shows for ?frame=N. */

/* eslint-disable no-unused-vars */

/** CSS cubic-bezier as a JS easing function (Newton, then bisection). */
function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return function (x) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i += 1) {
            const dx = sampleX(t) - x;
            if (Math.abs(dx) < 1e-6) return sampleY(t);
            const slope = slopeX(t);
            if (Math.abs(slope) < 1e-6) break;
            t -= dx / slope;
        }
        let lo = 0;
        let hi = 1;
        t = x;
        while (hi - lo > 1e-6) {
            if (sampleX(t) < x) lo = t;
            else hi = t;
            t = (lo + hi) / 2;
        }
        return sampleY(t);
    };
}

/* The four curves the whole film uses. OUT is the workhorse (fast start, long
   settle); PAN and ZOOM are split so the camera behaves like flyTo — most of
   the ground is covered while still zoomed out. */
const EASE = {
    out: cubicBezier(0.16, 1, 0.3, 1),
    soft: cubicBezier(0.33, 1, 0.68, 1),
    inOut: cubicBezier(0.42, 0, 0.58, 1),
    pan: cubicBezier(0.24, 0.86, 0.32, 1),
    zoom: cubicBezier(0.62, 0.02, 0.38, 1),
    count: cubicBezier(0.12, 0.9, 0.2, 1),
    pop: cubicBezier(0.34, 1.25, 0.34, 1),
};

/** Remotion-style interpolate: multi-stop, always clamped at both ends. */
function interp(x, input, output, easing) {
    const last = input.length - 1;
    if (x <= input[0]) return output[0];
    if (x >= input[last]) return output[last];
    for (let i = 0; i < last; i += 1) {
        if (x >= input[i] && x <= input[i + 1]) {
            const span = input[i + 1] - input[i];
            const t = span === 0 ? 1 : (x - input[i]) / span;
            const eased = easing ? easing(t) : t;
            return output[i] + (output[i + 1] - output[i]) * eased;
        }
    }
    return output[last];
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** Ramp up, hold, ramp down — the shape of every caption in the film. */
const trapezoid = (frame, inStart, inEnd, outStart, outEnd) =>
    interp(frame, [inStart, inEnd, outStart, outEnd], [0, 1, 1, 0], EASE.soft);

const asInt = (value) => Math.round(value).toLocaleString('pt-BR');

const asPct = (value, digits) => {
    const d = digits === undefined ? 1 : digits;
    return (value * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
    }) + '%';
};

const asMoney = (value) =>
    Math.round(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    });

/** "202,3 milhões" — the headline form of a big count. */
const asMillions = (value) =>
    (value / 1e6).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }) + ' milhões';

/* Tiny DOM helpers: the overlay markup lives in index.html and JS only ever
   updates style and text, so a frame can be re-painted from scratch cheaply. */
const el = (id) => document.getElementById(id);

const setOpacity = (node, value) => {
    node.style.opacity = String(value);
};

const shift = (node, x, y) => {
    node.style.translate = x + 'px ' + y + 'px';
};
