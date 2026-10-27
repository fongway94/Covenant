/* Procedural audio for Covenant — sound effects + adaptive ambient music.
   No audio files: everything is synthesised with Web Audio, so the whole
   soundtrack works offline and inside the single-file build. */

let ctx = null;
let enabled = true;          // sound effects

const NOTES = {
  tap:      [{ f: 420, d: 0.055, type: "sine", g: 0.045 }],
  choose:   [{ f: 330, d: 0.09, type: "triangle", g: 0.07 }, { f: 494, d: 0.11, type: "sine", g: 0.05, at: 0.06 }],
  good:     [{ f: 523, d: 0.11, type: "sine", g: 0.06 }, { f: 659, d: 0.13, type: "sine", g: 0.05, at: 0.09 }, { f: 784, d: 0.2, type: "sine", g: 0.045, at: 0.18 }],
  unlock:   [{ f: 392, d: 0.14, type: "triangle", g: 0.055 }, { f: 587, d: 0.18, type: "sine", g: 0.05, at: 0.1 }, { f: 880, d: 0.32, type: "sine", g: 0.04, at: 0.24 }],
  pray:     [{ f: 261, d: 0.5, type: "sine", g: 0.045 }, { f: 392, d: 0.6, type: "sine", g: 0.035, at: 0.18 }],
  hit:      [{ f: 660, d: 0.07, type: "square", g: 0.035 }, { f: 990, d: 0.1, type: "sine", g: 0.04, at: 0.05 }],
  miss:     [{ f: 180, d: 0.16, type: "sawtooth", g: 0.03 }],
  level:    [{ f: 523, d: 0.12, type: "triangle", g: 0.06 }, { f: 659, d: 0.12, type: "triangle", g: 0.06, at: 0.1 }, { f: 784, d: 0.14, type: "triangle", g: 0.06, at: 0.2 }, { f: 1046, d: 0.36, type: "sine", g: 0.05, at: 0.32 }],
  complete: [{ f: 392, d: 0.18, type: "sine", g: 0.05 }, { f: 523, d: 0.2, type: "sine", g: 0.05, at: 0.15 }, { f: 659, d: 0.22, type: "sine", g: 0.05, at: 0.3 }, { f: 784, d: 0.5, type: "sine", g: 0.05, at: 0.45 }]
};

export function setEnabled(v) { enabled = !!v; }
export function isEnabled() { return enabled; }

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch { return null; } }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Call from the first real user gesture — browsers block audio before that. */
export function resumeAudio() { getCtx(); }

export function sfx(name) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const notes = NOTES[name] || NOTES.tap;
  const t0 = c.currentTime;
  for (const n of notes) {
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const at = t0 + (n.at || 0);
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(n.g, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
      osc.connect(gain).connect(c.destination);
      osc.start(at);
      osc.stop(at + n.d + 0.03);
    } catch { /* audio not critical */ }
  }
}

/* =================================================================
   Ambient music
   Three layers crossfade together:
     1. a low drone (root / fifth / octave, slowly breathing),
     2. filtered brown noise (wind, water, rain, crowd),
     3. a gentle pentatonic melody scheduled with a look-ahead clock.
   Each chapter selects a preset; changing chapter crossfades in ~1s.
   ================================================================= */

const MUSIC_KEY = "covenant.music.v1";
let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_KEY) !== "0"; } catch { /* private mode */ }

let currentKind = null;
let layers = null;
let scheduler = null;
let nextNoteAt = 0;
let melodyStep = 0;
let ducked = false;
let noiseBuffer = null;

/** root = base Hz, scale = pentatonic semitone offsets, beat = seconds/note. */
const PRESETS = {
  title:   { root: 146.83, scale: [0, 3, 5, 7, 10, 12], beat: 1.05, drone: 0.055, noise: 0.020, cutoff: 480,  wave: "sine",     mel: 0.030 },
  camp:    { root: 164.81, scale: [0, 2, 5, 7, 9, 12],  beat: 0.92, drone: 0.050, noise: 0.028, cutoff: 620,  wave: "triangle", mel: 0.028 },
  valley:  { root: 130.81, scale: [0, 3, 5, 7, 10, 12], beat: 1.00, drone: 0.058, noise: 0.038, cutoff: 760,  wave: "sine",     mel: 0.026 },
  night:   { root: 110.00, scale: [0, 3, 5, 7, 10, 12], beat: 1.25, drone: 0.065, noise: 0.014, cutoff: 300,  wave: "sine",     mel: 0.024 },
  desert:  { root: 146.83, scale: [0, 2, 5, 7, 10, 12], beat: 1.10, drone: 0.052, noise: 0.052, cutoff: 1050, wave: "triangle", mel: 0.026 },
  sea:     { root: 123.47, scale: [0, 3, 5, 7, 10, 12], beat: 1.15, drone: 0.060, noise: 0.060, cutoff: 380,  wave: "sine",     mel: 0.025 },
  field:   { root: 174.61, scale: [0, 2, 4, 7, 9, 12],  beat: 0.88, drone: 0.048, noise: 0.030, cutoff: 900,  wave: "triangle", mel: 0.030 },
  temple:  { root: 155.56, scale: [0, 2, 5, 7, 9, 12],  beat: 1.20, drone: 0.062, noise: 0.016, cutoff: 420,  wave: "sine",     mel: 0.027 },
  city:    { root: 164.81, scale: [0, 2, 4, 7, 9, 12],  beat: 0.80, drone: 0.046, noise: 0.040, cutoff: 1150, wave: "triangle", mel: 0.029 },
  finale:  { root: 196.00, scale: [0, 2, 4, 7, 9, 12],  beat: 1.10, drone: 0.058, noise: 0.018, cutoff: 700,  wave: "sine",     mel: 0.032 }
};

/** Which ambience each chapter uses. */
export const CHAPTER_AMBIENCE = {
  elah: "valley", lions: "night", jericho: "desert", storm: "sea",
  prodigal: "field", esther: "temple", bush: "desert", ruth: "field",
  jonah: "sea", zacchaeus: "city"
};

export function isMusicEnabled() { return musicOn; }

export function setMusicEnabled(v) {
  const next = !!v;
  const changed = next !== musicOn;
  musicOn = next;
  try { localStorage.setItem(MUSIC_KEY, musicOn ? "1" : "0"); } catch { /* noop */ }
  if (!musicOn) {
    if (changed) { fadeOutLayers(layers); layers = null; stopScheduler(); }
    return;
  }
  if (!ctx) return;                          // wait for the first user gesture
  if (!changed && layers && !layers.stopped) return;   // already playing
  const kind = currentKind || "title";
  currentKind = null;
  setAmbience(kind);
}

function brownNoise(c) {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 3);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = Math.max(-1, Math.min(1, last * 3.2));
  }
  noiseBuffer = buf;
  return buf;
}

function makeLayers(c, preset) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.connect(c.destination);

  // 1 — breathing drone
  const droneBus = c.createGain();
  droneBus.gain.value = preset.drone;
  droneBus.connect(out);
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = preset.drone * 0.45;
  lfo.connect(lfoGain).connect(droneBus.gain);
  lfo.start();
  const oscs = [];
  for (const [mult, type, vol] of [[0.5, "sine", 0.55], [1, "sine", 0.4], [1.5, "triangle", 0.18], [2, "sine", 0.1]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = preset.root * mult * (mult === 1.5 ? 1.001 : 1);
    g.gain.value = vol;
    o.connect(g).connect(droneBus);
    o.start();
    oscs.push(o);
  }

  // 2 — filtered noise bed (wind / water / crowd)
  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = preset.cutoff;
  filter.Q.value = 0.6;
  const noiseGain = c.createGain();
  noiseGain.gain.value = preset.noise;
  const sweep = c.createOscillator();
  const sweepAmt = c.createGain();
  sweep.frequency.value = 0.05;
  sweepAmt.gain.value = preset.cutoff * 0.35;
  sweep.connect(sweepAmt).connect(filter.frequency);
  src.connect(filter).connect(noiseGain).connect(out);
  src.start(); sweep.start();

  return { out, oscs, lfo, sweep, src, preset, stopped: false };
}

function fadeOutLayers(l) {
  if (!l || !ctx || l.stopped) return;
  l.stopped = true;
  try {
    const now = ctx.currentTime;
    l.out.gain.cancelScheduledValues(now);
    l.out.gain.setValueAtTime(Math.max(0.0001, l.out.gain.value), now);
    l.out.gain.linearRampToValueAtTime(0.0001, now + 0.9);
  } catch { /* noop */ }
  setTimeout(() => disposeLayers(l), 1100);
}

function disposeLayers(l) {
  if (!l) return;
  for (const o of [...l.oscs, l.lfo, l.sweep, l.src]) { try { o.stop(); } catch { /* already stopped */ } }
  try { l.out.disconnect(); } catch { /* noop */ }
}

function playNote(c, l, at) {
  const p = l.preset;
  // A slow random walk through the pentatonic scale keeps it calm, not busy.
  melodyStep += Math.random() < 0.5 ? 1 : -1;
  const idx = Math.abs(melodyStep) % p.scale.length;
  const octave = Math.random() < 0.22 ? 2 : 1;
  const f = p.root * octave * Math.pow(2, p.scale[idx] / 12);
  const o = c.createOscillator();
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1800;
  o.type = p.wave; o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(p.mel, at + 0.09);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.25);
  o.connect(lp).connect(g).connect(l.out);
  o.start(at); o.stop(at + 1.35);
}

function schedule() {
  const c = ctx;
  if (!c || !musicOn || !layers || ducked || c.state !== "running") return;
  const p = layers.preset;
  const now = c.currentTime;
  if (nextNoteAt < now) nextNoteAt = now + 0.06;
  while (nextNoteAt < now + 0.6) {
    try { playNote(c, layers, nextNoteAt); } catch { /* noop */ }
    // occasional rest so the melody breathes
    nextNoteAt += p.beat * (Math.random() < 0.18 ? 2 : 1);
  }
}

function startScheduler() {
  if (scheduler) return;
  scheduler = setInterval(schedule, 180);
  nextNoteAt = 0;
}

function stopScheduler() {
  if (scheduler) { clearInterval(scheduler); scheduler = null; }
}

/** Switch the ambient bed. Safe to call on every render — it is idempotent. */
export function setAmbience(kind) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (!musicOn) { currentKind = kind; return; }
  if (kind === currentKind && layers && !layers.stopped) return;
  currentKind = kind;
  const preset = PRESETS[kind] || PRESETS.camp;
  if (layers) fadeOutLayers(layers);
  layers = makeLayers(c, preset);
  try {
    const now = c.currentTime;
    layers.out.gain.setValueAtTime(0.0001, now);
    layers.out.gain.linearRampToValueAtTime(ducked ? 0.0001 : 0.9, now + 1.4);
  } catch { /* noop */ }
  melodyStep = Math.floor(Math.random() * 6);
  nextNoteAt = 0;
  startScheduler();
}

/** Duck the music when the tab is hidden (saves battery, avoids surprise). */
export function duckAmbience(hidden) {
  ducked = !!hidden;
  if (!ctx || !layers || layers.stopped) return;
  try {
    const now = ctx.currentTime;
    layers.out.gain.cancelScheduledValues(now);
    layers.out.gain.setValueAtTime(Math.max(0.0001, layers.out.gain.value), now);
    layers.out.gain.linearRampToValueAtTime(ducked ? 0.0001 : 0.9, now + 0.35);
  } catch { /* noop */ }
}
