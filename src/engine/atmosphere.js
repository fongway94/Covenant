/* ============================================================================
   GPU atmosphere pass.

   A game engine (Unity / Godot / Phaser) would add megabytes and break the
   single-file offline build. What those engines actually give a 2D scene is a
   GPU shader pass — so we do just that, with ~130 lines of WebGL and no
   dependency. It paints volumetric light shafts, floating dust, film grain and
   a soft vignette over the chapter artwork, and falls back silently to plain
   CSS art on browsers without WebGL.

   No external textures, no network, no per-frame allocation.
   ============================================================================ */

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_warm;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec2 uv = v_uv;
  float t = u_time;

  /* Three slow shafts of light falling from the upper right. */
  float qx = uv.x * 0.86 + uv.y * 0.52;
  float rays = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float centre = 0.30 + fi * 0.20 + sin(t * 0.11 + fi * 2.1) * 0.014;
    float d = abs(qx - centre - (1.0 - uv.y) * 0.10);
    rays += pow(max(0.0, 1.0 - d * 7.5), 3.0)
          * (0.45 + 0.55 * noise(vec2(qx * 7.0 + fi * 3.3, t * 0.22)));
  }
  rays *= smoothstep(0.02, 0.55, uv.y);

  /* Dust motes drifting slowly upward. */
  vec2 g = uv * vec2(13.0, 21.0);
  vec2 id = floor(g), f = fract(g);
  float h = hash(id);
  vec2 dp = vec2(0.5 + 0.26 * sin(t * 0.45 + h * 6.283),
                 fract(h * 8.3 + t * (0.010 + h * 0.018)));
  float dust = smoothstep(0.085, 0.0, length(f - dp)) * (0.30 + 0.70 * hash(id + 7.7));

  /* Fine grain, refreshed in 1/12s buckets so it reads as film, not static. */
  float grain = hash(floor(uv * u_res * 0.65) + floor(t * 12.0)) * 2.0 - 1.0;

  /* Vignette: darken the corners so the centre feels lit. */
  float v = 1.0 - smoothstep(0.26, 0.80, length((uv - 0.5) * vec2(1.06, 0.92)));
  float dark = (1.0 - v) * 0.34;

  float light = (rays * 0.155 + dust * 0.30) * u_intensity;
  float a = clamp(light + dark * 0.52 + abs(grain) * 0.020, 0.0, 0.56);
  vec3 warm = mix(vec3(0.88, 0.95, 1.0), vec3(1.0, 0.82, 0.55), u_warm);
  vec3 col = mix(vec3(0.012, 0.030, 0.045), warm, light / (light + dark + 0.0001));
  gl_FragColor = vec4(col, a);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

let active = null;

export function stopAtmosphere() {
  if (!active) return;
  active.stop();
  active = null;
}

export function atmosphereActive() { return !!active; }

export function mountAtmosphere(canvas, opts = {}) {
  if (active && active.canvas === canvas) return active;   // one GL context for the whole app
  stopAtmosphere();
  if (!canvas || typeof canvas.getContext !== "function") return null;
  let gl = null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false })
      || canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false });
  } catch { /* no WebGL */ }
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uIntensity = gl.getUniformLocation(prog, "u_intensity");
  const uWarm = gl.getUniformLocation(prog, "u_warm");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const intensity = Math.max(0, Math.min(1.4, opts.intensity ?? 1));
  const warm = Math.max(0, Math.min(1, opts.warm ?? 0.82));
  let alive = true, raf = null, start = 0, w = 0, h = 0, lost = false;

  const onLost = (e) => { e.preventDefault?.(); lost = true; alive = false; };
  canvas.addEventListener("webglcontextlost", onLost);

  function resize() {
    const dpr = Math.min(1.5, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const cw = canvas.clientWidth || canvas.width || 360;
    const ch = canvas.clientHeight || canvas.height || 420;
    const nw = Math.max(1, Math.round(cw * dpr)), nh = Math.max(1, Math.round(ch * dpr));
    if (nw !== w || nh !== h) { w = canvas.width = nw; h = canvas.height = nh; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
  }

  function frame(ts) {
    if (!alive || lost) return;
    // Skip work while the canvas is detached (map / journal / settings screens).
    if (canvas.isConnected === false) {
      if (alive && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
      return;
    }
    if (!start) start = ts;
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (ts - start) / 1000);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uWarm, warm);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (alive && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
  }

  if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
  else { resize(); gl.uniform1f(uTime, 0); gl.uniform1f(uIntensity, intensity); gl.uniform1f(uWarm, warm); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

  active = {
    canvas,
    stop() {
      alive = false;
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      try { gl.deleteProgram(prog); gl.deleteBuffer(buf); gl.deleteShader(vs); gl.deleteShader(fs); } catch { /* noop */ }
    }
  };
  return active;
}
