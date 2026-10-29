/* Ten story-specific action scenes. Each one really controls a character:
   drag to aim / move / steer, tap to jump / bail, hold to advance.
   Every scene ends with c.end(success, score) and feeds back into the story. */

import { tx, isZh } from "../core/i18n.js";
import { clamp, rnd, dist, loadArt, pilgrim, lion, pig, coin, giant, boat, scepter, star, roundRect,
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
  demo: "aimrelease",
  titleEn: "The Sling", titleZh: "甩石迎敌",
  promptEn: "Drag away from David to wind the sling, release to fire. Strike Goliath's forehead twice — mind the wind and his raised shield.",
  promptZh: "从大卫身后往外拖，蓄住力再松手投石。要打中歌利亚的额头两次。小心风，也小心他抬起来的盾牌。",
  hintEn: "Drag to aim · Release to fire", hintZh: "拖动瞄准 · 松手投出",
  howEn: "Drag back from David to draw the sling, then release to throw.", howZh: "从大卫身后往外拖，把机弦拉满，再松手投出。",
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
  demo: "drag",
  titleEn: "Through the Den", titleZh: "潜行狮子坑",
  promptEn: "Drag to move your pilgrim. Release to stand still and hide. Stay out of the lions' gaze and reach the light.",
  promptZh: "拖动让朝圣者往前走，松手就站住、藏住身影。避开狮子的目光，走进右边那道亮光里。",
  hintEn: "Drag to move · Release to hide", hintZh: "拖动往前走 · 松手就藏住",
  howEn: "Drag to walk him forward; let go and he stops and hides.", howZh: "拖动让他往前走，松手他就停下藏好。",
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

/* ══════════════════ 3. THE ROAD — carry him to the inn ══════════════════
   This used to be a lane-dodger with coins falling from the sky: fine for ten
   seconds, and about as connected to the parable as a racing stripe. What the
   text says the Samaritan actually did is go to him, bind his wounds, set him
   on his own beast and bring him to an inn. Two of those are physical acts, so
   the road is now played at arm's length on the painted night road: lift a
   dead weight onto a donkey, then keep your hand on him while the animal
   walks, because a man who cannot hold on will slide off. */

const CARRY_IMG = "assets/art/carry.jpg";
const CARRY_BODY = { fx: 0.295, fy: 0.845 };   // where he lies, in plate fractions
const CARRY_BACK = { fx: 0.745, fy: 0.428 };   // across the donkey's back, behind the neck

/* Dead weight, wrapped in a cloak: no limbs doing any work, so the silhouette
   is a bundle with a head and a fold or two, not a person standing up. */
function paintBundled(ctx, x, y, ang, sc, strip = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
  ctx.fillStyle = "rgba(8,6,4,.45)";
  ctx.beginPath(); ctx.ellipse(2, 12, 52, 20, 0, 0, TAU); ctx.fill();
  const g = ctx.createLinearGradient(0, -22, 0, 24);
  g.addColorStop(0, "#efe3c6"); g.addColorStop(0.38, "#d3c4a3");
  g.addColorStop(0.74, "#a1906f"); g.addColorStop(1, "#5b5040");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 54, 21, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(92,74,50,.42)"; ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 15 - 6, -18 + Math.abs(i) * 1.5);
    ctx.quadraticCurveTo(i * 15, 2, i * 15 + 9, 18 - Math.abs(i) * 1.5);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,248,226,.4)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, -12, 44, 7, 0, Math.PI, TAU); ctx.stroke();
  ctx.fillStyle = "#5f4835";
  ctx.beginPath(); ctx.ellipse(-50, -5, 15, 13, -0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = "#8a6b4e";
  ctx.beginPath(); ctx.ellipse(-52, -9, 11, 8, -0.3, 0, TAU); ctx.fill();
  if (strip > 0.4) {
    ctx.strokeStyle = "rgba(247,238,216,.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-40, -15); ctx.lineTo(-26, 13); ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ the clock
   No scene is failed by its clock, and none is closed by it either. Past zero
   the scene simply keeps running — the payout shrinks (scene.js pays it out) —
   and the player finishes when they actually do the thing, or leaves with the
   skip button. Nothing here may end a scene on the player's behalf. */

const jericho = {
  demo: "lift",
  titleEn: "Carry him to the inn", titleZh: "把他抬到客店",
  promptEn: "Lift him onto the donkey — he cannot help you, so use your whole hand — then keep your palm on him while the animal walks. Let go and he slides.",
  promptZh: "把他抬上驴背。他一点力气都使不上，得用整只手托住。上路以后手也别松，一松他就会滑下去。",
  hintEn: "Lift him onto the donkey", hintZh: "用整只手把他托上去",
  howEn: "Put your whole hand under him and lift him onto the donkey, then keep your finger on him as the road turns.", howZh: "用整只手把他托上驴背，路上手指别松，一路扶稳他。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      t: 0, left: 58, phase: "lift", lift: 0, steady: 0, tilt: 0, bob: 0,
      last: null, spot: pp(c, CARRY_BODY.fx, CARRY_BODY.fy), dust: [], flashRing: 0
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    const body = pp(c, CARRY_BODY.fx, CARRY_BODY.fy);
    const back = pp(c, CARRY_BACK.fx, CARRY_BACK.fy);
    const dy = s.last ? q.y - s.last.y : 0;

    if (s.phase === "lift") {
      /* Heavy: only upward travel of the finger counts, and only while the
         hand is actually on him. Nothing happens if you swipe the air. */
      const grip = dist(q.x, q.y, s.spot.x, s.spot.y) < 92;
      if (q.down && grip && dy < 0) {
        s.lift = clamp(s.lift + (-dy) / (c.h * 0.40), 0, 1);
        if (Math.random() < dt * 14) {
          s.dust.push({ x: s.spot.x + rnd(-26, 26), y: s.spot.y + rnd(-8, 12), v: rnd(10, 30), life: 0.7, r: rnd(3, 8) });
        }
      }
      s.spot = {
        x: body.x + (back.x - body.x) * s.lift,
        y: body.y + (back.y - body.y) * s.lift - Math.sin(s.lift * Math.PI) * c.h * 0.05
      };
      c.progress = s.lift * 0.5;
      c.setHint(`${tx("Lift him onto the donkey", "把他抬上驴背")}   ${Math.round(s.lift * 100)}%`);
      if (s.lift >= 1) {
        s.phase = "steady"; s.bob = 0; s.tilt = 0;
        c.hit("unlock"); c.addScore(20);
        c.spark(back.x, back.y, "#f4d79b", 20, 140);
        c.float(back.x, back.y - 40, tx("On the beast", "上了驴背"), "#f4d79b");
        c.setHint(tx("Keep your hand on him — the road is rough", "把手按在他身上——路很颠"));
      }
    } else {
      s.bob += dt;
      const step = Math.sin(s.bob * 2.3);
      s.steady = clamp(s.steady + dt * 0.2, 0, 1);
      /* Every step of the animal throws him a little; the only thing keeping
         him on is your hand. */
      const drift = step * 0.6 + Math.sin(s.bob * 0.83 + 1.7) * 0.4;
      const bundle = { x: back.x + step * 5, y: back.y - Math.abs(step) * 7 };
      const holding = q.down && dist(q.x, q.y, bundle.x, bundle.y) < 118;
      s.tilt += (holding ? -s.tilt * 2.4 + drift * 0.35 : drift * 1.15 - s.tilt * 0.4) * dt;
      if (holding && Math.abs(dy) > 3) s.tilt -= dy * 0.004;
      if (Math.abs(s.tilt) > 1.05) {
        s.tilt = 0; c.hurt(1);
        c.float(bundle.x, bundle.y - 30, tx("He slips", "他滑了一下"), "#e08b78");
        if (c.hearts <= 0) return;
      }
      s.spot = { x: bundle.x, y: bundle.y };
      s.holding = holding;
      c.progress = 0.5 + s.steady * 0.5;
      c.setHint(`${tx("Keep your hand on him — the road is rough", "把手按在他身上——路很颠")}   ${Math.round(s.steady * 100)}%`);
      if (s.steady >= 1) {
        c.hit("complete"); c.spark(bundle.x, bundle.y, "#fff0c8", 30, 170);
        c.end(true, c.score + 80); return;
      }
    }
    s.last = { x: q.x, y: q.y };
    for (const d of s.dust) { d.life -= dt; d.y -= d.v * dt; d.r += dt * 6; }
    s.dust = s.dust.filter((d) => d.life > 0);
  },
  onDown() {},
  onUp() {},
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, CARRY_IMG, 0.12);
    const body = pp(c, CARRY_BODY.fx, CARRY_BODY.fy);
    const back = pp(c, CARRY_BACK.fx, CARRY_BACK.fy);

    /* As he comes up, the painted man on the ground is shaded out, so the eye
       follows the weight instead of seeing two of him. */
    if (s.lift > 0.02) {
      // the ground he leaves goes dark as the lantern goes with him
      const sh = ctx.createRadialGradient(body.x + 4, body.y - 10, 8, body.x + 4, body.y - 10, 92);
      sh.addColorStop(0, `rgba(8,10,12,${clamp(s.lift * 0.9, 0, 0.86)})`);
      sh.addColorStop(0.62, `rgba(8,10,12,${clamp(s.lift * 0.7, 0, 0.66)})`);
      sh.addColorStop(1, "rgba(8,10,12,0)");
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(body.x + 4, body.y - 10, 108, 48, -0.14, 0, TAU);
      ctx.fill();
      // the lantern pool widens with the work
      const g = ctx.createRadialGradient(s.spot.x, s.spot.y - 30, 10, s.spot.x, s.spot.y - 30, c.w * 0.55);
      g.addColorStop(0, "rgba(255,206,132,.16)");
      g.addColorStop(1, "rgba(30,24,18,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
    }

    const ang = (s.phase === "lift" ? s.lift * 0.2 : 0.13 + s.tilt * 0.2) - 0.16;
    paintBundled(ctx, s.spot.x, s.spot.y, ang, 0.7, 1);

    // the grip: a soft ring where the hand belongs, so the scene is touchable
    if (s.phase === "lift" || s.holding) {
      ctx.strokeStyle = `rgba(247,221,165,${0.22 + Math.sin(c.t * 3) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.spot.x, s.spot.y, s.phase === "lift" ? 74 : 92, 0, TAU); ctx.stroke();
    }
    for (const d of s.dust) {
      ctx.fillStyle = `rgba(198,174,138,${d.life * 0.35})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    }
    if (s.phase === "steady" && Math.abs(s.tilt) > 0.55) {
      ctx.fillStyle = `rgba(224,139,120,${Math.min(0.28, (Math.abs(s.tilt) - 0.55) * 0.5)})`;
      ctx.fillRect(0, 0, c.w, c.h);
    }
    const vig = ctx.createRadialGradient(c.w * 0.5, c.h * 0.55, c.h * 0.22, c.w * 0.5, c.h * 0.6, c.h * 0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(4,7,10,.72)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, c.w, c.h);
    void body; void back;
  }
};

/* ══════════════════ 3b. THE WOUND — oil, wine and linen ══════════════════
   The Samaritan's mercy is the most physical beat in the whole parable, and it
   used to be a lantern hunt for three glowing marks on the chapter artwork.
   This is what the text says he actually did: he went to him, bound up his
   wounds, pouring in oil and wine. So the scene is painted at arm's length —
   the forearm, the gash, the oil flask, the wineskin, the linen — and the
   player does the pouring and the binding with their own finger.

   The plate `assets/art/tend.jpg` is a painted close-up of the wounded man's
   arm on his cloak. The wound, the linen and the props are drawn on top of it
   along the arm's own measured centreline, so the bandage wraps the painted
   limb instead of floating near it. If the plate is not loaded yet, the same
   geometry is painted procedurally underneath, so the scene never shows a hole
   where the arm should be. */

const TEND_IMG = { w: 760, h: 1017, src: "assets/art/tend.jpg" };

/* The painted arm, measured off the plate in image-normalised coordinates.
   f = fraction along the arm, y = centreline, hw = half thickness. */
const ARM_IMG = [
  [0.00, 0.714, 0.034], [0.08, 0.697, 0.052], [0.16, 0.685, 0.063],
  [0.24, 0.666, 0.065], [0.32, 0.645, 0.065], [0.40, 0.610, 0.065],
  [0.48, 0.567, 0.058], [0.56, 0.534, 0.055], [0.64, 0.477, 0.059],
  [0.72, 0.458, 0.062]
];

/* Cover-fit, exactly as the backdrop is drawn, so geometry and plate agree. */
function tendFit(c) {
  const s = Math.max(c.w / TEND_IMG.w, c.h / TEND_IMG.h);
  return { s, dx: (c.w - TEND_IMG.w * s) / 2, dy: (c.h - TEND_IMG.h * s) / 2 };
}

/* The arm as canvas-space points with their own half-width in pixels. */
function armPoints(c) {
  const f0 = tendFit(c), pts = [];
  const N = 21;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    if (!pts.length) {
      const [,, hw] = ARM_IMG[0];
      pts.push({ f, x: 0 * TEND_IMG.w * f0.s + f0.dx, y: ARM_IMG[0][1] * TEND_IMG.h * f0.s + f0.dy, hw: hw * TEND_IMG.h * f0.s });
      continue;
    }
    // linear interpolation along the measured table
    const pos = f * (ARM_IMG.length - 1);
    const k = Math.min(ARM_IMG.length - 2, Math.floor(pos));
    const t = pos - k;
    const a = ARM_IMG[k], b = ARM_IMG[k + 1];
    const ix = a[0] + (b[0] - a[0]) * t;
    const iy = a[1] + (b[1] - a[1]) * t;
    const ih = a[2] + (b[2] - a[2]) * t;
    pts.push({ f, x: ix * TEND_IMG.w * f0.s + f0.dx, y: iy * TEND_IMG.h * f0.s + f0.dy, hw: ih * TEND_IMG.h * f0.s });
  }
  return pts;
}

/* The wound runs along the middle of the forearm, where a robber's blade would
   land and where a bandage can actually be wound. Indices into armPoints(c). */
const WOUND_I0 = 8, WOUND_I1 = 12;
/* The same span as a fraction of the arm, for placing linen along it. */
const WOUND_U0 = WOUND_I0 / 20, WOUND_U1 = WOUND_I1 / 20;
const woundSeg = (pts) => pts.slice(WOUND_I0, WOUND_I1 + 1);

function armPath(ctx, pts, grow = 0) {
  ctx.beginPath();
  for (const p of pts) ctx.lineTo(p.x, p.y - p.hw - grow);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + pts[i].hw + grow);
  ctx.closePath();
}

/* One hand: a palm with four fingers and a thumb, lit from the upper right.
   Hands carry the whole performance here — they hold the flask, they wind the
   linen — so they get shading rather than a single flat silhouette. */
function paintHand(ctx, x, y, rot, sc) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, -14, 0, 16);
  g.addColorStop(0, "#e2b184"); g.addColorStop(0.5, "#b9815a"); g.addColorStop(1, "#6a432c");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 12, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = -0.58 + i * 0.32;
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = i % 2 ? "#c08a60" : "#d3a077";
    ctx.beginPath(); ctx.ellipse(17, -1.5, 10, 4.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(96,60,38,.4)";
    ctx.beginPath(); ctx.ellipse(23, -1.5, 3.6, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#bc855c";
  ctx.beginPath(); ctx.ellipse(-3, -11, 8, 4.4, -0.65, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(70,42,26,.3)";
  ctx.beginPath(); ctx.ellipse(-8, 3, 8, 6, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

/* A clay flask: thrown, not moulded. Highlight on the belly, dark under the
   spout, a cord round the neck. */
function paintFlask(ctx, x, y, tilt, sc) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(-12, -20, 12, 20);
  g.addColorStop(0, "#c08050"); g.addColorStop(0.45, "#8e5133"); g.addColorStop(1, "#3d1d12");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-4, -22); ctx.lineTo(4, -22);
  ctx.quadraticCurveTo(14, -9, 15, 2);
  ctx.quadraticCurveTo(16, 18, 0, 19);
  ctx.quadraticCurveTo(-16, 18, -15, 2);
  ctx.quadraticCurveTo(-14, -9, -4, -22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,226,180,.45)";
  ctx.beginPath(); ctx.ellipse(-5, 1, 3.2, 8, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2f1a0c";
  ctx.beginPath(); ctx.ellipse(0, -22, 5, 2.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(240,214,168,.5)"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(0, -4.5, 9, -8); ctx.stroke();
  ctx.restore();
}

/* A wound is not a red dot. It is a parted gash with a lip of torn skin, a dark
   centre, and blood that has already run and dried at the edges. `clean` moves
   it from crusted to washed without ever making it look trivial. */
function paintWound(ctx, pts, clean, t) {
  /* Painted skin is unforgiving: a saturated red shape on it reads as a decal
     no matter how well it is drawn. So the wound is built out of the things
     light actually does on broken skin — a dark parted line, a soft bruise
     halo, a dull wet sheen — and laid down in multiply so it stains the arm
     instead of sitting on top of it. */
  const seg = woundSeg(pts);
  if (seg.length < 3) return;
  const last = seg.length - 1;
  const cen = (i) => Math.sin((i / last) * Math.PI);

  // bruise: a wide, low-contrast shadow under and around the cut
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const mid = seg[Math.floor(seg.length / 2)];
  const bruise = ctx.createRadialGradient(mid.x, mid.y, 2, mid.x, mid.y, mid.hw * 2.1);
  bruise.addColorStop(0, `rgba(${150 + clean * 40},${86 + clean * 40},${80 + clean * 40},.55)`);
  bruise.addColorStop(0.55, `rgba(${176 + clean * 40},${128 + clean * 40},${118 + clean * 40},.3)`);
  bruise.addColorStop(1, "rgba(200,170,160,0)");
  ctx.fillStyle = bruise;
  ctx.beginPath();
  ctx.ellipse(mid.x, mid.y, mid.hw * 2.2, mid.hw * 1.5, -0.16, 0, TAU);
  ctx.fill();
  ctx.restore();

  // dried blood: thin, dark, and running only a short way
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.5 * (1 - clean * 0.6);
  for (let i = 1; i < seg.length - 1; i++) {
    const p = seg[i];
    const len = p.hw * (0.16 + hash(i * 3.1) * 0.22);
    const wob = (hash(i * 7.3) - 0.5) * 2.4;
    ctx.fillStyle = "rgba(120,52,44,.85)";
    ctx.beginPath();
    ctx.moveTo(p.x - 0.9, p.y + 1);
    ctx.quadraticCurveTo(p.x + wob, p.y + 1 + len * 0.6, p.x + wob * 0.6, p.y + 1 + len);
    ctx.quadraticCurveTo(p.x + wob + 1.1, p.y + 1 + len * 0.6, p.x + 1.1, p.y + 1);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // the cut itself: a ragged dark line with an uneven width, laid in multiply
  const wid = (i) => (0.55 + hash(i * 4.7) * 0.75) * Math.min(1, cen(i) * 2.2) * seg[i].hw * 0.075 + 0.7;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  /* A painted arm has pores and hair; a vector wound laid straight on top of
     them reads as a sticker. A little blur puts the cut into the same optical
     plane as the skin, and the crisp highlight below re-cuts its edge. */
  if (typeof ctx.filter === "string") ctx.filter = "blur(1.1px)";
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.fillStyle = `rgba(${92 + clean * 30},${44 + clean * 18},${38 + clean * 14},.9)`;
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const p = seg[i], w = wid(i);
    const jitterY = hash(i * 11.3) * 1.6 - 0.8;
    if (i === 0) ctx.moveTo(p.x, p.y - w + jitterY); else ctx.lineTo(p.x, p.y - w + jitterY);
  }
  for (let i = last; i >= 0; i--) {
    const p = seg[i], w = wid(i);
    ctx.lineTo(p.x + 0.6, p.y + w * 0.8 + (hash(i * 5.1) - 0.5));
  }
  ctx.closePath(); ctx.fill();
  // a hairline of lantern light on the upper lip of the parted skin
  ctx.strokeStyle = `rgba(${214 + clean * 26},${132 + clean * 30},${112 + clean * 24},.5)`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const p = seg[i], y = p.y - wid(i) - 1.1;
    if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
  }
  ctx.stroke();
  ctx.restore();

  // scab and grit, gone once the wound is washed
  if (clean < 0.98) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 20; i++) {
      const p = seg[Math.floor(hash(i * 5.7) * seg.length)] || seg[0];
      const dx = (hash(i * 2.3) - 0.5) * p.hw * 0.14, dy = (hash(i * 9.1) - 0.5) * 2.8;
      ctx.fillStyle = i % 3 ? `rgba(96,58,44,${(1 - clean) * 0.5})` : `rgba(210,192,164,${(1 - clean) * 0.4})`;
      ctx.beginPath(); ctx.arc(p.x + dx, p.y + dy, 0.6 + hash(i * 4.4) * 0.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // what the washing leaves behind: a wine stain, and oil catching the lantern
  if (clean > 0.04) {
    ctx.save();
    ctx.globalAlpha = clean * 0.3;
    const ws = ctx.createRadialGradient(mid.x, mid.y, 2, mid.x, mid.y, mid.hw * 1.6);
    ws.addColorStop(0, "rgba(96,26,52,.75)");
    ws.addColorStop(1, "rgba(70,16,38,0)");
    ctx.fillStyle = ws;
    ctx.beginPath(); ctx.ellipse(mid.x, mid.y + 2, mid.hw * 1.3, mid.hw * 0.9, -0.12, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,244,208,${clean * (0.3 + Math.sin(t * 2.4) * 0.08)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= last; i++) {
      const p = seg[i], y = p.y - wid(i) - 1.2;
      if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
    }
    ctx.stroke();
  }
}

/* Linen wound round a real arm reads as cloth only if it is shaded like cloth
   round a cylinder: brightest along the crest of the limb and darkening
   towards both ends, which thin out as the turn disappears behind the arm.
   Each turn is clipped to the arm, so it can never stick out past the
   silhouette, and carries the same warm lantern light as the skin beneath. */
/* A point part-way between two samples of the arm, for placing a turn of
   linen exactly where the bandage has been wound to. */
function armAt(pts, u) {
  const a = Math.max(0, Math.min(pts.length - 1, u * (pts.length - 1)));
  const k = Math.min(pts.length - 2, Math.floor(a));
  const t = a - k;
  const p = pts[k], q = pts[k + 1];
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, hw: p.hw + (q.hw - p.hw) * t };
}

function paintWrap(ctx, pts, u, opacity = 1, seed = 0) {
  const u0 = WOUND_U0 - 0.025, u1 = WOUND_U1 + 0.025;   // the cuff laps past the cut
  const pt = armAt(pts, u0 + (u1 - u0) * u);
  const ahead = armAt(pts, u0 + (u1 - u0) * Math.min(1, u + 0.04));
  /* A wound bandage is wound on a spiral, so each turn sits at a slightly
     different angle instead of squaring up to the arm like a paper band. */
  const ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) + Math.PI / 2 + (u - 0.5) * 0.22;
  ctx.save();
  armPath(ctx, pts, 2);
  ctx.clip();
  ctx.translate(pt.x, pt.y); ctx.rotate(ang);
  ctx.globalAlpha = opacity;
  /* Each turn is a little different: a hand-wound bandage is never even, and
     the slight variation in length and lean is what stops the cuff reading as
     a moulded sleeve. */
  const L = pt.hw * (1.02 + hash(seed * 3.7) * 0.12);
  const bw = pt.hw * 0.17 + 2.6;

  // the shadow this turn presses into the arm, and the crease of the one below
  ctx.fillStyle = "rgba(34,20,10,.4)";
  ctx.beginPath();
  ctx.ellipse(2.5, bw * 1.05, L * 0.9, bw * 1.3, 0, 0, TAU);
  ctx.fill();

  // the cloth: a lens shape, thinning to a point at either end
  const g = ctx.createLinearGradient(-L, 0, L, 0);
  g.addColorStop(0, "#8d7c62");
  g.addColorStop(0.14, "#cbb995");
  g.addColorStop(0.4, "#e8d8b8");
  g.addColorStop(0.55, "#f6ecd4");
  g.addColorStop(0.72, "#e2d1ae");
  g.addColorStop(0.9, "#bfae8b");
  g.addColorStop(1, "#8a7a60");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-L, 0);
  ctx.quadraticCurveTo(-L * 0.55, -bw * 1.15, -L * 0.12, -bw);
  ctx.quadraticCurveTo(L * 0.4, -bw * 1.1, L, bw * 0.1);
  ctx.quadraticCurveTo(L * 0.4, bw * 1.15, -L * 0.12, bw);
  ctx.quadraticCurveTo(-L * 0.55, bw * 1.1, -L, 0);
  ctx.closePath(); ctx.fill();

  // threads running the length of the cloth, bowed by the limb underneath
  ctx.strokeStyle = "rgba(134,116,86,.22)"; ctx.lineWidth = 0.9;
  for (let x = -L * 0.9; x < L * 0.9; x += 3.6) {
    const bow = (1 - Math.pow(Math.abs(x) / L, 1.8)) * bw * 0.86;
    ctx.beginPath();
    ctx.moveTo(x, -bow);
    ctx.quadraticCurveTo(x + 2.2, 0, x, bow);
    ctx.stroke();
  }
  // the crest catching the lantern, and the crease at the lower edge
  ctx.strokeStyle = "rgba(255,250,236,.42)"; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-L * 0.8, -bw * 0.5); ctx.quadraticCurveTo(0, -bw * 1.02, L * 0.8, -bw * 0.34);
  ctx.stroke();
  ctx.strokeStyle = "rgba(80,58,34,.3)"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-L * 0.8, bw * 0.62); ctx.quadraticCurveTo(0, bw * 1.1, L * 0.8, bw * 0.5);
  ctx.stroke();
  ctx.restore();
}

const tend = {
  demo: "drag",
  titleEn: "Tend the wound", titleZh: "为他包扎伤口",
  promptEn: "Pour oil and wine over the wound, then wind the linen round it. Drag slowly — a wound is not a thing to be hurried.",
  promptZh: "把油和酒倒在伤口上，再用麻布一圈圈缠好。慢慢拖——伤口不是赶时间的事。",
  hintEn: "Drag over the wound", hintZh: "在伤口上来回拖",
  howEn: "Drag back and forth across the wound to pour in the oil and wine, then wind the linen around it.", howZh: "在伤口上来回拖，把油和酒倒上去，再用麻布一圈圈缠好。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      t: 0, phase: "wash", clean: 0, wrap: 0, done: false,
      washed: {}, drips: [], glints: [], tilt: 0, lastX: null
    };
    c.setHint(tx("Drag over the wound to pour oil and wine", "在伤口上拖动，倒下油和酒"));
  },
  step(c, dt) {
    const s = c.state;
    s.t += dt;
    const pts = armPoints(c);
    const seg = woundSeg(pts);
    const q = c.pointer;

    if (s.phase === "wash") {
      if (q.down) {
        s.tilt += (0.9 - s.tilt) * dt * 9;
        /* Only the stretch of wound under the finger is washed, so the player
           has to move along it instead of holding still in one spot. */
        for (let i = 0; i < seg.length; i++) {
          const p = seg[i];
          const d = dist(q.x, q.y, p.x, p.y);
          if (d < 52) {
            s.washed[i] = clamp((s.washed[i] || 0) + dt * (2.1 - d / 60), 0, 1);
            if (Math.random() < dt * 9) {
              s.drips.push({ x: p.x + rnd(-6, 6), y: p.y + rnd(-3, 5), life: 0.7, vy: rnd(22, 54), wine: Math.random() < 0.55 });
            }
          }
        }
      } else s.tilt += (0 - s.tilt) * dt * 7;
      let sum = 0;
      for (let i = 0; i < seg.length; i++) sum += s.washed[i] || 0;
      s.clean = sum / seg.length;
      c.progress = s.clean * 0.5;
      c.setHint(`${tx("Pour oil and wine over the wound", "把油和酒倒在伤口上")}   ${Math.round(s.clean * 100)}%`);
      if (s.clean >= 0.92) {
        s.phase = "bind"; s.clean = 1;
        c.hit("unlock");
        const mid = seg[Math.floor(seg.length / 2)];
        c.spark(mid.x, mid.y, "#f4d79b", 26, 170);
        c.float(mid.x, mid.y - 40, tx("Cleaned", "已洗净"), "#f4d79b");
        c.setHint(tx("Now wind the linen round the wound", "现在用麻布把伤口缠好"));
      }
    } else if (s.phase === "bind") {
      const near = seg.some((p) => dist(q.x, q.y, p.x, p.y) < 66);
      if (q.down && near) {
        const dx = s.lastX === null ? 0 : Math.abs(q.x - s.lastX);
        s.wrap = clamp(s.wrap + dx / (c.w * 1.5), 0, 1);
        if (Math.random() < dt * 6) s.glints.push({ x: q.x + rnd(-14, 14), y: q.y + rnd(-10, 10), life: 0.6 });
      }
      s.lastX = q.x;
      c.progress = 0.5 + s.wrap * 0.5;
      c.setHint(`${tx("Wind the linen round the wound", "用麻布把伤口缠好")}   ${Math.round(s.wrap * 100)}%`);
      if (s.wrap >= 0.98) {
        s.wrap = 1; s.done = true;
        const mid = seg[Math.floor(seg.length / 2)];
        c.hit("complete"); c.spark(mid.x, mid.y, "#fff0c8", 34, 190);
        c.end(true, c.score + 70);
      }
    }

    for (const d of s.drips) { d.life -= dt; d.y += d.vy * dt; }
    s.drips = s.drips.filter((d) => d.life > 0);
    for (const g of s.glints) g.life -= dt;
    s.glints = s.glints.filter((g) => g.life > 0);
  },
  onDown(c) { c.state.lastX = null; },
  onUp() {},
  draw(c, ctx) {
    const s = c.state;
    const pts = armPoints(c);
    const seg = woundSeg(pts);
    const plate = loadArt(TEND_IMG.src);
    const gotPlate = !!(plate && plate.complete && plate.naturalWidth > 0);

    if (gotPlate) {
      /* The painted close-up: arm, cloak, cobbles, lantern. Cover-fit, then
         graded so the canvas UI stays readable over it. */
      const f = tendFit(c);
      try {
        ctx.drawImage(plate, f.dx, f.dy, TEND_IMG.w * f.s, TEND_IMG.h * f.s);
      } catch { /* not decodable yet */ }
      ctx.fillStyle = "rgba(6,10,14,.28)"; ctx.fillRect(0, 0, c.w, c.h);
      // warm pool from the lantern in the top right
      const lamp = ctx.createRadialGradient(c.w * 0.86, c.h * 0.1, 16, c.w * 0.86, c.h * 0.1, c.w * 1.05);
      lamp.addColorStop(0, "rgba(255,196,110,.2)");
      lamp.addColorStop(1, "rgba(30,26,20,0)");
      ctx.fillStyle = lamp; ctx.fillRect(0, 0, c.w, c.h);
    } else {
      /* Same geometry, painted by hand, so a slow first load never leaves a
         hole where the arm should be. */
      const sky = ctx.createLinearGradient(0, 0, 0, c.h);
      sky.addColorStop(0, "#0b1620"); sky.addColorStop(0.42, "#1b2a30"); sky.addColorStop(1, "#241b14");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, c.w, c.h);
      ctx.fillStyle = "rgba(46,52,50,.6)";
      ctx.beginPath();
      ctx.moveTo(0, c.h * 0.44);
      for (let x = 0; x <= c.w; x += 26) ctx.lineTo(x, c.h * 0.44 - Math.sin(x * 0.014 + 1.1) * 20 - hash(x) * 12);
      ctx.lineTo(c.w, c.h); ctx.lineTo(0, c.h); ctx.fill();
      const cloak = ctx.createLinearGradient(0, c.h * 0.5, 0, c.h);
      cloak.addColorStop(0, "#2e3a56"); cloak.addColorStop(0.55, "#1d2438"); cloak.addColorStop(1, "#10131c");
      ctx.fillStyle = cloak;
      ctx.beginPath();
      ctx.moveTo(-10, c.h * 0.86);
      ctx.quadraticCurveTo(c.w * 0.3, c.h * 0.7, c.w * 0.64, c.h * 0.78);
      ctx.quadraticCurveTo(c.w * 0.9, c.h * 0.84, c.w + 10, c.h * 0.78);
      ctx.lineTo(c.w + 10, c.h + 10); ctx.lineTo(-10, c.h + 10); ctx.closePath(); ctx.fill();
      const lamp = ctx.createRadialGradient(c.w * 0.86, c.h * 0.14, 20, c.w * 0.86, c.h * 0.14, c.w * 1.05);
      lamp.addColorStop(0, "rgba(255,196,110,.3)");
      lamp.addColorStop(1, "rgba(30,26,20,0)");
      ctx.fillStyle = lamp; ctx.fillRect(0, 0, c.w, c.h);
      ctx.save(); armPath(ctx, pts, 5);
      ctx.fillStyle = "rgba(10,8,6,.5)"; ctx.fill(); ctx.restore();
      armPath(ctx, pts);
      const skin = ctx.createLinearGradient(0, c.h * 0.5, 0, c.h * 0.8);
      skin.addColorStop(0, "#d7a276"); skin.addColorStop(0.4, "#bb8558");
      skin.addColorStop(0.75, "#8d5b3a"); skin.addColorStop(1, "#4a2d1e");
      ctx.fillStyle = skin; ctx.fill();
    }

    /* ---------------- the wound, and what we have done to it ------------ */
    paintWound(ctx, pts, s.clean, s.t);

    /* ---------------- linen --------------------------------------------- */
    /* Turns overlap: a bandage is a continuous cuff of cloth, so the number of
       visible turns is driven by how far the player has wound, and each new
       turn lands just past the last. */
    const TURNS = 40;
    const shownTurns = s.phase === "bind" ? Math.floor(s.wrap * TURNS) : 0;
    for (let k = 0; k <= shownTurns; k++) {
      paintWrap(ctx, pts, Math.min(1, k / (TURNS - 1)), 0.94, k);
    }
    if (shownTurns > 0) {
      /* the cuff sits in the same lantern light as the arm beneath it */
      const cuff = armAt(pts, (WOUND_U0 + WOUND_U1) / 2);
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      const warm = ctx.createRadialGradient(cuff.x - cuff.hw * 0.3, cuff.y - cuff.hw * 0.9, 4,
        cuff.x, cuff.y, cuff.hw * 2.6);
      warm.addColorStop(0, "rgba(255,238,206,.25)");
      warm.addColorStop(1, "rgba(196,176,146,.55)");
      ctx.fillStyle = warm;
      ctx.beginPath(); ctx.ellipse(cuff.x, cuff.y, cuff.hw * 1.9, cuff.hw * 1.5, -0.2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (s.wrap >= 1) {
      const p = pts[clamp(WOUND_I1 + 2, 0, pts.length - 1)];
      ctx.save(); ctx.translate(p.x, p.y - 4);
      ctx.fillStyle = "#efe3cb";
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 6.5, -0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#e6d8bd"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(4, 2); ctx.quadraticCurveTo(16, 6, 19, 15);
      ctx.moveTo(2, 4); ctx.quadraticCurveTo(9, 15, 5, 22); ctx.stroke();
      ctx.restore();
    }

    /* ---------------- what has run down the arm -------------------------- */
    for (const d of s.drips) {
      ctx.fillStyle = d.wine ? `rgba(120,26,52,${d.life * 0.7})` : `rgba(255,226,160,${d.life * 0.55})`;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 1.7, 3, 0, 0, TAU); ctx.fill();
    }

    /* ---------------- props, set down on the cloak ------------------------ */
    /* The painted plate already places a flask and a roll of linen on the
       stone, so nothing is duplicated while it is on screen. Only the linen
       the player is actually using gets drawn, and only while binding. */
    if (!gotPlate) {
      paintFlask(ctx, c.w * 0.87, c.h * 0.8, -0.42, 1.15);
      ctx.save();
      ctx.translate(c.w * 0.12, c.h * 0.52); ctx.rotate(-0.24);
      const linen = ctx.createLinearGradient(-16, -16, 16, 16);
      linen.addColorStop(0, "#efe2c6"); linen.addColorStop(1, "#b3a385");
      ctx.fillStyle = linen; ctx.beginPath(); ctx.ellipse(0, 0, 17, 13.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(140,124,98,.45)"; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 17 - i * 3.6, 13.5 - i * 2.9, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }

    /* ---------------- the Samaritan's hands ------------------------------ */
    const q = c.pointer;
    const mid = seg[Math.floor(seg.length / 2)];
    /* The player's finger stands in for the Samaritan's hand: the flask follows
       the touch, and is put away the moment the finger lifts. A hand drawn at a
       fixed resting position looked like a third person in the scene. */
    if (s.phase === "wash" && (q.down || s.tilt > 0.02)) {
      if (q.down) c.touchUi = false;   // the flask is the marker here
      const hx = (q.down ? q.x : mid.x + 40) + 30;
      const hy = (q.down ? q.y : mid.y - 84) - 70;
      paintFlask(ctx, hx, hy, s.tilt * 0.55, 1.35);
      paintHand(ctx, hx + 4, hy + 26, 0.55, 1.25);
      if (s.tilt > 0.15 && q.down) {
        // the pour: oil and wine, from the spout to the finger
        const sx = hx - Math.sin(s.tilt * 0.55) * 22, sy = hy - 22;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255,226,160,.7)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 4, (sy + q.y) / 2, q.x, q.y); ctx.stroke();
        ctx.strokeStyle = "rgba(150,40,70,.5)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx + 2, sy);
        ctx.quadraticCurveTo(sx + 6, (sy + q.y) / 2, q.x + 1.5, q.y); ctx.stroke();
        ctx.fillStyle = "rgba(255,240,200,.85)";
        ctx.beginPath(); ctx.arc(q.x, q.y, 2.5 + Math.sin(s.t * 12) * 0.6, 0, TAU); ctx.fill();
      }
    } else if (q.down) {
      const p = seg[Math.floor(s.wrap * (seg.length - 1))] || mid;
      const hx = q.x, hy = q.y;
      paintHand(ctx, hx - 15, hy, -0.5, 0.95);
      paintHand(ctx, hx + 19, hy + 5, 0.7, 0.9);
      if (s.wrap < 1) {
        ctx.strokeStyle = "rgba(240,230,208,.9)"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx - 15, hy); ctx.lineTo(hx + 19, hy + 5); ctx.stroke();
      }
      void p;
    }
    for (const g of s.glints) {
      ctx.fillStyle = `rgba(255,246,214,${g.life})`;
      ctx.beginPath(); ctx.arc(g.x, g.y, 1.6, 0, TAU); ctx.fill();
    }

    /* ---------------- light and vignette -------------------------------- */
    const vign = ctx.createRadialGradient(c.w * 0.5, c.h * 0.55, c.h * 0.2, c.w * 0.5, c.h * 0.58, c.h * 0.78);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(4,6,9,.7)");
    ctx.fillStyle = vign; ctx.fillRect(0, 0, c.w, c.h);
    if (s.phase === "bind" && s.wrap >= 0.98) {
      ctx.fillStyle = "rgba(255,240,205,.12)"; ctx.fillRect(0, 0, c.w, c.h);
    }
  }
};

/* ══════════════════ 3c. PAINTED PLATES ══════════════════
   Four interaction beats that used to be the same shared mechanic — a lantern
   you swept over a still painting, tapping glyphs that lit up, with decoys to
   make it feel like a game. They were the dullest moments in each chapter, and
   they were identical in all four. Each one is now a physical act on its own
   painted plate: feel for stones in a cold brook, unbolt and open a window
   toward Jerusalem, walk toward a fire that must not be rushed, and carry a
   cry through the streets of Nineveh.

   All four share one plate transform, so the paint and the hit areas can never
   drift apart. */

const PLATE = { w: 760, h: 1017 };
function plateT(c) {
  const s = Math.max(c.w / PLATE.w, c.h / PLATE.h);
  return { s, dx: (c.w - PLATE.w * s) / 2, dy: (c.h - PLATE.h * s) / 2 };
}
/* plate fraction → canvas pixels (and the scale, for sizing drawn detail) */
function pp(c, fx, fy) {
  const t = plateT(c);
  return { x: t.dx + fx * PLATE.w * t.s, y: t.dy + fy * PLATE.h * t.s, s: t.s };
}
function plateArt(c, ctx, src, dim = 0) {
  const t = plateT(c);
  const img = loadArt(src);
  let ok = false;
  if (img && img.complete && img.naturalWidth > 0) {
    try { ctx.drawImage(img, t.dx, t.dy, PLATE.w * t.s, PLATE.h * t.s); ok = true; } catch { ok = false; }
  }
  if (!ok) {
    const g = ctx.createLinearGradient(0, 0, 0, c.h);
    g.addColorStop(0, "#0b141b"); g.addColorStop(0.55, "#1b2422"); g.addColorStop(1, "#231c14");
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
  }
  if (dim > 0) { ctx.fillStyle = `rgba(6,9,12,${dim})`; ctx.fillRect(0, 0, c.w, c.h); }
  return ok;
}
function plateVignette(c, ctx, strength = 0.7) {
  const v = ctx.createRadialGradient(c.w * 0.5, c.h * 0.52, c.h * 0.2, c.w * 0.5, c.h * 0.58, c.h * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(4,6,9,${strength})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, c.w, c.h);
}

/* ─────────────────── 1. THE BROOK — five smooth stones ─────────────────── */
const stones = {
  demo: "drag",
  titleEn: "Five smooth stones", titleZh: "五块光滑的石子",
  promptEn: "Wade in and drag your hand slowly through the water. A hurried hand clouds the brook; only a still one can feel the difference between a smooth stone and a jagged one.",
  promptZh: "走进溪水，让手在水里慢慢移动。手一急，水就浑了；只有手静下来，才分得出光滑的石子和带棱角的石子。",
  hintEn: "Drag slowly through the water", hintZh: "手在水里慢慢移",
  howEn: "Move your finger slowly through the water; only still water shows which stones are smooth.", howZh: "手指在水里慢慢移；水静下来，才看得出哪块石子是光滑的。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    /* positions are plate fractions; the scattered ones near the bank are
       decoys, and they are the jagged ones */
    const spots = [
      [0.34, 0.52, 1], [0.60, 0.46, 0], [0.47, 0.62, 1], [0.68, 0.66, 1],
      [0.29, 0.70, 1], [0.55, 0.78, 0], [0.72, 0.38, 0], [0.40, 0.82, 1]
    ];
    c.state = {
      t: 0, left: 48, got: 0, grip: 0, gripI: -1, murk: 0, speed: 0,
      spots: spots.map(([fx, fy, smooth], i) => ({ fx, fy, smooth: !!smooth, got: false, i, pop: 0 })),
      rings: [], last: null
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    if (s.last) {
      const d = dist(q.x, q.y, s.last.x, s.last.y);
      s.speed = s.speed * 0.72 + (d / Math.max(0.001, dt)) * 0.28;
    }
    s.last = { x: q.x, y: q.y };
    s.murk = clamp(s.murk - dt * 0.5, 0, 1);

    let near = -1, nd = 1e9;
    for (const st of s.spots) {
      if (st.got) continue;
      const p = pp(c, st.fx, st.fy);
      st.px = p.x; st.py = p.y;              // canvas position, also used by the oracles
      const d = dist(q.x, q.y, p.x, p.y);
      if (d < 42 && d < nd) { nd = d; near = st.i; }
    }
    const calm = s.speed < 210 && s.murk < 0.72;
    /* The stone the hand is on, and whether the water is quiet enough to take
       it. The drawing code reads this to light it up. */
    s.near = calm ? near : -1;
    if (q.down && near >= 0 && calm) {
      if (s.gripI !== near) { s.gripI = near; s.grip = 0; }
      s.grip += dt;
      if (s.grip >= 0.5) {
        const st = s.spots[near];
        st.got = true; st.pop = 1; s.grip = 0; s.gripI = -1;
        const p = pp(c, st.fx, st.fy);
        c.ring(p.x, p.y, "rgba(198,232,242,.55)", 36);
        if (st.smooth) {
          s.got++; c.addScore(18); c.hit("good");
          c.spark(p.x, p.y, "#d8eef6", 14, 120);
          c.float(p.x, p.y - 24, tx("smooth", "光滑"), "#e6f4fa");
        } else {
          s.murk = clamp(s.murk + 0.3, 0, 1); c.hit("miss");
          c.float(p.x, p.y - 24, tx("jagged — it slips", "有棱角——滑走了"), "#cda887");
        }
      }
    } else {
      s.grip = Math.max(0, s.grip - dt * 1.8);
      if (q.down && s.speed >= 210) s.murk = clamp(s.murk + dt * 0.85, 0, 1);
    }
    for (const r of s.rings) { r.life -= dt; r.r += dt * 90; }
    s.rings = s.rings.filter((r) => r.life > 0);
    for (const st of s.spots) st.pop = Math.max(0, st.pop - dt * 1.6);

    c.progress = s.got / 5;
    /* The hint answers the question the hand is asking at that moment: are you
       on a stone, is the water quiet, and what now. */
    const line = s.near >= 0
      ? tx("Hold still — it is lifting", "按住别动，正在捡起")
      : s.murk > 0.55
        ? tx("Let the water clear, then drag slowly", "等水静下来，再慢慢拖")
        : tx("Drag slowly through the water", "在水中慢慢拖");
    c.setHint(`${line}   ${s.got}/5`);
    if (s.got >= 5 && !s.ended) {
      s.ended = true; c.hit("unlock"); c.end(true, c.score + 60); return;
    }
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, "assets/art/stones.jpg", 0.18);
    // the brook's own light: caustics sliding over the bed
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 7; i++) {
      const y = c.h * (0.42 + i * 0.07);
      ctx.strokeStyle = `rgba(196,232,236,${0.05 + 0.03 * Math.sin(s.t * 1.4 + i)})`;
      ctx.lineWidth = 2 + Math.sin(s.t + i) * 1.5;
      ctx.beginPath();
      for (let x = -10; x <= c.w + 10; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.04 + s.t * 1.6 + i) * 5);
      ctx.stroke();
    }
    ctx.restore();

    /* Nothing is drawn until a hand comes near it. The brook is painted, so the
       stones have to be felt through the water rather than printed on top of it:
       the one under the finger surfaces, the rest stay part of the bed. */
    for (const st of s.spots) {
      if (st.got) continue;
      const p = pp(c, st.fx, st.fy);
      const d = dist(c.pointer.x, c.pointer.y, p.x, p.y);
      const seen = clamp(1 - (d - 26) / 46, 0, 1) * (1 - s.murk * 0.75);
      if (seen <= 0.02) continue;
      const r = 13 * p.s;
      ctx.save();
      ctx.globalAlpha = seen * 0.85;
      const g = ctx.createLinearGradient(p.x, p.y - r, p.x, p.y + r);
      g.addColorStop(0, st.smooth ? "#9aa5a2" : "#8e7f6b");
      g.addColorStop(1, st.smooth ? "#3f4a48" : "#3a3227");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, r, r * 0.72, 0.18, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(236,248,250,.3)";
      ctx.beginPath(); ctx.ellipse(p.x - r * 0.3, p.y - r * 0.3, r * 0.38, r * 0.2, 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(214,238,242,${0.22 * seen})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, TAU); ctx.stroke();

      /* The stone the hand is actually on says so out loud: a slow gold pulse
         round it, and — once the finger is holding — an arc that fills as the
         stone comes away from the bed. Without this the water is pretty but
         silent, and a player cannot tell "I am close" from "I have it". */
      if (s.near === st.i) {
        const pulse = 0.5 + 0.5 * Math.sin(s.t * 4.2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(247,214,138,${0.4 + 0.35 * pulse})`;
        ctx.lineWidth = 2 + pulse;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 13 + pulse * 2, 0, TAU); ctx.stroke();
        const hold = s.gripI === st.i ? clamp(s.grip / 0.5, 0, 1) : 0;
        if (hold > 0.01) {
          ctx.strokeStyle = "rgba(255,240,196,.96)";
          ctx.lineWidth = 3.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 16, -Math.PI / 2, -Math.PI / 2 + TAU * hold); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.font = `600 ${Math.max(11, 12 * p.s)}px ${c.font}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = hold > 0.01 ? "rgba(255,244,214,.98)" : "rgba(255,236,190,.9)";
        ctx.fillText(hold > 0.01 ? tx("hold…", "按住…") : tx("hold to lift", "按住捡起"), p.x, p.y - r - 16);
      }
      ctx.restore();
    }

    // the murk a hurried hand stirs up
    if (s.murk > 0.02) {
      ctx.fillStyle = `rgba(150,146,120,${s.murk * 0.4})`;
      ctx.fillRect(0, 0, c.w, c.h);
    }
    // rings from the water, and the grip holding
    ctx.strokeStyle = "rgba(226,246,250,.34)"; ctx.lineWidth = 1.4;
    for (const r of s.rings) { ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke(); }
    /* The grip is reported to the shared lifted marker rather than drawn here:
       a 20 px ring under the thumb was invisible exactly when it mattered. */
    if (c.pointer.down && s.grip > 0.02) c.touchHold = clamp(s.grip / 0.5, 0, 1);
    if (c.pointer.down) {
      ctx.fillStyle = "rgba(226,246,250,.1)";
      ctx.beginPath(); ctx.arc(c.pointer.x, c.pointer.y, 15, 0, TAU); ctx.fill();
    }

    /* Stones already taken, laid out on the bank at the bottom of the frame:
       small, wet, and countable — no floating hand. */
    for (let i = 0; i < 5; i++) {
      const x = c.w * 0.5 + (i - 2) * 28, y = c.h - 56;
      ctx.save();
      ctx.globalAlpha = i < s.got ? 0.92 : 0.16;
      const g = ctx.createLinearGradient(x, y - 7, x, y + 7);
      g.addColorStop(0, i < s.got ? "#8f9c98" : "#4d5a57");
      g.addColorStop(1, i < s.got ? "#4b5754" : "#333d3b");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, 8.5, 6, 0.1, 0, TAU); ctx.fill();
      if (i < s.got) {
        ctx.fillStyle = "rgba(245,252,252,.4)";
        ctx.beginPath(); ctx.ellipse(x - 2.4, y - 2, 3, 1.6, 0.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    plateVignette(c, ctx, 0.66);
  }
};

/* ─────────────── 2. THE UPPER ROOM — a window toward heaven ─────────────── */
const WINDOW_IMG = "assets/art/window.jpg";
const WIN_LATCH = { fx: 0.532, fy: 0.455 };
const WIN_SPLIT = 0.494;                 // the seam between the two shutters
const windowScene = {
  demo: "lift",
  titleEn: "A window toward heaven", titleZh: "朝向天堂的窗",
  promptEn: "His windows were open toward Jerusalem. Lift the iron latch, then push each shutter wide — three times a day he did this, and a decree will not change it.",
  promptZh: "他的窗朝着耶路撒冷开着。先抬起铁闩，再把两扇窗推开。他一天三次这样做，禁令也改不了这件事。",
  hintEn: "Lift the latch", hintZh: "按住铁闩往上抬",
  howEn: "Lift the iron latch first, then push both shutters open.", howZh: "先把铁闩抬起来，再把两扇窗往外推开。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    c.state = { t: 0, phase: "latch", latch: 0, l: 0, r: 0, last: null, motes: [] };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt;
    const latch = pp(c, WIN_LATCH.fx, WIN_LATCH.fy);
    s.latchPt = { x: latch.x, y: latch.y };
    s.seamX = pp(c, WIN_SPLIT, 0.45).x;
    if (s.phase === "latch") {
      if (q.down && dist(q.x, q.y, latch.x, latch.y) < 78 && s.last) {
        s.latch = clamp(s.latch + Math.max(0, s.last.y - q.y) / (c.h * 0.05), 0, 1);
      }
      c.progress = s.latch * 0.22;
      c.setHint(`${tx("Lift the latch", "抬起铁闩")}   ${Math.round(s.latch * 100)}%`);
      if (s.latch >= 1) {
        s.phase = "open"; c.hit("unlock"); c.addScore(10);
        c.spark(latch.x, latch.y, "#f0c46a", 16, 110);
        c.float(latch.x, latch.y - 26, tx("Unlatched", "闩开了"), "#f0c46a");
        c.setHint(tx("Push the shutters open", "把两扇窗推开"));
      }
    } else {
      const cxs = pp(c, WIN_SPLIT, 0.4);
      const dxf = s.last ? q.x - s.last.x : 0;
      if (q.down && q.x < cxs.x) s.l = clamp(s.l + Math.max(0, -dxf) / (c.w * 0.3), 0, 1);
      if (q.down && q.x > cxs.x) s.r = clamp(s.r + Math.max(0, dxf) / (c.w * 0.3), 0, 1);
      c.progress = 0.22 + (s.l + s.r) * 0.39;
      c.setHint(`${tx("Push the shutters open", "把两扇窗推开")}   ${Math.round((s.l + s.r) / 2 * 100)}%`);
      if (s.l >= 1 && s.r >= 1) {
        c.hit("complete"); c.addScore(30);
        const beam = pp(c, WIN_SPLIT, 0.5);
        c.spark(beam.x, beam.y, "#fff4d6", 30, 150);
        c.end(true, c.score + 60); return;
      }
    }
    s.last = { x: q.x, y: q.y };
    // dust turning in the light
    if (s.l + s.r > 0.1 && Math.random() < dt * 14) {
      const beam = pp(c, WIN_SPLIT, 0.5);
      s.motes.push({ x: beam.x + rnd(-30, 30), y: beam.y + rnd(-20, 120), v: rnd(4, 14), life: rnd(1.6, 3.2) });
    }
    for (const m of s.motes) { m.life -= dt; m.y -= m.v * dt; }
    s.motes = s.motes.filter((m) => m.life > 0);
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, WINDOW_IMG, 0.3);
    const openAvg = clamp((s.l + s.r) / 2, 0, 1);
    const seam = pp(c, WIN_SPLIT, 0.4);
    const frameTop = pp(c, WIN_SPLIT, 0.2);
    const frameBot = pp(c, WIN_SPLIT, 0.62);

    /* The painted shutters cannot swing, so each one is shaded out as it opens
       and the dawn is drawn into the gap it leaves — which is what the eye
       actually reads. */
    /* A shutter that swings away leaves the room darker, not a black rectangle:
       the shadow is feathered so its edges dissolve into the plaster. */
    for (const [side, amt] of [[0, s.l], [1, s.r]]) {
      if (amt <= 0.01) continue;
      const a = pp(c, side ? WIN_SPLIT : 0.255, 0.19), b = pp(c, side ? 0.735 : WIN_SPLIT, 0.625);
      const gx = side ? b.x : a.x, gw = b.x - a.x;
      const sh = ctx.createLinearGradient(side ? gx : gx + gw, 0, side ? gx + gw : gx, 0);
      sh.addColorStop(0, `rgba(10,12,14,${clamp(amt * 0.9, 0, 0.9)})`);
      sh.addColorStop(1, "rgba(10,12,14,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(a.x, a.y, gw, b.y - a.y);
    }
    if (openAvg > 0.01) {
      const gap = 6 + openAvg * 46;
      const g = ctx.createLinearGradient(seam.x - gap, 0, seam.x + gap, 0);
      g.addColorStop(0, "rgba(255,226,170,0)");
      g.addColorStop(0.5, `rgba(255,238,198,${0.42 + openAvg * 0.36})`);
      g.addColorStop(1, "rgba(255,226,170,0)");
      ctx.save();
      ctx.beginPath();
      ctx.rect(seam.x - gap, frameTop.y, gap * 2, frameBot.y - frameTop.y);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(seam.x - gap, frameTop.y, gap * 2, frameBot.y - frameTop.y);
      // let the beam die away at the lintel and the sill instead of ending flat
      const fade = ctx.createLinearGradient(0, frameTop.y, 0, frameBot.y);
      fade.addColorStop(0, "rgba(0,0,0,.55)");
      fade.addColorStop(0.18, "rgba(0,0,0,0)");
      fade.addColorStop(0.78, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,.45)");
      ctx.fillStyle = fade;
      ctx.fillRect(seam.x - gap, frameTop.y, gap * 2, frameBot.y - frameTop.y);
      ctx.restore();
      // the shaft of light it throws across the floor
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const shaft = ctx.createLinearGradient(0, frameBot.y, 0, c.h);
      shaft.addColorStop(0, `rgba(255,232,182,${0.1 + openAvg * 0.22})`);
      shaft.addColorStop(1, "rgba(255,226,170,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(seam.x - gap, frameBot.y);
      ctx.lineTo(seam.x + gap, frameBot.y);
      ctx.lineTo(seam.x + gap + c.w * 0.34 * openAvg, c.h);
      ctx.lineTo(seam.x - gap - c.w * 0.34 * openAvg, c.h);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // the latch and its slot
    const latch = pp(c, WIN_LATCH.fx, WIN_LATCH.fy);
    const lift = s.latch * pp(c, 0, 0).s * 14;
    ctx.save();
    ctx.strokeStyle = "rgba(24,20,16,.55)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(latch.x - 26, latch.y + 12); ctx.lineTo(latch.x + 4, latch.y + 12); ctx.stroke();
    /* The latch is already painted, so it is lit rather than redrawn: a warm
       glint that travels up the bar as the player lifts it. */
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glint = ctx.createRadialGradient(latch.x - 6, latch.y - lift + 4, 1, latch.x - 6, latch.y - lift + 4, 26);
    glint.addColorStop(0, `rgba(255,226,168,${0.22 + s.latch * 0.4})`);
    glint.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = glint;
    ctx.beginPath(); ctx.arc(latch.x - 6, latch.y - lift + 4, 26, 0, TAU); ctx.fill();
    ctx.restore();
    if (s.phase === "latch") {
      ctx.strokeStyle = `rgba(247,221,165,${0.3 + Math.sin(s.t * 3) * 0.14})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(latch.x - 10, latch.y + 2, 40, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(255,244,214,.75)";
      ctx.beginPath();
      const ay = latch.y - 46 - Math.sin(s.t * 2.4) * 4;
      ctx.moveTo(latch.x - 10, ay); ctx.lineTo(latch.x - 16, ay + 11); ctx.lineTo(latch.x - 4, ay + 11);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    for (const m of s.motes) {
      ctx.fillStyle = `rgba(255,240,208,${Math.min(0.5, m.life * 0.3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, TAU); ctx.fill();
    }
    plateVignette(c, ctx, 0.72);
  }
};

/* ─────────────── 3. THE BUSH — do not come too close ─────────────── */
const flame = {
  demo: "lift",
  titleEn: "Do not come too close", titleZh: "不要近前",
  promptEn: "The flame does not consume the branches. Draw near to it slowly — a hurried approach makes it flare, and you will have to begin again. Three times it steadies before it speaks.",
  promptZh: "火烧着枝子却不烧掉。慢慢靠近——一急，火就窜起来，你得从头再来。它稳下来三次，才会开口。",
  hintEn: "Drag upward, slowly", hintZh: "手指慢慢往上拖",
  howEn: "Drag slowly upward, a little at a time — hurry, and the fire flares.", howZh: "手指一点一点往上拖；一急，火就窜起来。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    c.state = { t: 0, left: 62, approach: 0, hold: 0, steady: [0, 0, 0], steadyT: [0, 0, 0], flare: 0, embers: [] };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    s.flare = Math.max(0, s.flare - dt * 1.6);
    /* The distance closed is accumulated from the hand's own upward travel,
       not read off where the finger happens to land — so a touch high on the
       screen cannot skip the approach, and a jumpy drag is what flares. */
    let rate = 0;      // a lifted hand is not a rush
    if (q.down) {
      const up = Math.max(0, (s.lastY ?? q.y) - q.y);
      const dApproach = up / (c.h * 0.55);
      rate = dApproach / Math.max(0.001, dt);
      if (rate > 0.62) {
        s.approach = clamp(s.approach - 0.16, 0, 1);
        s.flare = 1; c.hit("miss"); c.bump(6);
        c.float(q.x, q.y - 20, tx("Too fast", "太急了"), "#e8a06f");
      } else {
        s.approach = clamp(s.approach + dApproach, 0, 1);
      }
    }
    s.lastY = q.y;
    const marks = [0.42, 0.66, 0.88];
    let done = 0;
    for (let i = 0; i < 3; i++) {
      if (s.steady[i]) { done++; continue; }
      if (s.approach >= marks[i] - 0.012) {
        if (Math.abs(rate) < 0.05) {
          s.steadyT[i] += dt;
          if (s.steadyT[i] > 0.85) {
            s.steady[i] = 1; done++;
            c.hit("good"); c.addScore(20);
            const f = pp(c, 0.505, 0.42);
            c.spark(f.x, f.y, "#ffd58a", 20, 130);
            c.float(f.x, f.y - 50, tx("Steady", "安定了"), "#ffd58a");
            c.ring(f.x, f.y, "rgba(255,200,120,.5)", 70);
          }
        } else s.steadyT[i] = Math.max(0, s.steadyT[i] - dt * 2);
      } else s.steadyT[i] = Math.max(0, s.steadyT[i] - dt);
    }
    if (Math.random() < dt * (4 + s.approach * 10)) {
      const f = pp(c, 0.505, 0.42);
      s.embers.push({ x: f.x + rnd(-24, 24), y: f.y + rnd(-10, 20), v: rnd(18, 46), life: rnd(0.8, 1.8) });
    }
    for (const e of s.embers) { e.life -= dt; e.y -= e.v * dt; e.x += Math.sin(e.y * 0.03) * 8 * dt; }
    s.embers = s.embers.filter((e) => e.life > 0);

    c.progress = done / 3;
    c.setHint(`${tx("Drag upward, slowly", "慢慢往上拖")}   ${done}/3`);
    if (done >= 3) { c.hit("unlock"); c.end(true, c.score + 60); return; }
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, "assets/art/flame.jpg", 0.12);
    const f = pp(c, 0.505, 0.42);

    // the fire answers how near you are
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(f.x, f.y, 6, f.x, f.y, c.w * (0.34 + s.approach * 0.22 + s.flare * 0.3));
    glow.addColorStop(0, `rgba(255,196,110,${0.24 + s.approach * 0.3 + s.flare * 0.4})`);
    glow.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();

    /* No invented flames: the painting's fire is the fire. What the player
       needs instead is a way to read how far they have dared to come, so the
       approach is drawn as a depth rail on the edge of the frame with the three
       places the fire steadies marked on it. */
    const railX = c.w - 22, railTop = c.h * 0.3, railBot = c.h * 0.64;
    const railY = (v) => railBot - v * (railBot - railTop);
    ctx.strokeStyle = "rgba(226,196,150,.18)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(railX, railTop); ctx.lineTo(railX, railBot); ctx.stroke();
    for (const m of [0.42, 0.66, 0.88]) {
      const i = m === 0.42 ? 0 : m === 0.66 ? 1 : 2;
      const lit = s.steady[i];
      ctx.strokeStyle = lit ? "rgba(255,228,170,.9)" : "rgba(226,196,150,.35)";
      ctx.lineWidth = lit ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(railX - 7, railY(m)); ctx.lineTo(railX + 7, railY(m)); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,226,170,.85)";
    ctx.beginPath(); ctx.arc(railX, railY(s.approach), 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,226,170,.18)";
    ctx.beginPath(); ctx.arc(railX, railY(s.approach), 9, 0, TAU); ctx.fill();

    for (const e of s.embers) {
      ctx.fillStyle = `rgba(255,196,120,${Math.min(0.8, e.life)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, 1.6, 0, TAU); ctx.fill();
    }

    // how far you have dared to come, and how still you are being about it
    if (c.pointer.down) {
      const next = s.steady[0] ? (s.steady[1] ? 2 : 1) : 0;
      c.touchHold = clamp(s.steadyT[next] / 0.85, 0, 1);
    }
    // the sandals left on the rock, warming
    const sd = pp(c, 0.36, 0.78);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255,190,120,${0.06 + s.approach * 0.12})`;
    ctx.beginPath(); ctx.ellipse(sd.x, sd.y, 60, 24, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
    if (s.flare > 0.02) {
      ctx.fillStyle = `rgba(255,176,96,${s.flare * 0.28})`;
      ctx.fillRect(0, 0, c.w, c.h);
    }
    plateVignette(c, ctx, 0.6);
  }
};

/* ─────────────── 4. NINEVEH — carry the cry through the city ─────────────── */
const cry = {
  demo: "walktap",
  titleEn: "Yet forty days", titleZh: "再等四十日",
  promptEn: "Nineveh is three days wide and the message is one sentence. Walk the street — drag to move — and stop where people are listening long enough to cry it out.",
  promptZh: "尼尼微大得三天也走不完，可要说的话只有一句。顺着街往前走，在有人肯听的地方停下，把话喊出去。",
  hintEn: "Drag to walk · stop and tap to cry", hintZh: "拖动往前走 · 停下喊话",
  howEn: "Drag to walk the street, stop where someone will listen, then tap to cry out.", howZh: "拖着往前走，在有人愿意听的地方停下，再点一下喊出来。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    c.state = {
      t: 0, left: 46, p: 0.08, last: null, calls: 0, wave: 0,
      doors: [{ u: 0.3, done: false }, { u: 0.56, done: false }, { u: 0.8, done: false }],
      cloth: [], motes: []
    };
    c.setHint(this.hint());
  },
  onDown(c) {
    const s = c.state;
    s.last = null;                    // a fresh press never reads as a jump
    for (const d of s.doors) {
      if (d.done) continue;
      if (Math.abs(d.u - s.p) < 0.07) {
        d.done = true; s.calls++; s.wave = 1;
        c.hit("good"); c.addScore(20);
        c.float(c.w * 0.5, c.h * 0.55, tx("They stop", "他们停住了"), "#ffd58a");
        c.ring(c.w * 0.5, c.h * 0.6, "rgba(255,214,150,.5)", 90);
        s.cloth.push({ u: d.u, life: 1 });
        return;
      }
    }
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    s.wave = Math.max(0, s.wave - dt * 1.4);
    if (q.down && s.last) {
      s.p = clamp(s.p + (q.x - s.last.x) / (c.w * 1.15), 0, 1);
    }
    s.last = { x: q.x, y: q.y };
    for (const k of s.cloth) k.life = Math.min(1, k.life + dt * 1.5);
    if (Math.random() < dt * 10) {
      s.motes.push({ x: rnd(0, c.w), y: rnd(c.h * 0.3, c.h * 0.8), v: rnd(3, 10), life: rnd(1.4, 3) });
    }
    for (const m of s.motes) { m.life -= dt; m.y -= m.v * dt; m.x += dt * 4; }
    s.motes = s.motes.filter((m) => m.life > 0);
    const near = s.doors.some((d) => !d.done && Math.abs(d.u - s.p) < 0.07);
    c.progress = s.calls / 3;
    c.setHint(near
      ? tx("Tap to cry out: “Yet forty days!”", "点击呼喊：「再等四十日！」")
      : `${tx("Drag to walk · stop and tap to cry", "拖动行走 · 停下点击呼喊")}   ${s.calls}/3`);
    if (s.calls >= 3) { c.hit("unlock"); c.end(true, c.score + 60); return; }
  },
  draw(c, ctx) {
    const s = c.state;
    /* The street pans with the walk, so the plate has to be drawn overscanned
       and the pan clamped to the overhang — otherwise walking left slides the
       painting off the canvas and the page shows through the gap. */
    const t = plateT(c);
    const s2 = t.s * 1.22;
    const over = Math.max(0, (PLATE.w * s2 - c.w) / 2);
    const pan = clamp(-(s.p - 0.5) * c.w * 0.55, -over, over);
    const img = loadArt("assets/art/cry.jpg");
    let drawn = false;
    if (img && img.complete && img.naturalWidth > 0) {
      try {
        ctx.drawImage(img, (c.w - PLATE.w * s2) / 2 + pan, (c.h - PLATE.h * s2) / 2, PLATE.w * s2, PLATE.h * s2);
        drawn = true;
      } catch { drawn = false; }
    }
    if (!drawn) {
      const g = ctx.createLinearGradient(0, 0, 0, c.h);
      g.addColorStop(0, "#241a12"); g.addColorStop(0.6, "#3a2a1c"); g.addColorStop(1, "#1a120c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
    }
    ctx.fillStyle = "rgba(8,8,10,.2)"; ctx.fillRect(0, 0, c.w, c.h);

    // where the street is listening
    for (const d of s.doors) {
      const x = c.w * 0.5 + (d.u - s.p) * c.w * 0.95;
      if (x < -120 || x > c.w + 120) continue;
      const near = Math.abs(d.u - s.p) < 0.07;
      if (!d.done) {
        // a pool of torchlight on the cobbles: somewhere people have stopped
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const pool = ctx.createRadialGradient(x, c.h * 0.86, 4, x, c.h * 0.86, near ? 96 : 62);
        pool.addColorStop(0, `rgba(255,206,138,${near ? 0.26 + Math.sin(s.t * 3.4) * 0.08 : 0.12})`);
        pool.addColorStop(1, "rgba(255,160,80,0)");
        ctx.fillStyle = pool;
        ctx.beginPath(); ctx.ellipse(x, c.h * 0.86, near ? 96 : 62, near ? 30 : 20, 0, 0, TAU); ctx.fill();
        ctx.restore();
        /* An arch of warm light around the doorway: the street is busy, so the
           one thing the player must find has to be the brightest thing on it. */
        ctx.strokeStyle = `rgba(255,222,166,${near ? 0.5 + Math.sin(s.t * 3.2) * 0.16 : 0.2})`;
        ctx.lineWidth = near ? 3 : 1.8;
        const top = c.h * 0.5, base = c.h * 0.86, half = near ? 72 : 58;
        ctx.beginPath();
        ctx.moveTo(x - half, base);
        ctx.lineTo(x - half, top + half * 0.7);
        ctx.quadraticCurveTo(x, top - half * 0.35, x + half, top + half * 0.7);
        ctx.lineTo(x + half, base);
        ctx.stroke();
      } else {
        // sackcloth going down over the stones, and the street gone quiet
        ctx.save();
        ctx.globalAlpha = d.life ?? 1;
        const sk = ctx.createLinearGradient(0, c.h * 0.7, 0, c.h * 0.84);
        sk.addColorStop(0, "rgba(64,58,48,.92)");
        sk.addColorStop(1, "rgba(34,30,26,.92)");
        ctx.fillStyle = sk;
        ctx.beginPath();
        ctx.moveTo(x - 70, c.h * 0.74);
        ctx.quadraticCurveTo(x, c.h * 0.7, x + 70, c.h * 0.75);
        ctx.lineTo(x + 86, c.h * 0.85);
        ctx.quadraticCurveTo(x, c.h * 0.8, x - 86, c.h * 0.84);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(150,138,116,.5)"; ctx.lineWidth = 1.4;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 18, c.h * 0.735);
          ctx.lineTo(x + i * 22, c.h * 0.84);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    for (const m of s.motes) {
      ctx.fillStyle = `rgba(226,206,170,${Math.min(0.4, m.life * 0.22)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, TAU); ctx.fill();
    }
    // the cry itself: rings off the mouth of the street
    if (s.wave > 0.02) {
      ctx.strokeStyle = `rgba(255,226,176,${s.wave * 0.55})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(c.w * 0.5, c.h * 1.02, 60 + (1 - s.wave) * 220 + i * 40, -Math.PI * 0.86, -Math.PI * 0.14);
        ctx.stroke();
      }
    }
    // walking dust
    if (c.pointer.down) {
      ctx.fillStyle = "rgba(198,174,138,.2)";
      ctx.beginPath(); ctx.ellipse(c.w * 0.5, c.h * 0.9, 46, 10, 0, 0, TAU); ctx.fill();
    }
    plateVignette(c, ctx, 0.62);
  }
};

/* ---------------------------------------------------------------- 4. STORM */

const storm = {
  demo: "steer",
  titleEn: "Hold the Tiller", titleZh: "掌舵迎浪",
  promptEn: "Drag to counter-steer the boat against the waves. Tap BAIL to throw water out. Survive until the storm breaks.",
  promptZh: "拖动船舵顶住风浪，舱里进了水就点一下「舀水」。撑到风浪过去。",
  hintEn: "Drag to steer · Tap to bail", hintZh: "拖动把舵 · 点「舀水」",
  howEn: "Drag the wheel to keep the bow into the waves, and tap to bail when water rises in the boat.", howZh: "拖动船舵顶住风浪，舱里水多了就点一下舀出去。",
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

/* ─────────────── 5. THE COURTYARD — the robe, the ring, the shoes ───────────────
   "Bring forth the best robe... and put a ring on his hand, and shoes on his
   feet." The old scene was an auto-runner over pigs and empty cups. The father's
   welcome is not an obstacle course; it is three things put on a person who
   cannot put them on himself, so the player does the putting. */
const GIFTS = [
  { id: "robe", en: "the robe", zh: "袍子", from: [0.405, 0.5], to: [0.545, 0.402], r: 0.075 },
  { id: "ring", en: "the ring", zh: "戒指", from: [0.762, 0.652], to: [0.699, 0.778], r: 0.055 },
  { id: "shoes", en: "the shoes", zh: "鞋", from: [0.79, 0.885], to: [0.383, 0.906], r: 0.06 }
];

function paintRing(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = "#f0c46a"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
  ctx.fillStyle = "rgba(255,236,180,.9)";
  ctx.beginPath(); ctx.arc(0, -6, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}
function paintShoe(ctx, x, y, s, ang = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -6, 0, 8);
  g.addColorStop(0, "#a97a4e"); g.addColorStop(1, "#5a3a22");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-13, -6, -2, -6);
  ctx.quadraticCurveTo(10, -6, 13, 2); ctx.quadraticCurveTo(14, 7, 4, 7);
  ctx.quadraticCurveTo(-8, 7, -12, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(240,214,168,.4)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(8, 1); ctx.stroke();
  ctx.restore();
}
function paintRobeCloth(ctx, x, y, s, lift) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -26, 0, 26);
  g.addColorStop(0, "#f6ecd2"); g.addColorStop(0.5, "#ddc9a4"); g.addColorStop(1, "#9c8763");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-22, -18);
  ctx.quadraticCurveTo(0, -30 - lift * 8, 24, -14);
  ctx.quadraticCurveTo(30, 6, 10, 22);
  ctx.quadraticCurveTo(-14, 30, -24, 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(126,104,74,.4)"; ctx.lineWidth = 1.3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(i * 9, -16); ctx.quadraticCurveTo(i * 11, 2, i * 8, 20); ctx.stroke();
  }
  ctx.restore();
}

const prodigal = {
  demo: "drag",
  titleEn: "Bring forth the best robe", titleZh: "把上好的袍子拿来",
  promptEn: "He is on his knees and has nothing left to put on himself. Drag the robe to his shoulders, the ring to his hand, the shoes to his feet.",
  promptZh: "他跪在地上，身上什么都没有了。把袍子披到他肩上，把戒指套到他手上，把鞋穿到他脚上。",
  hintEn: "Drag each gift onto him", hintZh: "把每一件礼物拖到他身上",
  howEn: "Drag each gift onto him — the robe, the ring, the sandals.", howZh: "把每一件礼物拖到他身上：袍子、戒指、鞋。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    c.state = {
      t: 0, left: 70, held: null, heldWhat: null, pos: {}, placed: {},
      gifts: GIFTS.map((g) => ({ ...g })), warm: 0, sparks: []
    };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    const scale = pp(c, 0, 0).s;
    if (q.down) {
      if (!s.heldWhat) {
        for (const g of s.gifts) {
          if (s.placed[g.id]) continue;
          const p = s.pos[g.id] || pp(c, g.from[0], g.from[1]);
          if (dist(q.x, q.y, p.x, p.y) < g.r * 620) { s.heldWhat = g.id; break; }
        }
      }
      if (s.heldWhat) s.pos[s.heldWhat] = { x: q.x, y: q.y };
    } else if (s.heldWhat) {
      const g = s.gifts.find((x) => x.id === s.heldWhat);
      const target = pp(c, g.to[0], g.to[1]);
      const p = s.pos[g.id];
      if (dist(p.x, p.y, target.x, target.y) < 86) {
        s.placed[g.id] = true; c.hit("good"); c.addScore(25);
        c.spark(target.x, target.y, "#f6e6c4", 18, 120);
        c.float(target.x, target.y - 34, tx(g.en, g.zh), "#f6e6c4");
        s.warm = Math.min(1, s.warm + 0.34);
        const n = Object.keys(s.placed).length;
        if (n >= 3) { c.hit("complete"); c.end(true, c.score + 70); return; }
      } else {
        c.hit("miss");
        c.float(p.x, p.y - 24, tx("not there", "放这儿不对"), "#d8b48e");
      }
      delete s.pos[g.id];
      s.heldWhat = null;
    }
    for (const g of s.gifts) {
      if (g.sx === undefined) {
        const a = pp(c, g.from[0], g.from[1]), b = pp(c, g.to[0], g.to[1]);
        g.sx = a.x; g.sy = a.y; g.tx = b.x; g.ty = b.y;
      }
    }
    const n = Object.keys(s.placed).length;
    c.progress = n / 3;
    c.setHint(`${tx("Drag each gift onto him", "把每一件礼物拖到他身上")}   ${n}/3`);
    void scale;
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, "assets/art/robe.jpg", 0.14 + (1 - s.warm) * 0.12);
    // the father's welcome warms the courtyard as each gift lands
    if (s.warm > 0) {
      const w = pp(c, 0.5, 0.55);
      const g = ctx.createRadialGradient(w.x, w.y, 20, w.x, w.y, c.w * 0.7);
      g.addColorStop(0, `rgba(255,214,150,${0.06 + s.warm * 0.14})`);
      g.addColorStop(1, "rgba(255,170,90,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
    }
    for (const g of s.gifts) {
      if (s.placed[g.id]) {
        const t = pp(c, g.to[0], g.to[1]);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const halo = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, 34);
        halo.addColorStop(0, "rgba(255,236,190,.3)");
        halo.addColorStop(1, "rgba(255,200,120,0)");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(t.x, t.y, 34, 0, TAU); ctx.fill();
        ctx.restore();
        /* The robe is already being laid on his shoulders in the painting, so
           it is lit rather than drawn again. The ring and the shoes are the two
           things the picture leaves off him. */
        if (g.id === "ring") paintRing(ctx, t.x, t.y, 1.15);
        if (g.id === "shoes") { paintShoe(ctx, t.x - 16, t.y + 2, 0.72, -0.08); paintShoe(ctx, t.x + 12, t.y + 6, 0.68, 0.1); }
        continue;
      }
      const p = s.pos[g.id] || pp(c, g.from[0], g.from[1]);
      const held = s.heldWhat === g.id;
      const bob = Math.sin(s.t * 2 + g.from[0] * 9) * 2;
      ctx.save();
      ctx.globalAlpha = held ? 1 : 0.9;
      if (g.id === "robe") paintRobeCloth(ctx, p.x, p.y + bob, 1.1, held ? 1 : 0);
      if (g.id === "ring") paintRing(ctx, p.x, p.y + bob, 1.3);
      if (g.id === "shoes") { paintShoe(ctx, p.x - 10, p.y + bob, 1, -0.12); paintShoe(ctx, p.x + 12, p.y + 4 + bob, 0.95, 0.1); }
      ctx.restore();
      // where it belongs, while you are carrying it
      if (held) {
        const t = pp(c, g.to[0], g.to[1]);
        ctx.strokeStyle = `rgba(247,221,165,${0.35 + Math.sin(s.t * 5) * 0.15})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, 30, 0, TAU); ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      }
    }
    plateVignette(c, ctx, 0.55);
  }
};

/* ─────────────── 6. THE HALL — three steps, then kneel ─────────────── */
const STEPS = 3;

/* --------------------------------------------------------------- 6. ESTHER */

const esther = {
  demo: "lift",
  titleEn: "If I perish, I perish", titleZh: "我若死就死吧",
  promptEn: "Cross the hall a step at a time, and let each step finish before you take the next. Then kneel at the edge of the carpet and wait: the sceptre is his to extend, not yours to take.",
  promptZh: "一步一步穿过大厅，一步走稳了再走下一步。走到毯边跪下，然后等——金杖要他伸出来，不能自己去拿。",
  hintEn: "Drag up to step · then kneel", hintZh: "往上拖一步 · 再跪下",
  howEn: "Drag upward to take one steady step at a time, then kneel at the carpet and wait for the sceptre.", howZh: "往上拖，一步走稳了再走下一步；到毯边跪下，等王伸出金杖。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 0; c.hearts = 0;
    c.state = { t: 0, left: 72, phase: "walk", steps: 0, pressY: null, lastStep: -9, rush: 0, kneel: 0, scepter: 0, guards: 0 };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    s.rush = Math.max(0, s.rush - dt * 1.2);
    s.guards = Math.max(0, s.guards - dt * 1.4);
    if (s.phase === "walk") {
      if (q.down) {
        if (s.pressY === null) s.pressY = q.y;
        if (s.pressY - q.y > 62) {
          const gap = s.t - s.lastStep;
          if (gap < 0.85) {
            // too quick for a king's hall: the guards close the way
            s.steps = Math.max(0, s.steps - 1); s.guards = 1; s.rush = 1;
            c.hit("miss"); c.bump(5);
            c.float(c.w / 2, c.h * 0.55, tx("Not so fast", "别走得太急"), "#e8a06f");
          } else {
            s.steps++; s.lastStep = s.t;
            c.hit("good"); c.addScore(12);
            c.ring(c.w * 0.5, c.h * (0.9 - s.steps * 0.09), "rgba(255,220,160,.5)", 60);
          }
          s.pressY = q.y;
          if (s.steps >= STEPS) { s.phase = "kneel"; c.hit("unlock"); c.setHint(tx("Kneel, and wait", "跪下，等候")); }
        }
      } else s.pressY = null;
      c.progress = (s.steps / STEPS) * 0.6;
      if (s.phase === "walk") c.setHint(`${tx("Drag up to step · then kneel", "向上拖动走一步 · 然后跪下")}   ${s.steps}/${STEPS}`);
    } else if (s.phase === "kneel") {
      if (q.down) { s.kneel += dt; c.progress = 0.6 + Math.min(1, s.kneel / 1.8) * 0.2; }
      else s.kneel = Math.max(0, s.kneel - dt * 0.6);
      if (s.kneel >= 1.8) {
        s.phase = "sceptre"; c.hit("unlock");
        c.float(c.w / 2, c.h * 0.42, tx("He holds it out", "他伸出金杖"), "#ffe6ac");
      }
      c.setHint(`${tx("Kneel, and wait", "跪下，等候")}   ${Math.round(Math.min(1, s.kneel / 1.8) * 100)}%`);
    } else {
      s.scepter = Math.min(1, s.scepter + dt * 0.8);
      c.progress = 0.8 + s.scepter * 0.2;
      c.setHint(tx("Touch the sceptre", "触摸金杖"));
      if (s.scepter >= 1) {
        const tip = pp(c, 0.5, 0.66);
        if (q.down && dist(q.x, q.y, tip.x, tip.y) < 90) {
          c.hit("complete"); c.spark(tip.x, tip.y, "#fff0c8", 30, 170);
          c.end(true, c.score + 80);
        }
      }
    }
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, "assets/art/hall.jpg", 0.1);
    const throne = pp(c, 0.47, 0.5);
    // the way already walked, lit on the carpet
    const done = s.phase === "walk" ? s.steps / STEPS : 1;
    for (let i = 0; i < 3; i++) {
      const p = pp(c, 0.5, 0.9 - i * 0.075);
      const on = (i + 1) / 3 <= done || (s.phase !== "walk" && i >= 0);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, on ? 60 : 34);
      g.addColorStop(0, `rgba(255,222,164,${on ? 0.22 : 0.07})`);
      g.addColorStop(1, "rgba(255,180,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, on ? 60 : 34, on ? 22 : 12, 0, 0, TAU); ctx.fill();
      ctx.restore();
      if (on && s.phase === "walk" && i + 1 === s.steps) {
        ctx.fillStyle = `rgba(255,236,196,${0.4 + Math.sin(s.t * 4) * 0.15})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill();
      }
    }
    // kneeling: the light gathers on you
    if (s.phase !== "walk") {
      const p = pp(c, 0.5, 0.62);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, 120);
      g.addColorStop(0, `rgba(255,226,170,${0.12 + s.scepter * 0.2})`);
      g.addColorStop(1, "rgba(255,180,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 120, 60, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // the sceptre reaches out across the hall: a gold rod, held out, not taken
    if (s.scepter > 0) {
      const from = { x: throne.x + 10, y: throne.y + 26 };
      const to = pp(c, 0.5, 0.66);
      const ex = from.x + (to.x - from.x) * s.scepter, ey = from.y + (to.y - from.y) * s.scepter;
      const ang = Math.atan2(ey - from.y, ex - from.x);
      ctx.save();
      ctx.translate(from.x, from.y); ctx.rotate(ang);
      const len = Math.hypot(ex - from.x, ey - from.y);
      const g = ctx.createLinearGradient(0, -4, 0, 4);
      g.addColorStop(0, "#fff3c8"); g.addColorStop(0.5, "#e3b25e"); g.addColorStop(1, "#8d6224");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, -3, len, 6, 3) : ctx.rect(0, -3, len, 6); ctx.fill();
      ctx.restore();
      // the head of the sceptre at the far end, where the hand must reach
      ctx.fillStyle = "rgba(255,238,196,.95)";
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, TAU); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const halo = ctx.createRadialGradient(ex, ey, 2, ex, ey, 44);
      halo.addColorStop(0, "rgba(255,236,190,.55)");
      halo.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(ex, ey, 44, 0, TAU); ctx.fill();
      ctx.restore();
      if (s.scepter >= 1) {
        ctx.strokeStyle = `rgba(255,240,200,${0.3 + Math.sin(s.t * 3) * 0.14})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex, ey, 30, 0, TAU); ctx.stroke();
      }
    }
    // the guards at the threshold, when you hurry
    if (s.guards > 0.02) {
      for (const side of [0.1, 0.9]) {
        const p = pp(c, side, 0.8);
        ctx.strokeStyle = `rgba(220,180,140,${s.guards * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(p.x - 30, p.y - 60); ctx.lineTo(p.x + 40, p.y + 40); ctx.stroke();
      }
    }
    plateVignette(c, ctx, 0.6);
  }
};

/* ─────────────── 9. THE BELLY — three days, and the prayer ─────────────── */

export const GAMES = {
  sling, lions, jericho, tend, stones,
  window: windowScene, flame, cry,
  storm, prodigal, esther
};

/* ══════════════════════ 7a. BURNING BUSH — follow the flock ══════════════════════ */
const desert = {
  demo: "drag",
  art: "assets/art/bush.jpg", weather: "sand",
  titleEn: "Follow the flock", titleZh: "跟随羊群",
  promptEn: "Three sheep have wandered into the wadi. Gather them, then lead the flock to the burning bush before the sandstorm closes in.",
  promptZh: "三只羊走散在旱谷里。先把它们找齐，再赶在沙暴合拢之前，把羊群带到那丛燃烧的荆棘前。",
  hintEn: "Drag to walk · collect all 3 sheep · reach the bush", hintZh: "拖动行走 · 找齐 3 只羊 · 赶到荆棘前",
  howEn: "Drag to walk, gather the three lost sheep, then reach the burning bush.", howZh: "拖着走，先找齐三只走散的羊，再赶到那丛燃烧的荆棘前。",
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
  demo: "catch",
  art: "assets/art/ruth.jpg", weather: "petals",
  titleEn: "Glean the field", titleZh: "拾取麦穗",
  promptEn: "Gather 12 sheaves of barley before the sun sets. Keep clear of the swinging sickles — Boaz has told his men to leave extra for you.",
  promptZh: "天黑之前拾满 12 捆麦穗。躲开挥过来的镰刀。波阿斯已经吩咐过仆人，特意给你留了麦子。",
  hintEn: "Drag to move · dodge the sickles · 12 sheaves", hintZh: "拖动走动 · 躲开镰刀 · 拾满 12 捆",
  howEn: "Drag to move through the field, dodge the sickles, and gather twelve sheaves.", howZh: "拖着在田里走动，躲开挥来的镰刀，拾满十二捆麦穗。",
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
  demo: "drag",
  titleEn: "Three days in the deep", titleZh: "在深处三日",
  promptEn: "The belly breathes, and when it presses in you must be perfectly still. Between the swells, pull the kelp off your arms before it wraps you.",
  promptZh: "鱼腹在呼吸。它一收紧，你就得完全不动；松开的空档里，把缠在手臂上的海草扯下来。",
  hintEn: "Clear the kelp · hold still when the belly presses", hintZh: "扯掉海草 · 鱼腹一紧就别动",
  howEn: "Clear the kelp with your finger; when the belly tightens, hold still.", howZh: "用手指把缠住的海草扯掉；鱼腹一收紧，就完全别动。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      t: 0, left: 74, round: 0, phase: "kelp", hold: 0, press: 0, swell: 0,
      strands: [], grip: 0, gripI: -1, last: null, splash: [], prayers: []
    };
    c.setHint(this.hint());
    spawnKelp(c);
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    s.press = Math.max(0, s.press - dt);
    if (s.phase === "kelp") {
      const speed = s.last ? dist(q.x, q.y, s.last.x, s.last.y) / Math.max(0.001, dt) : 0;
      let near = -1, nd = 1e9;
      for (let idx = 0; idx < s.strands.length; idx++) {
        const k = s.strands[idx];
        if (k.free) continue;
        const d = dist(q.x, q.y, k.x, k.y);
        if (d < 46 && d < nd) { nd = d; near = idx; }
      }
      if (q.down && near >= 0 && speed > 120) {
        if (s.gripI !== near) { s.gripI = near; s.grip = 0; }
        s.grip += dt * 2.2;
        if (s.grip >= 1) {
          const k = s.strands[near];
          k.free = true; s.grip = 0; s.gripI = -1;
          c.hit("good"); c.addScore(10);
          c.spark(k.x, k.y, "#9fd8d0", 12, 110);
          s.splash.push({ x: k.x, y: k.y, life: 0.7 });
        }
      } else { s.grip = Math.max(0, s.grip - dt * 1.5); s.gripI = -1; }
      if (s.strands.every((k) => k.free)) {
        s.phase = "swell"; s.swell = 0; s.hold = 0;
        c.setHint(tx("Be still", "不要动"));
      }
      const left = s.strands.filter((k) => !k.free).length;
      c.progress = (s.round / 3) * 0.9 + (1 - left / Math.max(1, s.strands.length)) * 0.1;
      if (s.phase === "kelp") c.setHint(`${tx("Clear the kelp", "扯下海草")}   ${s.strands.length - left}/${s.strands.length}`);
    } else {
      s.swell += dt;
      const moving = q.down && s.last && dist(q.x, q.y, s.last.x, s.last.y) > 3.5;
      if (moving) {
        s.hold = Math.max(0, s.hold - dt * 2);
        if (s.press <= 0) { s.press = 1; c.hurt(1); if (c.hearts <= 0) return; }
      } else s.hold += dt;
      c.progress = (s.round / 3) * 0.9 + Math.min(1, s.hold / 1.5) * 0.1;
      c.setHint(`${tx("Be still — the belly is pressing", "不要动——鱼腹在收紧")}   ${Math.round(Math.min(1, s.hold / 1.5) * 100)}%`);
      if (s.hold >= 1.5) {
        s.round++;
        c.hit("good"); c.addScore(24);
        const line = roundPrayer(s.round);
        c.float(c.w / 2, c.h * 0.4, line, "#cfe8e4");
        s.prayers.push({ text: line, life: 2.4 });
        if (s.round >= 3) {
          c.hit("complete"); c.spark(c.w * 0.5, c.h * 0.3, "#dff2ee", 34, 160);
          c.end(true, c.score + 80); return;
        }
        s.phase = "kelp"; spawnKelp(c);
        c.setHint(tx("Clear the kelp", "扯下海草"));
      }
    }
    s.last = { x: q.x, y: q.y };
    for (const w of s.splash) w.life -= dt;
    s.splash = s.splash.filter((w) => w.life > 0);
    for (const p of s.prayers) p.life -= dt;
    s.prayers = s.prayers.filter((p) => p.life > 0);
  },
  draw(c, ctx) {
    const s = c.state;
    plateArt(c, ctx, "assets/art/belly.jpg", 0.28 + s.swell * 0.12);
    const light = pp(c, 0.5, 0.3);
    // the ribs close in as the belly presses
    if (s.phase === "swell" || s.swell > 0) {
      const k = Math.min(1, s.swell / 1.5);
      ctx.fillStyle = `rgba(3,8,10,${0.1 + k * 0.28})`;
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.strokeStyle = `rgba(120,170,164,${0.1 + k * 0.2})`;
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(c.w * (0.5 + side * 0.52), 0);
        ctx.quadraticCurveTo(c.w * (0.5 + side * (0.38 - k * 0.06)), c.h * 0.5, c.w * (0.5 + side * 0.52), c.h);
        ctx.stroke();
      }
    }
    /* Kelp: a tapered blade with fronds, not a stick. It sways in the water and
       catches on the arm, which is why it has to be pulled off. */
    for (let idx = 0; idx < s.strands.length; idx++) {
      const k = s.strands[idx];
      if (k.free) continue;
      const wob = Math.sin(s.t * 0.9 + k.i) * 8;
      const tipX = k.x + wob, tipY = k.y - 64;
      const g = ctx.createLinearGradient(tipX, tipY, k.x, k.y + 70);
      g.addColorStop(0, "rgba(96,140,104,.85)");
      g.addColorStop(0.45, "rgba(44,86,72,.95)");
      g.addColorStop(1, "rgba(14,32,28,.95)");
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(tipX - 3, tipY);
      ctx.quadraticCurveTo(tipX - 14 + wob * 0.2, k.y - 20, k.x - 11, k.y + 34);
      ctx.quadraticCurveTo(k.x - 3, k.y + 58, k.x + 4, k.y + 62);
      ctx.quadraticCurveTo(k.x + 13, k.y + 26, tipX + 12 + wob * 0.2, k.y - 22);
      ctx.quadraticCurveTo(tipX + 5, k.y - 44, tipX + 3, tipY);
      ctx.closePath(); ctx.fill();
      // the spine and a couple of fronds
      ctx.strokeStyle = "rgba(150,196,160,.35)"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY + 4);
      ctx.quadraticCurveTo(k.x + wob * 0.3, k.y - 10, k.x + 1, k.y + 52);
      ctx.stroke();
      for (let f = 0; f < 3; f++) {
        const fy = k.y - 30 + f * 26;
        ctx.beginPath();
        ctx.moveTo(k.x + wob * 0.2, fy);
        ctx.quadraticCurveTo(k.x + 22, fy - 8, k.x + 30, fy + 6);
        ctx.stroke();
      }
      ctx.restore();
      // where the hand should take hold
      const gripPt = { x: k.x + wob * 0.4, y: k.y };
      ctx.strokeStyle = `rgba(190,232,224,${0.16 + Math.sin(s.t * 2.4 + k.i) * 0.06})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(gripPt.x, gripPt.y, 30, 0, TAU); ctx.stroke();
      if (s.gripI === idx && s.grip > 0.05) {
        ctx.strokeStyle = "rgba(214,244,238,.9)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(gripPt.x, gripPt.y, 26, -Math.PI / 2, -Math.PI / 2 + s.grip * TAU); ctx.stroke();
      }
    }
    for (const w of s.splash) {
      ctx.strokeStyle = `rgba(190,230,226,${w.life * 0.5})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(w.x, w.y, (1 - w.life) * 40 + 6, 0, TAU); ctx.stroke();
    }
    // the shaft of light: dim while the belly presses, brighter each day survived
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const beam = ctx.createLinearGradient(0, light.y - 40, 0, c.h);
    beam.addColorStop(0, `rgba(210,238,236,${0.1 + s.round * 0.05 - s.swell * 0.03})`);
    beam.addColorStop(1, "rgba(150,210,205,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(c.w * 0.42, light.y); ctx.lineTo(c.w * 0.58, light.y);
    ctx.lineTo(c.w * 0.82, c.h); ctx.lineTo(c.w * 0.18, c.h);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    for (const p of s.prayers) {
      ctx.globalAlpha = Math.min(1, p.life / 1.2);
      ctx.fillStyle = "#dff0ec";
      ctx.font = `600 15px ${c.font || "system-ui"}`;
      ctx.textAlign = "center";
      ctx.fillText(p.text, c.w / 2, c.h * 0.42);
      ctx.globalAlpha = 1;
    }
    plateVignette(c, ctx, 0.66);
  }
};
function spawnKelp(c) {
  const s = c.state;
  s.strands = [0, 1, 2].map((i) => ({
    i: i + s.round * 3,
    x: c.w * (0.22 + i * 0.28) + (i % 2 ? 16 : -12),
    y: c.h * (0.56 + (i % 2) * 0.08),
    free: false
  }));
  s.grip = 0; s.gripI = -1;
  // keep the kelp inside the frame
  for (const k of s.strands) k.x = clamp(k.x, 40, c.w - 40);
}
function roundPrayer(n) {
  return [
    tx("Out of the belly of hell cried I", "我从阴间的腹中呼求"),
    tx("Yet hast thou brought up my life", "你却将我的性命救上来"),
    tx("Salvation is of the LORD", "救恩出于耶和华")
  ][Math.min(2, n - 1)];
}

/* ─────────────── 10. THE SYCAMORE — hand over hand ─────────────── */

/* ══════════════════════ 7d. ZACCHAEUS — climb the sycamore ══════════════════════ */
const climb = {
  demo: "twosides",
  titleEn: "Climb the sycamore", titleZh: "爬上桑树",
  promptEn: "Hand over hand: pull up on the side the light is on, then the other. Eight holds and you are above the crowd — pull on the wrong branch and you lose your grip.",
  promptZh: "两只手换着来：哪一侧有光，就从哪一侧往上拉。拉够八次，你就高过人群；拉错了枝子会脱手。",
  hintEn: "Drag up on the lit side", hintZh: "从有光的一侧往上拖",
  howEn: "Drag upward on whichever side is lit, and pull eight times.", howZh: "哪一侧有光，就从哪一侧往上拖，一共拉八次。",
  hint() { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = { t: 0, left: 68, holds: 0, side: 0, sway: 0, pressY: null, slip: 0, branch: 0 };
    c.setHint(this.hint());
  },
  step(c, dt) {
    const s = c.state, q = c.pointer;
    s.t += dt; s.left -= dt;
    s.slip = Math.max(0, s.slip - dt * 1.6);
    s.sway += (Math.sin(s.t * 1.1) * 0.02 - s.sway) * dt * 2;
    if (q.down) {
      if (s.pressY === null) s.pressY = q.y;
      const pull = s.pressY - q.y;
      if (pull > 58) {
        const onSide = (q.x > c.w * 0.5) === (s.side === 1);
        if (onSide) {
          s.holds++; s.side = 1 - s.side; s.pressY = q.y;
          s.branch = 1; c.hit("good"); c.addScore(12);
          c.spark(q.x, q.y, "#e8d9a8", 12, 110);
          s.sway += (s.side ? 1 : -1) * 0.03;
        } else {
          s.holds = Math.max(0, s.holds - 1); s.pressY = q.y; s.slip = 1;
          c.hit("miss"); c.hurt(1);
          if (c.hearts <= 0) return;
        }
      }
    } else s.pressY = null;
    s.branch = Math.max(0, s.branch - dt * 0.8);
    c.progress = Math.min(1, s.holds / 8);
    c.setHint(`${tx("Drag up on the lit side", "在有光的一侧向上拖")}   ${Math.min(8, s.holds)}/8`);
    if (s.holds >= 8) {
      c.hit("complete");
      c.float(c.w / 2, c.h * 0.36, tx("He is passing below", "他从下面经过"), "#ffe6ac");
      c.end(true, c.score + 70);
    }
  },
  draw(c, ctx) {
    const s = c.state;
    ctx.save();
    ctx.translate(c.w / 2, c.h / 2);
    ctx.rotate(s.sway + (s.slip > 0.5 ? Math.sin(s.t * 40) * 0.012 : 0));
    ctx.translate(-c.w / 2, -c.h / 2);
    /* Climbing is a change of scale, not a change of framing: the canopy opens
       around you and the road below recedes. Zooming cannot leave a seam, which
       sliding the plate did. */
    const zoom = 1 + s.holds * 0.021;
    ctx.translate(c.w / 2, c.h * 0.62);
    ctx.scale(zoom, zoom);
    ctx.translate(-c.w / 2, -c.h * 0.62);
    plateArt(c, ctx, "assets/art/branches.jpg", 0.12 + s.holds * 0.012);
    // the two holds: screen space, so they stay put while the tree grows
    for (const side of [0, 1]) {
      const p = { x: c.w * (side ? 0.72 : 0.27), y: c.h * 0.46 };
      const lit = side === s.side;
      ctx.save();
      if (lit) {
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 54);
        g.addColorStop(0, `rgba(255,238,190,${0.2 + Math.sin(s.t * 4) * 0.06})`);
        g.addColorStop(1, "rgba(255,200,120,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 54, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = `rgba(255,236,190,${0.5 + Math.sin(s.t * 4) * 0.14})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, TAU); ctx.stroke();
        ctx.fillStyle = "rgba(255,244,214,.85)";
        ctx.beginPath();
        const ay = p.y + 40 + Math.sin(s.t * 3) * 3;
        ctx.moveTo(p.x, ay - 12); ctx.lineTo(p.x - 7, ay); ctx.lineTo(p.x + 7, ay);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(226,196,150,.16)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, TAU); ctx.stroke();
      }
      void lit;
    }
    ctx.restore();
    // how high you have come
    for (let i = 0; i < 8; i++) {
      const y = c.h * 0.86 - i * 16;
      const x = c.w - 16;
      ctx.fillStyle = i < s.holds ? "rgba(255,226,170,.85)" : "rgba(226,196,150,.2)";
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    if (s.slip > 0.02) {
      ctx.fillStyle = `rgba(200,120,90,${s.slip * 0.18})`;
      ctx.fillRect(0, 0, c.w, c.h);
    }
    plateVignette(c, ctx, 0.55);
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
      kind: "charge", mode: "sling", hero: "david", ...P("elah-field", "leaves"),
      title: ["Wind the sling", "把机弦转起来"],
      prompt: ["The stones from the brook sit in your bag. Turn the sling round your fist — a full circle — and let go while it is still singing. Three clean throws before you step onto the field.",
        "从溪边捡来的石子就在袋里。绕着拳头把机弦转满一圈，趁它还带着风声时松手。上阵前先甩出三次干净的。"],
      hint: ["Drag in a circle · release when it sings", "绕圈拖 · 转起来就松手"],
    how: ["Drag your finger in a circle around your fist, then let go while the sling is still singing.", "用手指绕着拳头转圈拖，机弦还带着风声的时候松手。"],
      rounds: 3, seconds: 30, reward: 40
    },
    {
      kind: "dodge", hero: "david", villain: "goliath", ...P("elah-field", "leaves"),
      title: ["Cross the valley", "穿过山谷"],
      prompt: ["Goliath throws two kinds of spear at David as he walks to the line. One skims the dust — tap to leap over it. One comes at his chest — press and drag down to drop under it. Four hits and he is driven back; the story goes on either way.",
        "大卫往阵前走的时候，歌利亚一边投枪。枪贴着地飞来，点一下跳过去；枪朝他胸口飞来，按住往下拖，蹲下来让它从头顶过。被击中四次就退回谷口重走一遍——不扣分，故事也不会跳过这一仗。"],
      hint: ["Ground spear: tap to leap · chest spear: drag down", "贴地来的点一下 · 冲胸来的往下拖"],
    how: ["Tap when the spear skims the ground; press and drag down when it comes at his chest.", "枪贴地飞来，点一下跳过去；枪朝胸口飞来，按住往下拖，蹲下去。"],
      seconds: 17, reward: 30
    }
  ],

  /* --------------------------------------------------------- 2. Daniel */
  lions: [{
    kind: "rhythm", mode: "shade", hero: "daniel", ...P("lions", "embers"),
    title: ["Shelter the lamps", "遮住灯焰"],
    prompt: ["A guard walks his round with a torch. Cup your hand over each prayer lamp as his light passes, or the flame flares and he sees it. Three lamps before the den is sealed.",
      "守卫举着火把巡行。他的光经过时，用手遮住每一盏祷告的灯，否则火焰会窜起来被他看见。封坑之前，三盏都要守住。"],
    hint: ["Hold your hand over a lamp as the light passes", "光过来时，手指按在灯上"],
    how: ["When the guard's light comes near, press and hold on the lamp.", "守卫的火把照过来时，按住那盏灯别松手。"],
    rounds: 3, seconds: 30, reward: 30, robe: "#4a4260"
  }],

  /* --------------------------------------------------------- 3. Jericho */
  jericho: [{
    kind: "trace", hero: "traveller", ...P("jericho", "sand"),
    title: ["The narrow road", "狭窄的山路"],
    prompt: ["Lead the donkey along the winding path without stepping off the edge. Keep your finger on the road all the way to the top.",
      "牵着驴沿弯弯的山路往上走，别踩出路边。手指别离开路，一直拖到顶上。"],
    hint: ["Drag along the road to the top", "手指别离开路，拖到顶"],
    how: ["Keep one finger on the road and drag it all the way to the top.", "一根手指按在路面上，沿着路一直拖到顶上。"],
    seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 4. Storm */
  storm: [{
    kind: "charge", mode: "rope", hero: "fisherman", ...P("storm", "rain"),
    title: ["Haul the rope", "拉紧缆绳"],
    prompt: ["A wet rope, hand over hand. Drag it down the length of your reach, then let go and take the next hold. Three good hauls and the yard is up before the squall.",
      "缆绳全湿了，得一把一把往上拉：手指往下拖到底算一把，松手，再抓下一把。拉满三把，帆才能赶在风起来之前升上去。"],
    hint: ["Drag down and release · three hauls", "往下拖到底再松手 · 拉三把"],
    how: ["Drag down to the end of your reach, let go, then take the next hold. Three times.", "往下拖到底，松手，再抓下一把；这样拉三次。"],
    rounds: 3, seconds: 30, reward: 30
  }],

  /* --------------------------------------------------------- 5. Prodigal */
  prodigal: [{
    kind: "trace", hero: "prodigal", ...P("prodigal", "petals"),
    title: ["The long road home", "漫长的回家路"],
    prompt: ["One step, then another. Stay on the path through the pig fields and the empty cups. The Father is waiting at the top of the road.",
      "一步，再一步。绕过猪群，绕过空酒杯，脚别离开这条路。父亲就在路那头等你。"],
    hint: ["Drag along the road to the top", "沿路拖到顶端"],
    how: ["Keep your finger on the road and drag it step by step to the end.", "手指贴着路，一步一步拖到路的尽头。"],
    seconds: 26, reward: 30
  }],

  /* --------------------------------------------------------- 6. Esther */
  esther: [{
    kind: "order", mode: "seal", ...P("esther", "embers"),
    title: ["Seal the decree", "在谕旨上用印"],
    prompt: ["The herald reads the decree and the royal seals are pressed in order. Stamp them back into the wax in the same order — two readings, the second longer.",
      "传令官念一遍谕旨，王印就跟着一个接一个盖下去。你照同样的顺序把印按回蜡里。会念两遍，第二遍更长。"],
    hint: ["Press the seals in the order read", "按念到的顺序按印"],
    how: ["Watch the order the seals are pressed in, then press them back the same way.", "先看清王印是按什么顺序盖的，再照同样的顺序按一遍。"],
    rounds: 2, seconds: 34, reward: 30
  }],

  /* --------------------------------------------------------- 7. Burning bush */
  desert: [{
    kind: "sift", ...P("bush", "sand"),
    title: ["Search the wadi", "在旱谷中搜寻"],
    prompt: ["Three sheep have scattered into the ravine. Sweep the sand to uncover them before the light fails — avoid the empty shadows.",
      "三只羊走散在旱谷里。拂开沙土把它们找出来，趁天还没黑；那些空空的影子别去碰。"],
    hint: ["Drag to sweep · tap a sheep", "拖动扫开沙土 · 点住羊"],
    how: ["Drag across the sand to sweep it away, and tap a sheep once you uncover it.", "在沙上拖着扫开浮土，看见羊就点住它。"],
    goal: 3, decoys: 4, seconds: 24, reward: 25,
    good: "#efe2c4", siltRgb: "108,80,50"
  }],

  /* --------------------------------------------------------- 8. Ruth */
  glean: [{
    kind: "rhythm", mode: "catch", hero: "ruth", ...P("ruth", "petals"),
    title: ["Take what the reapers drop", "接住收割人落下的麦穗"],
    prompt: ["Gleaning means moving with the harvesters, not ahead of them. Put your hand under each sheaf as it falls from their arms — three before the light goes.",
      "拾穗得跟着收割的人，不能抢到他们前面。麦穗从他们臂弯里掉下来时，把手伸到下面接住。天黑之前接住三次。"],
    hint: ["Catch each falling sheaf", "麦穗落下时伸手接"],
    how: ["When a sheaf falls, slide your finger under it and catch it.", "麦穗往下掉的时候，把手指伸到它下面接住。"],
    rounds: 3, seconds: 30, reward: 30, robe: "#5c6042"
  }],

  /* --------------------------------------------------------- 9. Jonah */
  deep: [{
    kind: "charge", mode: "breath", ...P("jonah", "rain"),
    title: ["Hold your breath", "屏住呼吸"],
    prompt: ["Fill your lungs and go under. Hold while the water climbs and your sight narrows, then surface before the dark closes. Three good dives before the fish arrives.",
      "吸满一口气，沉下去。水面往上压、眼前越来越窄的时候屏住，趁黑暗合起来之前浮上来。大鱼来之前，要三次干净的下潜。"],
    hint: ["Hold to dive · surface before the dark closes", "按住往下潜 · 变黑之前浮上来"],
    how: ["Press and hold to dive, and lift your finger before the dark closes in.", "按住往下潜，趁四周变黑之前松手浮上来。"],
    rounds: 3, seconds: 30, reward: 30
  }],

  /* --------------------------------------------------------- 10. Zacchaeus */
  climb: [{
    kind: "order", mode: "branch", ...P("zacchaeus", "leaves"),
    title: ["Take the boughs they point to", "顺着人群指的枝子"],
    prompt: ["The crowd points you up the tree, one bough at a time. Watch which they choose, then take the same ones in the same order. Two climbs before Jesus passes.",
      "人群一根一根地指你往树上去。看清他们指的是哪几根，再照同样的顺序爬上去。耶稣经过前要爬两趟。"],
    hint: ["Take the boughs in the order pointed", "按他们指的顺序爬"],
    how: ["Watch which bough the crowd points to, then take the same ones in the same order.", "看清人群指的是哪一根枝子，再照同样的顺序爬上去。"],
    rounds: 2, seconds: 34, reward: 30
  }]
};

for (const [key, cfg] of Object.entries(PRELUDES)) {
  if (!GAMES[key]) continue;
  GAMES[key] = withStages(GAMES[key], cfg);
  GAMES[key].fg = FG[key] || "rocks";
}

/* The single-act scenes, unwrapped. The exported GAMES entries carry their own
   preparation acts, so an oracle that wants to test the climax itself has to be
   able to reach past them — otherwise a prelude that times out hides whether
   the scene it introduces can even be finished. */
export const SCENES = { jericho, tend, stones, window: windowScene, flame, cry, prodigal, esther, deep, climb };

export const ACT_COUNTS = Object.fromEntries(
  Object.entries(GAMES).map(([k, g]) => [k, g.actCount || 1])
);
