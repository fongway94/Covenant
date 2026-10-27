/* Covenant action-scene engine.
   A tiny canvas game loop shared by six story-specific interactive scenes.
   No images, no dependencies: every sprite is drawn with vector shapes so the
   whole engine works offline and inside the single-file build. */

import { sfx } from "../core/audio.js";
import { tx } from "../core/i18n.js";
import { GAMES } from "./games.js";

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

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
  ctx.strokeStyle = "#2a2118"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-4 + sw, 2); ctx.moveTo(3, -9); ctx.lineTo(4 - sw, 2); ctx.stroke();
  ctx.fillStyle = "#1b2a33";
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(9, -28); ctx.lineTo(-9, -28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c9a45c";
  ctx.beginPath(); ctx.ellipse(0, -34, 7.2, 8.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#14202a";
  ctx.beginPath(); ctx.arc(0, -36, 8.2, Math.PI, TAU); ctx.lineTo(8.2, -32); ctx.lineTo(-8.2, -32); ctx.fill();
  ctx.strokeStyle = "#8d6b3f"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10, -42); ctx.stroke();
  ctx.fillStyle = "#f4d79b"; ctx.beginPath(); ctx.arc(10, -43, 2.6, 0, TAU); ctx.fill();
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

export function startScene(canvas, key, onResult) {
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
    hint: "", label: "", state: {},
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
    stop() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); },
    skip() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); onResult({ score: 0, success: false, skipped: true }); }
  };
}

export function gameInfo(key) {
  const g = GAMES[key] || GAMES.sling;
  return { title: tx(g.titleEn, g.titleZh), prompt: tx(g.promptEn, g.promptZh), hint: tx(g.hintEn, g.hintZh) };
}
