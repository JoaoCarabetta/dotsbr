// Boot: load dots + land + fonts, then either play a live preview with a
// scrubber, or (?render) expose window.renderFrame(t) to the capture script.
import { Dots } from './dots.js';
import { makeView } from './camera.js';
import { layoutFor, cameraAt, layersAt, landAlpha, buildTargets, DURATION } from './story.js';
import { createOverlay } from './overlay.js';

const params = new URLSearchParams(location.search);
const W = Number(params.get('w')) || 1920;
const H = Number(params.get('h')) || 1080;
const RENDER = params.has('render');
const L = layoutFor(W, H);

const stage = document.getElementById('stage');
stage.style.width = `${W}px`;
stage.style.height = `${H}px`;
stage.classList.toggle('portrait', L.portrait);
if (RENDER) document.body.classList.add('render');

const landCanvas = document.getElementById('land');
landCanvas.width = W;
landCanvas.height = H;
const landCtx = landCanvas.getContext('2d');

// Fade via CSS opacity: a 2D canvas that is only clearRect()'d is not
// re-sent to the compositor in headless Chromium, so the last drawn land
// would linger under the city frames.
function drawLand(rings, view, alpha) {
  landCanvas.style.opacity = alpha;
  if (alpha <= 0) return;
  landCtx.clearRect(0, 0, W, H);
  for (const pass of [0, 1]) {
    for (const r of rings) {
      if (r.br !== pass) continue;
      landCtx.beginPath();
      for (let i = 0; i < r.pts.length; i += 2) {
        const [x, y] = view.project(r.pts[i], r.pts[i + 1]);
        i ? landCtx.lineTo(x, y) : landCtx.moveTo(x, y);
      }
      landCtx.closePath();
      landCtx.fillStyle = pass ? '#fdfdfb' : '#f6f5f1';
      landCtx.fill();
      landCtx.lineWidth = pass ? 1.4 : 1;
      landCtx.strokeStyle = pass ? '#d8d6ce' : '#e2e0d9';
      landCtx.stroke();
    }
  }
}

// Glyph samples for the dot wordmark (Inter 800, jittered grid).
function sampleGlyphs(Lay) {
  const c = document.createElement('canvas');
  c.width = Lay.W;
  c.height = Lay.H;
  const ctx = c.getContext('2d');
  ctx.font = `800 ${Lay.word.size}px Inter`;
  ctx.letterSpacing = `${-0.045 * Lay.word.size}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('dotsbr', Lay.word.x, Lay.word.y);
  const img = ctx.getImageData(0, 0, Lay.W, Lay.H).data;
  const pitch = Lay.portrait ? 3.2 : 3.0;
  const out = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < Lay.H; y += pitch) {
    for (let x = 0; x < Lay.W; x += pitch) {
      const px = x + (rnd() - 0.5) * pitch * 0.5;
      const py = y + (rnd() - 0.5) * pitch * 0.5;
      const a = img[(Math.round(py) * Lay.W + Math.round(px)) * 4 + 3];
      if (a > 140) out.push([px, py]);
    }
  }
  return out;
}

async function boot() {
  await Promise.all([
    document.fonts.load('400 80px "Instrument Serif"'),
    document.fonts.load('italic 400 80px "Instrument Serif"'),
    document.fonts.load('500 20px Inter'),
    document.fonts.load('800 20px Inter'),
  ]);
  const manifest = await (await fetch('data/manifest.json')).json();
  const dots = new Dots(document.getElementById('gl'), { W, H });
  dots.SCALE = manifest.scale;
  await Promise.all(
    Object.values(manifest.datasets).map(async (m) => {
      const buf = await (await fetch(`data/${m.name}.bin`)).arrayBuffer();
      dots.add(m.name, m, buf);
    }),
  );
  const land = await (await fetch('data/land.json')).json();
  const info = buildTargets(dots, L, sampleGlyphs);
  const overlay = createOverlay(stage, L);

  const renderAt = (t) => {
    const cam = cameraAt(t, L);
    const view = makeView(cam, W, H);
    drawLand(land, view, landAlpha(t, cam));
    dots.clear();
    for (const layer of layersAt(t, L, cam)) dots.draw(view, manifest.scale, layer);
    overlay(t, view, cam);
  };

  window.renderFrame = (t) => {
    renderAt(t);
    dots.gl.finish();
    return true;
  };
  window.DURATION = DURATION;
  window.info = info;

  if (RENDER) {
    window.ready = true;
    return;
  }
  preview(renderAt);
}

function preview(renderAt) {
  const bar = document.createElement('div');
  bar.className = 'controls';
  bar.innerHTML = `<button id="pp">▶︎</button><input id="sc" type="range" min="0" max="${DURATION}" step="0.001" value="0"><span id="tc">0.00s</span>`;
  document.body.appendChild(bar);
  const sc = bar.querySelector('#sc');
  const tc = bar.querySelector('#tc');
  const pp = bar.querySelector('#pp');
  const fit = () => {
    const k = Math.min((innerWidth - 20) / W, (innerHeight - 60) / H);
    stage.style.transform = `scale(${k})`;
    stage.style.marginBottom = `${H * k - H}px`;
    stage.style.marginRight = `${W * k - W}px`;
  };
  addEventListener('resize', fit);
  fit();
  let t = Number(params.get('t')) || 0;
  let playing = !params.has('t');
  let last = performance.now();
  const show = () => {
    renderAt(t);
    sc.value = t;
    tc.textContent = `${t.toFixed(2)}s`;
    pp.textContent = playing ? '❚❚' : '▶︎';
  };
  const loop = (now) => {
    if (playing) {
      t += (now - last) / 1000;
      if (t > DURATION) t = 0;
      show();
    }
    last = now;
    requestAnimationFrame(loop);
  };
  sc.addEventListener('input', () => { t = Number(sc.value); playing = false; show(); });
  pp.addEventListener('click', () => { playing = !playing; show(); });
  addEventListener('keydown', (e) => {
    if (e.key === ' ') { playing = !playing; e.preventDefault(); }
    if (e.key === 'ArrowRight') { t = Math.min(DURATION, t + 1 / 60); playing = false; }
    if (e.key === 'ArrowLeft') { t = Math.max(0, t - 1 / 60); playing = false; }
    show();
  });
  show();
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${e.stack || e}</pre>`);
  window.bootError = String(e.stack || e);
});
