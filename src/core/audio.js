/* Procedural audio for Covenant — sound effects + adaptive ambient score.
   No audio files: everything is synthesised with Web Audio, so the whole
   soundtrack works offline and inside the single-file build.

   The score is written for the world of the story, not for a console. There
   are no square waves, no arpeggios on a 16th-note grid and no chip-tick
   drums; what plays instead is an ancient-world chamber:

     1. a drone on the tonic (the room tone under everything),
     2. a slow bowed-string pad that moves through a modal progression,
     3. a plucked oud / lyre, sparse and rolled, never an arpeggio run,
     4. a breathy ney-like flute as the melody, in long phrases with rests,
     5. a soft frame drum on the strong beats, and a struck bowl in stillness,
   all sent through a long generated reverb.

   Every chapter has its own mode: Hijaz for the desert, Aeolian for the
   valley, Dorian for the sea and the fields, Ionian for the title and the
   finale. The point is that a player who leaves the sound on should never
   hear a rhythm that belongs to a different world. */

let ctx = null;
let enabled = true;          // sound effects

const NOTES = {
  tap:      [{ f: 392, d: 0.09, type: "sine", g: 0.030, lp: 1500 }],
  choose:   [{ f: 330, d: 0.16, type: "sine", g: 0.045, lp: 1400 }, { f: 494, d: 0.22, type: "sine", g: 0.032, at: 0.07, lp: 1800 }],
  good:     [{ f: 523, d: 0.2, type: "sine", g: 0.042, lp: 2100 }, { f: 659, d: 0.24, type: "sine", g: 0.034, at: 0.10, lp: 2100 }, { f: 784, d: 0.4, type: "sine", g: 0.028, at: 0.20, lp: 2400 }],
  unlock:   [{ f: 392, d: 0.3, type: "sine", g: 0.04, lp: 1500 }, { f: 587, d: 0.4, type: "sine", g: 0.034, at: 0.13, lp: 1900 }, { f: 880, d: 0.75, type: "sine", g: 0.026, at: 0.3, lp: 2200 }],
  pray:     [{ f: 261, d: 1.1, type: "sine", g: 0.036, lp: 900 }, { f: 392, d: 1.3, type: "sine", g: 0.028, at: 0.22, lp: 1100 }],
  hit:      [{ f: 587, d: 0.13, type: "sine", g: 0.030, lp: 1800 }, { f: 880, d: 0.2, type: "sine", g: 0.026, at: 0.06, lp: 2000 }],
  miss:     [{ f: 196, d: 0.26, type: "sine", g: 0.026, lp: 700 }],
  level:    [{ f: 523, d: 0.24, type: "sine", g: 0.04, lp: 1900 }, { f: 659, d: 0.26, type: "sine", g: 0.04, at: 0.13, lp: 2000 }, { f: 784, d: 0.3, type: "sine", g: 0.038, at: 0.26, lp: 2100 }, { f: 1046, d: 0.7, type: "sine", g: 0.03, at: 0.4, lp: 2300 }],
  complete: [{ f: 392, d: 0.4, type: "sine", g: 0.04, lp: 1600 }, { f: 523, d: 0.45, type: "sine", g: 0.036, at: 0.18, lp: 1800 }, { f: 659, d: 0.6, type: "sine", g: 0.034, at: 0.36, lp: 2000 }, { f: 784, d: 1.1, type: "sine", g: 0.032, at: 0.54, lp: 2200 }]
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
      gain.gain.exponentialRampToValueAtTime(n.g, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
      /* A low-pass on every effect keeps the whole interface in the same
         warm register as the score — nothing rings out above ~2 kHz. */
      let tail = gain;
      if (n.lp && c.createBiquadFilter) {
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = n.lp;
        lp.Q.value = 0.4;
        gain.connect(lp);
        tail = lp;
      }
      osc.connect(gain);
      tail.connect(c.destination);
      osc.start(at);
      osc.stop(at + n.d + 0.05);
    } catch { /* audio not critical */ }
  }
}

/* =================================================================
   The pen — a soft tick under the dialogue as it writes itself
   =================================================================
   One warm sine with an 18 ms swell and a 170 ms tail, walked up a
   pentatonic ladder so consecutive letters rise and fall instead of
   repeating one pitch. A very quiet band of low noise gives it the dry
   edge of a nib on parchment. No square or sawtooth anywhere and the
   filter sits at 1.6 kHz: this is the sound of writing, not of a keypad. */

const PEN_LADDER = [0, 2, 4, 7, 9, 7, 4, 2];   // semitones above 620 Hz
let penStep = 0;
let penLastAt = -1;
const PEN_GAP = 0.062;                          // at most ~16 ticks a second

export function penTick() {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  if (now - penLastAt < PEN_GAP) return;
  penLastAt = now;
  /* A hand does not keep perfect time: one letter in eight is skipped, which
     turns a row of identical ticks into a stroke of writing. */
  if (Math.random() < 0.12) return;

  const semi = PEN_LADDER[penStep % PEN_LADDER.length];
  penStep++;
  /* a whisper of drift so a long line never sounds mechanical */
  const f = 620 * Math.pow(2, semi / 12) * (1 + (Math.random() - 0.5) * 0.006);
  const at = now + 0.001;

  try {
    const osc = c.createOscillator();
    const body = c.createOscillator();
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    const peak = 0.017;

    osc.type = "sine";
    osc.frequency.setValueAtTime(f, at);
    body.type = "sine";
    body.frequency.setValueAtTime(f / 2, at);

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1600, at);
    lp.Q.value = 0.5;

    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.018);      // soft swell, never a click
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);

    osc.connect(g);
    const sub = c.createGain();
    sub.gain.value = 0.35;
    body.connect(sub).connect(g);
    g.connect(lp).connect(c.destination);

    osc.start(at); body.start(at);
    osc.stop(at + 0.2); body.stop(at + 0.2);
  } catch { /* audio not critical */ }
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

/* ------------------------------------------------------------- modes
   The seven notes of each mode, in semitones from the tonic. Chords are
   built by stacking scale degrees, never by adding fixed intervals, so a
   chord always belongs to the mode the chapter is in. */
const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],     // the valley, the den: grave, old
  dorian:  [0, 2, 3, 5, 7, 9, 10],     // sea and field: open, a little hopeful
  hijaz:   [0, 1, 4, 5, 7, 8, 10],     // desert and Babylon: the ancient East
  ionian:  [0, 2, 4, 5, 7, 9, 11],     // title, camp, finale: warm and singable
  mixo:    [0, 2, 4, 5, 7, 9, 10]      // the city: bright, crowded, a shaded third
};

function deg(mode, d) {
  const m = MODES[mode] || MODES.aeolian;
  const oct = Math.floor(d / 7);
  const i = ((d % 7) + 7) % 7;
  return m[i] + 12 * oct;
}

/** Four bars of chord roots, as scale degrees (0 = tonic). */
const PROG = {
  hope:    [0, 4, 5, 3],
  warm:    [0, 3, 5, 4],
  solemn:  [0, 5, 2, 6],
  desert:  [0, 3, 1, 0],
  ocean:   [0, 6, 3, 4],
  triumph: [0, 4, 5, 0]
};

/** root = Hz, beat = seconds per beat (a bar is four), drum = frame-drum level. */
const PRESETS = {
  title:  { root: 146.83, mode: "ionian",  prog: PROG.hope,    beat: 1.45, drone: 0.034, pad: 0.030, pluck: 0.052, reed: 0.062, drum: 0.30, bell: 0.16, bright: 2400, reverb: 0.34, noise: 0.013, cutoff: 480,  intens: 0.9 },
  camp:   { root: 164.81, mode: "ionian",  prog: PROG.warm,    beat: 1.60, drone: 0.031, pad: 0.028, pluck: 0.054, reed: 0.060, drum: 0.34, bell: 0.10, bright: 2300, reverb: 0.32, noise: 0.022, cutoff: 640,  intens: 0.9 },
  valley: { root: 130.81, mode: "aeolian", prog: PROG.solemn,  beat: 1.75, drone: 0.036, pad: 0.034, pluck: 0.048, reed: 0.064, drum: 0.42, bell: 0.14, bright: 2200, reverb: 0.46, noise: 0.026, cutoff: 760,  intens: 1.15 },
  night:  { root: 110.00, mode: "aeolian", prog: PROG.solemn,  beat: 2.15, drone: 0.038, pad: 0.036, pluck: 0.042, reed: 0.058, drum: 0.10, bell: 0.30, bright: 2600, reverb: 0.56, noise: 0.010, cutoff: 300,  intens: 0.7 },
  desert: { root: 146.83, mode: "hijaz",   prog: PROG.desert,  beat: 1.55, drone: 0.035, pad: 0.030, pluck: 0.052, reed: 0.072, drum: 0.50, bell: 0.10, bright: 2600, reverb: 0.38, noise: 0.042, cutoff: 1150, intens: 1.2 },
  sea:    { root: 123.47, mode: "dorian",  prog: PROG.ocean,   beat: 1.95, drone: 0.038, pad: 0.038, pluck: 0.040, reed: 0.060, drum: 0.18, bell: 0.14, bright: 2100, reverb: 0.52, noise: 0.052, cutoff: 400,  intens: 1.0 },
  field:  { root: 174.61, mode: "dorian",  prog: PROG.warm,    beat: 1.50, drone: 0.031, pad: 0.026, pluck: 0.054, reed: 0.062, drum: 0.26, bell: 0.18, bright: 2500, reverb: 0.40, noise: 0.020, cutoff: 900,  intens: 0.9 },
  temple: { root: 155.56, mode: "aeolian", prog: PROG.solemn,  beat: 2.05, drone: 0.039, pad: 0.040, pluck: 0.042, reed: 0.062, drum: 0.10, bell: 0.40, bright: 2300, reverb: 0.60, noise: 0.011, cutoff: 420,  intens: 0.75 },
  city:   { root: 164.81, mode: "mixo",    prog: PROG.warm,    beat: 1.35, drone: 0.030, pad: 0.026, pluck: 0.054, reed: 0.062, drum: 0.44, bell: 0.08, bright: 2500, reverb: 0.36, noise: 0.032, cutoff: 1300, intens: 1.1 },
  finale: { root: 196.00, mode: "ionian",  prog: PROG.triumph, beat: 1.55, drone: 0.032, pad: 0.038, pluck: 0.054, reed: 0.072, drum: 0.34, bell: 0.24, bright: 2700, reverb: 0.48, noise: 0.014, cutoff: 780,  intens: 0.85 }
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

/** A long, soft stereo impulse — a stone room with a high ceiling, not a
    plate reverb. Slow build, very gradual tail: this is most of what makes
    the score sound like it was recorded in a place rather than generated. */
function impulse(c) {
  if (impulseBuffer && impulseBuffer.sampleRate === c.sampleRate) return impulseBuffer;
  const len = Math.floor(c.sampleRate * 3.1);
  const buf = c.createBuffer(2, len, c.sampleRate);
  const pre = Math.floor(c.sampleRate * 0.026);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue; }
      const k = (i - pre) / (len - pre);
      /* the tail is also low-passed by ear: the noise loses its top as it
         decays, which is what a stone room does to a struck string */
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.2) * (1 - k * 0.5);
    }
  }
  impulseBuffer = buf;
  return buf;
}

function makeLayers(c, preset) {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.connect(c.destination);

  // Dry + wet: everything goes to `bus`, which splits into the room.
  const bus = c.createGain();
  bus.gain.value = 1;
  bus.connect(out);
  const conv = c.createConvolver();
  conv.buffer = impulse(c);
  const wet = c.createGain();
  wet.gain.value = preset.reverb;
  /* The room is darker than the dry signal — a bright reverb is the other
     thing that makes generated music sound synthetic. */
  const wetLp = c.createBiquadFilter();
  wetLp.type = "lowpass";
  wetLp.frequency.value = 2400;
  wetLp.Q.value = 0.3;
  bus.connect(conv); conv.connect(wetLp); wetLp.connect(wet); wet.connect(out);

  /* 1 — the drone. Tonic, fifth, octave; three voices with a hair of detune
     so they beat against each other very slowly. This is the oldest sound in
     the score and it never stops while a scene is open. */
  const droneGain = c.createGain();
  droneGain.gain.value = preset.drone;
  droneGain.connect(bus);
  const droneSwell = c.createOscillator();
  const droneSwellAmt = c.createGain();
  droneSwell.frequency.value = 0.037;
  droneSwellAmt.gain.value = preset.drone * 0.32;
  droneSwell.connect(droneSwellAmt).connect(droneGain.gain);
  droneSwell.start();

  const droneOscs = [];
  for (const [mult, vol, det] of [[1, 0.6, -4], [1.5, 0.26, 5], [2, 0.16, -7]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = preset.root * mult;
    o.detune.value = det;
    g.gain.value = vol;
    o.connect(g).connect(droneGain);
    o.start();
    droneOscs.push(o);
  }

  /* 2 — the bowed pad. Two triangle voices through a warm low-pass, moved to
     the 3rd and 5th of each chord with a slow portamento. */
  const padGain = c.createGain();
  padGain.gain.value = preset.pad;
  padGain.connect(bus);
  const padLfo = c.createOscillator();
  const padLfoAmt = c.createGain();
  padLfo.frequency.value = 0.071;
  padLfoAmt.gain.value = preset.pad * 0.4;
  padLfo.connect(padLfoAmt).connect(padGain.gain);
  padLfo.start();

  const padFilter = c.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.35;
  padFilter.connect(padGain);

  const padOscs = [];
  for (const [vol, det] of [[0.55, -6], [0.4, 7]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = preset.root * 2;
    o.detune.value = det;
    g.gain.value = vol;
    o.connect(g).connect(padFilter);
    o.start();
    padOscs.push(o);
  }

  /* 3 — bass. One sine an octave under the chord root, felt more than heard. */
  const bassGain = c.createGain();
  bassGain.gain.value = 0.026;
  bassGain.connect(bus);
  const bassOscs = [];
  for (const [mult, vol] of [[0.5, 0.7], [0.75, 0.18]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine"; o.frequency.value = preset.root * mult; g.gain.value = vol;
    o.connect(g).connect(bassGain);
    o.start(); bassOscs.push(o);
  }

  /* 4 — air. Wind, water or a distant crowd, filtered well below the
     melody so it reads as a place and not as noise. */
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = brownNoise(c);
  noiseSrc.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "lowpass"; noiseFilter.frequency.value = preset.cutoff; noiseFilter.Q.value = 0.6;
  const noiseGain = c.createGain();
  noiseGain.gain.value = preset.noise;
  const sweep = c.createOscillator();
  const sweepAmt = c.createGain();
  sweep.frequency.value = 0.043;
  sweepAmt.gain.value = preset.cutoff * 0.4;
  sweep.connect(sweepAmt).connect(noiseFilter.frequency);
  noiseSrc.connect(noiseFilter).connect(noiseGain).connect(bus);
  noiseSrc.start(); sweep.start();

  const sources = [...droneOscs, ...padOscs, ...bassOscs, droneSwell, padLfo, sweep, noiseSrc];
  return {
    out, bus, conv, wet, wetLp, droneGain, padGain, padFilter, bassGain,
    droneOscs, padOscs, bassOscs, noiseSrc, noiseFilter, sweep, sources, preset,
    chord: [], beatCount: 0, nextAt: 0, intensity: 0, stopped: false
  };
}

/** The chord under bar N, in Hz: root, third, fifth, and the octave above. */
function chordFreqs(preset, bar) {
  const roots = preset.prog;
  const root = roots[((bar % roots.length) + roots.length) % roots.length];
  const semis = [deg(preset.mode, root), deg(preset.mode, root + 2), deg(preset.mode, root + 4), deg(preset.mode, root + 7)];
  return semis.map((s) => preset.root * Math.pow(2, s / 12));
}

function applyChord(c, L, bar, at) {
  const f = chordFreqs(L.preset, bar);
  L.chord = f;
  const roots = L.preset.prog;
  L.chordRoot = roots[((bar % roots.length) + roots.length) % roots.length];
  try {
    /* Slow glides (0.6–1.1 s) so the pad slides into the new chord instead of
       switching to it — the difference between a synth and a section. */
    L.padOscs[0].frequency.setTargetAtTime(f[1] * 2, at, 0.85);
    L.padOscs[1].frequency.setTargetAtTime(f[2] * 2, at, 1.05);
    L.bassOscs[0].frequency.setTargetAtTime(f[0] / 2, at, 0.5);
    L.bassOscs[1].frequency.setTargetAtTime(f[2] / 2, at, 0.7);
  } catch { /* noop */ }
}

/** Plucked oud / lyre: a short swell, a body resonance and a long tail. The
    attack is 28 ms, not 10 — a string, not a key. */
function pluck(c, L, at, freq, vel, pan, dur = 2.4) {
  const p = L.preset;
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = "triangle"; o2.type = "sine";
  o1.frequency.setValueAtTime(freq, at);
  o2.frequency.setValueAtTime(freq * 2.003, at);
  o1.detune.setValueAtTime(-3, at); o2.detune.setValueAtTime(4, at);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(p.bright, at);
  lp.frequency.exponentialRampToValueAtTime(Math.max(360, p.bright * 0.28), at + dur * 0.8);
  lp.Q.value = 0.45;

  /* the soundbox: a gentle peak around 260 Hz gives the note a wooden body */
  const body = c.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 260;
  body.Q.value = 0.9;
  body.gain.value = 5;

  const g = c.createGain();
  const peak = p.pluck * vel;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.028);
  g.gain.exponentialRampToValueAtTime(peak * 0.34, at + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  const shimmer = c.createGain();
  shimmer.gain.value = 0.13;
  o1.connect(lp); o2.connect(shimmer).connect(lp);
  lp.connect(body).connect(g);
  if (c.createStereoPanner) {
    const pn = c.createStereoPanner();
    pn.pan.value = pan;
    g.connect(pn).connect(L.bus);
  } else g.connect(L.bus);
  o1.start(at); o2.start(at);
  o1.stop(at + dur + 0.1); o2.stop(at + dur + 0.1);
}

/** The melody: a ney-like reed in long phrases. Sine core, a breathy band of
    noise above it, vibrato that arrives late and a slow swell — this is the
    voice a player remembers, so it is given room and never rushed. */
function reed(c, L, at, freq, dur, vel) {
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = "sine"; o2.type = "triangle";
  o1.frequency.setValueAtTime(freq * 0.998, at);
  o1.frequency.exponentialRampToValueAtTime(freq, at + 0.16);     // a soft entry, slightly under pitch
  o2.frequency.setValueAtTime(freq, at);
  o2.frequency.exponentialRampToValueAtTime(freq, at + 0.2);
  o2.detune.setValueAtTime(6, at);

  const vib = c.createOscillator();
  const vibAmt = c.createGain();
  vib.frequency.value = 4.7;
  vibAmt.gain.setValueAtTime(0, at);
  vibAmt.gain.linearRampToValueAtTime(4.5, at + Math.min(0.9, dur * 0.45));  // vibrato blooms in
  vib.connect(vibAmt);
  vibAmt.connect(o1.detune); vibAmt.connect(o2.detune);
  vib.start(at); vib.stop(at + dur + 0.6);

  /* breath: a narrow band of noise riding on the note, only in the attack */
  const breathSrc = c.createBufferSource();
  breathSrc.buffer = brownNoise(c);
  const breathBp = c.createBiquadFilter();
  breathBp.type = "bandpass";
  breathBp.frequency.value = Math.min(2600, freq * 3);
  breathBp.Q.value = 1.1;
  const breathG = c.createGain();
  breathG.gain.setValueAtTime(0.0001, at);
  breathG.gain.linearRampToValueAtTime(0.02 * vel, at + 0.12);
  breathG.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(1.1, dur));
  breathSrc.connect(breathBp).connect(breathG).connect(L.bus);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2100; lp.Q.value = 0.5;
  const body = c.createGain(); body.gain.value = 0.8;
  const soft = c.createGain(); soft.gain.value = 0.2;

  const g = c.createGain();
  const peak = L.preset.reed * vel;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.22);       // long swell: breath, not a pick
  g.gain.setValueAtTime(peak, at + dur * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.5);

  o1.connect(body).connect(lp);
  o2.connect(soft).connect(lp);
  lp.connect(g).connect(L.bus);
  o1.start(at); o2.start(at);
  o1.stop(at + dur + 0.6); o2.stop(at + dur + 0.6);
  try { breathSrc.start(at, Math.random() * 2); } catch { breathSrc.start(at); }
  breathSrc.stop(at + Math.min(1.2, dur + 0.1));
}

/** Frame drum: a low skin tone with a long fall, and a soft hand resting on
    it. No click layer — the tick was the chip-drum tell. */
function drum(c, L, at, strength) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(96, at);
  o.frequency.exponentialRampToValueAtTime(52, at + 0.34);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.062 * strength, at + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
  o.connect(g).connect(L.bus);
  o.start(at); o.stop(at + 0.66);

  /* the hand: filtered noise below 600 Hz, a thud rather than a snap */
  const src = c.createBufferSource();
  src.buffer = brownNoise(c);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 580; lp.Q.value = 0.7;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, at);
  ng.gain.linearRampToValueAtTime(0.02 * strength, at + 0.012);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.19);
  src.connect(lp).connect(ng).connect(L.bus);
  try { src.start(at, Math.random() * 2); } catch { src.start(at); }
  src.stop(at + 0.22);
}

/** A struck bowl: two partials, one of them inharmonic, three seconds of tail.
    Heard once a phrase in the still scenes — a marker, not a rhythm. */
function bowl(c, L, at, freq, vel) {
  for (const [mult, gain, dur] of [[1, 0.5, 3.2], [2.76, 0.16, 2.4], [4.2, 0.06, 1.5]]) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * mult, at);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.018 * gain * vel, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(L.bus);
    o.start(at); o.stop(at + dur + 0.1);
  }
}

/* Melodic contours: scale-degree offsets above the current chord. Each is a
   short phrase in the mode, played once and then left alone — the rests are
   as written as the notes. */
const PHRASES = [
  [2, 3, 2, 1],
  [4, 3, 2, 3],
  [0, 1, 2, 1],
  [2, 1, 0, -1],
  [4, 2, 3, 2],
  [1, 2, 3, 4]
];

/** Schedule one beat of the score at an absolute time. Pure with respect to
    the clock, so it can be driven by the live scheduler below or rendered into
    an offline context by fillScore(). */
function scheduleBeat(c, L, at) {
  const p = L.preset;
  const bar = Math.floor(L.beatCount / 4);
  const beat = L.beatCount % 4;
  if (beat === 0) applyChord(c, L, bar, at);
  const f = L.chord.length ? L.chord : chordFreqs(p, bar);

  /* --- the frame drum ---
     One stroke on the first beat of a bar, a softer answer on the third in
     the louder places, and a heartbeat pair when a scene is urgent. */
  if (p.drum > 0) {
    const strong = beat === 0;
    const answer = beat === 2 && p.drum > 0.24;
    if (strong) { try { drum(c, L, at, p.drum * (1 + L.intensity * 0.2)); } catch { /* noop */ } }
    else if (answer) { try { drum(c, L, at, p.drum * 0.55 * (1 + L.intensity * 0.2)); } catch { /* noop */ } }
    if (L.intensity > 0.5 && strong) {
      try { drum(c, L, at + 0.3, p.drum * 0.4); } catch { /* noop */ }
    }
  }

  /* --- the bowl, in the quiet places --- */
  if (beat === 0 && p.bell > 0.05 && bar % 2 === 0 && Math.random() < p.bell * 1.4) {
    try { bowl(c, L, at, f[0] * 2, 0.85 + L.intensity * 0.1); } catch { /* noop */ }
  }

  /* --- the oud ---
     Beat 0 is a rolled pair (root, then its octave 55 ms later). Beat 2 may
     take a third or a fifth. Nothing else — the silence between is what
     makes it sound played rather than sequenced. */
  if (beat === 0 && f[0]) {
    try { pluck(c, L, at, f[0] * 2, 0.95, -0.22); } catch { /* noop */ }
    try { pluck(c, L, at + 0.055, f[3] * 2, 0.55, 0.24); } catch { /* noop */ }
  }
  if (beat === 2 && Math.random() < 0.55) {
    const note = Math.random() < 0.5 ? f[2] : f[1];
    try { pluck(c, L, at + (Math.random() - 0.5) * 0.05, note * 2, 0.6 + Math.random() * 0.25, 0.3); } catch { /* noop */ }
  }
  /* an ornament, rarely: two quick notes, the way a player fills a gap */
  if (beat === 3 && Math.random() < 0.16) {
    const o = f[1] * 4;
    try { pluck(c, L, at, o, 0.42, -0.3, 1.2); pluck(c, L, at + 0.14, f[2] * 4, 0.36, -0.3, 1.2); } catch { /* noop */ }
  }

  /* --- the melody ---
     One phrase per two bars. Four notes, each held across a beat, taken
     from a contour and quantised to the chord so it never clashes. */
  if ((bar % 2 === 0 || Math.random() < 0.22) && beat === 1) {
    const phrase = PHRASES[bar % PHRASES.length];
    const rootDeg = L.chordRoot ?? 0;
    for (let i = 0; i < phrase.length; i++) {
      const at2 = at + i * p.beat * 0.78;
      const semi = deg(p.mode, rootDeg + phrase[i] + 7);
      const freq = p.root * Math.pow(2, semi / 12);
      const dur = p.beat * (i === phrase.length - 1 ? 1.9 : 0.86);
      const vel = (0.9 - i * 0.08) * (1 - (bar % 2) * 0.35) + L.intensity * 0.14;
      try { reed(c, L, at2, freq, dur, Math.max(0.5, vel)); } catch { /* noop */ }
    }
  }
}

function schedule() {
  const c = ctx;
  if (!c || !musicOn || !layers || ducked || c.state !== "running") return;
  const L = layers, p = L.preset, now = c.currentTime;
  if (L.nextAt < now) L.nextAt = now + 0.05;

  while (L.nextAt < now + 0.7) {
    scheduleBeat(c, L, L.nextAt);
    L.beatCount++;
    L.nextAt += p.beat * (0.985 + Math.random() * 0.03);
  }
}

/** Render the score for one mood into any context, from 0 to `seconds`, with
    no clock and no timers. Used by tools/preview-audio.js to audition a score
    offline; the app itself goes through setAmbience(). */
export function fillScore(c, kind, seconds) {
  const preset = PRESETS[kind] || PRESETS.camp;
  const L = makeLayers(c, preset);
  L.intensity = 0;
  /* the same 2.4 s fade-in the live score uses, so the render matches what a
     player actually hears when a scene opens */
  try {
    const t0 = c.currentTime || 0;
    L.out.gain.setValueAtTime(0.0001, t0);
    L.out.gain.linearRampToValueAtTime(0.9, t0 + 1.4);
  } catch { /* noop */ }
  applyChord(c, L, 0, 0.05);
  let t = 0.05;
  while (t < seconds) {
    scheduleBeat(c, L, t);
    L.beatCount++;
    t += preset.beat;
  }
  return L;
}

function startScheduler() {
  if (scheduler) return;
  if (layers) layers.nextAt = 0;
  scheduler = setInterval(schedule, 180);
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
    l.out.gain.linearRampToValueAtTime(0.0001, now + 1.4);
  } catch { /* noop */ }
  setTimeout(() => disposeLayers(l), 1600);
}

function disposeLayers(l) {
  if (!l) return;
  for (const o of l.sources) { try { o.stop(); } catch { /* already stopped */ } }
  for (const n of [l.out, l.bus, l.conv, l.wet, l.wetLp, l.droneGain, l.padGain, l.padFilter, l.bassGain]) {
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
  if (layers) fadeOutLayers(layers);           // 1.4 s crossfade, not a cut
  /* Building the layer graph is the one place a context that survived a long
     suspend can throw (InvalidStateError). Never let that escape into a render
     or a tap handler — a silent score is infinitely better than a dead screen. */
  try { layers = makeLayers(c, preset); } catch { layers = null; currentKind = null; return; }
  layers.intensity = intensity;
  applyChord(c, layers, 0, c.currentTime);
  try {
    const now = c.currentTime;
    layers.out.gain.setValueAtTime(0.0001, now);
    layers.out.gain.linearRampToValueAtTime(ducked ? 0.0001 : 0.9, now + 2.4);   // fade in under the first line
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
    layers.out.gain.linearRampToValueAtTime(ducked ? 0.0001 : 0.9, now + 0.45);
  } catch { /* noop */ }
}
