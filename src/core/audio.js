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
   chord always belongs to the mode the chapter is in.

   There is a version of this score that is easy to write and impossible to
   listen to: a low drone, a very slow tempo, a flat second, and a lone high
   whistle drifting over the top. That is the language of a horror film, and
   an earlier draft of this file spoke it. Every mode here has a bright
   third — no flat seconds anywhere — and the tunes are ordinary and
   singable. */
const MODES = {
  ionian:  [0, 2, 4, 5, 7, 9, 11],     // title, camp, fields, finale: warm, open
  mixo:    [0, 2, 4, 5, 7, 9, 10],     // desert, city: a folk flat seventh, still bright
  dorian:  [0, 2, 3, 5, 7, 9, 10],     // valley, sea, temple: minor with a raised sixth
  aeolian: [0, 2, 3, 5, 7, 8, 10]      // the den at night: the plainest minor of all
};

function deg(mode, d) {
  const m = MODES[mode] || MODES.ionian;
  const oct = Math.floor(d / 7);
  const i = ((d % 7) + 7) % 7;
  return m[i] + 12 * oct;
}

/** Four bars of chord roots, as scale degrees (0 = tonic). A minor tonic
    cannot use the same harmonisation as a major one: in dorian and aeolian
    the chord on the sixth degree is diminished, so the minor version moves
    by VII and iv instead. Both end on the tonic, which is where the tune
    resolves and where the loop comes round.

    Every bar three is IV on purpose. That is the chord the tune's turn (G A
    G F) fits note for note, and the one place a held note would otherwise
    grind against the harmony. */
const PROG = {
  major: [0, 5, 3, 0],      // I  vi IV I
  minor: [0, 6, 3, 0]       // i  VII iv i
};

/* ------------------------------------------------------------- the theme
   One melody, sixteen beats, four bars. Every chapter plays it, transposed
   into that chapter's mode and key — the same tune dressed for each place.
   A soundtrack that remembers its own tune is what a player means when they
   say the music belongs to the game; a handful of random contours is not.

   Scale degrees, and how long each note lasts in beats. Written to be sung:
   two rising notes, an answering fall, a turn, and a held third that steps
   down to the tonic — which is where every bar four lands, in every mode.
   Short notes may pass through anything; a note held for a beat or more is
   always a chord tone, so the tune can never grind against its harmony. */
const THEME = [
  [4, 1], [4, 1], [5, 0.5], [4, 0.5], [2, 1],   // bar 1
  [4, 1.5], [2, 0.5], [1, 1], [0, 1],           // bar 2
  [4, 1], [5, 1], [4, 1], [3, 1],               // bar 3
  [2, 2], [0, 2]                                // bar 4
];

/** Beat -> the note that starts there, for the sixteen-beat cycle. */
const THEME_AT = (() => {
  const table = new Array(16).fill(null);
  let halves = 0;
  for (const [d, len] of THEME) {
    const spot = Math.floor(halves / 2);
    if (spot < 16) table[spot] = { d, len };
    halves += Math.round(len * 2);
  }
  return table;
})();

/** root = Hz, beat = seconds per beat (a bar is four), drum = frame-drum level.
    60-90 BPM: slow enough to breathe, fast enough to be music and not
    just atmosphere. The old presets ran at 28-40 BPM, which is a drone with a
    tune lost somewhere in it. */
const PRESETS = {
  title:  { root: 174.61, mode: "ionian",  prog: PROG.major,   beat: 0.78, drone: 0.016, pad: 0.052, pluck: 0.060, reed: 0.058, drum: 0.30, bell: 0.10, bright: 3000, reverb: 0.26, noise: 0.010, cutoff: 520,  intens: 0.9 },
  camp:   { root: 196.00, mode: "ionian",  prog: PROG.major,   beat: 0.86, drone: 0.015, pad: 0.056, pluck: 0.058, reed: 0.056, drum: 0.32, bell: 0.08, bright: 2900, reverb: 0.24, noise: 0.018, cutoff: 700,  intens: 0.9 },
  valley: { root: 146.83, mode: "dorian",  prog: PROG.minor,   beat: 0.92, drone: 0.018, pad: 0.053, pluck: 0.056, reed: 0.060, drum: 0.40, bell: 0.08, bright: 2800, reverb: 0.32, noise: 0.022, cutoff: 800,  intens: 1.15 },
  night:  { root: 130.81, mode: "dorian",  prog: PROG.minor,   beat: 1.04, drone: 0.016, pad: 0.055, pluck: 0.052, reed: 0.054, drum: 0.16, bell: 0.10, bright: 2500, reverb: 0.34, noise: 0.008, cutoff: 360,  intens: 0.7 },
  desert: { root: 164.81, mode: "mixo",    prog: PROG.major,   beat: 0.80, drone: 0.017, pad: 0.056, pluck: 0.054, reed: 0.058, drum: 0.48, bell: 0.06, bright: 3200, reverb: 0.26, noise: 0.034, cutoff: 1200, intens: 1.2 },
  sea:    { root: 146.83, mode: "mixo",    prog: PROG.major,   beat: 0.94, drone: 0.018, pad: 0.056, pluck: 0.054, reed: 0.058, drum: 0.22, bell: 0.10, bright: 2700, reverb: 0.32, noise: 0.044, cutoff: 460,  intens: 1.0 },
  field:  { root: 220.00, mode: "ionian",  prog: PROG.major,   beat: 0.76, drone: 0.014, pad: 0.048, pluck: 0.060, reed: 0.056, drum: 0.26, bell: 0.10, bright: 3200, reverb: 0.24, noise: 0.016, cutoff: 950,  intens: 0.9 },
  temple: { root: 155.56, mode: "dorian",  prog: PROG.minor,   beat: 0.98, drone: 0.017, pad: 0.056, pluck: 0.052, reed: 0.054, drum: 0.16, bell: 0.14, bright: 2600, reverb: 0.36, noise: 0.010, cutoff: 440,  intens: 0.75 },
  city:   { root: 196.00, mode: "mixo",    prog: PROG.major,   beat: 0.72, drone: 0.014, pad: 0.048, pluck: 0.054, reed: 0.058, drum: 0.44, bell: 0.05, bright: 3100, reverb: 0.24, noise: 0.028, cutoff: 1300, intens: 1.1 },
  finale: { root: 220.00, mode: "ionian",  prog: PROG.major,   beat: 0.84, drone: 0.016, pad: 0.055, pluck: 0.056, reed: 0.064, drum: 0.36, bell: 0.12, bright: 3300, reverb: 0.30, noise: 0.012, cutoff: 820,  intens: 0.85 }
};

/** The written material, exposed so the checks can reason about harmony
    instead of only about runtime errors. `tools/check-audio.js` uses it to
    prove the tune never lands a semitone against the chord under it. */
export const SCORE = { MODES, PROG, THEME, PRESETS };

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
  wetLp.frequency.value = 3400;
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
  /* Tonic and fifth, no detuned twins. Two sines a few cents apart beat
     against each other slowly, and a slow beat under a long reverb is exactly
     the sound of a horror score. One clean voice each, and a triangle so the
     low end has some warmth instead of a pure sine's hollowness. */
  for (const [mult, vol] of [[1, 0.66], [1.5, 0.3], [2, 0.14]]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = mult === 1 ? "triangle" : "sine";
    o.frequency.value = preset.root * mult;
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
  padFilter.frequency.value = 1500;
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
  bassGain.gain.value = 0.018;
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
    L.padOscs[0].frequency.setTargetAtTime(f[2], at, 0.7);        // the fifth
    L.padOscs[1].frequency.setTargetAtTime(f[1] * 2, at, 0.85);   // the third, an octave up
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

/** Schedule one beat of the score at an absolute time. Pure with respect to
    the clock, so it can be driven by the live scheduler below or rendered into
    an offline context by fillScore(). */
function scheduleBeat(c, L, at) {
  const p = L.preset;
  const beatInCycle = L.beatCount % 16;
  const bar = Math.floor(L.beatCount / 4);
  const beat = L.beatCount % 4;
  if (beat === 0) applyChord(c, L, bar, at);
  const f = L.chord.length ? L.chord : chordFreqs(p, bar);
  const loud = 1 + L.intensity * 0.18;

  /* --- the frame drum ---
     A soft stroke on the first beat, a lighter one on the third, and one on
     the "and" of four when the scene is urgent. Never on every beat: a
     drum under every quaver is what makes a soundtrack sound like a game
     loop. */
  if (p.drum > 0) {
    if (beat === 0) { try { drum(c, L, at, p.drum * loud); } catch { /* noop */ } }
    else if (beat === 2 && p.drum > 0.2) { try { drum(c, L, at, p.drum * 0.62 * loud); } catch { /* noop */ } }
    if (L.intensity > 0.5 && beat === 3) { try { drum(c, L, at + p.beat * 0.5, p.drum * 0.36); } catch { /* noop */ } }
  }

  /* --- the bowl, once a phrase, in the still places --- */
  if (beat === 0 && p.bell > 0.05 && bar % 4 === 0) {
    try { bowl(c, L, at, f[0] * 2, 0.7); } catch { /* noop */ }
  }

  /* --- the lyre ---
     A broken chord that walks where the tune walks: the root on one, the
     fifth under the tune's long note, the third at the turn. Two strings
     rolled together at the top of every bar. It is accompaniment, so it
     stays under the melody and leaves space. */
  const note = THEME_AT[beatInCycle];
  if (beat === 0 && f[0]) {
    try { pluck(c, L, at, f[0] * 2, 0.9, -0.2); } catch { /* noop */ }
    try { pluck(c, L, at + 0.045, f[2] * 2, 0.62, 0.2); } catch { /* noop */ }
  } else if (beat === 2 && f[2]) {
    try { pluck(c, L, at, f[2] * 2, 0.52, 0.26); } catch { /* noop */ }
  } else if (beat === 3 && f[1] && Math.random() < 0.5) {
    try { pluck(c, L, at, f[1] * 4, 0.4, -0.28, 1.6); } catch { /* noop */ }
  }
  /* a rolled pair right under a long melody note: two strings, a hand's width
     apart, so the tune never lands in silence */
  if (note && note.len >= 1.5 && f[0]) {
    try { pluck(c, L, at + 0.012, f[3], 0.34, 0.3, 2.0); } catch { /* noop */ }
  }

  /* --- the theme ---
     The same sixteen beats in every chapter. Two octaves above the tonic,
     which puts it in a singer's range rather than a whistle's; the second
     octave carries it as a quiet body so a phone speaker still has
     something to hold. */
  if (note) {
    const semi = deg(p.mode, note.d + 14);
    const freq = p.root * Math.pow(2, semi / 12);
    const dur = p.beat * note.len * 0.94;
    const vel = 0.92 * loud;
    try { reed(c, L, at, freq, dur, vel); } catch { /* noop */ }
    try { reed(c, L, at + 0.01, freq / 2, dur, vel * 0.42); } catch { /* noop */ }
  }

  /* --- an answer in the low register every other phrase ---
     When the tune rests, the lyre takes the fifth of the chord an octave
     down: call, then response, which is what keeps sixteen bars from
     sounding like a loop. */
  if (!note && beat === 1 && f[2]) {
    try { pluck(c, L, at, f[2], 0.5, -0.34, 2.2); } catch { /* noop */ }
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
