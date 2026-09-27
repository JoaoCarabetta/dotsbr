// WebGL2 dot renderer. Every animation (explosion, chart morph, lens wipe,
// zoom-level crossfade, wordmark) happens per vertex from a handful of
// uniforms, so a frame is a pure function of time: the headless capture and
// the live preview draw the same pixels.

const VS = `#version 300 es
precision highp float;
precision highp int;
in vec2 a_pos;
in vec2 a_meta;
in vec3 a_target;
uniform mat4 u_mvp;
uniform vec2 u_res;
uniform float u_dist;
uniform float u_size;
uniform float u_alpha;
uniform vec3 u_palette[8];
uniform float u_catAlpha[8];
uniform float u_fade;
uniform float u_morph;
uniform float u_morphDir;
uniform float u_stagger;
uniform float u_ease;
uniform float u_arc;
uniform float u_targetSize;
uniform float u_dimOthers;
uniform vec4 u_wipe;
uniform float u_wipeJitter;
uniform float u_wipePop;
uniform vec2 u_topFade;
uniform float u_ufAlpha[27];
uniform vec4 u_reveal;
out vec4 v_color;
out float v_size;

uint hash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}
float rnd(uint i, uint s) { return float(hash(i * 3u + s)) / 4294967295.0; }
float inOutCubic(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
float outExpo(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
float outBack(float t) { float c1 = 1.25; float c3 = c1 + 1.0; return 1.0 + c3 * pow(t - 1.0, 3.0) + c1 * pow(t - 1.0, 2.0); }

void main() {
  uint id = uint(gl_VertexID);
  float r1 = rnd(id, 1u), r2 = rnd(id, 2u), r3 = rnd(id, 3u);
  int cat = int(a_meta.x + 0.5);
  // a_meta.y is the dot's UF (index into extract.mjs UFS): lights a region.
  float alpha = u_alpha * u_catAlpha[cat] * u_ufAlpha[int(a_meta.y + 0.5)];
  // Dither crossfade: each dot owns a threshold, so fading a level in or
  // out adds/removes whole dots instead of blending a grey mush.
  float vis = clamp((u_fade - r1) / 0.03 + 0.5, 0.0, 1.0);
  float pop = 1.0 + 0.9 * (1.0 - vis) * step(0.001, vis);

  vec4 clip = u_mvp * vec4(a_pos, 0.0, 1.0);
  vec2 ndc = clip.xy / clip.w;
  vec2 px = vec2((ndc.x * 0.5 + 0.5) * u_res.x, (0.5 - ndc.y * 0.5) * u_res.y);
  float size = u_size * clamp(u_dist / clip.w, 0.35, 2.2);
  if (clip.w <= 0.0) alpha = 0.0;

  if (u_morph >= 0.0) {
    if (a_target.z > 0.5) {
      float p = clamp((u_morph - r2 * u_stagger) / (1.0 - u_stagger), 0.0, 1.0);
      float e = u_ease < 0.5 ? inOutCubic(p) : (u_ease < 1.5 ? outExpo(p) : outBack(p));
      vec2 A = u_morphDir < 0.5 ? px : a_target.xy;
      vec2 B = u_morphDir < 0.5 ? a_target.xy : px;
      vec2 d = B - A;
      vec2 ctrl = (A + B) * 0.5 + vec2(-d.y, d.x) * (r3 - 0.5) * u_arc;
      px = mix(mix(A, ctrl, e), mix(ctrl, B, e), e);
      float atTarget = u_morphDir < 0.5 ? e : 1.0 - e;
      size = mix(size, u_targetSize, atTarget);
    } else {
      alpha *= u_dimOthers;
    }
  }

  if (u_wipe.w != 0.0) {
    float d = dot(px, u_wipe.xy) - u_wipe.z + (r3 - 0.5) * u_wipeJitter;
    alpha *= smoothstep(0.0, 10.0, u_wipe.w * d);
    float band = exp(-(d * d) / (70.0 * 70.0));
    size *= 1.0 + u_wipePop * band;
    px += u_wipe.xy * band * 14.0 * sign(u_wipe.w);
  }

  alpha *= smoothstep(u_topFade.x, u_topFade.y, px.y);
  // Circular reveal (x, y, radius, softness): dots exist only inside it.
  if (u_reveal.z > 0.0) alpha *= 1.0 - smoothstep(u_reveal.z - u_reveal.w, u_reveal.z, distance(px, u_reveal.xy));
  size *= pop;

  // Sub-1.6px dots keep their coverage through alpha instead of aliasing.
  float drawn = max(size, 1.6);
  alpha *= min(1.0, (size * size) / (drawn * drawn)) * vis;
  gl_Position = vec4(px.x / u_res.x * 2.0 - 1.0, 1.0 - px.y / u_res.y * 2.0, 0.0, 1.0);
  gl_PointSize = drawn + 1.0;
  v_size = drawn;
  v_color = vec4(u_palette[cat], alpha);
}`;

const FS = `#version 300 es
precision highp float;
in vec4 v_color;
in float v_size;
out vec4 o;
void main() {
  float d = length(gl_PointCoord - 0.5) * (v_size + 1.0);
  float a = clamp(v_size * 0.5 - d + 0.5, 0.0, 1.0) * v_color.a;
  if (a <= 0.0) discard;
  o = vec4(v_color.rgb * a, a);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

export class Dots {
  constructor(canvas, { W, H }) {
    this.W = W;
    this.H = H;
    canvas.width = W;
    canvas.height = H;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.p = p;
    this.loc = {};
    for (const n of ['a_pos', 'a_meta', 'a_target']) this.loc[n] = gl.getAttribLocation(p, n);
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      this.loc[name] = gl.getUniformLocation(p, name);
    }
    this.sets = {};
  }

  add(name, meta, buffer) {
    const gl = this.gl;
    const n = meta.count;
    const pos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buffer, 0, n * 2), gl.STATIC_DRAW);
    const cat = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cat);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buffer, n * 8, n * 2), gl.STATIC_DRAW);
    const bytes = new Uint8Array(buffer, n * 8, n * 2);
    this.sets[name] = { ...meta, pos, cat, targets: {}, cats: bytes.filter((_, i) => i % 2 === 0), xy: new Float32Array(buffer, 0, n * 2) };
  }

  setTarget(name, key, data) {
    const gl = this.gl;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.sets[name].targets[key] = b;
  }

  clear() {
    const gl = this.gl;
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // One draw call per layer; `o` is the per-layer state from the timeline.
  draw(view, SCALE, o) {
    const gl = this.gl;
    const set = this.sets[o.ds];
    if (!set || o.fade <= 0 || o.alpha <= 0) return;
    const L = this.loc;
    gl.useProgram(this.p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, set.pos);
    gl.enableVertexAttribArray(L.a_pos);
    gl.vertexAttribPointer(L.a_pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, set.cat);
    gl.enableVertexAttribArray(L.a_meta);
    gl.vertexAttribPointer(L.a_meta, 2, gl.UNSIGNED_BYTE, false, 0, 0);
    const tgt = o.morph && set.targets[o.morph.target];
    if (tgt) {
      gl.bindBuffer(gl.ARRAY_BUFFER, tgt);
      gl.enableVertexAttribArray(L.a_target);
      gl.vertexAttribPointer(L.a_target, 3, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(L.a_target);
      gl.vertexAttrib3f(L.a_target, 0, 0, 0);
    }
    gl.uniformMatrix4fv(L.u_mvp, false, view.datasetMatrix(set.origin, SCALE));
    gl.uniform2f(L.u_res, this.W, this.H);
    gl.uniform1f(L.u_dist, view.dist);
    gl.uniform1f(L.u_size, o.size);
    gl.uniform1f(L.u_alpha, o.alpha);
    const pal = new Float32Array(24);
    o.palette.forEach((c, i) => pal.set(hex(c), i * 3));
    gl.uniform3fv(L.u_palette, pal);
    const ca = new Float32Array(8).fill(1);
    if (o.catAlpha) o.catAlpha.forEach((a, i) => (ca[i] = a));
    gl.uniform1fv(L.u_catAlpha, ca);
    gl.uniform1f(L.u_fade, o.fade);
    const m = o.morph;
    gl.uniform1f(L.u_morph, m ? m.t : -1);
    gl.uniform1f(L.u_morphDir, m && m.dir === 'in' ? 1 : 0);
    gl.uniform1f(L.u_stagger, m ? m.stagger ?? 0.3 : 0);
    gl.uniform1f(L.u_ease, m ? { cubic: 0, expo: 1, back: 2 }[m.ease || 'cubic'] : 0);
    gl.uniform1f(L.u_arc, m ? m.arc ?? 0.3 : 0);
    gl.uniform1f(L.u_targetSize, m ? m.size ?? o.size : o.size);
    gl.uniform1f(L.u_dimOthers, m ? m.dimOthers ?? 1 : 1);
    const w = o.wipe;
    gl.uniform4f(L.u_wipe, w ? w.dir[0] : 0, w ? w.dir[1] : 0, w ? w.offset : 0, w ? w.side : 0);
    gl.uniform1f(L.u_wipeJitter, w ? w.jitter ?? 120 : 0);
    gl.uniform1f(L.u_wipePop, w ? w.pop ?? 1.2 : 0);
    gl.uniform2f(L.u_topFade, o.topFade ? o.topFade[0] : -1e6, o.topFade ? o.topFade[1] : -1e6 + 1);
    const ufa = new Float32Array(27).fill(1);
    if (o.ufAlpha) o.ufAlpha.forEach((a, i) => (ufa[i] = a));
    gl.uniform1fv(L.u_ufAlpha, ufa);
    const rv = o.reveal;
    gl.uniform4f(L.u_reveal, rv ? rv[0] : 0, rv ? rv[1] : 0, rv ? rv[2] : 0, rv ? rv[3] : 1);
    gl.drawArrays(gl.POINTS, 0, set.count);
  }
}
