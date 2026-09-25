// Web Mercator camera with MapLibre's conventions (512px tiles, fov 36.87°,
// pitch/bearing), plus a movable principal point so the map can sit to the
// right of the text column the way MapLibre's `padding` does.

export const TILE = 512;
const FOV = 0.6435011087932844;

export const lon2x = (lon) => (lon + 180) / 360;
export const lat2y = (lat) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

// Column-major 4×4 helpers (gl-matrix layout), doubles until upload.
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
const translate = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const scale = (x, y, z) => { const m = ident(); m[0] = x; m[5] = y; m[10] = z; return m; };
function rotX(a) { const c = Math.cos(a), s = Math.sin(a); const m = ident(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); const m = ident(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

// cam: { x, y } mercator 0..1, zoom, bearing°, pitch°, px/py = screen point
// the centre lands on.
export function makeView(cam, W, H) {
  const ws = TILE * 2 ** cam.zoom;
  const dist = (0.5 / Math.tan(FOV / 2)) * H;
  let m = perspective(FOV, W / H, dist / 50, dist * 30);
  // Shift the vanishing point to (px, py) in clip space.
  const shift = translate(((cam.px ?? W / 2) - W / 2) / (W / 2), -((cam.py ?? H / 2) - H / 2) / (H / 2), 0);
  m = mul(shift, m);
  m = mul(m, scale(1, -1, 1));
  m = mul(m, translate(0, 0, -dist));
  m = mul(m, rotX(((cam.pitch || 0) * Math.PI) / 180));
  m = mul(m, rotZ((-(cam.bearing || 0) * Math.PI) / 180));
  m = mul(m, translate(-cam.x * ws, -cam.y * ws, 0));
  return {
    W, H, ws, dist, m,
    // MVP for a dataset stored as (merc - origin) * SCALE.
    datasetMatrix(origin, SCALE) {
      return new Float32Array(mul(mul(m, translate(origin[0] * ws, origin[1] * ws, 0)), scale(ws / SCALE, ws / SCALE, 1)));
    },
    // Mercator → screen px (+ w for perspective sizing).
    project(mx, my) {
      const x = mx * ws, y = my * ws;
      const cx = m[0] * x + m[4] * y + m[12];
      const cy = m[1] * x + m[5] * y + m[13];
      const cw = m[3] * x + m[7] * y + m[15];
      return [((cx / cw) * 0.5 + 0.5) * W, (0.5 - (cy / cw) * 0.5) * H, cw];
    },
  };
}

// Zoom + centre so a lon/lat box fills a screen rectangle [x0, y0, x1, y1].
export function fitBounds([w, s, e, n], [x0, y0, x1, y1]) {
  const bx0 = lon2x(w), bx1 = lon2x(e), by0 = lat2y(n), by1 = lat2y(s);
  const zx = Math.log2((x1 - x0) / ((bx1 - bx0) * TILE));
  const zy = Math.log2((y1 - y0) / ((by1 - by0) * TILE));
  return { x: (bx0 + bx1) / 2, y: (by0 + by1) / 2, zoom: Math.min(zx, zy), px: (x0 + x1) / 2, py: (y0 + y1) / 2, bearing: 0, pitch: 0 };
}

// van Wijk & Nuij "optimal" zoom-and-pan, the same curve MapLibre's flyTo
// uses, evaluated at k ∈ [0, 1]. Screen anchor, bearing and pitch are
// interpolated separately by the caller.
export function flyPath(a, b, rho = 1.42) {
  const ws0 = TILE * 2 ** a.zoom;
  const fx = a.x * ws0, fy = a.y * ws0;
  const dx = b.x * ws0 - fx, dy = b.y * ws0 - fy;
  const u1 = Math.hypot(dx, dy);
  const w0 = 1920;
  const w1 = w0 / 2 ** (b.zoom - a.zoom);
  const rho2 = rho * rho;
  const r = (i) => {
    const bb = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
    return Math.log(Math.sqrt(bb * bb + 1) - bb);
  };
  const r0 = r(0);
  const S = (r(1) - r0) / rho;
  const w = (s) => Math.cosh(r0) / Math.cosh(r0 + rho * s);
  const u = (s) => (w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2)) / u1;
  return (k) => {
    const s = k * S;
    const f = k >= 1 ? 1 : u(s);
    const zoom = k >= 1 ? b.zoom : a.zoom + Math.log2(1 / w(s));
    return { x: (fx + dx * f) / ws0, y: (fy + dy * f) / ws0, zoom };
  };
}
