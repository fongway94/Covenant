/* The fight at the bottom of the valley — turn-based, but nobody throws a punch.

   Goliath presses with a shout. You answer with one of the four lines you
   collected on the walk up. Answer the shout he actually made and the sling
   gets loaded; answer the wrong one and it costs you nerve. Five right answers
   empty his bluster; five stones are exactly what the brook gave you.

   You are not playing your own pilgrim here. The screen says 大卫, because for
   the length of this fight the hands on the sling are his — and that is the
   point of the whole chapter. */

import { isZh } from "../core/i18n.js";
import { sfx } from "../core/audio.js";
import { drawActor, drawShadow } from "./rig.js";
import { WORDS, SHOUTS } from "./elah.js";

const TAU = Math.PI * 2;
const L = (o) => (o && typeof o === "object" ? (isZh() ? o.zh : o.en) : (o || ""));
const PIPS = 5;

const wordById = (id) => WORDS.find((w) => w.id === id);

export function startBattle(canvas, opts = {}) {
  let ctx = null;
  try { ctx = canvas.getContext && canvas.getContext("2d"); } catch { /* jsdom */ }
  const noCanvas = !ctx;

  const carried = (opts.words || []).map(wordById).filter(Boolean);
  /* Anyone who somehow arrives without all four still gets a fair fight: the
     words they did not collect are the ones they will not be able to answer. */
  const hand = carried.length ? carried : WORDS.slice(0, 1);

  const st = {
    phase: "shout",           /* shout | choose | throw | flying | won | lost */
    shout: 0,
    pips: PIPS,
    hearts: 3,
    chosen: null,
    wrong: 0,
    t: 0,
    sh: 0,                    /* shake */
    flash: 0,
    bubble: null,
    fly: null,                /* {t, from, to} */
    fall: 0,
    cardsAt: [],
    hint: "",
    ended: false
  };
  const view = { w: 360, h: 520 };
  let alive = true, raf = null, last = 0, paused = false;
  let font = "system-ui, sans-serif";
  try { font = (typeof getComputedStyle === "function" && getComputedStyle(document.body).fontFamily) || font; } catch { /* noop */ }

  function scale() {
    try {
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale"));
      return Number.isFinite(v) && v > 0.5 ? v : 1.1;
    } catch { return 1.1; }
  }

  function resize() {
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const r = canvas.getBoundingClientRect?.() || { width: 360, height: 520 };
    view.w = Math.max(240, Math.round(r.width || canvas.clientWidth || 360));
    view.h = Math.max(320, Math.round(r.height || canvas.clientHeight || 520));
    if (!noCanvas) {
      canvas.width = Math.round(view.w * dpr);
      canvas.height = Math.round(view.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function ding(name) { try { sfx(name); } catch { /* audio is optional */ } }

  function pos(e) {
    const r = canvas.getBoundingClientRect?.() || { left: 0, top: 0 };
    const p = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: (p.clientX || 0) - r.left, y: (p.clientY || 0) - r.top };
  }

  function nextShout() {
    st.shout = (st.shout + 1) % SHOUTS.length;
    st.phase = "shout";
    st.chosen = null;
    st.bubble = null;
  }

  function answer(word) {
    const shout = SHOUTS[st.shout];
    st.chosen = word.id;
    if (word.kind === shout.kind) {
      st.phase = "throw";
      st.hint = L({ en: "Loaded. Let it go.", zh: "上弦了。松手。" });
      ding("complete");
    } else {
      st.hearts -= 1;
      st.wrong += 1;
      st.sh = 10;
      ding("miss");
      st.hint = L({ en: "That is not the answer to the thing he said.", zh: "这句话答的不是他刚说的那一句。" });
      if (st.hearts <= 0) { st.phase = "lost"; ding("miss"); }
      else st.phase = "choose";
    }
  }

  function release() {
    st.phase = "flying";
    const from = { x: view.w * 0.24, y: view.h * 0.74 };
    const to = { x: view.w * 0.70, y: view.h * 0.46 };
    st.fly = { t: 0, from, to, spin: 0 };
    ding("tap");
  }

  function land() {
    st.pips -= 1;
    st.sh = 14;
    st.flash = 0.3;
    st.fly = null;
    if (st.pips <= 0) {
      st.phase = "won";
      st.ended = true;
      ding("complete");
      try { opts.onWin?.(); } catch { /* optional */ }
    } else {
      nextShout();
    }
  }

  function retry() {
    st.pips = PIPS;
    st.hearts = 3;
    st.shout = 0;
    st.phase = "shout";
    st.wrong = 0;
    st.hint = "";
    st.ended = false;
    st.bubble = null;
  }

  function onDown(e) {
    e.preventDefault?.();
    if (paused) return;
    const p = pos(e);

    if (st.phase === "won") {
      try { opts.onDone?.(); } catch { /* optional */ }
      return;
    }
    if (st.phase === "lost") { retry(); ding("tap"); return; }

    if (st.phase === "shout") {
      st.phase = "choose";
      st.hint = L({ en: "One of these four answers him.", zh: "这四句里，有一句能接住他。" });
      return;
    }
    if (st.phase === "choose") {
      for (const c of st.cardsAt) {
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { answer(wordById(c.id)); return; }
      }
      return;
    }
    if (st.phase === "throw") { release(); return; }
  }

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("resize", resize);

  function detach() {
    canvas.removeEventListener("pointerdown", onDown);
    window.removeEventListener("resize", resize);
  }

  /* ---------------------------------------------------------------- update */
  function update(dt) {
    st.t += dt;
    st.sh = Math.max(0, st.sh - dt * 26);
    st.flash = Math.max(0, st.flash - dt * 1.8);
    if (st.phase === "flying" && st.fly) {
      st.fly.t += dt * 2.4;
      st.fly.spin += dt * 16;
      if (st.fly.t >= 1) land();
    }
    if (st.phase === "won") st.fall = Math.min(1, st.fall + dt * 0.9);
  }

  /* ----------------------------------------------------------------- paint */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function wrap(text, maxW, useChar) {
    const out = [];
    if (useChar) {
      let line = "";
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
        else line += ch;
      }
      if (line) out.push(line);
      return out;
    }
    let line = "";
    for (const w of text.split(" ")) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, view.h);
    sky.addColorStop(0, "#101d26");
    sky.addColorStop(0.45, "#1e3038");
    sky.addColorStop(0.72, "#3b3a34");
    sky.addColorStop(1, "#241f18");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.w, view.h);

    /* sun low behind the far ridge */
    const g = ctx.createRadialGradient(view.w * 0.68, view.h * 0.34, 4, view.w * 0.68, view.h * 0.34, view.h * 0.5);
    g.addColorStop(0, "rgba(247,196,106,.34)");
    g.addColorStop(1, "rgba(247,196,106,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);

    /* two ridges, hazier one behind */
    const ridge = (yBase, amp, color, phase) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, view.h);
      for (let x = 0; x <= view.w + 12; x += 12) {
        ctx.lineTo(x, yBase + Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.031 + phase * 2) * amp * 0.4);
      }
      ctx.lineTo(view.w, view.h);
      ctx.closePath(); ctx.fill();
    };
    ridge(view.h * 0.52, 16, "#20323c", 0.6);
    ridge(view.h * 0.60, 12, "#1a2830", 2.1);

    /* ground */
    const gnd = ctx.createLinearGradient(0, view.h * 0.66, 0, view.h);
    gnd.addColorStop(0, "#3a352a");
    gnd.addColorStop(1, "#241f18");
    ctx.fillStyle = gnd;
    ctx.fillRect(0, view.h * 0.66, view.w, view.h * 0.34);

    /* dust in the light */
    ctx.fillStyle = "rgba(247,221,165,.07)";
    for (let i = 0; i < 22; i++) {
      const x = (i * 61.7 + st.t * (5 + (i % 5) * 3)) % view.w;
      const y = (i * 37.3 + Math.sin(st.t * 0.7 + i) * 10) % (view.h * 0.7);
      ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 3) * 0.5, 0, TAU); ctx.fill();
    }
  }

  function drawMeters() {
    /* his bluster */
    const bw = 12, gap = 5, h = 54;
    const bx = view.w - 20 - (bw + gap) * PIPS;
    ctx.save();
    ctx.font = `${Math.round(10 * scale())}px ${font}`;
    ctx.fillStyle = "rgba(232,240,240,.5)";
    ctx.textAlign = "left";
    ctx.fillText(L({ en: "bluster", zh: "气焰" }), bx, 22);
    for (let i = 0; i < PIPS; i++) {
      const on = i < st.pips;
      ctx.fillStyle = on ? "rgba(224,139,120,.85)" : "rgba(232,240,240,.14)";
      roundRect(ctx, bx + i * (bw + gap), 28, bw, h, 4);
      ctx.fill();
    }
    /* your nerve */
    ctx.fillStyle = "rgba(232,240,240,.5)";
    ctx.fillText(L({ en: "nerve", zh: "心" }), 20, 22);
    for (let i = 0; i < 3; i++) {
      const on = i < st.hearts;
      ctx.fillStyle = on ? "#f7dda5" : "rgba(232,240,240,.16)";
      const cx = 20 + i * 20, cy = 40;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 6);
      ctx.bezierCurveTo(cx - 9, cy - 1, cx - 5, cy - 10, cx, cy - 4);
      ctx.bezierCurveTo(cx + 5, cy - 10, cx + 9, cy - 1, cx, cy + 6);
      ctx.fill();
    }
    /* who is holding the sling */
    ctx.fillStyle = "rgba(247,221,165,.7)";
    ctx.font = `600 ${Math.round(11 * scale())}px ${font}`;
    ctx.fillText(L({ en: "David · you are in his hands", zh: "大卫 · 你在他里面" }), 20, 66);
    ctx.restore();
  }

  function drawShout() {
    const shout = SHOUTS[st.shout];
    const by = view.h * 0.16;
    const text = L(shout.line);
    const tell = L(shout.tell);
    ctx.save();
    ctx.font = `${Math.round(13 * scale())}px ${font}`;
    const lines = wrap(text, view.w - 70, isZh());
    ctx.font = `${Math.round(11 * scale())}px ${font}`;
    const tells = wrap(tell, view.w - 70, isZh());
    const boxH = 34 + lines.length * 20 + tells.length * 15;
    ctx.fillStyle = "rgba(10,16,20,.78)";
    roundRect(ctx, 18, by, view.w - 36, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,139,120,.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#f0cbb8";
    ctx.font = `${Math.round(13 * scale())}px ${font}`;
    let ty = by + 24;
    for (const l of lines) { ctx.fillText(l, 32, ty); ty += 20; }
    ctx.fillStyle = "rgba(232,240,240,.55)";
    ctx.font = `${Math.round(11 * scale())}px ${font}`;
    ty += 2;
    for (const l of tells) { ctx.fillText(l, 32, ty); ty += 15; }
    ctx.restore();
  }

  function drawCards() {
    st.cardsAt = [];
    if (st.phase !== "choose") return;
    const n = hand.length;
    const top = view.h * 0.60;
    const pad = 12;
    const ch = Math.min(66, (view.h - top - 16 - pad * (n - 1)) / n);
    const fs = Math.round(11.5 * scale());

    for (let i = 0; i < n; i++) {
      const w = wordById(hand[i].id);
      const y = top + i * (ch + pad);
      const chosen = st.chosen === w.id;
      st.cardsAt.push({ id: w.id, x: 14, y, w: view.w - 28, h: ch });

      ctx.save();
      ctx.fillStyle = chosen ? "rgba(247,221,165,.16)" : "rgba(12,20,26,.86)";
      roundRect(ctx, 14, y, view.w - 28, ch, 12);
      ctx.fill();
      ctx.strokeStyle = chosen ? "rgba(247,221,165,.6)" : "rgba(247,221,165,.22)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#f7dda5";
      ctx.font = `700 ${Math.round(10.5 * scale())}px ${font}`;
      ctx.fillText(w.ref, 26, y + 17);

      ctx.fillStyle = "rgba(240,244,244,.86)";
      ctx.font = `${fs}px ${font}`;
      const lines = wrap(L(w.text), view.w - 60, isZh());
      let ty = y + 33;
      for (const l of lines.slice(0, Math.max(1, Math.floor((ch - 22) / (fs * 1.5))))) {
        ctx.fillText(l, 26, ty);
        ty += Math.round(fs * 1.5);
      }
      ctx.restore();
    }
  }

  function drawThrowPrompt() {
    const w = L({ en: "Let the stone go", zh: "甩出去" });
    ctx.save();
    const cx = view.w * 0.26, cy = view.h * 0.80;
    const r = 42 + Math.sin(st.t * 3) * 3;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    g.addColorStop(0, "rgba(247,221,165,.35)");
    g.addColorStop(1, "rgba(247,221,165,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(247,221,165,.7)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#f7dda5";
    ctx.font = `600 ${Math.round(12 * scale())}px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(w, cx, cy + 44);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawEnd() {
    if (st.phase === "won") {
      const a = Math.min(1, st.fall * 1.4);
      ctx.save();
      ctx.fillStyle = `rgba(6,11,15,${0.35 * a})`;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = a;
      ctx.fillStyle = "#f7dda5";
      ctx.font = `700 ${Math.round(18 * scale())}px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(L({ en: "The shouting stops", zh: "喊声停了" }), view.w / 2, view.h * 0.42);
      ctx.fillStyle = "rgba(240,244,244,.8)";
      ctx.font = `${Math.round(12.5 * scale())}px ${font}`;
      const body = L({
        en: "Not because you were stronger. Because the valley finally heard something else.",
        zh: "不是因为你更强。是因为这条山谷，终于听见了另外一种声音。"
      });
      const lines = wrap(body, view.w - 90, isZh());
      let ty = view.h * 0.42 + 34;
      for (const l of lines) { ctx.fillText(l, view.w / 2, ty); ty += 20; }
      ctx.fillStyle = "rgba(247,221,165,.72)";
      ctx.font = `${Math.round(11 * scale())}px ${font}`;
      if (Math.sin(st.t * 3) > -0.4) ctx.fillText(L({ en: "tap to come back ▸", zh: "点一下，回到自己 ▸" }), view.w / 2, view.h * 0.72);
      ctx.textAlign = "left";
      ctx.restore();
    }
    if (st.phase === "lost") {
      ctx.save();
      ctx.fillStyle = "rgba(6,11,15,.72)";
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.fillStyle = "#f7dda5";
      ctx.font = `700 ${Math.round(17 * scale())}px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(L({ en: "Your nerve gives out", zh: "你撑不住了" }), view.w / 2, view.h * 0.42);
      ctx.fillStyle = "rgba(240,244,244,.8)";
      ctx.font = `${Math.round(12.5 * scale())}px ${font}`;
      const lines = wrap(L({
        en: "Somebody pulls you back down the slope. Nobody in the camp says a word about it. You can go again whenever you want.",
        zh: "有人把你从坡上拉了回来。营里没有一个人提这件事。你想再来一次，随时都可以。"
      }), view.w - 90, isZh());
      let ty = view.h * 0.42 + 34;
      for (const l of lines) { ctx.fillText(l, view.w / 2, ty); ty += 20; }
      ctx.fillStyle = "rgba(247,221,165,.72)";
      ctx.font = `${Math.round(11 * scale())}px ${font}`;
      if (Math.sin(st.t * 3) > -0.4) ctx.fillText(L({ en: "tap to stand up again ▸", zh: "点一下，再站起来 ▸" }), view.w / 2, view.h * 0.74);
      ctx.textAlign = "left";
      ctx.restore();
    }
  }

  function render() {
    if (noCanvas) return;
    const sx = (Math.random() - 0.5) * st.sh;
    ctx.save();
    ctx.translate(sx, 0);
    drawSky();

    const groundY = view.h * 0.70;

    /* Goliath — big, and further away than he looks */
    const gx = view.w * 0.72;
    const gH = Math.min(view.h * 0.52, 240);
    const stag = st.phase === "flying" && st.fly ? Math.sin(st.fly.t * Math.PI) * 6 : 0;
    if (st.phase === "won") {
      const k = st.fall;
      drawShadow(ctx, gx, groundY + 2, 34 * (1 - k * 0.3), 0.4 * (1 - k * 0.5));
      ctx.save();
      ctx.translate(gx, groundY);
      ctx.rotate(-0.5 * k);
      drawActor(ctx, "giant", 0, 0, { dir: "left", h: gH, alpha: 1 - k * 0.35 });
      ctx.restore();
    } else {
      drawShadow(ctx, gx, groundY + 2, 34, 0.42);
      drawActor(ctx, "giant", gx + stag, groundY, { dir: "left", h: gH, squash: 1 + Math.sin(st.t * 1.4) * 0.006 });
      /* spear planted in the ground beside him */
      ctx.strokeStyle = "#8e949c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gx - gH * 0.30, groundY + 4);
      ctx.lineTo(gx - gH * 0.36, groundY - gH * 1.02);
      ctx.stroke();
      ctx.fillStyle = "#c9c2ac";
      ctx.beginPath();
      ctx.moveTo(gx - gH * 0.36, groundY - gH * 1.20);
      ctx.lineTo(gx - gH * 0.32, groundY - gH * 0.98);
      ctx.lineTo(gx - gH * 0.41, groundY - gH * 0.98);
      ctx.closePath(); ctx.fill();
      /* shield */
      ctx.fillStyle = "#3a4550";
      ctx.beginPath();
      ctx.ellipse(gx + gH * 0.26, groundY - gH * 0.46, gH * 0.17, gH * 0.24, 0.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(247,221,165,.18)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    /* David — small, in front */
    const dx = view.w * 0.24;
    const dH = Math.min(view.h * 0.20, 92);
    const bob = st.phase === "flying" ? 0 : Math.sin(st.t * 1.6) * 1.2;
    drawShadow(ctx, dx, groundY + 2, 16, 0.36);
    const whirl = st.phase === "throw" ? Math.sin(st.t * 9) * 3 : 0;
    drawActor(ctx, "david", dx + whirl, groundY + bob, { dir: "right", h: dH, glow: st.phase !== "won" });

    /* the stone on its way */
    if (st.fly) {
      const k = Math.min(1, st.fly.t);
      const x = st.fly.from.x + (st.fly.to.x - st.fly.from.x) * k;
      const y = st.fly.from.y + (st.fly.to.y - st.fly.from.y) * k - Math.sin(k * Math.PI) * view.h * 0.16;
      ctx.save();
      ctx.fillStyle = "#e6dcc2";
      ctx.beginPath(); ctx.arc(x, y, 4.4, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(247,221,165,.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 6); ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    /* scrim under the meters */
    const top = ctx.createLinearGradient(0, 0, 0, view.h * 0.24);
    top.addColorStop(0, "rgba(6,11,15,.82)");
    top.addColorStop(1, "rgba(6,11,15,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, view.w, view.h * 0.24);

    drawMeters();
    if (st.phase === "shout") drawShout();
    if (st.phase === "throw" || st.phase === "flying") drawThrowPrompt();
    drawCards();

    /* the line of guidance, always in the same place */
    if (st.hint && (st.phase === "choose" || st.phase === "throw")) {
      ctx.save();
      ctx.fillStyle = "rgba(8,14,18,.6)";
      const fs = Math.round(11 * scale());
      ctx.font = `${fs}px ${font}`;
      const lines = wrap(st.hint, view.w - 60, isZh());
      const h = 16 + lines.length * 16;
      roundRect(ctx, 14, view.h * 0.60 - h - 8, view.w - 28, h, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(247,221,165,.8)";
      let ty = view.h * 0.60 - h + 4;
      for (const l of lines) { ctx.fillText(l, 26, ty + 8); ty += 16; }
      ctx.restore();
    }

    drawEnd();

    if (st.flash > 0) {
      ctx.fillStyle = `rgba(255,240,205,${st.flash * 0.5})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    ctx.restore();
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!paused) update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  resize();
  render();
  raf = requestAnimationFrame(frame);

  return {
    stop() { alive = false; if (raf) cancelAnimationFrame(raf); detach(); },
    pause() { paused = true; },
    resume() { paused = false; },
    state: st
  };
}
