#!/usr/bin/env node
/* Render the procedural score to a WAV so it can be auditioned on a phone.

   The app synthesises everything at runtime; there is nothing to listen to in
   a headless sandbox. This drives the same scheduling code through an offline
   Web Audio context and writes what a player would hear.

   Needs an optional dev dependency (not installed by `npm ci`):
     npm install --no-save web-audio-engine
   Then:
     node tools/render-score.js                 # title, valley, desert, the pen
     node tools/render-score.js night sea 20    # any moods, N seconds each

   Output: _audio_preview/Covenant-score-preview.wav (git-ignored). */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SR = 44100;

let wae;
try { wae = await import("web-audio-engine"); }
catch {
  console.error("This needs the optional dev dependency:\n  npm install --no-save web-audio-engine");
  process.exit(1);
}

const { fillScore } = await import(path.join(ROOT, "src/core/audio.js"));

const args = process.argv.slice(2);
const isNum = (a) => a !== "" && Number.isFinite(Number(a));
const last = args.at(-1);
const seconds = isNum(last) ? Number(last) : 14;
const kinds = args.filter((a) => !isNum(a));
const plan = (kinds.length ? kinds : ["title", "valley", "desert"]).map((k) => [k, seconds]);

function encode(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return b;
}

async function score(kind, secs) {
  const c = new wae.OfflineAudioContext(2, SR * secs, SR);
  fillScore(c, kind, secs);
  const b = await c.startRendering();
  const out = new Float32Array(SR * secs);
  for (let i = 0; i < out.length; i++) out[i] = (b.getChannelData(0)[i] + b.getChannelData(1)[i]) / 2;
  return out;
}

/* The pen under a line of dialogue, rendered over a chapter's score so the
   balance between the two can be judged together. */
async function withPen(kind, secs) {
  const base = await score(kind, secs);
  const off = new wae.OfflineAudioContext(2, SR * secs, SR);
  let clock = 0;
  const proxy = new Proxy(off, {
    get(t, k) {
      if (k === "currentTime") return clock;
      if (k === "state") return "running";
      const v = t[k];
      return typeof v === "function" ? v.bind(t) : v;
    }
  });
  const realWindow = globalThis.window;
  globalThis.window = { AudioContext: function () { return proxy; } };
  const { penTick } = await import(path.join(ROOT, "src/core/audio.js"));
  for (let t = 1; t < secs - 1.5; t += 0.018) { clock = t; penTick(); }   // the typing interval
  const b = await off.startRendering();
  globalThis.window = realWindow;
  for (let i = 0; i < base.length; i++) base[i] += (b.getChannelData(0)[i] + b.getChannelData(1)[i]) / 2;
  return base;
}

const parts = [];
for (const [kind, secs] of plan) {
  const audio = await score(kind, secs);
  let peak = 0;
  for (const v of audio) peak = Math.max(peak, Math.abs(v));
  console.log(`${kind.padEnd(9)} ${String(secs).padStart(3)}s  peak ${peak.toFixed(3)}`);
  parts.push(audio, new Float32Array(Math.round(SR * 1.1)));
}
const pen = await withPen(plan[0][0], 11);
parts.push(pen);

const total = parts.reduce((n, p) => n + p.length, 0);
const joined = new Float32Array(total);
let o = 0;
for (const p of parts) { joined.set(p, o); o += p.length; }

/* Bring the whole reel up to a listenable level on a phone speaker. The live
   score is deliberately quiet under dialogue; this is an audition, not a mix. */
let peak = 0;
for (const v of joined) peak = Math.max(peak, Math.abs(v));
const gain = peak > 0.85 ? 0.85 / peak : peak > 0 ? 0.85 / peak : 1;
for (let i = 0; i < joined.length; i++) joined[i] *= gain;

const dir = path.join(ROOT, "_audio_preview");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "Covenant-score-preview.wav");
fs.writeFileSync(file, encode(joined));
console.log(`\n${file}\n${(total / SR).toFixed(0)}s · gain ×${gain.toFixed(2)} · ${(fs.statSync(file).size / 1e6).toFixed(1)} MB`);
