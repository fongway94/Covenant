/* Six story-specific action scenes. Each one really controls a character:
   drag to aim / move / steer, tap to jump / bail, hold to advance.
   Every scene ends with c.end(success, score) and feeds back into the story. */

import { tx } from "../core/i18n.js";
import { clamp, rnd, dist, pilgrim, lion, pig, coin, giant, boat, scepter, star, roundRect } from "./scene.js";

const TAU = Math.PI * 2;

function bg(c, ctx, top, bottom, dust = 28) {
  const g = ctx.createLinearGradient(0, 0, 0, c.h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.w, c.h);
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

function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color.replace("ALPHA", String(alpha)));
  g.addColorStop(1, color.replace("ALPHA", "0"));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* ---------------------------------------------------------------- 1. SLING */

const sling = {
  titleEn: "The Sling", titleZh: "甩石迎敌",
  promptEn: "Drag back from David, release to fire. Hit Goliath's forehead twice — mind the wind and his shield.",
  promptZh: "从大卫身后拖动蓄力，松手投石。命中歌利亚的额头两次——留意风和他举起的盾牌。",
  hintEn: "Drag to aim · Release to fire", hintZh: "拖动瞄准 · 松手投出",
  hint(c) { return tx(this.hintEn, this.hintZh); },
  init(c) {
    c.maxHearts = 3; c.hearts = 3;
    c.state = {
      sling: { x: c.w * 0.19, y: c.h * 0.74 },
      stones: 5, hits: 0, shots: [], drag: null, wind: rnd(-42, 42), t: 0,
      g: { x: c.w * 0.79, y: c.h * 0.62, dir: 1, shield: false, flash: 0 },
      blocked: 0
    };
    c.setHint(this.hint());
  },
  onDown(c, p) { c.state.drag = { ox: p.startX, oy: p.startY, x: p.x, y: p.y }; },
  onMove(c, p) { if (c.state.drag) { c.state.drag.x = p.x; c.state.drag.y = p.y; } },
  onUp(c, p) {
    const s = c.state, d = s.drag;
    s.drag = null;
    if (!d || s.stones <= 0) return;
    const vx = (d.ox - p.x) * 3.7, vy = (d.oy - p.y) * 3.7;
    if (Math.hypot(vx, vy) < 70) return;
    s.shots.push({ x: s.sling.x, y: s.sling.y - 8, vx, vy, life: 2.4 });
    s.stones--; c.hit("throw"); c.spark(s.sling.x, s.sling.y - 8, "#e7b75b", 7, 70);
  },
  step(c, dt) {
    const s = c.state; s.t += dt;
    s.g.y += s.g.dir * 42 * dt;
    if (s.g.y > c.h * 0.74) { s.g.y = c.h * 0.74; s.g.dir = -1; }
    if (s.g.y < c.h * 0.48) { s.g.y = c.h * 0.48; s.g.dir = 1; }
    s.g.shield = Math.sin(s.t * 1.25) > 0.55;
    s.g.flash = Math.max(0, s.g.flash - dt * 2.5);
    for (let i = s.shots.length - 1; i >= 0; i--) {
      const b = s.shots[i];
      b.vx += s.wind * dt; b.vy += 300 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      const hx = s.g.x, hy = s.g.y - 70;
      if (dist(b.x, b.y, hx, hy) < 13) {
        s.shots.splice(i, 1);
        if (s.g.shield) {
          s.blocked++; c.spark(hx + 22, s.g.y - 35, "#cdd6e0", 12, 110);
          c.float(hx, hy - 24, tx("BLOCKED!", "被盾挡住！"), "#cdd6e0"); c.hit("miss");
        } else {
          s.hits++; c.addScore(40); c.bump(12); c.hit("hit");
          c.spark(hx, hy, "#f4d79b", 26, 190); s.g.flash = 1;
          c.float(hx, hy - 26, tx("HIT!", "命中！"), "#f4d79b");
        }
      } else if (b.life <= 0 || b.y > c.h + 20 || b.x > c.w + 30 || b.x < -30) s.shots.splice(i, 1);
    }
    c.progress = clamp(s.hits / 2, 0, 1);
    c.setHint(`${tx("Drag to aim · Release to fire", "拖动瞄准 · 松手投出")}   ${tx("Stones", "石子")} ${"●".repeat(s.stones)}`);
    if (s.hits >= 2) { c.end(true, c.score + 60); return; }
    if (s.stones <= 0 && s.shots.length === 0) c.end(false, c.score);
  },
  draw(c, ctx) {
    const s = c.state;
    bg(c, ctx, "#1a2c3a", "#33413c", 34);
    star(ctx, c.w * 0.82, 42, 13, "#f4d79b", 0.5 + Math.sin(c.t * 2) * 0.12);
    hills(ctx, c, c.h * 0.58, "#2a3a3c", 40);
    hills(ctx, c, c.h * 0.7, "#263338", 120);
    ground(ctx, c, c.h * 0.8, "#2b322c");
    ctx.strokeStyle = "rgba(240,196,106,.22)"; ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(0, c.h * 0.84 + i * 9); ctx.lineTo(c.w, c.h * 0.84 + i * 9); ctx.stroke(); }
    // Goliath + shield
    glow(ctx, s.g.x, s.g.y - 40, 70, "rgba(224,139,120,ALPHA)", s.g.flash * 0.4);
    giant(ctx, s.g.x, s.g.y, 1.25, c.t);
    if (s.g.shield) {
      ctx.fillStyle = "rgba(190,200,214,.85)";
      ctx.beginPath(); ctx.ellipse(s.g.x + 32, s.g.y - 40, 9, 32, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#f0c46a"; ctx.lineWidth = 2; ctx.stroke();
    }
    // David
    pilgrim(ctx, s.sling.x, s.sling.y, 1.05, c.t, 1, 1, true);
    ctx.strokeStyle = "rgba(244,215,155,.7)"; ctx.lineWidth = 1.6;
    if (s.drag) {
      const vx = (s.drag.ox - s.drag.x) * 3.7, vy = (s.drag.oy - s.drag.y) * 3.7;
      ctx.beginPath(); ctx.moveTo(s.sling.x, s.sling.y - 12); ctx.lineTo(s.sling.x + vx * 0.05, s.sling.y - 12 + vy * 0.05); ctx.stroke();
      ctx.fillStyle = "rgba(244,215,155,.55)";
      for (let i = 1; i <= 9; i++) {
        const tt = i * 0.085;
        const px = s.sling.x + vx * tt + s.wind * tt * tt * 0.5;
        const py = s.sling.y - 8 + vy * tt + 150 * tt * tt;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, 3 - i * 0.22), 0, TAU); ctx.fill();
      }
    }
    for (const b of s.shots) {
      glow(ctx, b.x, b.y, 12, "rgba(244,215,155,ALPHA)", 0.5);
      ctx.fillStyle = "#e7d3a6"; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, TAU); ctx.fill();
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
      lions: [0.26, 0.43, 0.6, 0.77].map((f, i) => ({
        x: c.w * f, y: c.h * (i % 2 ? 0.36 : 0.72), a: i % 2 ? 1.2 : -1.2, sp: 0.55 + i * 0.12, r: 108, face: i % 2 ? 1 : -1
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
    for (const l of s.lions) { l.a += l.sp * dt * (Math.sin(c.t * 0.5 + l.x) > 0 ? 1 : -1); l.face = Math.cos(l.a) >= 0 ? 1 : -1; }
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
    for (const l of s.lions) {
      const cone = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
      cone.addColorStop(0, "rgba(255,196,90,.24)"); cone.addColorStop(1, "rgba(255,196,90,0)");
      ctx.save(); ctx.beginPath(); ctx.moveTo(l.x, l.y);
      ctx.arc(l.x, l.y, l.r, l.a - 0.52, l.a + 0.52); ctx.closePath();
      ctx.fillStyle = cone; ctx.fill(); ctx.restore();
      lion(ctx, l.x, l.y, 0.85, l.face, 1, true);
    }
    for (const f of s.frags) if (!f.got) {
      glow(ctx, f.x, f.y, 18, "rgba(127,212,200,ALPHA)", 0.55);
      star(ctx, f.x, f.y + Math.sin(c.t * 3 + f.x) * 3, 8, "#9fe6d8", 0.95);
    }
    pilgrim(ctx, s.p.x, s.p.y, 0.9, s.p.walk, 1, s.p.moving ? 1 : 0.45, true);
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
    pilgrim(ctx, s.p.x, s.p.y, 1.05, c.t * 2.2, 1, 1, false);
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
    boat(ctx, c.w / 2, c.h * 0.7, 1.05, s.roll, c.t);
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
    if (c.progress > 0.85) { glow(ctx, c.w * 0.82, 50, 60, "rgba(244,215,155,ALPHA)", 0.4); star(ctx, c.w * 0.82, 50, 12, "#f4d79b", 0.8); }
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
    // father's house, growing closer
    const hx = c.w * (0.86 - (1 - c.progress) * 0.18), hy = s.gy - 58 * (0.5 + c.progress * 0.5);
    glow(ctx, hx, hy, 46, "rgba(244,215,155,ALPHA)", 0.35 + c.progress * 0.3);
    ctx.fillStyle = "#3b3226"; ctx.fillRect(hx - 26, hy - 22, 52, 42);
    ctx.beginPath(); ctx.moveTo(hx - 32, hy - 22); ctx.lineTo(hx, hy - 46); ctx.lineTo(hx + 32, hy - 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4d79b"; ctx.fillRect(hx - 6, hy - 8, 12, 16);
    ctx.fillStyle = "#6b5130"; ctx.fillRect(0, s.gy, c.w, c.h - s.gy);
    ctx.strokeStyle = "rgba(240,196,106,.22)"; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 68 - c.t * 190) % (c.w + 70) + c.w + 70) % (c.w + 70) - 35;
      ctx.beginPath(); ctx.moveTo(x, s.gy + 8 + i * 9); ctx.lineTo(x + 34, s.gy + 8 + i * 9); ctx.stroke();
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
    pilgrim(ctx, c.w * 0.24, s.p.y, 1.05, c.t * 3.4, 1, 1, true);
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
    // pillars + throne
    ctx.fillStyle = "#2c3c60";
    for (let i = 0; i < 4; i++) { const x = 30 + i * (c.w - 60) / 3; ctx.fillRect(x - 7, c.h * 0.18, 14, c.h * 0.5); ctx.fillStyle = "#46629a"; ctx.fillRect(x - 11, c.h * 0.18, 22, 8); ctx.fillStyle = "#2c3c60"; }
    ctx.fillStyle = "#4a3a2c"; ctx.fillRect(c.w * 0.84, c.h * 0.42, c.w * 0.16, c.h * 0.3);
    glow(ctx, c.w * 0.9, c.h * 0.55, 70, "rgba(240,196,106,ALPHA)", s.up ? 0.5 : 0.16);
    // king
    ctx.fillStyle = "#7a4a3a"; ctx.beginPath(); ctx.ellipse(c.w * 0.9, c.h * 0.5, 20, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e8c79a"; ctx.beginPath(); ctx.arc(c.w * 0.9, c.h * 0.44, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f0c46a"; ctx.beginPath(); ctx.moveTo(c.w * 0.9 - 14, c.h * 0.41); ctx.lineTo(c.w * 0.9, c.h * 0.31); ctx.lineTo(c.w * 0.9 + 14, c.h * 0.41); ctx.closePath(); ctx.fill();
    scepter(ctx, c.w * 0.78, c.h * 0.6, s.up, c.t);
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
    for (const gx of [c.w * 0.3, c.w * 0.62]) {
      ctx.fillStyle = "#26313f"; ctx.fillRect(gx - 8, c.h * 0.6, 16, c.h * 0.14);
      ctx.fillStyle = "#c9a45c"; ctx.beginPath(); ctx.arc(gx, c.h * 0.58, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = s.moving && !s.up ? "#ff8a6a" : "#4a4a3a";
      ctx.beginPath(); ctx.arc(gx - 2.5, c.h * 0.575, 1.6, 0, TAU); ctx.arc(gx + 2.5, c.h * 0.575, 1.6, 0, TAU); ctx.fill();
    }
    // player
    const px = c.w * (0.16 + s.progress * 0.66), py = c.h * 0.75;
    pilgrim(ctx, px, py, 1.05, s.moving ? c.t * 3 : 0, 1, 1, true);
    for (const tk of s.tokens) if (!tk.got) {
      const x = c.w * (0.16 + tk.p * 0.66);
      star(ctx, x, py - 58 + Math.sin(c.t * 3 + tk.p * 9) * 4, 7, "#f0c46a", 0.75);
    }
  }
};

export const GAMES = { sling, lions, jericho, storm, prodigal, esther };
