// Kinetic type + small SVG/DOM helpers shared by every story's overlay.
import { prog, ease, env } from '../util.js';

export const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
};

// "*word*" marks the emphasised (italic, coloured) words of a headline.
export function words(text, color) {
  return text
    .split(' ')
    .map((w) => {
      const em = w.startsWith('*');
      const clean = w.replace(/\*/g, '');
      return `<span class="w"><span class="wi${em ? ' em' : ''}"${em && color ? ` style="color:${color}"` : ''}>${clean}</span></span>`;
    })
    .join(' ');
}
// Emphasis can span several words: *8 em 10* → mark every word in between.
export function markRuns(text) {
  let on = false;
  return text
    .split(' ')
    .map((w) => {
      const starts = w.startsWith('*');
      const ends = /\*[.,:]?$/.test(w);
      const mark = on || starts;
      if (starts) on = true;
      if (ends) on = false;
      const clean = w.replace(/\*/g, '');
      return mark ? `*${clean}*` : clean;
    })
    .join(' ');
}

// Word-by-word rise in, word-by-word lift out.
export function animWords(el, t, tin, tout, { stagger = 0.032, dur = 0.62 } = {}) {
  const ws = el._ws || (el._ws = [...el.querySelectorAll('.wi')]);
  ws.forEach((w, i) => {
    const pin = ease.outExpo(prog(t, tin + i * stagger, tin + i * stagger + dur));
    const pout = ease.inCubic(prog(t, tout - 0.34 + i * 0.012, tout + i * 0.012));
    const y = (1 - pin) * 110 - pout * 110;
    w.style.transform = `translate3d(0, ${y}%, 0)`;
    w.style.opacity = t < tin || t > tout + 0.4 ? 0 : 1;
  });
}

export function fade(el, t, tin, tout, { dy = 18, dur = 0.5, outDur = 0.3 } = {}) {
  const a = env(t, tin, tout, dur, outDur, ease.outCubic);
  const pin = ease.outExpo(prog(t, tin, tin + dur));
  const pout = ease.inCubic(prog(t, tout - outDur, tout));
  el.style.opacity = a;
  el.style.transform = `translate3d(0, ${(1 - pin) * dy - pout * dy * 0.6}px, 0)`;
  el.style.visibility = a > 0.001 ? 'visible' : 'hidden';
}

export function digits(s) {
  return s.split('').map((c) => (c === '.' ? '<span class="sep">.</span>' : `<span class="d">${c}</span>`)).join('');
}

export function chips(items) {
  return items.map(([name, c]) => `<span class="lg"><i style="background:${c}"></i>${name}</span>`).join('');
}

export function logoSvg(size) {
  // favicon.svg's five census dots, without the grey tile.
  return `<svg width="${size}" height="${size}" viewBox="2 6 26 21" aria-hidden="true"><circle cx="13" cy="14" r="6.2" fill="#e41a1c"/><circle cx="20.5" cy="12.5" r="5.4" fill="#4daf4a"/><circle cx="16.5" cy="21" r="4.8" fill="#ff7f00"/><circle cx="8.2" cy="20.5" r="3.6" fill="#984ea3"/><circle cx="24.2" cy="20" r="3.4" fill="#377eb8"/></svg>`;
}
export const searchIcon = () => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>`;
export const cursorSvg = () => `<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2.5 19.5 13l-7 1.2 4 7.3-3 1.6-4-7.4L4 20.5z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
