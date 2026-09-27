// Frame-exact capture: serve motion/, step window.renderFrame(t) in headless
// Chromium, pipe PNG frames into ffmpeg (libx264), mux the soundtrack.
//
//   node scripts/render.mjs                         # 1920×1080 → out/dotsbr.mp4
//   node scripts/render.mjs --w 1080 --h 1920       # vertical → out/dotsbr-vertical.mp4
//   node scripts/render.mjs --stills 0.5,3.2,8      # PNGs in out/stills/ for review
//   --story povo     which src/stories/*.js to render (default: main)
//   --workers 2      split the frames across pages (SwiftShader is CPU-bound)
//   --fps 30         frame rate (default 30)
//   --target-mib 28  two-pass encode to a file size (chat/upload limits);
//                    otherwise one pass at --crf (default 23)
//
// Env: CHROME (browser binary), FFMPEG (ffmpeg with libx264).
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] == null ? true : all[i + 1]]] : acc), []),
);
const W = Number(args.w || 1920);
const H = Number(args.h || 1080);
const FPS = Number(args.fps || 30);
const TARGET_MIB = args['target-mib'] ? Number(args['target-mib']) : null;
const vertical = H > W;
const STORY = args.story || 'main';
const tag = `${STORY === 'main' ? '' : `-${STORY}`}${vertical ? '-vertical' : ''}`;
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render&story=${STORY}&w=${W}&h=${H}`;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--force-color-profile=srgb'],
});
async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.bootError);
  if (err) throw new Error(err);
  // CDP capture with Chromium's fast PNG encoder (optimizeForSpeed).
  const cdp = await page.context().newCDPSession(page);
  const shot = async (t) => {
    await page.evaluate((tt) => window.renderFrame(tt), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { page, shot };
}

const COLOR = ['-pix_fmt', 'yuv420p', '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
// With a size target the workers write a near-lossless intermediate and the
// real encode happens afterwards in two passes; dense dot fields are costly
// for H.264, so a CRF alone cannot promise a size.
const ENCODE = TARGET_MIB
  ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '8', ...COLOR]
  : ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 23), ...COLOR];
const run = (argv) => new Promise((r, j) => {
  const p = spawn(FFMPEG, argv, { stdio: ['pipe', 'inherit', 'inherit'] });
  p.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r()));
});

if (args.stills) {
  const { page, shot } = await openPage();
  console.log('targets', await page.evaluate(() => JSON.stringify(window.info)));
  const dir = path.join(OUT, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of String(args.stills).split(',')) {
    const t = Number(s);
    fs.writeFileSync(path.join(dir, `${STORY === 'main' ? '' : `${STORY}-`}${vertical ? 'v' : 'h'}-${t.toFixed(2)}.png`), await shot(t));
    console.log('still', t);
  }
} else {
  const workers = Number(args.workers || 1);
  const { page: first } = await openPage();
  const duration = await first.evaluate(() => window.DURATION);
  await first.close();
  const frames = Math.round(duration * FPS);
  const name = args.out || `dotsbr${tag}.mp4`;
  const audio = path.join(OUT, STORY === 'main' ? 'soundtrack.wav' : `soundtrack-${STORY}.wav`);
  const withAudio = fs.existsSync(audio) && !args['no-audio'];
  const t0 = Date.now();
  let done = 0;
  // Each worker renders a contiguous range into its own segment; segments
  // start on an IDR frame, so the concat demuxer can join them losslessly.
  const segs = await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const a = Math.floor((k * frames) / workers);
    const b = Math.floor(((k + 1) * frames) / workers);
    const seg = path.join(OUT, `seg${tag}-${k}.mp4`);
    const { shot } = await openPage();
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
    for (let f = a; f < b; f++) {
      const png = await shot(f / FPS);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (++done % (FPS * 2) === 0) console.log(`frame ${done}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await closed;
    return seg;
  }));
  const list = path.join(OUT, `segments${tag}.txt`);
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  const out = path.join(OUT, name);
  if (TARGET_MIB) {
    const inter = path.join(OUT, `inter${tag}.mp4`);
    await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', inter]);
    const audioKbps = 192;
    // 3% headroom for the MP4 container and rate-control overshoot.
    const videoKbps = Math.floor((TARGET_MIB * 8 * 1048576 * 0.97) / duration / 1000 - (withAudio ? audioKbps : 0));
    const log = path.join(OUT, `pass${tag}`);
    const common = ['-c:v', 'libx264', '-preset', 'slow', '-b:v', `${videoKbps}k`, '-maxrate', `${Math.round(videoKbps * 1.6)}k`,
      '-bufsize', `${videoKbps * 3}k`, ...COLOR, '-passlogfile', log];
    await run(['-y', '-loglevel', 'error', '-i', inter, ...common, '-pass', '1', '-an', '-f', 'null', '/dev/null']);
    await run(['-y', '-loglevel', 'error', '-i', inter, ...(withAudio ? ['-i', audio] : []), ...common, '-pass', '2',
      ...(withAudio ? ['-c:a', 'aac', '-b:a', `${audioKbps}k`, '-shortest'] : []), '-movflags', '+faststart', out]);
    fs.rmSync(inter);
    for (const f of fs.readdirSync(OUT)) if (f.startsWith(path.basename(log))) fs.rmSync(path.join(OUT, f));
    console.log(`two-pass: ${videoKbps} kb/s video → ${(fs.statSync(out).size / 1048576).toFixed(1)} MiB`);
  } else {
    await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      ...(withAudio ? ['-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-c:v', 'copy', '-movflags', '+faststart', out]);
  }
  segs.forEach((s) => fs.rmSync(s));
  fs.rmSync(list);
  console.log(`wrote out/${name} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
