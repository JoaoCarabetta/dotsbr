#!/usr/bin/env node
/**
 * Renders promo/ into an MP4.
 *
 * Why this exists instead of a video framework: the film is a live MapLibre map
 * reading the real PMTiles, and the only way to get a clean frame is to ask the
 * page for one and wait until every tile for that camera has arrived. The page
 * already exposes that contract (`window.promoSeek(frame)`), so all a renderer
 * has to do is drive it: seek, screenshot, repeat, then hand the stills to
 * ffmpeg. Zero npm dependencies — Node's built-in WebSocket speaks CDP, and
 * Chrome is the same engine that runs the product.
 *
 * Needs: `python3 scripts/serve.py` (HTTP Range for the PMTiles), Google Chrome,
 * and ffmpeg on PATH.
 *
 *   node scripts/capture_promo.mjs                       # full 15 s → video/out/
 *   node scripts/capture_promo.mjs --from 240 --to 300   # one beat
 *   node scripts/capture_promo.mjs --frame 120           # a single still
 *   node scripts/capture_promo.mjs --every 3             # fast rough cut
 *   node scripts/capture_promo.mjs --headed              # watch it happen
 */

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222;
const PROFILE = "/tmp/dotsbr-promo-chrome";
const FRAME_DIR = "/tmp/dotsbr-promo-frames";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const options = {
  url: flag("url", `http://127.0.0.1:8000/promo/`),
  out: flag("out", path.join(ROOT, "video/out/dotsbr-15s.mp4")),
  from: Number(flag("from", 0)),
  to: flag("to") === null ? null : Number(flag("to")),
  every: Number(flag("every", 1)),
  single: flag("frame") === null ? null : Number(flag("frame")),
  quality: Number(flag("quality", 95)),
  headed: has("headed"),
  keepFrames: has("keep-frames"),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const log = (message) => {
  process.stdout.write(`${message}\n`);
};

/** Minimal CDP client over Node's global WebSocket. */
class Devtools {
  #socket;
  #next = 1;
  #pending = new Map();

  static async attach(wsUrl) {
    const client = new Devtools();
    await client.#connect(wsUrl);
    return client;
  }

  #connect(wsUrl) {
    return new Promise((resolve, reject) => {
      this.#socket = new WebSocket(wsUrl);
      this.#socket.addEventListener("open", () => resolve());
      this.#socket.addEventListener("error", (event) =>
        reject(new Error(`CDP socket failed: ${event.message ?? "unknown"}`)),
      );
      this.#socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        const waiter = this.#pending.get(message.id);
        if (!waiter) {
          return;
        }
        this.#pending.delete(message.id);
        if (message.error) {
          waiter.reject(new Error(message.error.message));
        } else {
          waiter.resolve(message.result);
        }
      });
    });
  }

  send(method, params = {}) {
    const id = this.#next++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Evaluate in the page and await the promise it returns. */
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const text =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text;
      throw new Error(`page error: ${text}`);
    }
    return result.result.value;
  }

  close() {
    this.#socket.close();
  }
}

const fetchJson = async (url) => {
  const response = await fetch(url);
  return response.json();
};

/** Chrome is slow to open its debugging port on a loaded machine. */
const waitForChrome = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    } catch {
      await sleep(500);
    }
  }
  throw new Error("Chrome never opened its remote debugging port");
};

const launchChrome = () => {
  const args = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--mute-audio",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    // Deterministic pixels: one device pixel per CSS pixel, 1920×1080 stage.
    "--force-device-scale-factor=1",
    "--window-size=1920,1080",
    // WebGL must work; SwiftShader is the fallback when no GPU is exposed.
    "--enable-unsafe-swiftshader",
    "about:blank",
  ];
  if (!options.headed) {
    args.unshift("--headless=new");
  }
  const child = spawn(CHROME, args, { stdio: "ignore", detached: false });
  child.on("error", (error) => {
    throw error;
  });
  return child;
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });

const main = async () => {
  if (!existsSync(CHROME)) {
    throw new Error(`Chrome not found at ${CHROME}`);
  }
  // The page needs the Range server for the PMTiles; fail early and loudly.
  try {
    const probe = await fetch(options.url, { method: "HEAD" });
    if (!probe.ok) {
      throw new Error(`HTTP ${probe.status}`);
    }
  } catch (error) {
    throw new Error(
      `${options.url} is not serving (${error.message}). Run: python3 scripts/serve.py`,
    );
  }

  await rm(FRAME_DIR, { recursive: true, force: true });
  await mkdir(FRAME_DIR, { recursive: true });
  await mkdir(path.dirname(options.out), { recursive: true });

  log(`chrome: launching ${options.headed ? "headed" : "headless"}`);
  const chrome = launchChrome();
  let client;
  try {
    await waitForChrome();
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find((target) => target.type === "page");
    if (!page) {
      throw new Error("no page target in Chrome");
    }
    client = await Devtools.attach(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    // The stage is authored at exactly 1920×1080; match it so nothing scales.
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    log(`page: ${options.url}`);
    await client.send("Page.navigate", { url: options.url });
    // promoReady resolves only after the first frame's tiles are in, which on a
    // cold PMTiles cache is the slowest moment of the whole render.
    await client.evaluate("window.promoReady.then(() => 'ok')");
    const meta = await client.evaluate("window.promoMeta");
    const info = await client.evaluate("window.promoReady");
    log(
      `map ready: ${info.base} · basemap ${info.token ? "light-v10" : "flat plate"} · ${meta.duration} frames @ ${meta.fps}fps`,
    );

    const frames = [];
    if (options.single !== null) {
      frames.push(options.single);
    } else {
      const to = options.to === null ? meta.duration - 1 : options.to;
      for (let frame = options.from; frame <= to; frame += options.every) {
        frames.push(frame);
      }
    }

    const started = Date.now();
    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];
      await client.evaluate(`window.promoSeek(${frame})`);
      const shot = await client.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: options.quality,
        captureBeyondViewport: false,
      });
      const file = path.join(FRAME_DIR, `${String(i).padStart(5, "0")}.jpg`);
      await writeFile(file, Buffer.from(shot.data, "base64"));
      if (i % 15 === 0 || i === frames.length - 1) {
        const done = i + 1;
        const rate = done / ((Date.now() - started) / 1000);
        const left = Math.round((frames.length - done) / Math.max(rate, 0.01));
        log(
          `frame ${frame} (${done}/${frames.length}) · ${rate.toFixed(2)} fps · ~${left}s left`,
        );
      }
    }

    if (options.single !== null) {
      const still = options.out.replace(/\.mp4$/, `-frame${options.single}.jpg`);
      await run("cp", [path.join(FRAME_DIR, "00000.jpg"), still]);
      log(`still: ${still}`);
      return;
    }

    // The film is authored at 30fps; --every N keeps the same wall-clock length
    // by lowering the output rate instead of speeding the motion up.
    const fps = meta.fps / options.every;
    log(`ffmpeg: encoding ${frames.length} frames at ${fps}fps`);
    await run("ffmpeg", [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(FRAME_DIR, "%05d.jpg"),
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "18",
      // yuv420p + even dimensions: what every social platform and Safari want.
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      options.out,
    ]);
    log(`done: ${options.out}`);
  } finally {
    if (client) {
      client.close();
    }
    chrome.kill("SIGTERM");
    if (!options.keepFrames && options.single === null) {
      await rm(FRAME_DIR, { recursive: true, force: true });
    }
  }
};

main().catch((error) => {
  process.stderr.write(`\n${error.message}\n`);
  process.exit(1);
});
