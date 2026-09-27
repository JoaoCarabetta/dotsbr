// DOM components for the stories. Each factory builds its elements once and
// returns an update function; every update is a pure function of time.
import { h, words, markRuns, animWords, fade, logoSvg, chips } from './type.js';
import { prog, lerp, ease, env, spring, fmtPct } from '../util.js';
import { lon2x, lat2y } from '../camera.js';

export const root = (stage) => stage.appendChild(h('div', 'overlay'));

export function Brand(r) {
  const el = r.appendChild(h('div', 'brand', `${logoSvg(30)}<span>dotsbr</span>`));
  return (t, tin, tout) => fade(el, t, tin, tout, { dy: -10 });
}

export function Source(r, text = 'Fonte: IBGE, Censo Demográfico 2022') {
  const el = r.appendChild(h('div', 'source', text));
  return (t, tin, tout) => fade(el, t, tin, tout, { dy: 0 });
}

// Kicker / headline / sub / fine print / legend, stacked from `top`.
// "*…*" marks emphasis (italic + colour in the headline, bold in the sub).
export function Block(r, { top = 200, kicker, head, sub, fine, legend, color = '#16181b', size, subSize, center = false }) {
  const b = r.appendChild(h('div', `block story-block${center ? ' center' : ''}`));
  b.style.top = `${top}px`;
  const k = kicker ? b.appendChild(h('div', 'kicker', kicker)) : null;
  const hd = b.appendChild(h('div', 'headline', words(markRuns(head), color)));
  if (size) hd.style.fontSize = `${size}px`;
  const sb = sub ? b.appendChild(h('div', 'sub', words(markRuns(sub)))) : null;
  if (sb && subSize) sb.style.fontSize = `${subSize}px`;
  const fn = fine ? b.appendChild(h('div', 'fine', fine)) : null;
  const lg = legend ? b.appendChild(h('div', 'legend', legend)) : null;
  return (t, tin, tout) => {
    b.style.visibility = t > tin - 0.05 && t < tout + 0.5 ? 'visible' : 'hidden';
    if (k) fade(k, t, tin, tout, { dy: 8 });
    animWords(hd, t, tin + 0.03, tout);
    if (sb) animWords(sb, t, tin + 0.35, tout - 0.02, { stagger: 0.025 });
    if (fn) fade(fn, t, tin + 0.6, tout - 0.03, { dy: 8 });
    if (lg) fade(lg, t, tin + 0.5, tout - 0.04, { dy: 12 });
  };
}

export const kicker = (text, color = '#e41a1c') => `<i style="background:${color}"></i>${text}`;
export const legendHtml = (items) => chips(items);
export function rampHtml(colors, [lo, mid, hi], title) {
  return `${title ? `<div class="ramp-title">${title}</div>` : ''}<div class="ramp">${colors.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="ramp-labels"><span>${lo}</span><span>${mid}</span><span>${hi}</span></div>`;
}

// The single dot the story opens on: pops, breathes, then becomes the burst.
export function HookDot(r, [x, y], color, burstAt, caption) {
  const cap = caption ? r.appendChild(h('div', 'hook-cap', caption)) : null;
  if (cap) { cap.style.left = `${x}px`; cap.style.top = `${y + 56}px`; }
  const el = r.appendChild(h('div', 'hook-dot'));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.background = color;
  el.style.boxShadow = `0 0 0 14px ${color}22, 0 0 0 30px ${color}0d`;
  const rings = [0, 0.09].map(() => r.appendChild(h('div', 'shock')));
  rings.forEach((ring) => { ring.style.left = `${x}px`; ring.style.top = `${y}px`; ring.style.borderColor = color; });
  return (t) => {
    const s = spring(t - 0.1, { freq: 1.6, damping: 0.5 });
    const pulse = 1 + 0.07 * Math.sin((2 * Math.PI * t) / 0.9) * prog(t, 0.6, 1.0) - 0.12 * ease.inCubic(prog(t, burstAt - 0.4, burstAt - 0.05));
    const shrink = ease.inCubic(prog(t, burstAt - 0.05, burstAt + 0.14));
    el.style.transform = `translate(-50%, -50%) scale(${Math.max(0, s * pulse * (1 - shrink))})`;
    el.style.opacity = t < burstAt + 0.15 ? 1 : 0;
    if (cap) fade(cap, t, 0.7, burstAt - 0.05, { dy: 10 });
    rings.forEach((ring, i) => {
      const p = prog(t, burstAt + i * 0.09, burstAt + i * 0.09 + 0.9);
      ring.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      ring.style.transform = `translate(-50%, -50%) scale(${0.05 + ease.outExpo(p) * (i ? 1.25 : 1)})`;
      ring.style.opacity = (1 - ease.outCubic(p)) * (i ? 0.35 : 0.6);
    });
  };
}

// Pins that ride the (tilting) map. `windows` maps key → [in, out].
export function Pins(r, places) {
  const els = places.map((p) => {
    const el = r.appendChild(h('div', 'pin', `<div class="ring"></div><div class="stem"></div><div class="tag">${p.name}</div>`));
    return { ...p, el };
  });
  return (t, view, windows) => {
    for (const p of els) {
      const [a, b] = windows[p.key] || [-1, -1];
      const [x, y] = view.project(lon2x(p.lon), lat2y(p.lat));
      const sp = spring(t - a, { freq: 1.9, damping: 0.55 });
      const out = ease.inCubic(prog(t, b - 0.25, b));
      p.el.style.visibility = t > a && t < b ? 'visible' : 'hidden';
      p.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      p.el.style.setProperty('--s', Math.max(0, sp * (1 - out)));
      p.el.style.setProperty('--stem', Math.max(0, ease.outCubic(prog(t, a + 0.05, a + 0.35)) * (1 - out)));
    }
  };
}

// Labels and counting values next to dot bars built by barTargets().
export function BarLabels(r, rows, spec, shares, ends) {
  const items = rows.map(([name, color], i) => {
    const y = spec.y + i * spec.rowH + spec.rowH / 2;
    const label = r.appendChild(h('div', 'chart-label', `<i style="background:${color}"></i>${name}`));
    label.style.left = `${spec.x}px`;
    label.style.top = `${y}px`;
    const value = r.appendChild(h('div', 'chart-value'));
    value.style.left = `${ends[i] + 16}px`;
    value.style.top = `${y}px`;
    return { label, value };
  });
  return (t, tin, tout, { dimRows = [], dimAt = Infinity } = {}) => {
    items.forEach(({ label, value }, i) => {
      const a0 = tin + 0.3 + i * 0.07;
      const dim = dimRows.includes(i) ? lerp(1, 0.28, ease.inOutCubic(prog(t, dimAt, dimAt + 0.4))) : 1;
      label.style.opacity = env(t, a0, tout + i * 0.03, 0.4, 0.25) * dim;
      label.style.transform = `translate3d(${(1 - ease.outExpo(prog(t, a0, a0 + 0.6))) * -24}px, -50%, 0)`;
      value.textContent = fmtPct(shares[i] * ease.outCubic(prog(t, tin + 0.35 + i * 0.07, tin + 1.3)));
      value.style.opacity = env(t, tin + 0.55 + i * 0.07, tout + i * 0.03, 0.4, 0.25) * dim;
    });
  };
}

// A right bracket joining rows [i, j] of a bar chart, with a big label.
export function Bracket(r, { x, y0, y1, text, color }) {
  const el = r.appendChild(h('div', 'bracket'));
  el.style.left = `${x}px`;
  el.style.top = `${y0}px`;
  el.style.height = `${y1 - y0}px`;
  el.style.borderColor = color;
  const label = r.appendChild(h('div', 'bracket-label', text));
  label.style.left = `${x + 34}px`;
  label.style.top = `${(y0 + y1) / 2}px`;
  label.style.color = color;
  return (t, tin, tout) => {
    const a = env(t, tin, tout, 0.35, 0.25);
    el.style.opacity = a;
    el.style.transform = `scaleY(${ease.outBack(prog(t, tin, tin + 0.5), 1.2)})`;
    label.style.opacity = a;
    label.style.transform = `translate3d(${(1 - ease.outExpo(prog(t, tin + 0.1, tin + 0.7))) * 30}px, -50%, 0)`;
  };
}

// A floating legend pill over the map: colour chips, or any html (a ramp).
export function Legend(r, items, { bottom = 330 } = {}) {
  const el = r.appendChild(h('div', 'legend legend-bar', typeof items === 'string' ? items : chips(items)));
  el.style.bottom = `${bottom}px`;
  return (t, tin, tout) => fade(el, t, tin, tout, { dy: 14 });
}

// Tagline + address pill under the dot wordmark.
export function Outro(r, L, { tagline = 'O Brasil em pontos · Censo 2022', cta = 'carabetta.xyz/dotsbr' } = {}) {
  const tg = r.appendChild(h('div', 'tagline', words(tagline)));
  const url = r.appendChild(h('div', 'url', `${logoSvg(26)}<span>${cta}</span>`));
  const base = L.word.y + L.word.size * 0.31;
  tg.style.top = `${base + L.word.size * 0.17}px`;
  url.style.top = `${base + L.word.size * 0.17 + 110}px`;
  return (t, tin, tout) => {
    animWords(tg, t, tin - 0.2, tout, { stagger: 0.04 });
    const u = spring(t - tin, { freq: 1.7, damping: 0.6 });
    url.style.opacity = t > tin ? Math.min(1, u * 1.4) : 0;
    url.style.transform = `translate(-50%, 0) translate3d(0, ${(1 - u) * 26}px, 0)`;
  };
}

// A measuring line drawn on the map between two lon/lat points.
export function Ruler(r, { a, b, label, labels = [], color = '#16181b' }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ruler');
  const line = document.createElementNS(NS, 'line');
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '5');
  line.setAttribute('stroke-linecap', 'round');
  const ends = [0, 1].map(() => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', '11');
    c.setAttribute('fill', '#fff');
    c.setAttribute('stroke', color);
    c.setAttribute('stroke-width', '5');
    return c;
  });
  svg.append(line, ...ends);
  r.appendChild(svg);
  const tag = r.appendChild(h('div', 'ruler-label', label));
  const endTags = labels.map((l) => r.appendChild(h('div', 'pin-tag', l)));
  return (t, view, tin, tout) => {
    const vis = t > tin && t < tout + 0.3;
    for (const el of [svg, tag, ...endTags]) el.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) return;
    const A = view.project(lon2x(a[0]), lat2y(a[1]));
    const B = view.project(lon2x(b[0]), lat2y(b[1]));
    const p = ease.inOutCubic(prog(t, tin + 0.1, tin + 0.9));
    const out = 1 - ease.inCubic(prog(t, tout - 0.25, tout));
    line.setAttribute('x1', A[0]);
    line.setAttribute('y1', A[1]);
    line.setAttribute('x2', lerp(A[0], B[0], p));
    line.setAttribute('y2', lerp(A[1], B[1], p));
    ends[0].setAttribute('cx', A[0]);
    ends[0].setAttribute('cy', A[1]);
    ends[1].setAttribute('cx', B[0]);
    ends[1].setAttribute('cy', B[1]);
    ends[1].style.opacity = prog(t, tin + 0.8, tin + 0.95);
    svg.style.opacity = out;
    const s = spring(t - (tin + 0.8), { freq: 1.8, damping: 0.55 });
    tag.style.transform = `translate3d(${(A[0] + B[0]) / 2}px, ${(A[1] + B[1]) / 2 - 40}px, 0) translate(-50%, -100%) scale(${Math.max(0, s) * out})`;
    endTags.forEach((el, i) => {
      const P = i ? B : A;
      el.style.transform = `translate3d(${P[0]}px, ${P[1] + 26}px, 0) translate(-50%, 0) scale(${Math.max(0, spring(t - (tin + 0.3 + i * 0.5), { freq: 1.8, damping: 0.6 })) * out})`;
    });
  };
}

// A ring that springs in around a point (to find a tiny unit-chart block).
export function Ring(r, { x, y, d, color }) {
  const el = r.appendChild(h('div', 'ring-callout'));
  Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${d}px`, height: `${d}px`, borderColor: color });
  return (t, tin, tout) => {
    const s = spring(t - tin, { freq: 1.7, damping: 0.5 });
    const out = 1 - ease.inCubic(prog(t, tout - 0.3, tout));
    el.style.visibility = t > tin && t < tout ? 'visible' : 'hidden';
    el.style.transform = `translate(-50%, -50%) scale(${Math.max(0, s) * out})`;
  };
}

// A caption pinned to a screen position (unit-chart labels).
export function Label(r, { x, y, html, color = '#16181b' }) {
  const el = r.appendChild(h('div', 'map-label', html));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  return (t, tin, tout) => fade(el, t, tin, tout, { dy: 10 });
}
