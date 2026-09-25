import { RACE_COLOR, type RaceKey } from "./theme";

// Equirectangular box used by the live map's Brazil fitBounds.
const LON_MIN = -74;
const LON_MAX = -32;
const LAT_MIN = -34;
const LAT_MAX = 6;

// Sit Brazil on the right half so the story card can occupy the real
// product's top-left chrome without covering the coast.
export const MAP = { x: 560, y: 30, size: 1020 };

// Same Rio shortcut the localhost HUD uses (dev jump "2").
export const RIO = { lon: -43.1729, lat: -22.9068 };

export type Dot = {
  x: number;
  y: number;
  race: RaceKey;
  color: string;
  // 0 = already visible at the national "1 ponto = 4.500" plate.
  // Higher = only appears as the camera pretends to refine density.
  detail: number;
  delay: number;
};

export const project = (lon: number, lat: number) => {
  const nx = (lon - LON_MIN) / (LON_MAX - LON_MIN);
  const ny = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);
  return { x: MAP.x + nx * MAP.size, y: MAP.y + ny * MAP.size };
};

export const RIO_XY = project(RIO.lon, RIO.lat);

// Simplified mainland outline, clockwise from Amapá. Stylized on purpose:
// this video is a promo plate, not a substitute for the PMTiles.
const BRAZIL: [number, number][] = [
  [-51.7, 4.3],
  [-50.0, 1.8],
  [-48.4, -0.6],
  [-44.4, -2.5],
  [-41.3, -2.9],
  [-38.5, -3.6],
  [-35.0, -5.8],
  [-34.8, -7.1],
  [-34.9, -8.2],
  [-35.8, -9.6],
  [-37.2, -11.0],
  [-38.9, -13.0],
  [-38.6, -15.5],
  [-39.1, -17.8],
  [-40.3, -20.4],
  [-40.9, -21.9],
  [-42.0, -22.9],
  [-43.2, -23.05],
  [-44.8, -23.4],
  [-46.7, -24.1],
  [-48.4, -25.6],
  [-48.6, -27.0],
  [-48.6, -28.6],
  [-49.5, -29.4],
  [-51.2, -31.4],
  [-52.1, -32.2],
  [-52.7, -33.6],
  [-53.5, -33.7],
  [-55.7, -30.9],
  [-57.6, -30.1],
  [-57.7, -27.3],
  [-58.2, -25.5],
  [-56.4, -22.1],
  [-57.9, -17.7],
  [-60.1, -16.3],
  [-62.4, -13.2],
  [-65.2, -11.1],
  [-69.6, -11.0],
  [-72.8, -9.5],
  [-73.9, -7.6],
  [-70.0, -6.2],
  [-69.7, -2.4],
  [-67.3, -0.4],
  [-65.5, 1.0],
  [-64.0, 2.2],
  [-61.2, 3.4],
  [-60.1, 5.2],
  [-59.3, 3.6],
  [-56.8, 1.8],
  [-54.0, 2.3],
  [-51.7, 4.3],
];

const pointInBrazil = (lon: number, lat: number) => {
  let inside = false;
  for (let i = 0, j = BRAZIL.length - 1; i < BRAZIL.length; j = i++) {
    const [xi, yi] = BRAZIL[i];
    const [xj, yj] = BRAZIL[j];
    const hit =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
};

// Deterministic so every Remotion frame redraws the same cloud of people.
const mulberry32 = (seed: number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickRace = (lon: number, lat: number, rand: () => number): RaceKey => {
  const r = rand();
  // Regional mix so the plate rhymes with the census map (South greener,
  // Northeast redder, Amazon more purple) without claiming tile accuracy.
  if (lat < -24) {
    if (r < 0.72) return "branca";
    if (r < 0.88) return "parda";
    if (r < 0.97) return "preta";
    if (r < 0.99) return "amarela";
    return "indigena";
  }
  if (lon > -41.5) {
    if (r < 0.58) return "parda";
    if (r < 0.78) return "preta";
    if (r < 0.96) return "branca";
    if (r < 0.99) return "indigena";
    return "amarela";
  }
  if (lat > -8 && lon < -54) {
    if (r < 0.62) return "parda";
    if (r < 0.78) return "branca";
    if (r < 0.88) return "preta";
    if (r < 0.98) return "indigena";
    return "amarela";
  }
  if (r < 0.44) return "parda";
  if (r < 0.82) return "branca";
  if (r < 0.95) return "preta";
  if (r < 0.98) return "indigena";
  return "amarela";
};

const settlementWeight = (lon: number, lat: number) => {
  // Coast + Southeast carry most of the 2022 population, so the coarse
  // plate would look empty there if we sampled the polygon uniformly.
  if (lon > -50 && lat < -18 && lat > -26) return 1;
  if (lon > -42 && lat > -18) return 0.72;
  if (lat < -26) return 0.42;
  if (lat > -6) return 0.18;
  return 0.28;
};

export const DOTS: Dot[] = (() => {
  const rand = mulberry32(2022);
  const dots: Dot[] = [];
  const target = 3400;
  let guard = 0;
  while (dots.length < target && guard < 80000) {
    guard += 1;
    const lon = LON_MIN + rand() * (LON_MAX - LON_MIN);
    const lat = LAT_MIN + rand() * (LAT_MAX - LAT_MIN);
    if (!pointInBrazil(lon, lat)) continue;
    if (rand() > settlementWeight(lon, lat)) continue;
    const race = pickRace(lon, lat, rand);
    const { x, y } = project(lon, lat);
    const coarse = dots.length < 780;
    dots.push({
      x,
      y,
      race,
      color: RACE_COLOR[race],
      detail: coarse ? 0 : 0.28 + rand() * 0.62,
      delay: rand(),
    });
  }
  return dots;
})();
