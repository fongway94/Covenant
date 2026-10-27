/* Procedural sound effects via Web Audio — no audio files, works offline. */

let ctx = null;
let enabled = true;

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
