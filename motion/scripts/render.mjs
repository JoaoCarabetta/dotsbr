// Frame-exact capture: serve motion/, step window.renderFrame(t) in headless
// Chromium, pipe PNG frames into ffmpeg (libx264), mux the soundtrack.
//
//   node scripts/render.mjs                         # 1920×1080 → out/dotsbr-15s.mp4
//   node scripts/render.mjs --w 1080 --h 1920       # vertical → out/dotsbr-15s-vertical.mp4
//   node scripts/render.mjs --stills 0.5,3.2,8      # PNGs in out/stills/ for review
//   --workers 2   split the frames across pages (SwiftShader is CPU-bound)
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
const FPS = Number(args.fps || 60);
const vertical = H > W;
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
const url = `http://127.0.0.1:${server.address().port}/index.html?render&w=${W}&h=${H}`;

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

const ENCODE = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 23), '-pix_fmt', 'yuv420p',
  '-profile:v', 'high', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
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
    fs.writeFileSync(path.join(dir, `${vertical ? 'v' : 'h'}-${t.toFixed(2)}.png`), await shot(t));
    console.log('still', t);
  }
} else {
  const workers = Number(args.workers || 1);
  const { page: first } = await openPage();
  const duration = await first.evaluate(() => window.DURATION);
  await first.close();
  const frames = Math.round(duration * FPS);
  const name = args.out || `dotsbr-15s${vertical ? '-vertical' : ''}.mp4`;
  const audio = path.join(OUT, 'soundtrack.wav');
  const withAudio = fs.existsSync(audio) && !args['no-audio'];
  const t0 = Date.now();
  let done = 0;
  // Each worker renders a contiguous range into its own segment; segments
  // start on an IDR frame, so the concat demuxer can join them losslessly.
  const segs = await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const a = Math.floor((k * frames) / workers);
    const b = Math.floor(((k + 1) * frames) / workers);
    const seg = path.join(OUT, `seg-${vertical ? 'v' : 'h'}-${k}.mp4`);
    const { shot } = await openPage();
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error(`ffmpeg ${c}`)) : r())));
    for (let f = a; f < b; f++) {
      const png = await shot(f / FPS);
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      if (++done % 60 === 0) console.log(`frame ${done}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await closed;
    return seg;
  }));
  const list = path.join(OUT, 'segments.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  await run(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    ...(withAudio ? ['-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
    '-c:v', 'copy', '-movflags', '+faststart', path.join(OUT, name)]);
  segs.forEach((s) => fs.rmSync(s));
  fs.rmSync(list);
  console.log(`wrote out/${name} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
server.close();
