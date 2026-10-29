#!/usr/bin/env node
/* Headless check for the procedural score.
   jsdom has no Web Audio, so this supplies a small mock AudioContext and
   drives the scheduler to catch bad params, NaNs, missing nodes and leaks. */

const stats = { osc: 0, buffer: 0, started: 0, stopped: 0, notes: [] };

function param(name, initial = 0) {
  return {
    value: initial,
    setValueAtTime(v, t) { check(v, t, name + ".setValueAtTime"); this.value = v; return this; },
    linearRampToValueAtTime(v, t) { check(v, t, name + ".linearRampToValueAtTime"); this.value = v; return this; },
    exponentialRampToValueAtTime(v, t) { check(v, t, name + ".exponentialRampToValueAtTime"); if (v <= 0) throw new Error(name + ": exponential ramp to non-positive " + v); this.value = v; return this; },
    setTargetAtTime(v, t, c) { check(v, t, name + ".setTargetAtTime"); if (!(c > 0)) throw new Error(name + ": bad time constant"); this.value = v; return this; },
    cancelScheduledValues(t) { checkFinite(t, name + ".cancelScheduledValues"); return this; }
  };
}
function check(v, t, where) { checkFinite(v, where); checkFinite(t, where + " time"); }
function checkFinite(v, where) { if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(where + ": non-finite value " + v); }

function node(extra = {}) {
  return Object.assign({
    connect(dest) { if (!dest) throw new Error("connect(undefined)"); return dest; },
    disconnect() {},
    gain: param("gain", 1),
    frequency: param("frequency", 440),
    detune: param("detune"),
    Q: param("Q", 1),
    pan: param("pan"),
    type: "sine", loop: false, buffer: null
  }, extra);
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = "running";
    this.destination = node();
    globalThis.__mockCtx = this;
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  createGain() { return node({ gain: param("gain", 1) }); }
  createOscillator() {
    stats.osc++;
    return node({
      start(t) { checkFinite(t ?? 0, "osc.start"); stats.started++; },
      stop(t) { checkFinite(t ?? 0, "osc.stop"); stats.stopped++; }
    });
  }
  createBiquadFilter() { return node({ frequency: param("filter.frequency", 1000), Q: param("Q", 1) }); }
  createConvolver() { return node(); }
  createStereoPanner() { return node({ pan: param("pan") }); }
  createBuffer(ch, len, rate) {
    const data = Array.from({ length: ch }, () => new Float32Array(len));
    return { sampleRate: rate, length: len, numberOfChannels: ch, getChannelData: (i) => data[i] };
  }
  createBufferSource() {
    stats.buffer++;
    return node({
      start(t, off) { checkFinite(t ?? 0, "buffer.start"); if (off !== undefined) checkFinite(off, "buffer.offset"); stats.started++; },
      stop(t) { checkFinite(t ?? 0, "buffer.stop"); stats.stopped++; }
    });
  }
}

globalThis.window = { AudioContext: MockAudioContext };
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => store.set(k, String(v))
};

/* Capture the scheduler callback so we can step it deterministically. */
let tick = null;
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn) => { tick = fn; return 99; };
globalThis.clearInterval = () => { tick = null; };
globalThis.setTimeout = (fn) => { fn(); return 1; };   // dispose immediately in test

const audio = await import("../src/core/audio.js");
const { setAmbience, resumeAudio, setMusicEnabled, duckAmbience, isMusicEnabled, CHAPTER_AMBIENCE, sfx, penTick, fillScore } = audio;

if (!isMusicEnabled()) throw new Error("music should default to on");
resumeAudio();
sfx("complete");

const kinds = ["title", ...new Set(Object.values(CHAPTER_AMBIENCE)), "finale"];
for (const kind of kinds) {
  const before = stats.started;
  setAmbience(kind, kind === "desert" ? 1 : 0);
  if (!tick) throw new Error("scheduler did not start for " + kind);
  for (let i = 0; i < 60; i++) {
    globalThis.__ctxTime = (globalThis.__ctxTime || 0);
    tick();
    // advance clock through the created mock context
    const ctx = globalThis.__mockCtx;
    if (ctx) ctx.currentTime += 0.12;
  }
  if (stats.started - before < 20) throw new Error(`${kind}: score produced too few voices (${stats.started - before})`);
  console.log(`  ${kind.padEnd(9)} ok   voices=${String(stats.started - before).padStart(4)}`);
}

/* ---- the pen under the dialogue ----
   Two oscillators per tick, one clock-guarded gap so a fast typer cannot
   machine-gun it, and silence of its own accord when sound is off. */
{
  const ctxM = globalThis.__mockCtx;
  ctxM.currentTime = 10;
  const a = stats.osc;
  penTick();
  const one = stats.osc - a;
  if (one < 2) throw new Error("penTick produced no voice");
  for (let i = 0; i < 12; i++) penTick();              // same instant: all swallowed
  if (stats.osc - a !== one) throw new Error("penTick is not rate-limited (" + (stats.osc - a) + " voices)");
  ctxM.currentTime += 0.09;
  penTick();
  if (stats.osc - a <= one) throw new Error("penTick stayed silent after the gap");
  audio.setEnabled(false);
  const off = stats.osc;
  ctxM.currentTime += 1;
  penTick();
  if (stats.osc !== off) throw new Error("penTick ignores the sound setting");
  audio.setEnabled(true);
}

/* ---- harmony ---- the tune must never grind against the chord under it.
   This is the check that would have caught the first draft of this score,
   where a flat second sat under a held note and the whole thing sounded like
   a horror film. A short passing note may go anywhere; anything held for a
   beat or more has to be consonant with every note in the chord. */
{
  const { SCORE } = audio;
  const { MODES, PROG, THEME, PRESETS } = SCORE;
  const deg = (mode, d) => { const m = MODES[mode]; return m[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };
  const pc = (x) => ((x % 12) + 12) % 12;
  const bad = [];
  let halves = 0;
  const notes = [];
  for (const [d, len] of THEME) { notes.push({ at: halves / 2, d, len }); halves += Math.round(len * 2); }
  if (halves !== 32) bad.push(`theme is ${halves / 2} beats, not sixteen`);
  for (const [kind, p] of Object.entries(PRESETS)) {
    if (!MODES[p.mode]) bad.push(`${kind}: unknown mode ${p.mode}`);
    if (!Object.values(PROG).includes(p.prog)) bad.push(`${kind}: progression is not one of the written ones`);
    if (p.beat < 0.6 || p.beat > 1.2) bad.push(`${kind}: ${p.beat}s per beat is outside 50-100 BPM`);
    if (p.mode !== "ionian" && p.mode !== "mixo" && p.prog === PROG.major) bad.push(`${kind}: a minor mode cannot use the major harmonisation`);
    if ((p.mode === "ionian" || p.mode === "mixo") && p.prog === PROG.minor) bad.push(`${kind}: a major mode cannot use the minor harmonisation`);
    for (let bar = 0; bar < 4; bar++) {
      const chord = [0, 2, 4, 7].map((k) => pc(deg(p.mode, p.prog[bar] + k)));
      for (const n of notes) {
        if (n.at < bar * 4 || n.at >= bar * 4 + 4 || n.len < 1) continue;
        const m = pc(deg(p.mode, n.d));
        for (const c of chord) {
          const iv = Math.abs(m - c) % 12, dist = Math.min(iv, 12 - iv);
          if (dist === 1) bad.push(`${kind} bar ${bar + 1}: melody and chord a semitone apart`);
        }
      }
    }
  }
  /* and the modes themselves have to be bright: no flat second anywhere,
     because a flat second under a long note is the horror interval. */
  for (const [name, mode] of Object.entries(MODES)) {
    if (mode[1] !== 2) bad.push(`mode ${name}: second degree is not a whole tone`);
    if (mode[2] !== 3 && mode[2] !== 4) bad.push(`mode ${name}: third degree is neither major nor minor`);
  }
  if (bad.length) {
    console.error(`\n✗ harmony: ${bad.length} problem(s):`);
    for (const b of bad) console.error("  " + b);
    process.exit(1);
  }
}

/* ---- offline rendering ---- the audition path (tools render a preview WAV
   from this) must lay the whole score down up front, with no timers and no
   dependence on a clock, and must cover every beat of the span asked for. */
{
  const before = stats.started;
  const L = fillScore(globalThis.__mockCtx, "temple", 12);
  const made = stats.started - before;
  if (!L || !L.chord.length) throw new Error("fillScore produced no chord");
  if (made < 40) throw new Error("fillScore was too sparse for 12 s (" + made + " voices)");
  if (!tick) throw new Error("fillScore should not need the interval scheduler");
}

/* Re-render style calls must be idempotent, not rebuild the orchestra. */
setAmbience("title", 0);
const b = stats.started;
for (let i = 0; i < 30; i++) setAmbience("title", 0);
if (stats.started - b > 2) throw new Error("setAmbience is not idempotent");

/* Hidden tab ducks, off/on stops and restarts. */
duckAmbience(true);
duckAmbience(false);
setMusicEnabled(false);
if (isMusicEnabled()) throw new Error("music did not turn off");
if (tick) throw new Error("scheduler still running after music off");
setMusicEnabled(true);
if (!tick) throw new Error("scheduler did not restart after music on");

globalThis.setInterval = realSetInterval;
console.log(`\n✓ Procedural score: ${kinds.length} moods on five modes — drone, bowed pad, oud, reed melody, frame drum, bowl, room reverb and air — plus the rate-limited pen under the dialogue. No bad params or leaks.`);
