/* Procedural audio for Covenant — sound effects + adaptive ambient score.
   No audio files: everything is synthesised with Web Audio, so the whole
   soundtrack works offline and inside the single-file build.

   The score is built from four layers per chapter mood:
     1. a moving chord progression (gliding pad + bass),
     2. a plucked harp/oud arpeggio with phrase contour and humanised timing,
     3. a soft frame-drum / low pulse on the strong beats,
     4. filtered brown-noise ambience (wind, water, crowd),
   all fed through a generated convolution reverb for space. */

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
   Ambient score
   ================================================================= */

const MUSIC_KEY = "covenant.music.v1";
let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_KEY) !== "0"; } catch { /* private mode */ }

let currentKind = null;
let currentIntensity = 0;
let layers = null;
let scheduler = null;
let ducked = false;
let noiseBuffer = null;
let impulseBuffer = null;

/* Chord progressions as semitone offsets from the preset root. Four bars,
   each a 4-note chord. Movement is what stops a drone sounding "dull". */
const PROG = {
  warm:    [[0, 4, 7, 11], [5, 9, 12, 16], [-3, 2, 7, 11], [2, 7, 11, 14]],
  solemn:  [[0, 3, 7, 10], [-4, 0, 3, 7], [5, 9, 12, 15], [3, 7, 10, 14]],
  hope:    [[0, 4, 7, 11], [-5, -1, 2, 7], [3, 7, 10, 14], [5, 9, 12, 16]],
  desert:  [[0, 2, 7, 10], [0, 3, 7, 10], [5, 7, 12, 15], [3, 5, 10, 14]],
  ocean:   [[0, 3, 7, 10], [-2, 2, 5, 9], [3, 7, 10, 14], [-4, 0, 3, 7]],
  triumph: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 19], [2, 7, 11, 14]]
};

/** root = Hz, beat = seconds per arpeggio step, prog = chord set. */
const PRESETS = {
  title:   { root: 146.83, prog: PROG.hope,    beat: 0.46, pad: 0.030, pluck: 0.052, bright: 3400, reverb: 0.34, noise: 0.012, cutoff: 520,  drum: 0.55, wave: "triangle", intensityGain: 0.9 },
  camp:    { root: 164.81, prog: PROG.warm,    beat: 0.42, pad: 0.028, pluck: 0.050, bright: 3000, reverb: 0.30, noise: 0.020, cutoff: 700,  drum: 0.60, wave: "triangle", intensityGain: 0.9 },
  valley:  { root: 130.81, prog: PROG.solemn,  beat: 0.44, pad: 0.034, pluck: 0.046, bright: 2500, reverb: 0.42, noise: 0.030, cutoff: 880,  drum: 0.85, wave: "sawtooth", intensityGain: 1.15 },
  night:   { root: 110.00, prog: PROG.solemn,  beat: 0.56, pad: 0.038, pluck: 0.038, bright: 1900, reverb: 0.52, noise: 0.010, cutoff: 330,  drum: 0.15, wave: "sine",     intensityGain: 0.7 },
  desert:  { root: 146.83, prog: PROG.desert,  beat: 0.40, pad: 0.030, pluck: 0.052, bright: 3800, reverb: 0.28, noise: 0.046, cutoff: 1250, drum: 0.95, wave: "sawtooth", intensityGain: 1.2 },
  sea:     { root: 123.47, prog: PROG.ocean,   beat: 0.52, pad: 0.040, pluck: 0.040, bright: 2100, reverb: 0.56, noise: 0.056, cutoff: 420,  drum: 0.35, wave: "sine",     intensityGain: 1.0 },
  field:   { root: 174.61, prog: PROG.warm,    beat: 0.40, pad: 0.026, pluck: 0.054, bright: 3600, reverb: 0.32, noise: 0.022, cutoff: 980,  drum: 0.55, wave: "triangle", intensityGain: 0.9 },
  temple:  { root: 155.56, prog: PROG.solemn,  beat: 0.54, pad: 0.042, pluck: 0.040, bright: 2300, reverb: 0.62, noise: 0.012, cutoff: 460,  drum: 0.20, wave: "sine",     intensityGain: 0.75 },
  city:    { root: 164.81, prog: PROG.warm,    beat: 0.36, pad: 0.026, pluck: 0.055, bright: 4000, reverb: 0.30, noise: 0.036, cutoff: 1400, drum: 0.90, wave: "triangle", intensityGain: 1.1 },
  finale:  { root: 196.00, prog: PROG.triumph, beat: 0.44, pad: 0.036, pluck: 0.058, bright: 4200, reverb: 0.48, noise: 0.014, cutoff: 820,  drum: 0.70, wave: "triangle", intensityGain: 0.8 }
};

/** Which score each chapter uses. */
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
  if (!ctx) return;                                     // wait for first gesture
  if (!changed && layers && !layers.stopped) return;    // already playing
  const kind = currentKind || "title";
  currentKind = null;
  setAmbience(kind, currentIntensity);
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

/** A short exponential-decay stereo impulse — cheap, warm hall reverb. */
function impulse(c) {
  if (impulseBuffer && impulseBuffer.sampleRate === c.sampleRate) return impulseBuffer;
  const len = Math.floor(c.sampleRate * 1.9);
  const buf = c.createBuffer(2, len, c.sampleRate);
  const pre = Math.floor(c.sampleRate * 0.018);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue; }
      const k = (i - pre) / (len - pre);
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.7) * (1 - k * 0.35);
    }
  }
  impulseBuffer = buf;
  return buf;
}

function makeLayers(c, preset) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.connect(c.destination);

  // Reverb send: everything goes to `bus`, which splits dry + wet.
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(out);
  const conv = c.createConvolver();
  conv.buffer = impulse(c);
  const wet = c.createGain();
  wet.gain.value = preset.reverb;
  bus.connect(conv); conv.connect(wet); wet.connect(out);

  // 1 — gliding pad (3 voices) + bass (2 voices)
  const padGain = c.createGain();
  padGain.gain.value = preset.pad;
  padGain.connect(bus);
  const padLfo = c.createOscillator();
  const padLfoAmt = c.createGain();
  padLfo.frequency.value = 0.09;
  padLfoAmt.gain.value = preset.pad * 0.38;
  padLfo.connect(padLfoAmt).connect(padGain.gain);
  padLfo.start();

  const padOscs = [];
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = i === 1 ? "triangle" : "sine";
    o.frequency.value = preset.root * (i === 0 ? 1 : i === 1 ? 1.5 : 2);
    o.detune.value = (i - 1) * 5;
    g.gain.value = i === 0 ? 0.5 : i === 1 ? 0.32 : 0.22;
    o.connect(g).connect(padGain);
    o.start();
    padOscs.push(o);
  }

  const bassGain = c.createGain();
  bassGain.gain.value = 0.052;
  bassGain.connect(bus);
  const bassOscs = [];
  for (const [mult, vol] of [[0.5, 0.72], [0.75, 0.22]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine"; o.frequency.value = preset.root * mult; g.gain.value = vol;
    o.connect(g).connect(bassGain);
    o.start(); bassOscs.push(o);
  }

  // 2 — noise bed (wind / water / crowd)
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = brownNoise(c);
  noiseSrc.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass"; filter.frequency.value = preset.cutoff; filter.Q.value = 0.7;
  const noiseGain = c.createGain();
  noiseGain.gain.value = preset.noise;
  const sweep = c.createOscillator();
  const sweepAmt = c.createGain();
  sweep.frequency.value = 0.055;
  sweepAmt.gain.value = preset.cutoff * 0.42;
  sweep.connect(sweepAmt).connect(filter.frequency);
  noiseSrc.connect(filter).connect(noiseGain).connect(bus);
  noiseSrc.start(); sweep.start();

  const sources = [...padOscs, ...bassOscs, padLfo, sweep, noiseSrc];
  return {
    out, bus, conv, wet, padGain, bassGain, padOscs, bassOscs,
    noiseSrc, filter, sweep, sources, preset,
    chord: [], beatCount: 0, nextAt: 0, intensity: 0, stopped: false
  };
}

function chordFreqs(preset, bar) {
  const chord = preset.prog[((bar % preset.prog.length) + preset.prog.length) % preset.prog.length];
  return chord.map((semi) => preset.root * Math.pow(2, semi / 12));
}

function applyChord(c, L, bar, at) {
  const f = chordFreqs(L.preset, bar);
  L.chord = f;
  try {
    // A gentle portamento settles inside the first beat — the pad stays in
    // tune with the plucked notes instead of smearing between two chords.
    L.padOscs[0].frequency.setTargetAtTime(f[0], at, 0.22);
    L.padOscs[1].frequency.setTargetAtTime(f[2], at, 0.28);
    L.padOscs[2].frequency.setTargetAtTime(f[1] * 2, at, 0.34);
    L.bassOscs[0].frequency.setTargetAtTime(f[0] / 2, at, 0.18);
    L.bassOscs[1].frequency.setTargetAtTime(f[2] / 2, at, 0.24);
  } catch { /* noop */ }
}

/** Plucked string: two slightly detuned oscillators through a sweeping LP. */
function pluck(c, L, at, freq, vel, pan) {
  const p = L.preset;
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = p.wave; o2.type = "sine";
  o1.frequency.setValueAtTime(freq, at);
  o2.frequency.setValueAtTime(freq * 2.004, at);
  o1.detune.setValueAtTime(-4, at); o2.detune.setValueAtTime(6, at);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(p.bright, at);
  lp.frequency.exponentialRampToValueAtTime(Math.max(420, p.bright * 0.2), at + 1.0);
  lp.Q.value = 0.5;

  const g = c.createGain();
  const peak = p.pluck * vel;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.010);
  g.gain.exponentialRampToValueAtTime(peak * 0.28, at + 0.22);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.35);

  const shimmer = c.createGain();
  shimmer.gain.value = 0.16;
  o1.connect(lp); o2.connect(shimmer).connect(lp);
  lp.connect(g);
  if (c.createStereoPanner) {
    const pn = c.createStereoPanner();
    pn.pan.value = pan;
    g.connect(pn).connect(L.bus);
  } else g.connect(L.bus);
  o1.start(at); o2.start(at);
  o1.stop(at + 1.4); o2.stop(at + 1.4);
}

/** A slow, flute-like answering phrase — the counter-melody above the harp. */
function melodicNote(c, L, at, freq, dur, vel) {
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = "sine"; o2.type = "triangle";
  o1.frequency.setValueAtTime(freq, at);
  o2.frequency.setValueAtTime(freq, at);
  o2.detune.setValueAtTime(7, at);

  const vib = c.createOscillator();
  const vibAmt = c.createGain();
  vib.frequency.value = 5.1;
  vibAmt.gain.value = 4;
  vib.connect(vibAmt);
  vibAmt.connect(o1.detune); vibAmt.connect(o2.detune);
  vib.start(at); vib.stop(at + dur + 0.5);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1900; lp.Q.value = 0.6;
  const body = c.createGain();
  body.gain.value = 0.78;
  const soft = c.createGain();
  soft.gain.value = 0.22;

  const g = c.createGain();
  const peak = 0.036 * vel;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.12);
  g.gain.setValueAtTime(peak, at + dur * 0.62);
  g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.45);

  o1.connect(body).connect(lp);
  o2.connect(soft).connect(lp);
  lp.connect(g).connect(L.bus);
  o1.start(at); o2.start(at);
  o1.stop(at + dur + 0.5); o2.stop(at + dur + 0.5);
}

/** Soft low frame-drum pulse + a short airy tick. */
function drum(c, L, at, strength) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(118, at);
  o.frequency.exponentialRampToValueAtTime(46, at + 0.17);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.075 * strength, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
  o.connect(g).connect(L.bus);
  o.start(at); o.stop(at + 0.36);

  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.026 * strength, at);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  src.connect(bp).connect(ng).connect(L.bus);
  try { src.start(at, Math.random() * 2); } catch { src.start(at); }
  src.stop(at + 0.1);
}

/* An 8-step phrase contour; rotated each bar so it never loops verbatim. */
const PHRASES = [
  [0, 2, 1, 3, 2, 1, 3, 2],
  [0, 1, 2, 3, 1, 2, 0, 2],
  [2, 3, 1, 2, 0, 1, 3, 1],
  [0, 2, 3, 1, 2, 3, 1, 0]
];

function schedule() {
  const c = ctx;
  if (!c || !musicOn || !layers || ducked || c.state !== "running") return;
  const L = layers, p = L.preset, now = c.currentTime;
  if (L.nextAt < now) L.nextAt = now + 0.05;
  const speed = L.intensity > 0 ? 0.9 : 1;

  while (L.nextAt < now + 0.6) {
    const at = L.nextAt;
    const bar = Math.floor(L.beatCount / 8);
    const step = L.beatCount % 8;
    if (step === 0) applyChord(c, L, bar, at);
    const f = L.chord.length ? L.chord : chordFreqs(p, bar);

    // Drum on the strong beats; a little more present during action scenes.
    const drumOn = p.drum > 0 && (step === 0 || step === 4 || (L.intensity > 0 && step === 6));
    if (drumOn) {
      try { drum(c, L, at, p.drum * (step === 0 ? 1 : 0.6) * (1 + L.intensity * 0.25)); } catch { /* noop */ }
    }

    // Every other bar a slow flute-like line answers the harp. Four notes,
    // each held across two steps: this is the part you can hum afterwards.
    const answerBar = bar % 2 === 0;
    const melodyStep = step % 2 === 1;
    if (answerBar && melodyStep && f[3] !== undefined) {
      const contour = [2, 3, 2, 1][(step - 1) / 2];
      try {
        melodicNote(c, L, at, f[contour] * 2, p.beat * 1.65, 0.9 + L.intensity * 0.12);
      } catch { /* noop */ }
    }

    // Arpeggio with rests, octave answers and a rotated phrase.
    const phrase = PHRASES[bar % PHRASES.length];
    const idx = phrase[step];
    const rest = (step === 3 || step === 7) && Math.random() < 0.42;
    if (!rest && f[idx] !== undefined) {
      const answer = step === 6 && Math.random() < 0.38;
      const freq = f[idx] * (answer ? 4 : 2);
      const vel = (step === 0 ? 1.05 : 0.72 + Math.random() * 0.35)
        * (answer ? 0.7 : 1) * (answerBar && melodyStep ? 0.68 : 1);
      const pan = Math.sin((L.beatCount + bar) * 0.7) * 0.42;
      try { pluck(c, L, at + (Math.random() - 0.5) * 0.018, freq, vel, pan); } catch { /* noop */ }
      // Occasional soft fifth underneath for body.
      if (step === 0 && Math.random() < 0.6) {
        try { pluck(c, L, at + 0.012, f[0], 0.5, -pan); } catch { /* noop */ }
      }
    }

    L.beatCount++;
    L.nextAt += p.beat * speed * (0.96 + Math.random() * 0.08);
  }
}

function startScheduler() {
  if (scheduler) return;
  if (layers) layers.nextAt = 0;
  scheduler = setInterval(schedule, 150);
}

function stopScheduler() {
  if (scheduler) { clearInterval(scheduler); scheduler = null; }
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
  for (const o of l.sources) { try { o.stop(); } catch { /* already stopped */ } }
  for (const n of [l.out, l.bus, l.conv, l.wet, l.padGain, l.bassGain]) {
    try { n.disconnect(); } catch { /* noop */ }
  }
}

/** Switch the score. Safe to call on every render — idempotent by kind. */
export function setAmbience(kind, intensity = 0) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  currentIntensity = intensity;
  if (!musicOn) { currentKind = kind; return; }
  if (kind === currentKind && layers && !layers.stopped) {
    layers.intensity = intensity;
    return;
  }
  currentKind = kind;
  const preset = PRESETS[kind] || PRESETS.camp;
  if (layers) fadeOutLayers(layers);
  layers = makeLayers(c, preset);
  layers.intensity = intensity;
  applyChord(c, layers, 0, c.currentTime);
  try {
    const now = c.currentTime;
    layers.out.gain.setValueAtTime(0.0001, now);
    layers.out.gain.linearRampToValueAtTime(ducked ? 0.0001 : 0.9, now + 1.3);
  } catch { /* noop */ }
  startScheduler();
}

/** Duck the score when the tab is hidden (saves battery, avoids surprise). */
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
