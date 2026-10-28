/* Ten story-specific action scenes. Each one really controls a character:
   drag to aim / move / steer, tap to jump / bail, hold to advance.
   Every scene ends with c.end(success, score) and feeds back into the story. */

import { tx, isZh } from "../core/i18n.js";
import { clamp, rnd, dist, pilgrim, lion, pig, coin, giant, boat, scepter, star, roundRect,
  drawBackdrop, drawWeather, shadow, npc, actor, actorShadow, preloadSprites } from "./scene.js";
import { goldenHour, lightRays, softVignette } from "./visual.js";
import { withStages } from "./stages.js";

const TAU = Math.PI * 2;
/* stable pseudo-noise: the same index always gives the same stone or stem, so
   scenery does not shimmer between frames. */
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function bg(c, ctx, top, bottom, dust = 28) {
  if (c.game?.art) {
    drawBackdrop(c, ctx, c.game.art, { top, bottom, alpha: 0.44, weather: c.game.weather });
    goldenHour(c, ctx);
    lightRays(c, ctx, 1);
    softVignette(c, ctx, 0.3);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, c.h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
    drawWeather(c, ctx, c.game?.weather);
  }
  ctx.save();
  for (let i = 0; i < dust; i++) {
    const x = (i * 97.3 + c.t * (6 + (i % 4) * 3)) % c.w;
    const y = (i * 53.7 + Math.sin(c.t * 0.6 + i) * 12) % c.h;
    ctx.globalAlpha = 0.08 + (i % 5) * 0.025; ctx.fillStyle = "#f4d79b";
    ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function ground(ctx, c, y, color = "#23323b") {
  ctx.fillStyle = color; ctx.fillRect(0, y, c.w, c.h - y);
  ctx.strokeStyle = "rgba(240,196,106,.25)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.w, y); ctx.stroke();
}

function hills(ctx, c, y, color, off = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, c.h);
  for (let x = 0; x <= c.w + 20; x += 20) {
    ctx.lineTo(x, y + Math.sin((x + off) * 0.017) * 18 + Math.sin((x + off) * 0.041) * 9);
  }
  ctx.lineTo(c.w, c.h); ctx.closePath(); ctx.fill();
}

/** Body height that reads correctly whatever the phone, in CSS px. */
function bodyH(c, frac, lo, hi) { return clamp(c.h * frac, lo, hi); }

function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color.replace("ALPHA", String(alpha)));
  g.addColorStop(1, color.replace("ALPHA", "0"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* ---------------------------------------------------------------- 1. SLING */

/* Staging for the Elah valley. Painted sprites carry the performance; the
   layout lives in one place so the drawing, the aim and the hit test can never
   drift apart. */
function slingStage(c) {
  const groundY = c.h * 0.86;
  const dH = clamp(c.h * 0.33, 118, 250);   // David, in px of figure height
  // He is huge, but his helmet crest has to stay clear of the briefing card at
  // the top of the screen or the one target that matters is hidden behind it.
  const topSafe = Math.max(186, c.h * 0.23);
  const gH = clamp(Math.min(c.h * 0.60, groundY - topSafe), 200, 440);
  return {
    groundY, dH, gH,
    dx: c.w * 0.2,
    gx: c.w * 0.715,
    headY: groundY - gH * 0.9,              // where the stone has to land
    headR: clamp(gH * 0.07, 16, 26)
  };
}

/** Where the stone leaves David's hand. Reads off david-throw.png's pose. */
function slingHand(c) {
  const L = slingStage(c);
  return { x: L.dx + L.dH * 0.16, y: L.groundY - L.dH * 0.72, L };
}

const sling = {
  titleEn: "The Sling", titleZh: "甩石迎敌",
  promptEn: "Drag away from David to wind the sling, release to fire. Strike Goliath's forehead twice — mind the wind and his raised shield.",
  promptZh: "从大卫身后拖动蓄力，松手投石。命中歌利亚的额头两次——留意风和他举起的盾牌。",
  hintEn: "Drag to aim · Release to fire", hintZh: "拖动瞄准 · 松手投出",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    preloadSprites();
    c.state = {
      stones: clamp(c.shared?.stones ?? 5, 2, 5), hits: 0, shots: [], drag: null,
      wind: rnd(-42, 42), blocked: 0, dust: [],
      d: { throwT: 0, windup: 0, cheer: 0 },
      g: { shieldT: 0, shield: false, flash: 0, jolt: 0, pound: 0, fall: 0, fallen: false, t: 0 }
    };
    c.setHint(this.hint());
  },
  onDown(c, p) { if (c.state.g.fall <= 0) c.state.drag = { ox: p.startX, oy: p.startY, x: p.x, y: p.y }; },
  onMove(c, p) { if (c.state.drag) { c.state.drag.x = p.x; c.state.drag.y = p.y; } },
  onUp(c, p) {
    const s = c.state, d = s.drag;
    s.drag = null;
    if (!d || s.stones <= 0 || s.g.fall > 0) return;
    const vx = (d.ox - p.x) * 4.4, vy = (d.oy - p.y) * 4.4;
    if (Math.hypot(vx, vy) < 70) return;
    const hand = slingHand(c);
    s.shots.push({ x: hand.x, y: hand.y, vx, vy, life: 2.4, spin: 0 });
    s.stones--; s.d.throwT = 0.42;
    c.hit("throw"); c.spark(hand.x, hand.y, "#f4d79b", 7, 70);
    c.ring(hand.x, hand.y, "rgba(247,221,165,.35)", 26);
    // a puff of dust as he plants his feet
    for (let i = 0; i < 6; i++) s.dust.push({ x: hand.L.dx + rnd(-12, 12), y: hand.L.groundY, life: 0.5, r: rnd(3, 7) });
  },
  step(c, dt) {
    const s = c.state, g = s.g, L = slingStage(c);
    g.t += dt;
    /* ---------------------------------------------------- Goliath's turn */
    if (g.fall > 0) {
      // The giant topples. Nothing else moves until he is down.
      g.fall = Math.max(0, g.fall - dt);
      c.progress = 1;
      if (g.fall === 0) { c.end(true, c.score + 60); return; }
    } else {
      const want = Math.sin(g.t * 1.15) > 0.34;
      if (want !== g.shield) { g.shield = want; c.hit(want ? "tap" : "tap"); }
      g.shieldT += ((want ? 1 : 0) - g.shieldT) * Math.min(1, dt * 7);
      g.pound = Math.max(0, g.pound - dt);
      if (Math.floor((g.t - dt) / 3.6) !== Math.floor(g.t / 3.6)) {
        // he drives the spear butt into the dust — menace, not damage
        g.pound = 0.42;
        c.shake = Math.max(c.shake, 2.5);
        c.ring(L.gx - L.gH * 0.2, L.groundY, "rgba(214,196,158,.45)", 34);
        for (let i = 0; i < 5; i++) c.spark(L.gx - L.gH * 0.2 + rnd(-8, 8), L.groundY - 2, "#cbbd9c", 1, 40);
      }
      g.flash = Math.max(0, g.flash - dt * 2.5);
      g.jolt = Math.max(0, g.jolt - dt * 4);
      s.d.cheer = Math.max(0, s.d.cheer - dt * 1.5);
    }
    s.d.throwT = Math.max(0, s.d.throwT - dt);
    s.d.windup = s.drag
      ? Math.min(1, Math.hypot(s.drag.ox - s.drag.x, s.drag.oy - s.drag.y) / (c.w * 0.62))
      : Math.max(0, s.d.windup - dt * 3);

    for (let i = s.shots.length - 1; i >= 0; i--) {
      const b = s.shots[i];
      b.vx += s.wind * dt; b.vy += 260 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.spin += dt * 9;
      const hx = L.gx + Math.sin(g.t * 0.8) * 4, hy = L.headY;
      if (dist(b.x, b.y, hx, hy) < L.headR && g.fall <= 0) {
        s.shots.splice(i, 1);
        if (g.shieldT > 0.55) {
          s.blocked++;
          c.spark(hx + 18, hy + L.gH * 0.06, "#cdd6e0", 14, 130);
          c.ring(hx + 18, hy + L.gH * 0.06, "rgba(205,214,224,.6)", 34);
          c.float(hx, hy - 26, tx("BLOCKED!", "被盾挡住！"), "#cdd6e0"); c.hit("miss");
          g.shieldT = 0.9;
        } else {
          s.hits++; c.addScore(40); c.bump(12); c.hit("hit");
          c.spark(hx, hy, "#f4d79b", 26, 190);
          c.ring(hx, hy, "rgba(247,221,165,.8)", 60);
          g.flash = 1; g.jolt = 1;
          c.float(hx, hy - 26, tx("HIT!", "命中！"), "#f4d79b");
          if (s.hits >= 2) {
            // he does not simply vanish: he staggers, drops, and the ground shakes
            g.fall = 1.35; g.fallen = true;
            c.bump(16); c.hit("complete");
            c.ring(hx, hy, "rgba(224,139,120,.75)", 96);
            c.float(c.w / 2, c.h * 0.4, tx("THE GIANT FALLS", "巨人倒下"), "#f4d79b");
            for (let k = 0; k < 22; k++) c.spark(L.gx + rnd(-30, 30), L.groundY - rnd(0, 40), "#cbbd9c", 1, 120);
          }
        }
      } else if (b.life <= 0 || b.y > c.h + 20 || b.x > c.w + 30 || b.x < -30) s.shots.splice(i, 1);
    }
    for (let i = s.dust.length - 1; i >= 0; i--) {
      const d = s.dust[i]; d.life -= dt; d.r += dt * 26;
      if (d.life <= 0) s.dust.splice(i, 1);
    }

    c.progress = clamp(s.hits / 2, 0, 1);
    c.setHint(`${tx("Drag to aim · Release to fire", "拖动瞄准 · 松手投出")}   ${tx("Stones", "石子")} ${"●".repeat(s.stones)}`);
    if (g.fall <= 0 && s.stones <= 0 && s.shots.length === 0) c.end(false, c.score);
  },
  draw(c, ctx) {
    const s = c.state, g = s.g, L = slingStage(c), t = c.t;
    /* Warm earth, not cold slate: the valley artwork is golden-hour dust and a
       blue-green floor under it made the drawn ground look like water. */
    bg(c, ctx, "#1a2c3a", "#4a3a26", 34);
    star(ctx, c.w * 0.82, 42, 13, "#f4d79b", 0.5 + Math.sin(t * 2) * 0.12);
    hills(ctx, c, c.h * 0.58, "#3a3327", 40);
    hills(ctx, c, c.h * 0.7, "#312a20", 120);
    const gg = ctx.createLinearGradient(0, L.groundY, 0, c.h);
    gg.addColorStop(0, "rgba(64,50,32,.86)"); gg.addColorStop(1, "rgba(24,18,12,.97)");
    ctx.fillStyle = gg; ctx.fillRect(0, L.groundY, c.w, c.h - L.groundY);
    ctx.strokeStyle = "rgba(240,196,106,.22)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, L.groundY); ctx.lineTo(c.w, L.groundY); ctx.stroke();
    // dry grass on the valley floor
    ctx.strokeStyle = "rgba(214,196,158,.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const x = (i * 63) % c.w, y = L.groundY + 6 + (i % 4) * 11;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 6); ctx.stroke();
    }

    /* --------------------------------------------------- Goliath of Gath */
    const fall = g.fall > 0 ? 1 - g.fall / 1.35 : 0;              // 0 → 1
    const sway = Math.sin(g.t * 0.8) * 4;
    const breathe = 1 + Math.sin(g.t * 1.6) * 0.006;
    const poundDip = g.pound > 0 ? Math.sin((1 - g.pound / 0.42) * Math.PI) * 0.02 : 0;
    const gx = L.gx + sway - g.jolt * 12 - fall * 26;
    const gy = L.groundY + fall * 10 + g.pound * 6;
    glow(ctx, gx, L.headY, 86, "rgba(224,139,120,ALPHA)", g.flash * 0.42);
    actorShadow(ctx, gx, L.groundY + 2, L.gH * 0.24, 0.4);
    const rot = Math.sin(g.t * 0.55) * 0.008 + g.jolt * 0.05 - fall * 0.16;
    let drewG = false;
    const pose = { rot, squash: breathe };
    if (g.fall > 0) {
      // cross-fade into the stagger pose over the first quarter-second
      const k = Math.min(1, fall * 4);
      if (k < 1) drewG = actor(ctx, "goliath", gx, gy, L.gH * (1 + poundDip), { ...pose, alpha: 1 - k }) || drewG;
      drewG = actor(ctx, "goliathFall", gx - 6, gy, L.gH, { rot, alpha: k }) || drewG;
    } else {
      /* He does not glow behind a fake plate: he physically steps behind his
         shield. Two painted poses cross-fade in ~0.15s, so the guard reads as
         motion and the head target is genuinely covered. */
      const k = clamp(g.shieldT, 0, 1);
      if (k < 1) drewG = actor(ctx, "goliath", gx, gy, L.gH * (1 + poundDip), { ...pose, alpha: 1 - k }) || drewG;
      if (k > 0.01) drewG = actor(ctx, "goliathGuard", gx, gy, L.gH * (1 + poundDip), { ...pose, alpha: k }) || drewG;
    }
    if (!drewG) giant(ctx, gx, L.groundY, L.gH / 62, t);      // vector fallback

    // Aim reticle on the head — the one place a stone must land. Dimmed when
    // the shield covers it, so a shot into the guard is never a mystery.
    const openK = 1 - g.shieldT;
    if (g.fall <= 0) {
      const hx = gx + Math.sin(g.t * 0.8) * 4;
      ctx.save();
      ctx.globalAlpha = 0.22 + openK * 0.4;
      ctx.strokeStyle = openK > 0.5 ? "#f7dda5" : "#a9b6c4";
      ctx.lineWidth = 1.2;
      const r = L.headR * 1.75;
      for (let i = 0; i < 4; i++) {
        const a = i * (TAU / 4) + c.t * 0.35;
        ctx.beginPath(); ctx.arc(hx, L.headY, r, a, a + 0.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hx, L.headY, 2, 0, TAU);
      ctx.fillStyle = openK > 0.5 ? "#ffe6a8" : "#a9b6c4"; ctx.fill();
      ctx.restore();
    }

    /* -------------------------------------------------------- David */
    const dH = L.dH * (1 + Math.sin(t * 1.7) * 0.006);
    const windup = s.d.windup;
    const dRot = -0.02 + Math.sin(t * 0.9) * 0.008 - windup * 0.14;
    const throwK = s.d.throwT / 0.42;                          // 1 → 0
    const dx = L.dx - windup * 5 + (throwK > 0 ? L.dH * 0.16 : 0);
    actorShadow(ctx, L.dx, L.groundY + 2, dH * 0.22, 0.3);
    let drewD;
    if (throwK > 0.35) {
      drewD = actor(ctx, "davidThrow", dx, L.groundY, dH * 0.95, { rot: -0.05 + (1 - throwK) * 0.05 });
    } else {
      drewD = actor(ctx, "david", dx, L.groundY, dH, { rot: dRot, squash: 1 - windup * 0.015 });
    }
    if (!drewD) pilgrim(ctx, L.dx, L.groundY, 1.05, t, 1, 1, true);

    // Sling whirl: the rope spins faster as the drag gets longer.
    if (windup > 0.04 && throwK <= 0) {
      const dw = dH * 0.408;
      const hx = L.dx - dw * 0.31, hy = L.groundY - dH * 0.38;
      const rad = 8 + windup * 16;
      ctx.save();
      ctx.strokeStyle = `rgba(244,215,155,${0.25 + windup * 0.45})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(hx, hy, rad, t * (6 + windup * 12), t * (6 + windup * 12) + 4.4); ctx.stroke();
      const a = -t * (6 + windup * 12);
      ctx.fillStyle = "#e7d3a6";
      ctx.beginPath(); ctx.arc(hx + Math.cos(a) * rad, hy + Math.sin(a) * rad, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // Aim preview, drawn only while the player is actually dragging.
    if (s.drag) {
      const hand = slingHand(c);
      const vx = (s.drag.ox - s.drag.x) * 4.4, vy = (s.drag.oy - s.drag.y) * 4.4;
      ctx.save();
      ctx.strokeStyle = "rgba(244,215,155,.55)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y);
      ctx.lineTo(hand.x + vx * 0.05, hand.y + vy * 0.05); ctx.stroke();
      ctx.fillStyle = "rgba(244,215,155,.5)";
      for (let i = 1; i <= 7; i++) {
        const tt = i * 0.075;
        const px = hand.x + vx * tt + s.wind * tt * tt * 0.5;
        const py = hand.y + vy * tt + 130 * tt * tt;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, 3 - i * 0.28), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // Stones in flight, with a short trail and a spinning glint.
    for (const b of s.shots) {
      ctx.save();
      ctx.strokeStyle = "rgba(247,221,165,.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke();
      ctx.restore();
      glow(ctx, b.x, b.y, 13, "rgba(244,215,155,ALPHA)", 0.5);
      ctx.fillStyle = "#e7d3a6"; ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath();
      ctx.arc(b.x - Math.cos(b.spin) * 1.4, b.y - Math.sin(b.spin) * 1.4, 1.3, 0, TAU); ctx.fill();
    }
    for (const d of s.dust) {
      ctx.fillStyle = `rgba(203,189,156,${Math.max(0, d.life) * 0.5})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    }

    // wind readout
    ctx.fillStyle = "rgba(244,231,203,.8)"; ctx.font = `600 11px ${c.font}`; ctx.textAlign = "center";
    const arrow = s.wind > 0 ? "→" : "←";
    ctx.fillText(`${tx("WIND", "风")} ${arrow} ${Math.abs(Math.round(s.wind))}`, c.w / 2, 62);
    ctx.fillText(`${tx("HITS", "命中")} ${s.hits}/2`, c.w / 2, 80);
  }
};

/* ---------------------------------------------------------------- 2. LIONS */

const lions = {
  titleEn: "Through the Den", titleZh: "潜行狮子坑",
  promptEn: "Drag to move your pilgrim. Release to stand still and hide. Stay out of the lions' gaze and reach the light.",
  promptZh: "拖动让朝圣者移动，松手站定隐藏。避开狮子的目光，走到右边的光里。",
  hintEn: "Drag to move · Release to hide", hintZh: "拖动移动 · 松手躲藏",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    const y = c.h * 0.55;
    c.state = {
      p: { x: c.w * 0.1, y, r: 12, walk: 0, moving: false },
      startX: c.w * 0.1, goalX: c.w * 0.91,
      // Two on the upper ledge, two on the lower, each with its own beat.
      lions: [[0.3, 0.34], [0.7, 0.34], [0.3, 0.72], [0.7, 0.72]].map(([fx, fy], i) => ({
        x: c.w * fx, y: c.h * fy, a: i % 2 ? 1.2 : -1.2,
        sp: 0.55 + i * 0.12, r: c.w * 0.26, face: i % 2 ? 1 : -1
      })),
      frags: [0.32, 0.52, 0.72].map((f, i) => ({ x: c.w * f, y: c.h * (0.5 + (i - 1) * 0.19), got: false })),
      cooldown: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state; s.cooldown = Math.max(0, s.cooldown - dt);
    const p = s.p;
    const target = c.pointer.down ? { x: c.pointer.x, y: c.pointer.y } : null;
    if (c.keys.has("arrowleft") || c.keys.has("a")) p.x -= 130 * dt;
    if (c.keys.has("arrowright") || c.keys.has("d")) p.x += 130 * dt;
    if (c.keys.has("arrowup") || c.keys.has("w")) p.y -= 130 * dt;
    if (c.keys.has("arrowdown") || c.keys.has("s")) p.y += 130 * dt;
    p.moving = !!target || c.keys.size > 0;
    if (target) {
      const d = dist(p.x, p.y, target.x, target.y);
      if (d > 3) { const k = Math.min(1, (135 * dt) / d); p.x += (target.x - p.x) * k; p.y += (target.y - p.y) * k; p.walk += dt * 2.4; }
    }
    p.x = clamp(p.x, 16, s.goalX + 10); p.y = clamp(p.y, c.h * 0.24, c.h * 0.85);
    s.lions.forEach((l) => { l.a += l.sp * dt * (Math.sin(c.t * 0.5 + l.x) > 0 ? 1 : -1); l.face = Math.cos(l.a) >= 0 ? 1 : -1; });
    for (const f of s.frags) {
      if (!f.got && dist(p.x, p.y, f.x, f.y) < 24) {
        f.got = true; c.addScore(25); c.hit("good"); c.spark(f.x, f.y, "#7fd4c8", 16, 120);
        c.float(f.x, f.y - 18, "+25", "#7fd4c8");
      }
    }
    if (p.moving && s.cooldown <= 0) {
      for (const l of s.lions) {
        const d = dist(p.x, p.y, l.x, l.y);
        const ang = Math.atan2(p.y - l.y, p.x - l.x);
        let diff = Math.abs(((ang - l.a + Math.PI * 3) % TAU) - Math.PI);
        if (d < l.r && diff < 0.52) {
          s.cooldown = 1.4; c.hurt(1);
          p.x = Math.max(s.startX, l.x - 70);
          if (c.hearts <= 0) return;
        }
      }
    }
    c.progress = clamp((p.x - s.startX) / (s.goalX - s.startX), 0, 1);
    c.setHint(`${tx("Drag to move · Release to hide", "拖动移动 · 松手躲藏")}   ${tx("Found", "已找到")} ${s.frags.filter((f) => f.got).length}/3`);
    if (c.progress >= 0.995) c.end(true, c.score + 50);
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, "#101a20", "#1d2726", 16);
    ctx.fillStyle = "rgba(90,70,44,.22)"; ctx.fillRect(0, c.h * 0.2, c.w, c.h * 0.7);
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = "rgba(240,196,106,.07)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, c.h * 0.22 + i * 42); ctx.lineTo(c.w, c.h * 0.22 + i * 42); ctx.stroke();
    }
    // exit light
    glow(ctx, s.goalX, c.h * 0.55, 62, "rgba(244,215,155,ALPHA)", 0.5 + Math.sin(c.t * 2) * 0.12);
    ctx.fillStyle = "rgba(244,215,155,.8)"; ctx.font = "20px serif"; ctx.textAlign = "center";
    ctx.fillText("✟", s.goalX, c.h * 0.55 + 7);
    s.lions.forEach((l) => {
      const cone = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
      cone.addColorStop(0, "rgba(255,196,90,.24)"); cone.addColorStop(1, "rgba(255,196,90,0)");
      ctx.save(); ctx.beginPath(); ctx.moveTo(l.x, l.y);
      ctx.arc(l.x, l.y, l.r, l.a - 0.52, l.a + 0.52); ctx.closePath();
      ctx.fillStyle = cone; ctx.fill(); ctx.restore();
      /* The painted lion prowls on the ground line, not in the air: feet land
         where the cave floor is, and only this one lion carries the full body. */
      // Size by WIDTH: the sprite is 2.15:1, so a lion about a third of the
      // screen wide stays inside its own patch of floor.
      const lh = clamp((c.w * 0.34) / 2.15, 40, 120);
      const groundL = l.y + lh * 0.5;
      actorShadow(ctx, l.x, groundL + 2, lh * 0.42, 0.34);
      const breathe = 1 + Math.sin(c.t * 1.4 + l.x) * 0.012;
      const prowl = Math.sin(c.t * 2.2 + l.x * 0.01) * 0.012;
      const drewLion = actor(ctx, "lion", l.x, groundL, lh, {
        flip: l.face, rot: prowl, squash: breathe,
        alpha: 0.94 + Math.sin(c.t * 3 + l.y) * 0.04
      });
      if (!drewLion) lion(ctx, l.x, l.y, 0.85, l.face, 1, true);
    });
    for (const f of s.frags) if (!f.got) {
      glow(ctx, f.x, f.y, 18, "rgba(127,212,200,ALPHA)", 0.55);
      star(ctx, f.x, f.y + Math.sin(c.t * 3 + f.x) * 3, 8, "#9fe6d8", 0.95);
    }
    const dh = bodyH(c, 0.20, 84, 176);
    actorShadow(ctx, s.p.x, s.p.y + 2, dh * 0.2, s.p.moving ? 0.34 : 0.22);
    const drewDaniel = actor(ctx, "daniel", s.p.x, s.p.y, dh, {
      rot: s.p.moving ? 0.04 + Math.sin(c.t * 8) * 0.02 : 0,
      squash: 1 + Math.sin(c.t * 1.6) * 0.006,
      alpha: s.p.moving ? 1 : 0.55
    });
    if (!drewDaniel) pilgrim(ctx, s.p.x, s.p.y, 0.9, s.p.walk, 1, s.p.moving ? 1 : 0.45, true);
    if (!s.p.moving) { ctx.fillStyle = "rgba(244,231,203,.55)"; ctx.font = `11px ${c.font}`; ctx.textAlign = "center"; ctx.fillText(tx("hidden", "隐藏中"), s.p.x, s.p.y - 52); }
  }
};

/* -------------------------------------------------------------- 3. JERICHO */

const jericho = {
  titleEn: "The Road to Jericho", titleZh: "耶利哥路上",
  promptEn: "Drag left and right to dodge rocks and robbers. Collect six coins for the innkeeper before the road ends.",
  promptZh: "左右拖动避开石头和强盗。在路走完之前，收集六枚银币交给店主。",
  hintEn: "Drag to dodge · Collect 6 coins", hintZh: "拖动闪避 · 收集 6 枚银币",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = { p: { x: c.w / 2, y: c.h * 0.8 }, coins: 0, objs: [], spawn: 0, dist: 0, inv: 0 };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state;
    s.dist += dt * 4.4; s.inv = Math.max(0, s.inv - dt);
    c.progress = clamp(s.dist / 100, 0, 1);
    const target = c.pointer.down ? c.pointer.x : null;
    if (target !== null) s.p.x += clamp(target - s.p.x, -320 * dt, 320 * dt);
    if (c.keys.has("arrowleft") || c.keys.has("a")) s.p.x -= 220 * dt;
    if (c.keys.has("arrowright") || c.keys.has("d")) s.p.x += 220 * dt;
    s.p.x = clamp(s.p.x, 24, c.w - 24);
    s.spawn -= dt;
    if (s.spawn <= 0) {
      s.spawn = rnd(0.5, 0.85);
      const isCoin = Math.random() < 0.48;
      s.objs.push({ x: rnd(30, c.w - 30), y: -20, v: rnd(120, 175), r: isCoin ? 11 : 17, coin: isCoin, rock: !isCoin, spin: rnd(0, 6) });
    }
    for (let i = s.objs.length - 1; i >= 0; i--) {
      const o = s.objs[i]; o.y += o.v * dt; o.spin += dt * 3;
      if (dist(s.p.x, s.p.y, o.x, o.y) < o.r + 14) {
        s.objs.splice(i, 1);
        if (o.coin) {
          s.coins++; c.addScore(20); c.hit("good"); c.spark(o.x, o.y, "#f0c46a", 12, 110);
          c.float(o.x, o.y - 14, "+20", "#f0c46a");
        } else if (s.inv <= 0) {
          s.inv = 1.1; c.hurt(1);
          if (c.hearts <= 0) return;
        }
      } else if (o.y > c.h + 30) s.objs.splice(i, 1);
    }
    c.setHint(`${tx("Drag to dodge · Collect 6 coins", "拖动闪避 · 收集 6 枚银币")}   ${s.coins}/6`);
    if (c.progress >= 1) c.end(s.coins >= 6, c.score + (s.coins >= 6 ? 60 : 0));
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, "#2b3138", "#5c5341", 20);
    hills(ctx, c, c.h * 0.4, "#4a4c42", 30);
    // perspective road
    ctx.fillStyle = "#8b7654";
    ctx.beginPath(); ctx.moveTo(c.w * 0.44, c.h * 0.45); ctx.lineTo(c.w * 0.56, c.h * 0.45);
    ctx.lineTo(c.w + 20, c.h); ctx.lineTo(-20, c.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,200,.16)"; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = c.h * 0.45 + ((i * 0.075 + (c.t * 0.35) % 0.075) * c.h);
      if (y > c.h) continue;
      ctx.beginPath(); ctx.moveTo(c.w * 0.5 - (y - c.h * 0.45) * 0.5, y); ctx.lineTo(c.w * 0.5 + (y - c.h * 0.45) * 0.5, y); ctx.stroke();
    }
    for (const o of s.objs) {
      if (o.coin) coin(ctx, o.x, o.y, o.r, c.t);
      else {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.spin * 0.4);
        ctx.fillStyle = "#5b574c"; ctx.beginPath();
        for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; ctx.lineTo(Math.cos(a) * o.r * (0.8 + (i % 2) * 0.2), Math.sin(a) * o.r * 0.85); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#3d3a31"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
    }
    if (c.progress > 0.8) {
      const y = c.h * 0.45 + (c.progress - 0.8) * 260;
      glow(ctx, c.w * 0.5, y, 40, "rgba(244,215,155,ALPHA)", 0.45);
      ctx.fillStyle = "#f4d79b"; ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText("⌂", c.w * 0.5, y + 7);
    }
    ctx.globalAlpha = s.inv > 0 ? 0.5 + Math.sin(c.t * 30) * 0.3 : 1;
    /* The road widens with perspective, so the traveller grows as he comes
       down the hill. Height follows the road, not the screen. */
    const near = clamp((s.p.y - c.h * 0.45) / (c.h * 0.55), 0, 1);
    const th = clamp(c.h * (0.10 + near * 0.14), 62, 210);
    actorShadow(ctx, s.p.x, s.p.y + 2, th * 0.2, 0.3);
    const drewTrav = actor(ctx, "traveller", s.p.x, s.p.y, th, {
      flip: -1,
      rot: 0.05 + Math.sin(c.t * 9) * 0.015, squash: 1 + Math.sin(c.t * 9) * 0.012
    });
    if (!drewTrav) pilgrim(ctx, s.p.x, s.p.y, 1.05, c.t * 2.2, 1, 1, false);
    ctx.globalAlpha = 1;
  }
};

/* ---------------------------------------------------------------- 4. STORM */

const storm = {
  titleEn: "Hold the Tiller", titleZh: "掌舵迎浪",
  promptEn: "Drag to counter-steer the boat against the waves. Tap BAIL to throw water out. Survive until the storm breaks.",
  promptZh: "拖动船舵对抗风浪，点击「舀水」把水泼出去。撑到风浪过去。",
  hintEn: "Drag to steer · Tap to bail", hintZh: "拖动掌舵 · 点击舀水",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = { roll: 0, steer: 0, water: 0.12, bail: 0, stability: 0, duration: 20, bailBtn: { x: c.w - 48, y: c.h - 96, r: 30 } };
    c.setHint(this.hint());
  },
  onDown(c, p) {
    const s = c.state;
    if (dist(p.x, p.y, s.bailBtn.x, s.bailBtn.y) < s.bailBtn.r + 8) {
      s.water = Math.max(0, s.water - 0.2); s.bail = 0.35;
      c.hit("tap"); c.spark(p.x, p.y, "#7fd4c8", 10, 100); c.float(p.x, p.y - 20, tx("BAIL!", "舀水！"), "#7fd4c8");
      c.pointer.bailHold = true;
    }
  },
  onKey(c, k, down) { if (down && k === " ") { c.state.water = Math.max(0, c.state.water - 0.2); c.state.bail = 0.35; c.hit("tap"); } },
  onUp(c) { c.pointer.bailHold = false; },
  step(c, dt) {
    const s = c.state; s.bail = Math.max(0, s.bail - dt);
    let steer = 0;
    if (c.pointer.down && !c.pointer.bailHold) steer = clamp((c.pointer.x - c.w / 2) / (c.w / 2), -1, 1);
    if (c.keys.has("arrowleft") || c.keys.has("a")) steer = -1;
    if (c.keys.has("arrowright") || c.keys.has("d")) steer = 1;
    s.steer += (steer - s.steer) * dt * 9;
    const wave = Math.sin(c.t * 1.7) * 0.32 + Math.sin(c.t * 3.1 + 1) * 0.16 + Math.sin(c.t * 0.7) * 0.1;
    const target = clamp(wave - s.steer * 0.55, -0.72, 0.72);
    s.roll += (target - s.roll) * dt * 2.6;
    s.water += (0.052 + Math.abs(s.roll) * 0.16 - (s.bail > 0 ? 0.22 : 0)) * dt;
    s.stability += Math.max(0, 1 - Math.abs(s.roll) * 2.2) * dt;
    if (s.water >= 1) { s.water = 0.52; c.hurt(1); if (c.hearts <= 0) return; }
    c.progress = clamp(c.t / s.duration, 0, 1);
    c.setHint(`${tx("Drag to steer · Tap to bail", "拖动掌舵 · 点击舀水")}   ${tx("WATER", "水位")} ${Math.round(s.water * 100)}%`);
    if (c.progress >= 1) c.end(true, Math.round(c.score + s.stability * 6));
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, c.progress > 0.85 ? "#294055" : "#16242f", "#0e1a22", 12);
    ctx.strokeStyle = "rgba(180,210,230,.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let x = 0; x <= c.w; x += 8) ctx.lineTo(x, 40 + i * 16 + Math.sin(x * 0.02 + c.t * 2 + i) * 4);
      ctx.stroke();
    }
    // waves
    for (let layer = 0; layer < 3; layer++) {
      const base = c.h * (0.62 + layer * 0.12);
      ctx.fillStyle = ["rgba(30,68,86,.7)", "rgba(22,52,68,.8)", "rgba(14,36,50,.9)"][layer];
      ctx.beginPath(); ctx.moveTo(0, c.h);
      for (let x = 0; x <= c.w; x += 8) {
        const a = (layer === 0 ? 22 : 28) * (1 - c.progress * 0.8);
        ctx.lineTo(x, base + Math.sin(x * 0.022 + c.t * (2.4 + layer) + layer) * a);
      }
      ctx.lineTo(c.w, c.h); ctx.closePath(); ctx.fill();
    }
    /* The whole crew rides one deck. Drawing the hull AFTER the fisherman lets
       the gunwale cover his shins, so he stands *in* the boat rather than on
       top of a floating triangle. His body lags the deck roll by a beat. */
    const fh = bodyH(c, 0.23, 96, 210);
    const lag = Math.sin(c.t * 1.6 - 0.7) * 0.05;
    const deckY = c.h * 0.745 + fh * 0.12;
    const boatY = c.h * 0.745;
    ctx.save();
    ctx.translate(c.w / 2, deckY);
    ctx.rotate(s.roll * 0.8 + lag);
    ctx.translate(-c.w / 2, -deckY);
    const drewFish = actor(ctx, "fisherman", c.w / 2, deckY, fh, {
      rot: s.steer * 0.05, squash: 1 + Math.sin(c.t * 2.2) * 0.01
    });
    ctx.restore();
    // the deck he stands on: no sail (the chapter art already has one)
    boat(ctx, c.w / 2, boatY, Math.max(1.1, c.w / 300), s.roll, c.t, { sail: false });
    if (!drewFish) pilgrim(ctx, c.w / 2, boatY - 8, 0.9, c.t * 2, 1, 1, true);
    /* Sink the hull into the sea: a crest of the near wave runs over the
       gunwale, so the boat sits *in* the water instead of floating over it. */
    ctx.save();
    const crest = boatY + 14;
    const wg = ctx.createLinearGradient(0, crest - 10, 0, c.h);
    wg.addColorStop(0, "rgba(14,36,50,.0)");
    wg.addColorStop(0.25, "rgba(14,36,50,.86)");
    wg.addColorStop(1, "rgba(9,24,34,.96)");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(0, c.h);
    for (let x = 0; x <= c.w; x += 8) {
      ctx.lineTo(x, crest + Math.sin(x * 0.03 + c.t * 2.2) * 5 + Math.sin(x * 0.07 - c.t) * 2);
    }
    ctx.lineTo(c.w, c.h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(214,235,240,.28)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= c.w; x += 8) {
      const y = crest + Math.sin(x * 0.03 + c.t * 2.2) * 5 + Math.sin(x * 0.07 - c.t) * 2;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    // water meter
    ctx.fillStyle = "rgba(255,255,255,.15)"; roundRect(ctx, 16, c.h - 46, 110, 8, 4); ctx.fill();
    ctx.fillStyle = s.water > 0.75 ? "#e08b78" : "#7fd4c8"; roundRect(ctx, 16, c.h - 46, 110 * s.water, 8, 4); ctx.fill();
    // bail button
    const b = s.bailBtn;
    glow(ctx, b.x, b.y, b.r + 12, "rgba(127,212,200,ALPHA)", s.bail > 0 ? 0.55 : 0.24);
    ctx.fillStyle = s.bail > 0 ? "#4fb8a8" : "rgba(20,42,52,.9)";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#7fd4c8"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#f4e7cb"; ctx.font = `600 12px ${c.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(tx("BAIL", "舀水"), b.x, b.y);
    ctx.textBaseline = "alphabetic";
    if ((c.stageProgress ?? c.progress) > 0.85) { glow(ctx, c.w * 0.82, 50, 60, "rgba(244,215,155,ALPHA)", 0.4); star(ctx, c.w * 0.82, 50, 12, "#f4d79b", 0.8); }
  }
};

/* ------------------------------------------------------------- 5. PRODIGAL */

const prodigal = {
  titleEn: "The Long Way Home", titleZh: "奔向父家",
  promptEn: "Auto-run toward home. Tap to jump pigs, thorns and empty cups. Catch the memories of home floating above.",
  promptZh: "自动朝家奔跑。点击跳过猪群、荆棘和空酒杯，接住空中那些关于家的记忆。",
  hintEn: "Tap to jump · Catch memories", hintZh: "点击跳跃 · 接住记忆",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = { gy: c.h * 0.79, p: { y: c.h * 0.79, vy: 0, onGround: true }, objs: [], spawn: 0, dist: 0, inv: 0, caught: 0 };
    c.setHint(this.hint());
  },
  jump(c) {
    const s = c.state;
    if (!s.p.onGround) return;
    s.p.vy = -430; s.p.onGround = false; c.hit("tap"); c.spark(c.w * 0.24, s.gy, "#e7b75b", 6, 60);
  },
  onDown(c) { prodigal.jump(c); },
  onKey(c, k, down) { if (down && (k === " " || k === "arrowup" || k === "w")) prodigal.jump(c); },
  step(c, dt) {
    const s = c.state;
    s.dist += dt * 5.6; s.inv = Math.max(0, s.inv - dt);
    c.progress = clamp(s.dist / 100, 0, 1);
    s.p.vy += 1150 * dt; s.p.y += s.p.vy * dt;
    if (s.p.y >= s.gy) { s.p.y = s.gy; s.p.vy = 0; s.p.onGround = true; }
    s.spawn -= dt;
    if (s.spawn <= 0) {
      s.spawn = rnd(0.72, 1.05);
      const type = Math.random();
      s.objs.push({ x: c.w + 30, y: type < 0.22 ? s.gy - rnd(70, 105) : s.gy, kind: type < 0.22 ? "mem" : type < 0.6 ? "pig" : "thorn", got: false, spin: rnd(0, 6) });
    }
    const px = c.w * 0.24;
    for (let i = s.objs.length - 1; i >= 0; i--) {
      const o = s.objs[i]; o.x -= (180 + c.progress * 70) * dt; o.spin += dt * 4;
      const oy = o.kind === "mem" ? o.y : o.y - 22;
      if (dist(px, s.p.y - 18, o.x, oy) < (o.kind === "mem" ? 24 : 26)) {
        s.objs.splice(i, 1);
        if (o.kind === "mem") {
          s.caught++; c.addScore(25); c.hit("good"); c.spark(o.x, oy, "#f4d79b", 16, 130);
          c.float(o.x, oy - 16, "+25", "#f4d79b");
        } else if (s.inv <= 0) { s.inv = 1.1; c.hurt(1); if (c.hearts <= 0) return; }
      } else if (o.x < -40) s.objs.splice(i, 1);
    }
    c.setHint(`${tx("Tap to jump · Catch memories", "点击跳跃 · 接住记忆")}   ${s.caught}`);
    if (c.progress >= 1) c.end(true, Math.round(c.score + 55));
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, "#22384a", "#c99a61", 18);
    star(ctx, c.w * 0.82, 46, 10, "#f4d79b", 0.35);
    /* The father's house, still far off at the start and close at the end. It is
       the goal, so it has to read as a lit home from the first frame: warm
       halo, mud-brick wall, a doorway with light spilling out of it. */
    /* Home is a lamp on the ground at the far end of the road, not a building
       floating in the sky. At this size a lit doorway and its halo are all the
       eye needs, and because it stands ON the road line it never reads as an
       object pasted over the painting. It swells as the runner closes. */
    const near = 0.55 + c.progress * 0.45;
    const hx = c.w * (0.9 - c.progress * 0.06), hy = s.gy + 4;
    const hw = 30 * near, hh = 22 * near;
    glow(ctx, hx, hy - hh * 0.5, 46 * near, "rgba(255,214,150,ALPHA)", 0.26 + c.progress * 0.28);
    ctx.fillStyle = "rgba(28,22,15,.92)";
    ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.62, hy - hh);
    ctx.lineTo(hx, hy - hh - hh * 0.42);
    ctx.lineTo(hx + hw * 0.62, hy - hh);
    ctx.closePath(); ctx.fill();
    const dg = ctx.createRadialGradient(hx, hy - hh * 0.45, 0.5, hx, hy - hh * 0.45, hh * 0.7);
    dg.addColorStop(0, "rgba(255,236,186,.98)"); dg.addColorStop(1, "rgba(255,198,120,0)");
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.ellipse(hx, hy - hh * 0.42, hw * 0.3, hh * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffeec2";
    ctx.fillRect(hx - hw * 0.1, hy - hh * 0.62, hw * 0.2, hh * 0.42);
    /* The road. It used to be one flat brown rectangle butted against the
       artwork, which read as a masking error. Now the artwork's own dust melts
       into the drawn ground through a soft horizon band, the dirt carries the
       ruts of a cart track running away from the player, and the grit scrolls
       so the running always has ground speed under it. */
    const road = ctx.createLinearGradient(0, s.gy - 26, 0, c.h);
    road.addColorStop(0, "rgba(150,116,72,0)");
    road.addColorStop(0.18, "rgba(122,95,60,.92)");
    road.addColorStop(1, "rgba(58,44,29,1)");
    ctx.fillStyle = road; ctx.fillRect(0, s.gy - 26, c.w, c.h - s.gy + 26);
    // cart ruts: soft, low-contrast, and only in the near half of the road, so
    // they read as worn track and never as dark shapes standing on it
    for (const [rx, rw] of [[0.46, 0.05], [0.74, 0.045]]) {
      const top = s.gy + (c.h - s.gy) * 0.34;
      const g4 = ctx.createLinearGradient(0, top, 0, c.h);
      g4.addColorStop(0, "rgba(26,19,12,0)");
      g4.addColorStop(1, "rgba(26,19,12,.26)");
      ctx.fillStyle = g4;
      ctx.beginPath();
      ctx.moveTo(c.w * (rx - rw * 0.4), top);
      ctx.lineTo(c.w * (rx + rw * 0.4), top);
      ctx.quadraticCurveTo(c.w * (rx + rw * 1.5), c.h * 0.94, c.w * (rx + rw * 2.2), c.h);
      ctx.lineTo(c.w * (rx - rw * 2.0), c.h);
      ctx.quadraticCurveTo(c.w * (rx - rw * 1.2), c.h * 0.94, c.w * (rx - rw * 0.4), top);
      ctx.closePath(); ctx.fill();
    }
    // dust kicked up at the horizon, where the painting meets the drawn road
    const haze = ctx.createLinearGradient(0, s.gy - 30, 0, s.gy + 54);
    haze.addColorStop(0, "rgba(196,164,116,0)");
    haze.addColorStop(0.5, "rgba(196,164,116,.18)");
    haze.addColorStop(1, "rgba(150,116,72,0)");
    ctx.fillStyle = haze; ctx.fillRect(0, s.gy - 30, c.w, 84);
    // grit and small stones streaming past
    for (let i = 0; i < 34; i++) {
      const sp = 40 + hash(i) * 90;
      const x = ((hash(i * 3.1) * (c.w + 80) - c.t * sp) % (c.w + 80) + c.w + 80) % (c.w + 80) - 40;
      const y = s.gy + 4 + hash(i * 7.7) * (c.h - s.gy);
      const r = 1.1 + hash(i * 11) * 2.4;
      ctx.fillStyle = i % 4 ? "rgba(28,21,13,.42)" : "rgba(196,160,104,.22)";
      ctx.beginPath(); ctx.ellipse(x, y, r * 2.1, r, 0, 0, TAU); ctx.fill();
    }
    for (const o of s.objs) {
      if (o.kind === "mem") { glow(ctx, o.x, o.y, 20, "rgba(244,215,155,ALPHA)", 0.5); star(ctx, o.x, o.y + Math.sin(c.t * 3 + o.spin) * 3, 9, "#f4d79b", 0.95); }
      else if (o.kind === "pig") pig(ctx, o.x, o.y, 0.9, c.t + o.spin);
      else {
        ctx.save(); ctx.translate(o.x, o.y); ctx.strokeStyle = "#4a6a48"; ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 0); ctx.lineTo(i * 9, -20); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.globalAlpha = s.inv > 0 ? 0.5 + Math.sin(c.t * 30) * 0.3 : 1;
    const ph = bodyH(c, 0.21, 88, 180);
    actorShadow(ctx, c.w * 0.24, s.p.y + 2, ph * 0.2, 0.3);
    const drewProd = actor(ctx, "prodigal", c.w * 0.24, s.p.y, ph, {
      rot: 0.06 + Math.sin(c.t * 10) * 0.02, squash: 1 + Math.sin(c.t * 10) * 0.015
    });
    if (!drewProd) pilgrim(ctx, c.w * 0.24, s.p.y, 1.05, c.t * 3.4, 1, 1, true);
    ctx.globalAlpha = 1;
  }
};

/* --------------------------------------------------------------- 6. ESTHER */

const esther = {
  titleEn: "The Golden Sceptre", titleZh: "伸出的金杖",
  promptEn: "Hold to walk toward the throne only while the golden sceptre is raised. Release and freeze when it falls — the guards are watching.",
  promptZh: "金杖举起时按住前进，金杖落下时立刻松手静止——守卫正在看着你。",
  hintEn: "Hold to advance · Release to freeze", hintZh: "按住前进 · 松手静止",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      progress: 0, up: true, timer: 2.4, warn: false, moving: false,
      tokens: [0.25, 0.52, 0.78].map((p) => ({ p, got: false })), cooldown: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state;
    s.timer -= dt; s.cooldown = Math.max(0, s.cooldown - dt);
    s.warn = s.up && s.timer < 0.55;
    if (s.timer <= 0) { s.up = !s.up; s.timer = s.up ? rnd(2.0, 2.7) : rnd(1.2, 1.7); c.hit(s.up ? "good" : "tap"); }
    s.moving = c.pointer.down || c.keys.has(" ") || c.keys.has("arrowright") || c.keys.has("d");
    if (s.moving && !s.up && s.cooldown <= 0) {
      s.cooldown = 1.3; s.progress = Math.max(0, s.progress - 0.09); c.hurt(1);
      if (c.hearts <= 0) return;
    } else if (s.moving && s.up) {
      s.progress += dt * 0.19; c.addScore(dt * 8);
    }
    for (const tk of s.tokens) {
      if (!tk.got && s.progress >= tk.p) {
        tk.got = true; c.addScore(30); c.hit("good");
        const x = c.w * (0.16 + tk.p * 0.66);
        c.spark(x, c.h * 0.7, "#f0c46a", 18, 140); c.float(x, c.h * 0.7 - 20, "+30", "#f0c46a");
      }
    }
    c.progress = clamp(s.progress, 0, 1);
    c.setHint(s.up
      ? `${tx("SCEPTRE UP — hold to walk", "金杖举起——按住前进")}${s.warn ? " !" : ""}`
      : tx("SCEPTRE DOWN — freeze!", "金杖落下——快停下！"));
    if (c.progress >= 1) c.end(true, Math.round(c.score + 60));
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, "#1b2438", "#3a2b3f", 22);
    /* The chapter artwork already paints the hall, the throne and the king, so
       the scene no longer draws a second set of pillars and a second king on
       top of them. What the *player* needs to read is the sceptre and the
       floor they must cross. */
    ctx.save();
    ctx.fillStyle = "rgba(9,14,26,.42)"; ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();
    // the aisle: a faint gold path from the door to the throne
    const aisle = ctx.createLinearGradient(0, c.h * 0.7, 0, c.h);
    aisle.addColorStop(0, "rgba(240,196,106,.14)");
    aisle.addColorStop(1, "rgba(240,196,106,0)");
    ctx.fillStyle = aisle; ctx.fillRect(c.w * 0.08, c.h * 0.7, c.w * 0.6, c.h * 0.3);
    glow(ctx, c.w * 0.9, c.h * 0.55, 70, "rgba(240,196,106,ALPHA)", s.up ? 0.5 : 0.16);
    /* The artwork already has a sceptre in the king's hand, pointing down. The
       mechanic is "is it raised?", so the raised state is drawn as a gold light
       travelling up the painted shaft, and the fallen state as that light going
       out. No second sceptre, no invented anatomy. */
    const sx = c.w * 0.545, sy = c.h * 0.665;      // the painted staff's butt
    const tipY = c.h * 0.42;
    ctx.save();
    if (s.up) {
      const g3 = ctx.createLinearGradient(sx, sy, sx, tipY);
      g3.addColorStop(0, "rgba(255,228,150,0)");
      g3.addColorStop(0.55, `rgba(255,228,150,${0.5 + Math.sin(c.t * 3) * 0.08})`);
      g3.addColorStop(1, "rgba(255,246,214,.95)");
      ctx.strokeStyle = g3; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, tipY); ctx.stroke();
      glow(ctx, sx, tipY, 26, "rgba(255,236,170,ALPHA)", 0.7 + Math.sin(c.t * 3) * 0.1);
      ctx.fillStyle = "#fff6d6";
      ctx.beginPath(); ctx.arc(sx, tipY, 4.5, 0, TAU); ctx.fill();
    } else {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#8a7440"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 60); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // floor
    ctx.fillStyle = "#5a4a3c"; ctx.fillRect(0, c.h * 0.72, c.w, c.h * 0.28);
    ctx.strokeStyle = "rgba(240,196,106,.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, c.h * 0.74 + i * 22); ctx.lineTo(c.w, c.h * 0.74 + i * 22); ctx.stroke(); }
    // light indicator
    ctx.fillStyle = s.up ? "#6fd0a8" : "#e0705f";
    ctx.beginPath(); ctx.arc(c.w * 0.5, 34, 9 + (s.warn ? Math.sin(c.t * 20) * 3 : 0), 0, TAU); ctx.fill();
    ctx.fillStyle = "#f4e7cb"; ctx.font = `600 12px ${c.font}`; ctx.textAlign = "center";
    ctx.fillText(s.up ? tx("GO", "前进") : tx("FREEZE", "静止"), c.w * 0.5, 58);
    // guards
    for (const gx of [c.w * 0.235, c.w * 0.655]) {
      const gy = c.h * 0.735;
      // spear, body, helmet — reads as a guard at a glance, costs six shapes
      ctx.strokeStyle = "rgba(198,170,110,.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx + 12, gy - 62); ctx.lineTo(gx + 12, gy + 6); ctx.stroke();
      ctx.fillStyle = "rgba(24,32,44,.85)";
      ctx.beginPath(); ctx.moveTo(gx - 9, gy); ctx.lineTo(gx - 7, gy - 44); ctx.lineTo(gx + 7, gy - 44);
      ctx.lineTo(gx + 9, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(58,70,88,.95)";
      ctx.beginPath(); ctx.arc(gx, gy - 52, 8, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = "rgba(198,170,110,.55)";
      ctx.beginPath(); ctx.moveTo(gx - 9, gy - 54); ctx.lineTo(gx, gy - 64); ctx.lineTo(gx + 9, gy - 54); ctx.closePath(); ctx.fill();
      if (s.moving && !s.up) {
        ctx.fillStyle = "rgba(255,138,106,.9)";
        ctx.beginPath(); ctx.arc(gx, gy - 52, 2.2, 0, TAU); ctx.fill();
      }
    }
    // player
    const px = c.w * (0.16 + s.progress * 0.66), py = c.h * 0.75;
    const eh = bodyH(c, 0.23, 96, 200);
    actorShadow(ctx, px, py + 2, eh * 0.22, 0.32);
    const drewEsther = actor(ctx, "esther", px, py, eh, {
      rot: s.moving ? 0.035 + Math.sin(c.t * 8) * 0.015 : Math.sin(c.t * 0.9) * 0.006,
      squash: 1 + Math.sin(c.t * 1.5) * 0.005
    });
    if (!drewEsther) pilgrim(ctx, px, py, 1.05, s.moving ? c.t * 3 : 0, 1, 1, true);
    for (const tk of s.tokens) if (!tk.got) {
      const x = c.w * (0.16 + tk.p * 0.66);
      star(ctx, x, py - 58 + Math.sin(c.t * 3 + tk.p * 9) * 4, 7, "#f0c46a", 0.75);
    }
  }
};

export const GAMES = { sling, lions, jericho, storm, prodigal, esther };

/* ══════════════════════ 7a. BURNING BUSH — follow the flock ══════════════════════ */
const desert = {
  art: "assets/art/bush.jpg", weather: "sand",
  titleEn: "Follow the flock", titleZh: "跟随羊群",
  promptEn: "Three sheep have wandered into the wadi. Gather them, then lead the flock to the burning bush before the sandstorm closes in.",
  promptZh: "三只羊走散在旱谷里。先找齐它们，再在沙暴合拢前把羊群带到燃烧的荆棘前。",
  hintEn: "Drag to walk · collect all 3 sheep · reach the bush", hintZh: "拖动行走 · 找齐 3 只羊 · 走到荆棘前",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      p: { x: c.w * 0.13, y: c.h * 0.68 }, sheep: [
        { x: c.w * 0.3, y: c.h * 0.47, got: false }, { x: c.w * 0.52, y: c.h * 0.76, got: false },
        { x: c.w * 0.68, y: c.h * 0.42, got: false }
      ],
      rocks: [{ x: c.w * 0.42, y: c.h * 0.6, r: 26 }, { x: c.w * 0.59, y: c.h * 0.55, r: 20 }],
      storm: 1, t: 0, glow: 0, msg: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state; s.t += dt; s.storm = Math.max(0, 1 - s.t / 30); s.msg = Math.max(0, s.msg - dt);
    const q = c.pointer;
    let gx = s.p.x, gy = s.p.y;
    if (q.down && q.y > c.h * 0.18) { gx = q.x; gy = q.y; }
    else {
      const kx = (c.keys.has("d") || c.keys.has("arrowright") ? 1 : 0) - (c.keys.has("a") || c.keys.has("arrowleft") ? 1 : 0);
      const ky = (c.keys.has("s") || c.keys.has("arrowdown") ? 1 : 0) - (c.keys.has("w") || c.keys.has("arrowup") ? 1 : 0);
      gx = s.p.x + kx * 40; gy = s.p.y + ky * 40;
    }
    const dx = gx - s.p.x, dy = gy - s.p.y, d = Math.hypot(dx, dy);
    if (d > 2) {
      const sp = 132 * dt / Math.max(0.25, d);
      s.p.x = clamp(s.p.x + dx * sp, 18, c.w - 18);
      s.p.y = clamp(s.p.y + dy * sp, c.h * 0.34, c.h * 0.87);
    }
    for (const r of s.rocks) {
      const rd = dist(s.p.x, s.p.y, r.x, r.y) || 1;
      if (rd < r.r + 9) { s.p.x = r.x + (s.p.x - r.x) / rd * (r.r + 9); s.p.y = r.y + (s.p.y - r.y) / rd * (r.r + 9); }
    }
    for (const sh of s.sheep) if (!sh.got && dist(s.p.x, s.p.y, sh.x, sh.y) < 30) {
      sh.got = true; c.addScore(10); c.spark(sh.x, sh.y, "#f4d79b", 14, 120); c.hit("good");
    }
    const bushX = c.w * 0.86;
    if (s.p.x > bushX - 26) {
      if (s.sheep.every(x => x.got)) { s.glow = 1; c.spark(bushX, c.h * 0.56, "#ffe6a6", 34, 210); c.end(true, c.score + Math.round(s.storm * 20)); return; }
      s.p.x = bushX - 30; s.msg = 1.2;
    }
    const got = s.sheep.filter(x => x.got).length;
    c.progress = got * 0.2 + Math.max(0, s.p.x / c.w - 0.13) * 0.4;
    c.setHint(s.msg > 0
      ? tx("Gather the flock first!", "先找齐羊群！")
      : `${this.hint()}   ${tx("SHEEP", "羊")} ${got}/3   ${tx("SANDSTORM", "沙暴")} ${Math.ceil(s.storm * 30)}s`);
    if (s.storm <= 0) c.end(false, c.score);
  },
  draw(c, ctx) {
    const s = c.state; bg(c, ctx, "#3a2b28", "#7a5230", 16);
    const sx = c.w * (0.32 + 0.9 * s.storm);
    const sg = ctx.createLinearGradient(sx - 40, 0, Math.min(c.w, sx + 120), 0);
    sg.addColorStop(0, "rgba(196,154,94,0)"); sg.addColorStop(1, "rgba(196,154,94,.5)");
    ctx.fillStyle = sg; ctx.fillRect(sx - 40, 0, c.w - sx + 40, c.h);
    ctx.fillStyle = "rgba(120,84,46,.45)"; ctx.fillRect(0, c.h * 0.78, c.w, c.h * 0.22);
    for (const r of s.rocks) {
      shadow(ctx, r.x, r.y + r.r * 0.55, r.r * 1.1, 5, 0.45);
      ctx.fillStyle = "#6d5138"; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.7, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,225,170,.22)"; ctx.beginPath(); ctx.ellipse(r.x - r.r * 0.25, r.y - r.r * 0.3, r.r * 0.4, r.r * 0.2, 0.3, 0, TAU); ctx.fill();
    }
    const bx = c.w * 0.9, by = c.h * 0.56;
    const rg = ctx.createRadialGradient(bx, by, 3, bx, by, 84 + s.glow * 50);
    rg.addColorStop(0, "rgba(255,238,180,.75)"); rg.addColorStop(0.5, "rgba(255,166,60,.3)"); rg.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bx, by, 84 + s.glow * 50, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2e3b28"; ctx.beginPath(); ctx.ellipse(bx, by + 14, 30, 22, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + s.t * 0.4, fx = bx + Math.cos(a) * (16 + Math.sin(s.t * 5 + i) * 5);
      const fy = by - 6 + Math.sin(a) * 14 - ((s.t * 32 + i * 11) % 28);
      ctx.fillStyle = i % 2 ? "rgba(255,196,84,.85)" : "rgba(255,120,44,.8)";
      ctx.beginPath(); ctx.ellipse(fx, fy, 5, 10, 0, 0, TAU); ctx.fill();
    }
    for (const sh of s.sheep) if (!sh.got) {
      const bob = Math.sin(s.t * 3 + sh.x) * 2;
      const y0 = sh.y + bob;
      shadow(ctx, sh.x, sh.y + 12, 15, 3.5, 0.4);
      // legs, then fleece: a cluster of lobes beats one flat ellipse
      ctx.strokeStyle = "#2f2620"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sh.x - 7, y0 + 6); ctx.lineTo(sh.x - 7, y0 + 14);
      ctx.moveTo(sh.x + 6, y0 + 6); ctx.lineTo(sh.x + 6, y0 + 14); ctx.stroke();
      ctx.fillStyle = "#2f2620";
      ctx.beginPath(); ctx.ellipse(sh.x - 6.5, y0 + 14.5, 2.6, 1.6, 0, 0, TAU);
      ctx.ellipse(sh.x + 6.5, y0 + 14.5, 2.6, 1.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#d9cdb4";
      for (const [dx, dy, r] of [[-9, -2, 6.4], [-3, -5, 7], [3, -4, 6.6], [8, -1, 5.8], [-5, 2, 6.4], [4, 2, 6.2], [0, -8, 5.4]]) {
        ctx.beginPath(); ctx.arc(sh.x + dx, y0 + dy, r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#f6efdd";
      for (const [dx, dy, r] of [[-7, -6, 4], [2, -8, 4.2], [6, -4, 3.6], [-2, -2, 4.4], [-8, 1, 3.4]]) {
        ctx.beginPath(); ctx.arc(sh.x + dx, y0 + dy, r, 0, TAU); ctx.fill();
      }
      // dark face, ear, and a curled horn
      ctx.fillStyle = "#31302b";
      ctx.beginPath(); ctx.ellipse(sh.x + 11, y0 - 5, 4.6, 4.2, 0.35, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sh.x + 8, y0 - 8, 2.6, 1.6, -0.7, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#8d7f63"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(sh.x + 10, y0 - 9, 3, 3.4, 5.4); ctx.stroke();
      ctx.fillStyle = "#0f0d0a";
      ctx.beginPath(); ctx.arc(sh.x + 12.4, y0 - 5.6, 0.9, 0, TAU); ctx.fill();
    }
    /* The shepherd sprite is framed to the shins, so he is staged so that his
       hem lands inside the wadi's near bank — he reads as standing behind the
       rise, not floating over it. He is nudged in from the edge so the staff
       never clips. */
    const sh2 = bodyH(c, 0.24, 100, 200);
    const mx = Math.max(s.p.x, sh2 * 0.42);
    const feet = c.h * 0.80;
    const drewMoses = actor(ctx, "shepherd", mx, feet, sh2, {
      rot: Math.sin(s.t * 0.8) * 0.008, squash: 1 + Math.sin(s.t * 1.4) * 0.006
    });
    if (!drewMoses) {
      actorShadow(ctx, s.p.x, s.p.y + 2, sh2 * 0.2, 0.3);
      pilgrim(ctx, s.p.x, s.p.y, 1.05, s.t, 1, 1, true);
    }
    ctx.fillStyle = "rgba(255,240,200,.75)"; ctx.font = `11px ${c.font}`; ctx.textAlign = "center";
    ctx.fillText(tx("THE BUSH", "荆棘"), bx, by + 54);
  },
  onDown(c, q) { return q.y > c.h * 0.18; }, onMove() { return true; }
};

/* ══════════════════════ 7b. RUTH — glean before sunset ══════════════════════ */
const glean = {
  art: "assets/art/ruth.jpg", weather: "petals",
  titleEn: "Glean the field", titleZh: "拾取麦穗",
  promptEn: "Gather 12 sheaves of barley before the sun sets. Keep clear of the swinging sickles — Boaz has told his men to leave extra for you.",
  promptZh: "日落前拾取 12 捆麦子。避开挥动的镰刀——波阿斯已吩咐仆人特意留下麦穗给你。",
  hintEn: "Drag to move · dodge the sickles · 12 sheaves", hintZh: "拖动移动 · 躲开镰刀 · 拾取 12 捆麦子",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      p: { x: c.w * 0.5, y: c.h * 0.78 }, t: 0, sky: 0,
      grain: Array.from({ length: 14 }, (_, i) => ({
        x: c.w * (0.1 + (i % 7) * 0.13), y: c.h * (0.4 + Math.floor(i / 7) * 0.16) + rnd(-8, 8), got: false
      })),
      sickles: [{ y: c.h * 0.5, x: c.w * 0.3, a: 0 }, { y: c.h * 0.64, x: c.w * 0.7, a: 2 }],
      hb: 0, hurt: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state; s.t += dt; s.sky = Math.min(1, s.t / 34); s.hb -= dt;
    const q = c.pointer;
    if (q.down && q.y > c.h * 0.16) { s.p.x = clamp(q.x, 14, c.w - 14); s.p.y = clamp(q.y, c.h * 0.34, c.h * 0.88); }
    for (const g of s.grain) if (!g.got && dist(s.p.x, s.p.y, g.x, g.y) < 22) {
      g.got = true; c.addScore(5); c.spark(g.x, g.y, "#f8e3a8", 10, 100); c.hit("good");
    }
    for (let i = 0; i < s.sickles.length; i++) {
      const k = s.sickles[i]; k.a += dt * (2.3 + i * 0.5);
      k.x = c.w * (0.5 + 0.36 * Math.sin(k.a * (i ? 0.8 : 1.1)));
      if (s.hb <= 0 && dist(s.p.x, s.p.y, k.x, k.y) < 26) {
        s.hb = 0.8; s.hurt = 1; c.hurt(1);
        if (c.hearts <= 0) return;
      }
    }
    s.hurt = Math.max(0, s.hurt - dt);
    const got = s.grain.filter(g => g.got).length;
    c.progress = got / 12;
    c.setHint(`${this.hint()}   ${tx("SHEAVES", "麦捆")} ${got}/12   ${tx("SUNSET", "日落")} ${Math.ceil((1 - s.sky) * 34)}s`);
    if (got >= 12) c.end(true, c.score + Math.round((1 - s.sky) * 25));
    else if (s.sky >= 1) c.end(false, c.score);
  },
  draw(c, ctx) {
    const s = c.state; bg(c, ctx, "#4b3e2c", "#a5763c", 12);
    /* This artwork is a bright, dusty golden field and the light rays add more
       glare on top of it. Without a grade the field, the reapers and the sheaves
       all sink into the same cream haze; a warm shadow layer puts the depth back
       so Ruth is the brightest thing in the frame. */
    const grade = ctx.createLinearGradient(0, c.h * 0.3, 0, c.h);
    grade.addColorStop(0, "rgba(42,28,14,.20)");
    grade.addColorStop(1, "rgba(28,18,9,.42)");
    ctx.fillStyle = grade; ctx.fillRect(0, 0, c.w, c.h);
    const sy = c.h * (0.12 + s.sky * 0.56);
    const sg = ctx.createRadialGradient(c.w * 0.78, sy, 4, c.w * 0.78, sy, 60);
    sg.addColorStop(0, "rgba(255,246,205,.95)"); sg.addColorStop(0.35, "rgba(255,202,110,.5)"); sg.addColorStop(1, "rgba(255,180,90,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(c.w * 0.78, sy, 60, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f6dfa0"; ctx.beginPath(); ctx.arc(c.w * 0.78, sy, 15, 0, TAU); ctx.fill();
    /* Furrows of cut barley: soft bands that widen toward the viewer. The old
       version was evenly spaced hairlines, which read as a scanline overlay. */
    for (let i = 0; i < 9; i++) {
      const f = i / 9;
      const y = c.h * (0.38 + f * 0.6);
      const band = ctx.createLinearGradient(0, y - 6 - f * 8, 0, y + 6 + f * 8);
      band.addColorStop(0, "rgba(120,86,40,0)");
      band.addColorStop(0.5, `rgba(${i % 2 ? "86,60,28" : "214,176,110"},${0.14 + f * 0.1})`);
      band.addColorStop(1, "rgba(120,86,40,0)");
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.moveTo(-10, y - 6 - f * 8);
      ctx.quadraticCurveTo(c.w * 0.5, y - 14 - f * 10, c.w + 10, y - 6 - f * 8);
      ctx.lineTo(c.w + 10, y + 6 + f * 8);
      ctx.quadraticCurveTo(c.w * 0.5, y + 2 + f * 6, -10, y + 6 + f * 8);
      ctx.closePath(); ctx.fill();
    }
    for (const g of s.grain) if (!g.got) {
      const bob = Math.sin(c.t * 2.2 + g.x * 0.1) * 1.6;
      const y0 = g.y + bob;
      shadow(ctx, g.x, g.y + 12, 10, 2.6, 0.4);
      glow(ctx, g.x, y0 - 4, 22, "rgba(255,226,150,ALPHA)", 0.3);
      // five stalks leaning out of a tied waist
      ctx.strokeStyle = "#d8b46a"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.moveTo(g.x + j * 0.6, y0 + 10);
        ctx.quadraticCurveTo(g.x + j * 4, y0 + 2, g.x + j * 5.4, y0 - 12);
        ctx.stroke();
        ctx.fillStyle = "#f6e0a2";
        ctx.beginPath(); ctx.ellipse(g.x + j * 5.4, y0 - 13.5, 1.7, 3.4, j * 0.16, 0, TAU); ctx.fill();
      }
      // the binding
      ctx.strokeStyle = "rgba(150,104,48,.9)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(g.x - 4, y0 - 1); ctx.lineTo(g.x + 4, y0 - 1.6); ctx.stroke();
    }
    for (const k of s.sickles) {
      shadow(ctx, k.x, k.y + 6, 16, 3, 0.45);
      npc(ctx, k.x, k.y + 12, { s: 0.62, phase: s.t * 2, robe: "#4c5a4a", cloth: "#26312a" });
      ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.a);
      /* A stroked arc reads as a hoop. A crescent — outer edge sweeping wide,
         inner edge tapering back to the heel — reads as a blade, which is what
         the player has to dodge. */
      const a0 = -0.34, a1 = 1.62;
      const bl = ctx.createLinearGradient(-14, -14, 16, 16);
      bl.addColorStop(0, "#e9eef1"); bl.addColorStop(0.55, "#a8b2b8"); bl.addColorStop(1, "#6b747a");
      ctx.fillStyle = bl;
      ctx.beginPath();
      ctx.arc(0, 0, 20, a0, a1);
      ctx.arc(0, 0, 12.5, a1 - 0.06, a0 + 0.16, true);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 19.6, a0 + 0.05, a1 - 0.08); ctx.stroke();
      // heel of the blade, then the wooden grip running back from it
      ctx.fillStyle = "#4d5257";
      ctx.beginPath(); ctx.ellipse(Math.cos(a1) * 16, Math.sin(a1) * 16, 4, 3.4, a1, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#7a5228"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(Math.cos(a1) * 15, Math.sin(a1) * 15);
      ctx.lineTo(Math.cos(a1) * 15 + 6, Math.sin(a1) * 15 + 11);
      ctx.stroke();
      ctx.fillStyle = "#5c3d1d";
      ctx.beginPath(); ctx.arc(Math.cos(a1) * 15 + 6, Math.sin(a1) * 15 + 11, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const rh = bodyH(c, 0.21, 88, 180);
    actorShadow(ctx, s.p.x, s.p.y + 2, rh * 0.2, 0.3);
    const drewRuth = actor(ctx, "ruth", s.p.x, s.p.y, rh, {
      rot: 0.03 + Math.sin(s.t * 7) * 0.02, squash: 1 + Math.sin(s.t * 7) * 0.012
    });
    if (!drewRuth) pilgrim(ctx, s.p.x, s.p.y, 1.05, s.t, 1, 1, true);
    if (s.hurt > 0) { ctx.fillStyle = `rgba(214,92,66,${s.hurt * 0.22})`; ctx.fillRect(0, 0, c.w, c.h); }
  },
  onDown(c, q) { return q.y > c.h * 0.16; }, onMove() { return true; }
};

/* ══════════════════════ 7c. JONAH — cast the prayer into the deep ══════════════════════ */
const deep = {
  art: "assets/art/jonah.jpg", weather: "rain",
  titleEn: "Into the deep", titleZh: "投入深海",
  promptEn: "Hold your breath and swim through the storm. Catch the three bubbles of prayer before you reach the shore. Avoid the rocks and jellyfish.",
  promptZh: "屏住呼吸，穿越风浪游向岸边。途中接住 3 颗祷告气泡，避开礁石和水母。",
  hintEn: "Drag up / down to swim · catch 3 prayer bubbles", hintZh: "上下拖动游泳 · 接住 3 颗祷告气泡",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      y: c.h * 0.55, ty: c.h * 0.55, t: 0, dist: 0, bubbles: 0, hb: 0, hurt: 0,
      obs: [], orbs: [], spawned: 0, wave: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state; s.t += dt; s.dist = Math.min(1, s.t / 26); s.wave += dt; s.hb -= dt;
    const q = c.pointer;
    if (q.down && q.y > c.h * 0.14) s.ty = clamp(q.y, c.h * 0.24, c.h * 0.86);
    s.y += clamp((s.ty - s.y) * dt * 7, -170 * dt, 170 * dt);
    if (s.spawned < 26 && s.t > s.spawned * 0.92) {
      const i = s.spawned++;
      if (i % 3 === 1 && s.orbs.length + s.bubbles < 6) s.orbs.push({ x: c.w + 20, y: rnd(c.h * 0.3, c.h * 0.8), t: 0 });
      else s.obs.push({ x: c.w + 20, y: rnd(c.h * 0.26, c.h * 0.84), r: rnd(13, 20), jelly: i % 4 === 0, t: 0 });
    }
    for (const o of s.obs) { o.x -= (120 + s.dist * 60) * dt; o.t += dt; }
    for (const o of s.orbs) { o.x -= (110 + s.dist * 50) * dt; o.t += dt; }
    s.obs = s.obs.filter(o => o.x > -30);
    s.orbs = s.orbs.filter(o => o.x > -30);
    const px = c.w * 0.26;
    for (const o of s.orbs) if (!o.got && dist(px, s.y, o.x, o.y) < 25) {
      o.got = true; s.bubbles++; c.addScore(12); c.hit("good");
      c.spark(o.x, o.y, "#fff3cf", 18, 140);
    }
    s.orbs = s.orbs.filter(o => !o.got);
    for (const o of s.obs) if (s.hb <= 0 && dist(px, s.y, o.x, o.y) < o.r + 9) {
      s.hb = 1.1; s.hurt = 1; c.hurt(1);
      if (c.hearts <= 0) return;
    }
    s.hurt = Math.max(0, s.hurt - dt);
    c.progress = s.dist;
    c.setHint(`${this.hint()}   ${tx("PRAYERS", "祷告")} ${s.bubbles}/3   ${tx("SHORE", "岸边")} ${Math.round(s.dist * 100)}%`);
    if (s.dist >= 1) c.end(s.bubbles >= 3, c.score + s.bubbles * 5);
  },
  draw(c, ctx) {
    const s = c.state; bg(c, ctx, "#12283c", "#0c3c4a", 8);
    for (let i = 0; i < 5; i++) {
      const x = (i * 0.23 + s.wave * 0.02) % 1 * c.w;
      ctx.fillStyle = "rgba(150,220,225,.045)";
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 70, c.h); ctx.lineTo(x + 20, c.h); ctx.fill();
    }
    ctx.strokeStyle = "rgba(180,236,232,.35)"; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= c.w; x += 8) {
      const y = c.h * 0.16 + Math.sin(x * 0.03 + s.wave * 2.5) * 5 + Math.sin(x * 0.07 - s.wave) * 2;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(6,26,32,.6)";
    ctx.beginPath(); ctx.moveTo(0, c.h);
    for (let x = 0; x <= c.w; x += 12) ctx.lineTo(x, c.h * 0.92 - Math.sin(x * 0.018 + 1.4) * 13);
    ctx.lineTo(c.w, c.h); ctx.fill();
    for (const o of s.obs) {
      if (o.jelly) {
        const g = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, o.r * 1.8);
        g.addColorStop(0, "rgba(255,180,220,.55)"); g.addColorStop(1, "rgba(255,140,200,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.8, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,196,222,.8)";
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.7, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,196,222,.7)"; ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(o.x + i * 5, o.y + 2);
          ctx.quadraticCurveTo(o.x + i * 5 + Math.sin(o.t * 4 + i) * 4, o.y + o.r, o.x + i * 5, o.y + o.r * 1.7); ctx.stroke();
        }
      } else {
        shadow(ctx, o.x, o.y + o.r * 0.7, o.r, 4, 0.4);
        ctx.fillStyle = "#2b3f42"; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.8, 0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(160,220,220,.2)"; ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 4, o.r * 0.35, o.r * 0.2, 0.4, 0, TAU); ctx.fill();
      }
    }
    for (const o of s.orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, 22);
      g.addColorStop(0, "rgba(255,247,210,.9)"); g.addColorStop(0.4, "rgba(216,180,108,.45)"); g.addColorStop(1, "rgba(216,180,108,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, 22, 0, TAU); ctx.fill();
      star(ctx, o.x, o.y, 8, "#fff3cf", 0.85);
    }
    const px = c.w * 0.26;
    ctx.save(); ctx.translate(px, s.y);
    shadow(ctx, 0, 16, 18, 4, 0.4);
    ctx.rotate(clamp((s.ty - s.y) * 0.002, -0.32, 0.32));
    ctx.fillStyle = "#e8d2a6"; ctx.beginPath(); ctx.ellipse(0, 0, 15, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c9a45c"; ctx.beginPath(); ctx.arc(13, -3, 6.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#c9a45c"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-19, Math.sin(s.t * 12) * 8 - 6); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 4; i++) {
      const by = s.y - ((s.t * 26 + i * 15) % 42);
      ctx.strokeStyle = "rgba(220,245,245,.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px - 14 - i * 3, by, 2 + i * 0.5, 0, TAU); ctx.stroke();
    }
    if (s.hurt > 0) { ctx.fillStyle = `rgba(214,92,66,${s.hurt * 0.2})`; ctx.fillRect(0, 0, c.w, c.h); }
  },
  onDown(c, q) { return q.y > c.h * 0.14; }, onMove() { return true; }
};

/* ══════════════════════ 7d. ZACCHAEUS — climb the sycamore ══════════════════════ */
const climb = {
  art: "assets/art/zacchaeus.jpg", weather: "petals",
  titleEn: "Climb the sycamore", titleZh: "爬上桑树",
  promptEn: "Tap the left or right branch in the order the crowd points. Ten good holds and you will see Jesus pass beneath you. Hesitate and you slip.",
  promptZh: "按人群指示的顺序，点左或右的树枝。抓稳十次，你就会看见耶稣从树下经过。犹豫就会滑落。",
  hintEn: "Tap LEFT / RIGHT as the glow shows · 10 holds", hintZh: "按亮起的树枝点左 / 右 · 抓稳 10 次",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    const seq = Array.from({ length: 10 }, (_, i) => (i % 3 === 2 ? (i % 2) : (i % 2 ? 1 : 0)));
    c.state = { seq, step: 0, t: 0, hold: 1.7, slip: 0, cheer: 0 };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state; s.t += dt; s.hold -= dt; s.slip = Math.max(0, s.slip - dt); s.cheer = Math.max(0, s.cheer - dt);
    if (s.hold <= 0) { s.slip = 0.6; s.hold = 1.7; c.hurt(1); if (c.hearts <= 0) return; }
    c.progress = s.step / 10;
    c.setHint(`${this.hint()}   ${tx("HOLD", "抓稳")} ${s.step}/10   ${tx("TIME", "时间")} ${s.hold.toFixed(1)}s`);
  },
  draw(c, ctx) {
    const s = c.state; bg(c, ctx, "#2b3340", "#5d6b52", 12);
    const scroll = s.step * 9;
    /* The chapter art already paints a sycamore, so the trunk is a soft shadow
       behind the handholds instead of a second tree drawn in flat brown. */
    const trunk = ctx.createLinearGradient(c.w * 0.4, 0, c.w * 0.6, 0);
    trunk.addColorStop(0, "rgba(18,22,18,0)");
    trunk.addColorStop(0.5, "rgba(24,26,20,.5)");
    trunk.addColorStop(1, "rgba(18,22,18,0)");
    ctx.fillStyle = trunk;
    ctx.beginPath(); ctx.moveTo(c.w * 0.4, c.h); ctx.lineTo(c.w * 0.455, c.h * 0.1);
    ctx.lineTo(c.w * 0.545, c.h * 0.1); ctx.lineTo(c.w * 0.6, c.h); ctx.fill();
    ctx.strokeStyle = "rgba(240,216,170,.10)"; ctx.lineWidth = 2;
    for (let y = c.h * 0.15; y < c.h; y += 30) { ctx.beginPath(); ctx.moveTo(c.w * 0.46, y); ctx.lineTo(c.w * 0.54, y + 7); ctx.stroke(); }
    for (let i = 0; i < 11; i++) {
      const y = c.h * 0.84 - i * 38 + scroll, dir = i % 2 ? 1 : -1;
      if (y < -20 || y > c.h + 20) continue;
      const active = i === s.step;
      ctx.strokeStyle = active ? "#f1d492" : "#574431"; ctx.lineWidth = active ? 9 : 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(c.w * 0.5, y + 8);
      ctx.quadraticCurveTo(c.w * (0.5 + dir * 0.16), y - 4, c.w * (0.5 + dir * 0.28), y - 12); ctx.stroke();
      if (active) {
        const gx = c.w * (0.5 + dir * 0.28), gy = y - 12;
        const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 38);
        g.addColorStop(0, "rgba(255,239,186,.7)"); g.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 38, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,244,208,.95)"; ctx.font = `bold 11px ${c.font}`; ctx.textAlign = "center";
        ctx.fillText(tx(dir < 0 ? "LEFT" : "RIGHT", dir < 0 ? "左" : "右"), gx, gy - 20);
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = c.w * (0.06 + ((i * 0.237) % 0.88));
      const y = c.h * (0.1 + ((i * 0.19) % 0.5)) + Math.sin(i * 2.1) * 18;
      const r = 26 + (i % 4) * 9;
      const g2 = ctx.createRadialGradient(x, y, 2, x, y, r);
      g2.addColorStop(0, "rgba(38,66,44,.62)");
      g2.addColorStop(1, "rgba(24,44,30,0)");
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, i * 0.6, 0, TAU); ctx.fill();
    }
    const zy = c.h * 0.84 - s.step * 38 + scroll;
    const zx = c.w * (0.5 + (s.seq[Math.min(s.step, 9)] ? 0.18 : -0.18));
    const zh = bodyH(c, 0.17, 74, 150);
    const drewZac = actor(ctx, "zacchaeus", zx, zy + zh * 0.42, zh, {
      flip: s.seq[Math.min(s.step, 9)] ? 1 : -1,
      rot: Math.sin(s.t * 2.4) * 0.02,
      squash: 1 + (s.cheer > 0 ? Math.sin(s.cheer * 20) * 0.02 : 0)
    });
    if (!drewZac) npc(ctx, zx, zy - 2, { s: 0.9, phase: s.t, robe: "#7c5a34", cloth: "#2c241b" });
    const crowd = 1 - s.step / 14;
    for (let i = 0; i < 6; i++) {
      const x = c.w * (0.1 + i * 0.16), y = c.h * 0.93;
      npc(ctx, x, y, { s: 0.5 * crowd, phase: s.t + i, robe: ["#4a5a68", "#6b5540", "#3f5b54"][i % 3], cloth: "#18232b" });
    }
    npc(ctx, c.w * (0.2 + (s.t * 0.035) % 0.7), c.h * 0.96, { s: 0.62, phase: s.t * 0.8, robe: "#e9e2d0", cloth: "#8a6f4a", glow: "rgba(255,236,180,.22)" });
    const f = clamp(s.hold / 1.7, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.4)"; roundRect(ctx, c.w * 0.28, c.h * 0.12, c.w * 0.44, 7, 3); ctx.fill();
    ctx.fillStyle = f > 0.35 ? "#d6b46c" : "#d65c42"; roundRect(ctx, c.w * 0.28, c.h * 0.12, c.w * 0.44 * f, 7, 3); ctx.fill();
    if (s.slip > 0) { ctx.fillStyle = `rgba(214,92,66,${s.slip * 0.3})`; ctx.fillRect(0, 0, c.w, c.h); }
  },
  onDown(c, q) {
    const s = c.state;
    if (q.y < c.h * 0.18 || s.step >= 10) return true;
    const pick = q.x < c.w * 0.5 ? 0 : 1;
    if (pick === s.seq[s.step]) {
      s.step++; c.addScore(6); s.hold = 1.7; s.cheer = 0.5; c.hit("good");
      c.spark(q.x, q.y, "#f4d79b", 12, 110);
      if (s.step >= 10) c.end(true, c.score + 20);
    } else { s.slip = 0.6; c.hurt(1); }
    return true;
  }
};

Object.assign(GAMES, { desert, glean, deep, climb });

/* Give every existing game its painterly chapter backdrop and weather. */
const GAME_ART = {
  // The Elah action acts are staged on an EMPTY valley plate: the chapter art
  // already paints David and Goliath, and doubling them behind live actors read
  // as a ghost. The empty plate gives the painted sprites the stage.
  sling: ["assets/art/elah-field.jpg", "leaves"], lions: ["assets/art/lions.jpg", "embers"],
  jericho: ["assets/art/jericho.jpg", "sand"], storm: ["assets/art/storm.jpg", "rain"],
  prodigal: ["assets/art/prodigal.jpg", "petals"], esther: ["assets/art/esther.jpg", "embers"]
};
for (const [k, [art, weather]] of Object.entries(GAME_ART)) { GAMES[k].art = art; GAMES[k].weather = weather; }

/* ══════════════════════════════════════════════════════════════════════
   MULTI-ACT SET PIECES
   Every chapter now has a preparation act (sometimes two) before its climax.
   David gets three acts: search the brook → cross the valley under fire →
   sling the stone. The stones you actually find become your ammunition.
   ══════════════════════════════════════════════════════════════════════ */

const FG = {
  sling: "rocks", lions: "arch", jericho: "dunes", storm: "waves",
  prodigal: "reeds", esther: "arch", desert: "dunes", glean: "stalks",
  deep: "waves", climb: "branches"
};

const P = (art, weather) => ({ art: `assets/art/${art}.jpg`, weather });

export const PRELUDES = {
  /* ---------------------------------------------------- 1. David (3 acts) */
  sling: [
    {
      kind: "charge", hero: "david", ...P("elah-field", "leaves"),
      title: ["Practise the sling", "练习甩石"],
      prompt: ["The stones from the brook sit in your bag. Hold to wind the sling, then release inside the moving gold band — three clean swings before you step onto the field.",
        "从溪边捡来的石子就在袋里。按住转动机弦，在移动的金色区间里松手——上阵前先练成三次干净的挥甩。"],
      hint: ["Hold to wind · release in the band", "按住蓄力 · 在金带内松手"],
      rounds: 3, seconds: 24, reward: 40
    },
    {
      kind: "dodge", hero: "david", villain: "goliath", ...P("elah-field", "leaves"),
      title: ["Cross the valley", "穿过山谷"],
      prompt: ["Goliath hurls spears as David walks toward the line. Tap to leap over them. Four hits and you are knocked back — but the story goes on.",
        "大卫走向阵前时，歌利亚不断投出长枪。点击跳过。被击中四次会被逼退——但故事仍会继续。"],
      hint: ["Tap to jump · reach the battle line", "点击跳跃 · 走到阵前"],
      seconds: 17, reward: 30
    }
  ],

  /* --------------------------------------------------------- 2. Daniel */
  lions: [{
    kind: "rhythm", hero: "daniel", ...P("lions", "embers"),
    title: ["Keep the night watch", "守住夜里的祷告"],
    prompt: ["The guards pass in a rhythm. Tap as the light crosses the golden mark — three steady prayers before the den is sealed.",
      "守卫按节奏巡行。当光点穿过金色标记时点击——在坑口被封住前，守住三次祷告。"],
    hint: ["Tap on the mark · three times", "在标记处点击 · 共三次"],
    rounds: 3, seconds: 22, reward: 30, robe: "#4a4260"
  }],

  /* --------------------------------------------------------- 3. Jericho */
  jericho: [{
    kind: "trace", hero: "traveller", ...P("jericho", "sand"),
    title: ["The narrow road", "狭窄的山路"],
    prompt: ["Lead the donkey along the winding path without stepping off the edge. Keep your finger on the road all the way to the top.",
      "沿着弯曲的山路牵驴前行，别踩出路边。手指始终留在路上，一直走到顶端。"],
    hint: ["Drag along the road to the top", "沿路拖到顶端"],
    seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 4. Storm */
  storm: [{
    kind: "charge", hero: "fisherman", ...P("storm", "rain"),
    title: ["Haul the rope", "拉紧缆绳"],
    prompt: ["Hold to haul the rope, then release exactly inside the moving gold band. Three clean pulls and the boat is ready for the waves.",
      "按住拉绳，在移动的金色区间里松手。三次成功，船就能迎向风浪。"],
    hint: ["Hold to pull · release in the band", "按住拉绳 · 在金带内松手"],
    rounds: 3, seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 5. Prodigal */
  prodigal: [{
    kind: "trace", hero: "prodigal", ...P("prodigal", "petals"),
    title: ["The long road home", "漫长的回家路"],
    prompt: ["One step, then another. Stay on the path through the pig fields and the empty cups. The Father is waiting at the top of the road.",
      "一步，再一步。穿过猪群与空酒杯，始终留在路上。父亲在路的尽头等候。"],
    hint: ["Drag along the road to the top", "沿路拖到顶端"],
    seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 6. Esther */
  esther: [{
    kind: "order", ...P("esther", "embers"),
    title: ["Remember the decree", "记住谕旨的顺序"],
    prompt: ["Watch the royal seals light up, then tap them back in the same order. Two rounds — the second is longer. A mistake costs you time.",
      "看清王室印记亮起的顺序，再按同样的顺序点回来。两轮，第二轮更长。出错会损失时间。"],
    hint: ["Repeat the order of the seals", "按印记的顺序点回来"],
    rounds: 2, seconds: 34, reward: 30
  }],

  /* --------------------------------------------------------- 7. Burning bush */
  desert: [{
    kind: "sift", ...P("bush", "sand"),
    title: ["Search the wadi", "在旱谷中搜寻"],
    prompt: ["Three sheep have scattered into the ravine. Sweep the sand to uncover them before the light fails — avoid the empty shadows.",
      "三只羊走散在旱谷里。拂开沙土找出它们，趁天色未暗——避开那些空空的影子。"],
    hint: ["Drag to sweep · tap a sheep", "拖动拂开沙土 · 点击羊"],
    goal: 3, decoys: 6, seconds: 24, reward: 25,
    good: "#efe2c4", siltRgb: "108,80,50"
  }],

  /* --------------------------------------------------------- 8. Ruth */
  glean: [{
    kind: "rhythm", hero: "ruth", ...P("ruth", "petals"),
    title: ["Keep pace with the reapers", "跟上收割人的节奏"],
    prompt: ["Gleaning means moving with the harvesters, not ahead of them. Tap when the sheaf-light crosses the golden mark — three times.",
      "拾穗要跟着收割人的节奏，不能抢在前头。麦捆之光穿过金色标记时点击——共三次。"],
    hint: ["Tap on the mark · three times", "在标记处点击 · 共三次"],
    rounds: 3, seconds: 22, reward: 30, robe: "#5c6042"
  }],

  /* --------------------------------------------------------- 9. Jonah */
  deep: [{
    kind: "charge", ...P("jonah", "rain"),
    title: ["Hold your breath", "屏住呼吸"],
    prompt: ["Each dive needs exactly the right breath. Hold, then release inside the moving gold band — three dives before the fish arrives.",
      "每一次下潜都需要恰到好处的一口气。按住，在移动的金色区间里松手——大鱼到来前完成三次。"],
    hint: ["Hold to breathe in · release in the band", "按住吸气 · 在金带内松手"],
    rounds: 3, seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 10. Zacchaeus */
  climb: [{
    kind: "order", ...P("zacchaeus", "leaves"),
    title: ["Read the branches", "看清树枝"],
    prompt: ["The crowd points you up the tree. Watch which branches glow, then tap them back in order. Two rounds before Jesus passes.",
      "人群指示你往树上爬。看清哪些树枝亮起，再按顺序点回来。耶稣经过前要完成两轮。"],
    hint: ["Repeat the order of the branches", "按树枝的顺序点回来"],
    rounds: 2, seconds: 34, reward: 30
  }]
};

for (const [key, cfg] of Object.entries(PRELUDES)) {
  if (!GAMES[key]) continue;
  GAMES[key] = withStages(GAMES[key], cfg);
  GAMES[key].fg = FG[key] || "rocks";
}

export const ACT_COUNTS = Object.fromEntries(
  Object.entries(GAMES).map(([k, g]) => [k, g.actCount || 1])
);
