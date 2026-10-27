/* Covenant action-scene engine.
   A tiny canvas game loop shared by ten story-specific interactive scenes.
   No images, no dependencies: every sprite is drawn with vector shapes so the
   whole engine works offline and inside the single-file build. */

import { sfx } from "../core/audio.js";
import { tx } from "../core/i18n.js";
import { GAMES } from "./games.js";

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* --------------------------------------------------- painterly backdrops */
/* Every action scene is layered over the chapter's generated artwork. The
   image is cached once, panned slowly for parallax, then graded with a
   vignette, warm light rays and weather so the vector sprites stay readable. */
const ART_CACHE = new Map();

export function loadArt(src) {
  if (!src || typeof Image === "undefined") return null;
  if (ART_CACHE.has(src)) return ART_CACHE.get(src);
  let img = null;
  try { img = new Image(); img.src = src; } catch { img = null; }
  ART_CACHE.set(src, img);
  return img;
}

export function drawBackdrop(c, ctx, src, opts = {}) {
  const { w, h, t } = c;
  const alpha = opts.alpha ?? 0.5;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, opts.top || "#162a38");
  g.addColorStop(1, opts.bottom || "#0b141c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  const img = loadArt(src);
  if (img && img.complete && img.naturalWidth > 0) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * 1.08;
    const dw = iw * scale, dh = ih * scale;
    const dx = (w - dw) / 2 + Math.sin(t * 0.18) * 7;
    const dy = (h - dh) / 2 + Math.sin(t * 0.13) * 5;
    try { ctx.drawImage(img, dx, dy, dw, dh); } catch { /* not loaded yet */ }
  }

  // colour grade so bright artwork never drowns the sprites
  ctx.fillStyle = `rgba(8,16,23,${alpha})`;
  ctx.fillRect(0, 0, w, h);

  // warm volumetric rays from the upper-left
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 3; i++) {
    const x = w * (0.16 + i * 0.28) + Math.sin(t * 0.4 + i) * 14;
    const rg = ctx.createLinearGradient(x, 0, x + 80, h * 0.8);
    rg.addColorStop(0, "rgba(247,221,165,.11)");
    rg.addColorStop(1, "rgba(247,221,165,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(x - 26, 0); ctx.lineTo(x + 34, 0);
    ctx.lineTo(x + 128, h * 0.9); ctx.lineTo(x + 50, h * 0.9); ctx.fill();
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.16, w / 2, h * 0.5, h * 0.78);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(3,8,12,.68)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  drawWeather(c, ctx, opts.weather);
}

export function drawWeather(c, ctx, kind) {
  if (!kind) return;
  const { w, h, t } = c;
  ctx.save();
  if (kind === "sand" || kind === "petals" || kind === "leaves" || kind === "rain") {
    const n = kind === "rain" ? 60 : 42;
    for (let i = 0; i < n; i++) {
      const seed = i * 13.37;
      let x, y, len, col;
      if (kind === "rain") {
        x = (seed * 7 + t * 40) % (w + 40) - 20;
        y = (seed * 23 + t * 560) % (h + 60) - 30;
        len = 13; col = "rgba(170,205,225,.28)";
      } else if (kind === "sand") {
        x = (seed * 11 + t * 170) % (w + 60) - 30;
        y = (seed * 17 + Math.sin(t + i) * 8) % h;
        len = 8; col = "rgba(231,197,140,.24)";
      } else {
        x = (seed * 9 + t * 34 + Math.sin(t + i) * 22) % (w + 40) - 20;
        y = (seed * 19 + t * 42) % (h + 40) - 20;
        len = 5; col = kind === "leaves" ? "rgba(146,181,120,.32)" : "rgba(247,221,165,.35)";
      }
      ctx.strokeStyle = col; ctx.lineWidth = kind === "petals" || kind === "leaves" ? 2 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + (kind === "rain" ? -5 : len), y + (kind === "petals" || kind === "leaves" ? 7 : len * 0.7));
      ctx.stroke();
    }
  } else if (kind === "bubbles") {
    for (let i = 0; i < 26; i++) {
      const x = (i * 71.3 + Math.sin(t + i) * 12) % w;
      const y = (h - ((t * (18 + i % 5 * 6) + i * 37) % (h + 40)));
      ctx.strokeStyle = "rgba(180,230,225,.28)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 4), 0, TAU); ctx.stroke();
    }
  } else if (kind === "embers") {
    for (let i = 0; i < 22; i++) {
      const x = (i * 53.7 + Math.sin(t * 0.8 + i) * 20) % w;
      const y = h - ((t * (22 + i % 4 * 9) + i * 29) % h);
      ctx.fillStyle = `rgba(247,190,105,${0.15 + (i % 5) * 0.06})`;
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/** A ground shadow shared by every sprite — instant depth. */
export function shadow(ctx, x, y, rx = 13, ry = 4, alpha = 0.34) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(3,8,12,${alpha})`);
  g.addColorStop(1, "rgba(3,8,12,0)");
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------- drawing kit */

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function star(ctx, x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/** A small pilgrim: robe, hood, staff, animated walking legs. */
export function pilgrim(ctx, x, y, s = 1, phase = 0, dir = 1, alpha = 1, glow = false) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(dir * s, s); ctx.globalAlpha = alpha;
  if (glow) {
    const g = ctx.createRadialGradient(0, -18, 2, 0, -18, 34);
    g.addColorStop(0, "rgba(244,215,155,.35)"); g.addColorStop(1, "rgba(244,215,155,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -18, 34, 0, TAU); ctx.fill();
  }
  const sw = Math.sin(phase * 9) * 3.2;
  shadow(ctx, 0, 3, 15, 4, 0.42);
  ctx.strokeStyle = "#2a2118"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-4 + sw, 2); ctx.moveTo(3, -9); ctx.lineTo(4 - sw, 2); ctx.stroke();
  // cape, fluttering behind
  ctx.fillStyle = "#20333d";
  ctx.beginPath(); ctx.moveTo(-6, -29); ctx.quadraticCurveTo(-13 - Math.sin(phase * 7) * 3, -18, -9, -6);
  ctx.lineTo(-3, -9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1b2a33";
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(9, -28); ctx.lineTo(-9, -28); ctx.closePath(); ctx.fill();
  // rim light on the leading edge
  ctx.strokeStyle = "rgba(247,221,165,.42)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(8.5, -27); ctx.lineTo(7, -10); ctx.stroke();
  ctx.fillStyle = "#c9a45c";
  ctx.beginPath(); ctx.ellipse(0, -34, 7.2, 8.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#14202a";
  ctx.beginPath(); ctx.arc(0, -36, 8.2, Math.PI, TAU); ctx.lineTo(8.2, -32); ctx.lineTo(-8.2, -32); ctx.fill();
  ctx.fillStyle = "rgba(255,240,205,.55)";
  ctx.beginPath(); ctx.arc(3.2, -33, 1.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8d6b3f"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10, -42); ctx.stroke();
  ctx.fillStyle = "#f4d79b"; ctx.beginPath(); ctx.arc(10, -43, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}

/** A named NPC for the adventure hub: robe colour, headscarf, walking bob. */
export function npc(ctx, x, y, o = {}) {
  const s = o.s ?? 1, phase = o.phase ?? 0, robe = o.robe || "#3c6070";
  const head = o.head || "#c9a45c", cloth = o.cloth || "#14202a";
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 3, 16, 4.5, 0.4);
  const bob = Math.sin(phase * 2.2) * 1.6;
  ctx.translate(0, bob);
  ctx.fillStyle = robe;
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-7, -30); ctx.lineTo(7, -30); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(247,221,165,.3)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-7, -29); ctx.lineTo(-8, -2); ctx.stroke();
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.ellipse(0, -36, 7.4, 8.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = cloth;
  ctx.beginPath(); ctx.arc(0, -38, 8.6, Math.PI, TAU); ctx.lineTo(8.6, -34); ctx.lineTo(-8.6, -34); ctx.fill();
  ctx.fillStyle = "rgba(255,240,205,.6)";
  ctx.beginPath(); ctx.arc(3, -35, 1.4, 0, TAU); ctx.fill();
  if (o.glow) {
    const rg = ctx.createRadialGradient(0, -20, 2, 0, -20, 40);
    rg.addColorStop(0, o.glow); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -20, 40, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function lion(ctx, x, y, s = 1, face = 1, alpha = 1, awake = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#7a5a2c";
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(19, -9, 12, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#a97f3d";
  ctx.beginPath(); ctx.arc(19, -12, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3a2a17";
  ctx.beginPath(); ctx.arc(14, -14, 2.2, 0, TAU); ctx.arc(25, -14, 2.2, 0, TAU); ctx.fill();
  if (awake) {
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath(); ctx.arc(14, -14, 1.5, 0, TAU); ctx.arc(25, -14, 1.5, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "#6b4c22"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-22, 4); ctx.quadraticCurveTo(-34, -6, -30, -18); ctx.stroke();
  ctx.fillStyle = "#4a3418";
  for (let i = -18; i < 18; i += 9) { ctx.beginPath(); ctx.ellipse(i, 12, 4, 3, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function pig(ctx, x, y, s = 1, phase = 0) {
  ctx.save(); ctx.translate(x, y + Math.sin(phase * 8) * 1.5); ctx.scale(s, s);
  ctx.fillStyle = "#a9726b";
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 11, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -3, 8, 0, TAU); ctx.fill();
  ctx.fillStyle = "#7d5350";
  ctx.beginPath(); ctx.ellipse(18, -1, 4, 3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(12, -15); ctx.lineTo(15, -9); ctx.fill();
  ctx.fillStyle = "#2a1a1a"; ctx.beginPath(); ctx.arc(15, -5, 1.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#6f4744"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-5, 13); ctx.moveTo(7, 8); ctx.lineTo(7, 13); ctx.stroke();
  ctx.restore();
}

export function coin(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.25, Math.abs(Math.cos(t * 3))), 1);
  ctx.fillStyle = "#f0c46a"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8a642a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#8a642a"; ctx.font = `bold ${r * 1.2}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("✦", 0, 0); ctx.restore();
}

export function giant(ctx, x, y, s = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#2b3540";
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-13, -48); ctx.lineTo(13, -48); ctx.lineTo(18, 0); ctx.fill();
  ctx.fillStyle = "#c8a06a"; ctx.beginPath(); ctx.arc(0, -60, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2b3540"; ctx.beginPath(); ctx.arc(0, -65, 12, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = "#e9c47f";
  ctx.beginPath(); ctx.arc(0, -70, 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#c8a06a"; ctx.lineWidth = 5; ctx.lineCap = "round";
  const a = Math.sin(t * 2) * 0.15;
  ctx.beginPath(); ctx.moveTo(-13, -44); ctx.lineTo(-27, -30 + a * 10); ctx.moveTo(13, -44); ctx.lineTo(28, -34 - a * 10); ctx.stroke();
  ctx.strokeStyle = "#8e949c"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(28, -60); ctx.lineTo(30, 4); ctx.stroke();
  ctx.restore();
}

export function boat(ctx, x, y, s, roll, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(roll); ctx.scale(s, s);
  ctx.fillStyle = "#5a3d24";
  ctx.beginPath(); ctx.moveTo(-58, -6); ctx.lineTo(58, -6); ctx.lineTo(42, 20); ctx.lineTo(-42, 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#c9a45c"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#eee0c1";
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -64); ctx.lineTo(38 + Math.sin(t * 4) * 3, -14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#8d6b3f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(0, 12); ctx.stroke();
  ctx.fillStyle = "#1b2a33"; ctx.beginPath(); ctx.ellipse(-34, -14, 8, 6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export function scepter(ctx, x, y, up, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(up ? -0.12 : 1.15 + Math.sin(t * 2) * 0.03);
  ctx.strokeStyle = "#f0c46a"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -78); ctx.stroke();
  ctx.fillStyle = "#ffdd8a"; ctx.beginPath(); ctx.arc(0, -82, 7, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------- scene loop */

export function startScene(canvas, key, onResult, seed = {}) {
  const game = GAMES[key] || GAMES.sling;
  let ctx = null;
  try { ctx = canvas.getContext && canvas.getContext("2d"); } catch { /* jsdom */ }
  if (!ctx) {
    /* No canvas (jsdom / very old browser): stay skippable, never crash. */
    return { stop() {}, skip() { onResult({ score: 0, success: false, skipped: true }); } };
  }

  let alive = true, raf = null, last = 0, ended = false;
  let font = "system-ui, sans-serif";
  try { font = (typeof getComputedStyle === "function" && getComputedStyle(document.body).fontFamily) || font; } catch { /* noop */ }
  const pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  const keys = new Set();
  const particles = [], floats = [];

  const c = {
    w: 0, h: 0, t: 0, dt: 0.016, game, pointer, keys, particles, floats, font, hudTop: 112,
    hearts: 3, maxHearts: 3, score: 0, progress: 0, shake: 0, flash: 0,
    hint: "", label: "", state: {}, shared: { ...seed },
    rnd, clamp, dist,
    spark(x, y, color = "#f4d79b", n = 12, speed = 130) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), sp = rnd(speed * 0.3, speed);
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rnd(0.4, 0.9), max: 0.9, r: rnd(1.5, 4), color });
      }
    },
    float(x, y, text, color = "#f4d79b") { floats.push({ x, y, text, color, life: 1.1 }); },
    bump(n = 8) { c.shake = Math.max(c.shake, n); c.flash = 0.25; },
    hit(name) { try { sfx(name); } catch { /* noop */ } },
    hurt(n = 1) {
      c.hearts = Math.max(0, c.hearts - n); c.bump(10); c.hit("miss");
      c.float(c.w / 2, c.h * 0.42, tx("-1 ♥", "-1 ♥"), "#e08b78");
      if (c.hearts <= 0) c.end(false, Math.round(c.score));
    },
    addScore(n) { c.score += n; },
    setHint(s) { c.hint = s; },
    end(success, score) {
      if (ended) return;
      ended = true; alive = false;
      c.score = Math.max(0, Math.round(score ?? c.score));
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      detach();
      c.hit(success ? "complete" : "miss");
      onResult({ score: c.score, success: !!success, skipped: false });
    }
  };

  function resize() {
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const r = canvas.getBoundingClientRect();
    c.w = Math.max(240, r.width || canvas.clientWidth || 360);
    c.h = Math.max(320, r.height || canvas.clientHeight || 520);
    canvas.width = Math.round(c.w * dpr);
    canvas.height = Math.round(c.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function down(e) {
    e.preventDefault?.();
    const p = pos(e); pointer.x = p.x; pointer.y = p.y;
    pointer.startX = p.x; pointer.startY = p.y; pointer.dx = 0; pointer.dy = 0;
    pointer.down = true; pointer.justDown = true;
    game.onDown?.(c, pointer);
  }
  function move(e) {
    if (!pointer.down && !pointer.x) return;
    e.preventDefault?.();
    const p = pos(e);
    pointer.x = p.x; pointer.y = p.y;
    pointer.dx = pointer.x - pointer.startX; pointer.dy = pointer.y - pointer.startY;
    game.onMove?.(c, pointer);
  }
  function up(e) {
    e.preventDefault?.();
    if (e.changedTouches?.[0]) { const p = pos(e); pointer.x = p.x; pointer.y = p.y; }
    pointer.down = false; pointer.justUp = true;
    game.onUp?.(c, pointer);
  }
  function keydown(e) {
    keys.add(e.key.toLowerCase());
    if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(e.key.toLowerCase())) e.preventDefault?.();
    game.onKey?.(c, e.key.toLowerCase(), true);
  }
  function keyup(e) { keys.delete(e.key.toLowerCase()); game.onKey?.(c, e.key.toLowerCase(), false); }

  function attach() {
    canvas.addEventListener("pointerdown", down, { passive: false });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    canvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up, { passive: false });
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("resize", resize);
  }
  function detach() {
    canvas.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    canvas.removeEventListener("touchstart", down);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", up);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("resize", resize);
  }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.life -= dt; f.y -= 28 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
    c.shake = Math.max(0, c.shake - dt * 34);
    c.flash = Math.max(0, c.flash - dt * 1.6);
  }

  function drawFx() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.font = `bold 16px ${c.font}`;
    for (const f of floats) {
      ctx.globalAlpha = clamp(f.life / 1.1, 0, 1); ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function hud() {
    const { w, h } = c;
    ctx.save();
    // progress rail
    const top = c.hudTop || 14;
    ctx.fillStyle = "rgba(255,255,255,.13)"; roundRect(ctx, 14, top, w - 28, 5, 3); ctx.fill();
    ctx.fillStyle = "#f0c46a"; roundRect(ctx, 14, top, Math.max(4, (w - 28) * clamp(c.progress, 0, 1)), 5, 3); ctx.fill();
    // hearts
    ctx.font = `15px ${c.font}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let i = 0; i < c.maxHearts; i++) {
      ctx.fillStyle = i < c.hearts ? "#e08b78" : "rgba(255,255,255,.2)";
      ctx.fillText("♥", 16 + i * 19, top + 22);
    }
    // score
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(244,231,203,.85)"; ctx.font = `600 12px ${c.font}`;
    ctx.fillText(`${tx("SCORE", "得分")} ${c.score}`, w - 16, top + 22);
    // hint banner
    if (c.hint) {
      ctx.font = `500 13px ${c.font}`; ctx.textAlign = "center";
      const tw = ctx.measureText(c.hint).width;
      ctx.fillStyle = "rgba(11,20,28,.72)"; roundRect(ctx, w / 2 - tw / 2 - 14, h - 42, tw + 28, 28, 14); ctx.fill();
      ctx.fillStyle = "#f4e7cb"; ctx.fillText(c.hint, w / 2, h - 28);
    }
    ctx.restore();
  }

  function frame(ts) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts; c.t += dt; c.dt = dt;
    resizeIfNeeded();
    ctx.save();
    if (c.shake > 0) ctx.translate(rnd(-c.shake, c.shake), rnd(-c.shake, c.shake));
    try { game.step(c, dt); } catch (err) { if (typeof console !== "undefined") console.warn("[scene] step:", err); }
    updateFx(dt);
    ctx.clearRect(-40, -40, c.w + 80, c.h + 80);
    try { game.draw(c, ctx); } catch (err) { if (typeof console !== "undefined") console.warn("[scene] draw:", err); }
    drawFx();
    hud();
    ctx.restore();
    if (c.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${c.flash * 0.16})`; ctx.fillRect(0, 0, c.w, c.h); }
    pointer.justDown = false; pointer.justUp = false;
    if (alive && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
  }

  let sizeKey = "";
  function resizeIfNeeded() {
    const k = `${canvas.clientWidth}x${canvas.clientHeight}`;
    if (k !== sizeKey) { sizeKey = k; resize(); }
  }

  resize();
  attach();
  game.init(c);
  c.hint = game.hint(c);
  if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);

  return {
    scene: c,   // read-only-ish handle for debugging and automated visual checks
    stop() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); },
    skip() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); onResult({ score: 0, success: false, skipped: true }); }
  };
}

export function gameInfo(key) {
  const g = GAMES[key] || GAMES.sling;
  return { title: tx(g.titleEn, g.titleZh), prompt: tx(g.promptEn, g.promptZh), hint: tx(g.hintEn, g.hintZh) };
}
