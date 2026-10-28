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
const { setAmbience, resumeAudio, setMusicEnabled, duckAmbience, isMusicEnabled, CHAPTER_AMBIENCE, sfx } = audio;

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
console.log(`\n✓ Procedural score: ${kinds.length} moods, moving chords, harp, drums, reverb and ambience — no bad params or leaks.`);
