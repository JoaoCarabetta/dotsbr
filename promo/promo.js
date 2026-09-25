/* Entry point.
 *
 * Exposes the tiny API scripts/capture_promo.mjs drives:
 *   window.promoMeta            fps, duration, authored size
 *   window.promoReady           resolves when the map has its first frame
 *   window.promoSeek(frame)     paints that frame and resolves when it is final
 *
 * By hand (needs `python3 scripts/serve.py`):
 *   http://127.0.0.1:8000/promo/              frame 0
 *   http://127.0.0.1:8000/promo/?frame=300    one still
 *   http://127.0.0.1:8000/promo/?play=1&hud=1 real-time preview with a readout
 *   arrow keys step frames (shift = 10), space toggles playing
 * Real-time preview does not wait for tiles, so dots pop in while panning; the
 * captured film waits for every frame, which is why it does not. */

window.promoMeta = { fps: FPS, duration: DURATION, width: 1920, height: 1080 };

const clampFrame = (frame) => Math.max(0, Math.min(DURATION - 1, Math.round(frame)));

/** Letterbox the 1920×1080 stage into whatever window a human opened. The
 *  capture viewport is exactly 1920×1080, so there the scale is 1. */
function fitStage() {
    const stage = el('stage');
    const scale = Math.min(1, window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.marginLeft = (window.innerWidth - 1920 * scale) / 2 + 'px';
    stage.style.marginTop = (window.innerHeight - 1080 * scale) / 2 + 'px';
}

/** Paint a frame without waiting for tiles (preview and scrubbing). */
function showFrame(frame) {
    const state = promoState(clampFrame(frame));
    applyMapState(state);
    /* Overlays run after the camera: the pointer and popup are positioned with
       map.project(), which has to see this frame's camera. */
    paintOverlay(state);
    if (hud) hud.textContent = 'frame ' + state.frame + ' · ' + (state.frame / FPS).toFixed(2) + 's · z' + state.camera.zoom.toFixed(2);
    return state;
}

const twoFrames = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

let hud = null;
let playing = false;
let playStart = 0;
let current = 0;

function playLoop() {
    if (!playing) return;
    const elapsed = (performance.now() - playStart) / 1000;
    current = Math.floor(elapsed * FPS) % DURATION;
    showFrame(current);
    requestAnimationFrame(playLoop);
}

async function boot() {
    fitStage();
    window.addEventListener('resize', fitStage);
    buildOverlay();

    if (params.get('hud')) {
        hud = document.createElement('div');
        hud.style.cssText =
            'position:fixed;left:12px;top:12px;z-index:99;padding:4px 8px;border-radius:4px;' +
            'background:rgba(17,17,17,0.85);color:#f1f3f4;font:12px ui-monospace,Menlo,monospace';
        document.body.appendChild(hud);
    }

    current = clampFrame(Number(params.get('frame')) || 0);
    const info = await initMap(promoState(current));
    showFrame(current);
    await twoFrames();

    document.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowRight') current = clampFrame(current + step);
        else if (event.key === 'ArrowLeft') current = clampFrame(current - step);
        else if (event.key === ' ') {
            playing = !playing;
            playStart = performance.now() - (current / FPS) * 1000;
            if (playing) playLoop();
            event.preventDefault();
            return;
        } else return;
        playing = false;
        showFrame(current);
    });

    if (params.get('play')) {
        playing = true;
        playStart = performance.now();
        playLoop();
    }

    return info;
}

window.promoReady = boot();

window.promoSeek = async function (frame) {
    const state = showFrame(frame);
    await settleMap();
    /* Two rAFs: MapLibre's last paint and the overlay's style changes both have
       to be composited before the screenshot is taken. */
    await twoFrames();
    return state.frame;
};
