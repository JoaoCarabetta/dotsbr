// Pull real dots out of the versioned per-UF MBTiles (../tiles) into flat
// binaries the WebGL renderer can upload as-is. Nothing here is synthetic:
// every dot is one the live map would draw at that zoom.
//
//   node scripts/extract.mjs            # every dataset in DATASETS
//   node scripts/extract.mjs rio_race_11 # just one
//
// Output: data/<name>.bin + data/manifest.json (gitignored; regenerate).
import Database from 'better-sqlite3';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TILES = path.resolve(ROOT, '..', 'tiles');
const OUT = path.join(ROOT, 'data');

// Display order = legend order in index.html, so category index i maps to
// palette slot i in the renderer.
export const THEMES = {
  race: { dir: '', prop: 'race', keys: ['parda', 'branca', 'preta', 'indigena', 'amarela'] },
  income: {
    dir: 'income',
    prop: 'cat',
    keys: ['income_ate_1sm', 'income_1_2sm', 'income_2_3sm', 'income_3_5sm', 'income_5_10sm', 'income_mais_10sm', 'income_sem_dado'],
  },
  religion: {
    dir: 'religion',
    prop: 'cat',
    keys: ['relig_catolica', 'relig_evangelica', 'relig_sem_religiao', 'relig_afro', 'relig_espirita', 'relig_indigena', 'relig_outras', 'relig_sem_info'],
  },
};

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

// Bounding boxes are [west, south, east, north], sized from the camera
// path in src/timeline.js: each fly level only has to cover what the camera
// sees while that level is on screen (plus pitch/bearing slack in Rio).
const all = (theme, zoom) => ({ name: `br_${theme}_${zoom}`, theme, zoom, ufs: UFS });
const box = (name, theme, zoom, bbox) => ({ name, theme, zoom, bbox, ufs: UFS });
const RIO = [-44.4, -23.35, -42.6, -22.1];

export const DATASETS = [
  all('race', 5),
  all('race', 6),
  box('race_7', 'race', 7, [-58, -32, -30, -12]),
  box('race_8', 'race', 8, [-51, -28, -36, -17]),
  box('race_9', 'race', 9, [-47.5, -25.5, -39.5, -20]),
  box('race_10', 'race', 10, [-45.5, -24.2, -41.5, -21.4]),
  box('rio_race_11', 'race', 11, RIO),
  box('rio_income_11', 'income', 11, RIO),
  box('rio_religion_11', 'religion', 11, RIO),

  // Election shorts (src/stories/*): national income/religion, and the fly
  // chains each short needs, cut to what its portrait camera can see.
  all('income', 5),
  all('income', 6),
  all('religion', 5),
  all('religion', 6),
  // bolso: Brasil → Brasília (renda)
  box('df_income_7', 'income', 7, [-55, -24, -41, -8]),
  box('df_income_8', 'income', 8, [-51.5, -19.8, -44.5, -11.8]),
  box('df_income_9', 'income', 9, [-49.6, -17.8, -46.4, -13.8]),
  box('df_income_10', 'income', 10, [-48.8, -16.6, -47.2, -14.9]),
  box('df_income_11', 'income', 11, [-48.5, -16.2, -47.45, -15.35]),
  // fe: Brasil → Rio (religião)
  box('rio_religion_7', 'religion', 7, [-58, -32, -30, -12]),
  box('rio_religion_8', 'religion', 8, [-51, -28, -36, -17]),
  box('rio_religion_9', 'religion', 9, [-47.5, -25.5, -39.5, -20]),
  box('rio_religion_10', 'religion', 10, [-45.5, -24.2, -41.5, -21.4]),
  // duascores + seuestado: Brasil → São Paulo (raça)
  box('sp_race_7', 'race', 7, [-58, -34, -35, -12]),
  box('sp_race_8', 'race', 8, [-52, -28.5, -41, -18.5]),
  box('sp_race_9', 'race', 9, [-49.2, -25.8, -44, -21.2]),
  box('sp_race_10', 'race', 10, [-47.9, -24.6, -45.3, -22.4]),
  box('sp_race_11', 'race', 11, [-47.3, -24.2, -45.95, -22.9]),
  // seuestado: the other capitals of the tour
  box('manaus_race_10', 'race', 10, [-60.9, -4.1, -59.1, -1.9]),
  box('manaus_race_11', 'race', 11, [-60.5, -3.7, -59.55, -2.3]),
  box('salvador_race_10', 'race', 10, [-39.3, -13.9, -37.6, -11.8]),
  box('salvador_race_11', 'race', 11, [-38.9, -13.5, -38.0, -12.2]),
  box('poa_race_10', 'race', 10, [-52.1, -31.1, -50.3, -28.9]),
  box('poa_race_11', 'race', 11, [-51.65, -30.65, -50.7, -29.3]),
];

const lon2x = (lon) => (lon + 180) / 360;
const lat2y = (lat) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

// Deterministic shuffle: MapLibre draws dots in tile/feature order, which
// stacks whole categories on top of each other. A fixed shuffle keeps the
// mix fair and gives every dot a spatially random index for staggering.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function readDots({ theme, zoom, ufs, bbox }) {
  const t = THEMES[theme];
  const n = 2 ** zoom;
  const xs = [];
  const ys = [];
  const cats = [];
  const ufIdx = [];
  const bx = bbox && [lon2x(bbox[0]), lat2y(bbox[3]), lon2x(bbox[2]), lat2y(bbox[1])];
  for (const uf of ufs) {
    const file = path.join(TILES, t.dir, uf, `zoom${zoom}-${zoom}`, 'tiles.mbtiles');
    if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
    const db = new Database(file, { readonly: true });
    let rows;
    if (bx) {
      const x0 = Math.floor(bx[0] * n);
      const x1 = Math.floor(bx[2] * n);
      const y0 = Math.floor(bx[1] * n);
      const y1 = Math.floor(bx[3] * n);
      // MBTiles rows are TMS (y flipped).
      rows = db
        .prepare('select tile_column x, tile_row r, tile_data d from tiles where zoom_level=? and tile_column between ? and ? and tile_row between ? and ?')
        .all(zoom, x0, x1, n - 1 - y1, n - 1 - y0);
    } else {
      rows = db.prepare('select tile_column x, tile_row r, tile_data d from tiles where zoom_level=?').all(zoom);
    }
    const u = UFS.indexOf(uf);
    for (const row of rows) {
      let buf = row.d;
      if (buf[0] === 0x1f) buf = zlib.gunzipSync(buf);
      const layer = new VectorTile(new Protobuf(buf)).layers.points;
      if (!layer) continue;
      const ty = n - 1 - row.r;
      const ext = layer.extent;
      for (let i = 0; i < layer.length; i++) {
        const f = layer.feature(i);
        const cat = t.keys.indexOf(f.properties[t.prop]);
        if (cat < 0) continue;
        for (const ring of f.loadGeometry()) {
          for (const p of ring) {
            // Buffer copies of a neighbour's dots sit outside [0, extent).
            if (p.x < 0 || p.y < 0 || p.x >= ext || p.y >= ext) continue;
            const mx = (row.x + p.x / ext) / n;
            const my = (ty + p.y / ext) / n;
            if (bx && (mx < bx[0] || mx > bx[2] || my < bx[1] || my > bx[3])) continue;
            xs.push(mx);
            ys.push(my);
            cats.push(cat);
            ufIdx.push(u);
          }
        }
      }
    }
    db.close();
  }
  return { xs, ys, cats, ufIdx };
}

// Positions are stored relative to the dataset centre, scaled by 2^20, so
// float32 keeps sub-pixel precision even at z13 on the GPU.
export const SCALE = 2 ** 20;

function write(ds) {
  const { xs, ys, cats, ufIdx } = readDots(ds);
  const count = xs.length;
  const order = Array.from({ length: count }, (_, i) => i);
  const rand = mulberry32(0x5eed ^ ds.zoom);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i];
    if (ys[i] > maxY) maxY = ys[i];
  }
  const ox = (minX + maxX) / 2;
  const oy = (minY + maxY) / 2;
  const pad = (4 - ((count * 2) % 4)) % 4;
  const buf = Buffer.alloc(count * 8 + count * 2 + pad);
  const pos = new Float32Array(buf.buffer, buf.byteOffset, count * 2);
  const meta = new Uint8Array(buf.buffer, buf.byteOffset + count * 8, count * 2);
  const counts = new Array(THEMES[ds.theme].keys.length).fill(0);
  order.forEach((src, i) => {
    pos[i * 2] = (xs[src] - ox) * SCALE;
    pos[i * 2 + 1] = (ys[src] - oy) * SCALE;
    meta[i * 2] = cats[src];
    meta[i * 2 + 1] = ufIdx[src];
    counts[cats[src]]++;
  });
  fs.writeFileSync(path.join(OUT, `${ds.name}.bin`), buf);
  return { name: ds.name, theme: ds.theme, zoom: ds.zoom, count, origin: [ox, oy], bounds: [minX, minY, maxX, maxY], counts };
}

// Natural Earth 1:50m countries around South America, as Mercator rings.
// Only used as a faint silhouette at national zoom (it fades out by z7,
// where 1:50m coastlines would visibly miss the dots).
async function writeLand() {
  const { feature } = await import('topojson-client');
  const { default: world } = await import('world-atlas/countries-50m.json', { with: { type: 'json' } });
  const out = [];
  for (const f of feature(world, world.objects.countries).features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const poly of polys) {
      const ring = poly[0];
      const inView = ring.some(([lon, lat]) => lon > -95 && lon < -15 && lat > -60 && lat < 20);
      if (!inView) continue;
      const pts = [];
      for (const [lon, lat] of ring) pts.push(+lon2x(lon).toFixed(6), +lat2y(Math.max(-85, Math.min(85, lat))).toFixed(6));
      out.push({ br: f.properties.name === 'Brazil' ? 1 : 0, pts });
    }
  }
  fs.writeFileSync(path.join(OUT, 'land.json'), JSON.stringify(out));
  console.log(`land.json         ${out.length} rings`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(OUT, { recursive: true });
  await writeLand();
  const only = new Set(process.argv.slice(2));
  const manifestPath = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) && only.size ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { scale: SCALE, datasets: {} };
  for (const ds of DATASETS) {
    if (only.size && !only.has(ds.name)) continue;
    const t0 = Date.now();
    manifest.datasets[ds.name] = write(ds);
    console.log(`${ds.name.padEnd(18)} ${String(manifest.datasets[ds.name].count).padStart(8)} dots  ${Date.now() - t0}ms`);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
}
