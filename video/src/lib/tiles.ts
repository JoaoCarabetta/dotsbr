import maplibregl, {
  type ExpressionSpecification,
  type Map,
  type RequestTransformFunction,
  type StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import { BG, RACE_COLOR } from "./theme";

// Same archive the live map reads. Studio is :3000, so local serve.py
// needs CORS (see scripts/serve.py). Production already sends `*`.
const LOCAL_PMTILES = "http://127.0.0.1:8000/data/tiles/censo2022.pmtiles";
const PROD_PMTILES =
  "https://carabetta.xyz/dotsbr/data/tiles/censo2022.pmtiles";

// z3 (not 3.5): the live legend rounds 3.5 → 4 → 2.000, but the PBF on
// screen is still the 4.500 plate until the camera crosses z4.
export const BRAZIL_CAMERA = {
  center: [-51.9, -14.2] as [number, number],
  zoom: 3,
  // Same box the live map fitBounds on load — z3 alone leaves Brazil ~240px wide.
  bounds: [
    [-74, -34],
    [-32, 6],
  ] as [[number, number], [number, number]],
};

// Fitted national view on 1920×1080 (what fitBounds of BRAZIL_CAMERA.bounds
// lands on). The fly starts here so we don't interpolate from a tiny z3 plate.
export const FLY_START = {
  center: [-51.9, -14.2] as [number, number],
  zoom: 4.2,
};

// Dev HUD jump "2" on the live map, held at z11 (50 people/dot) so the
// fly asks for setor tiles without going to z14 for the whole city.
export const RIO_CAMERA = {
  center: [-43.1729, -22.9068] as [number, number],
  zoom: 11,
};

// Copied from index.html so the video legend matches the tiles, not a guess.
const PEOPLE_PER_DOT = [
  4500, 2000, 900, 400, 150, 120, 90, 70, 50, 35, 25, 20,
];

export const peoplePerDot = (zoom: number) => {
  const z = Math.min(14, Math.max(3, parseInt(Number(zoom).toFixed(0), 10)));
  return PEOPLE_PER_DOT[z - 3];
};

export const formatPeoplePerDot = (n: number) => n.toLocaleString("pt-BR");

// Same interpolate as CIRCLE_RADIUS_STOPS in index.html.
export const CIRCLE_RADIUS_STOPS = [
  3,
  0.8 * 1.2,
  7,
  0.8 * 1.2,
  12,
  (0.8 + (0.4 * 5) / 6) * 1.2,
  13,
  1.2 * 1.2 * 1.5,
];

export const RACE_COLOR_MATCH = [
  "match",
  ["get", "race"],
  "branca",
  RACE_COLOR.branca,
  "preta",
  RACE_COLOR.preta,
  "amarela",
  RACE_COLOR.amarela,
  "parda",
  RACE_COLOR.parda,
  "indigena",
  RACE_COLOR.indigena,
  "#ccc",
] as ExpressionSpecification;

// Fallback when REMOTION_MAPBOX_TOKEN is unset — dots still render.
export const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": BG },
    },
  ],
};

// Same host the live map uses. Token stays in env (not this file) so it
// is not copied into a second public source.
export const mapboxAccessToken = () =>
  process.env.REMOTION_MAPBOX_TOKEN ?? "";

export const mapboxStyleUrl = (token: string) =>
  `https://api.mapbox.com/styles/v1/mapbox/light-v10?access_token=${token}`;

export const rewriteMapboxRequest = (
  token: string,
): RequestTransformFunction => {
  return (url) => {
    if (!url.startsWith("mapbox://")) {
      return { url };
    }
    const q = `access_token=${token}`;
    if (url.startsWith("mapbox://sprites/")) {
      // MapLibre 4 asks for `.../light-v10@2x.json`; the REST sprite is
      // `/styles/v1/{owner}/{id}/sprite` or `sprite@2x`, not `id.json/sprite`.
      const rest = url.slice("mapbox://sprites/".length).replace(/\.json$/, "");
      const retina = rest.endsWith("@2x");
      const path = retina ? rest.slice(0, -3) : rest;
      const sprite = retina ? "sprite@2x" : "sprite";
      return {
        url: `https://api.mapbox.com/styles/v1/${path}/${sprite}?${q}`,
      };
    }
    if (url.startsWith("mapbox://fonts/")) {
      return { url: `https://api.mapbox.com/fonts/v1/${url.slice(15)}?${q}` };
    }
    return {
      url: `https://api.mapbox.com/v4/${url.slice(9)}.json?secure&${q}`,
    };
  };
};

// Same cut as index.html: city + bairro only, names in Portuguese.
const PLACE_LABEL_LAYERS = new Set([
  "settlement-label",
  "settlement-subdivision-label",
]);

export const applyBasemapLabels = (map: Map) => {
  const style = map.getStyle();
  if (!style?.layers) {
    return;
  }
  for (const layer of style.layers) {
    if (layer.type !== "symbol") {
      continue;
    }
    const show = PLACE_LABEL_LAYERS.has(layer.id);
    map.setLayoutProperty(layer.id, "visibility", show ? "visible" : "none");
    if (show) {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name_pt"],
        ["get", "name"],
      ]);
    }
  }
};

let protocolReady = false;

export const ensurePmtilesProtocol = () => {
  if (protocolReady) {
    return;
  }
  const protocol = new Protocol({ metadata: true });
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolReady = true;
};

export const resolveCensusPmtilesUrl = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch(LOCAL_PMTILES, {
      method: "HEAD",
      signal: controller.signal,
    });
    if (res.ok) {
      return LOCAL_PMTILES;
    }
  } catch {
    // serve.py down or blocked — public archive still has Range + CORS.
  } finally {
    clearTimeout(timer);
  }
  return PROD_PMTILES;
};
