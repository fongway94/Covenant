/* The valley, walkable.

   One canvas, one loop. Movement is press-and-drag to steer, or tap the ground
   to walk there — no on-screen d-pad taking up half the phone. Talking, picking
   up a stone and crossing the challenge line are all proximity-driven, so the
   only thing a player has to learn is "walk at the thing".

   The field knows nothing about the fight. When you cross the line it reports
   what you carry and asks the screen above it to take over. */

import { isZh } from "../core/i18n.js";
import { drawActor, drawShadow } from "./rig.js";
import { TILE, W, H, T, ELAH, NPCS, STONES, WORDS, blockedAt } from "./elah.js";

const TAU = Math.PI * 2;
const L = (o) => (o && typeof o === "object" ? (isZh() ? o.zh : o.en) : (o || ""));

const MAP_W = W * TILE;
const MAP_H = H * TILE;
const SPEED = 168;                 /* px per second, world space */
const TALK_RANGE = TILE * 1.45;
const PICK_RANGE = TILE * 0.62;
const STEER_DEAD = 12;             /* px before a press becomes a drag */

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const COL = {
  grassA: "#2b3d33", grassB: "#31473a",
  dryA: "#463d2f", dryB: "#4f4636",
  pathA: "#5a4e39", pathB: "#635640",
  water: "#16303c", ford: "#2f5560",
  cliff: "#10171c", cliffLip: "#1d262c",
  wheat: "#574f2b", flower: "#33483a",
  warm: "rgba(247,221,165,"
};

export function startField(canvas, opts = {}) {
  let ctx = null;
  try { ctx = canvas.getContext && canvas.getContext("2d"); } catch { /* jsdom */ }
  const noCanvas = !ctx;

  const grid = ELAH.grid;
  const st = {
    phase: "field",                       /* field | return | done */
    p: { x: (ELAH.start[0] + 0.5) * TILE, y: (ELAH.start[1] + 0.5) * TILE, dir: "up", frame: 0, moving: false },
    target: null,
    pendingTalk: null,
    cam: { x: 0, y: 0, init: false },
    picked: new Set(),
    words: new Set(),
    spoken: new Set(),
    stonesGem: 0,
    dialogue: null,
    floaters: [],
    dust: [],
    t: 0,
    steer: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
    keys: new Set(),
    shake: 0,
    hintAt: 0,
    goliathDown: false
  };

  const entities = NPCS.map((n) => ({ ...n }));
  const stones = STONES.map((s) => ({ ...s, got: false }));

  let alive = true, raf = null, last = 0, paused = false;
  let font = "system-ui, sans-serif";
  try { font = (typeof getComputedStyle === "function" && getComputedStyle(document.body).fontFamily) || font; } catch { /* noop */ }

  const view = { w: 360, h: 520 };
  const saying = (o) => (typeof o === "string" ? o : L(o));

  /* ------------------------------------------------------------ geometry */
  const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)];
  const solidAt = (x, y) => {
    const [tx, ty] = tileOf(x, y);
    return blockedAt(grid, tx, ty);
  };

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

  /* ---------------------------------------------------------------- input */
  function pos(e) {
    const r = canvas.getBoundingClientRect?.() || { left: 0, top: 0 };
    const p = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: (p.clientX || 0) - r.left, y: (p.clientY || 0) - r.top };
  }

  function nearestNpc() {
    let best = null, bd = TALK_RANGE;
    for (const n of entities) {
      const nx = (n.at[0] + 0.5) * TILE, ny = (n.at[1] + 0.5) * TILE;
      const d = Math.hypot(nx - st.p.x, ny - st.p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  function npcUnder(px, py) {
    const wx = px + st.cam.x, wy = py + st.cam.y;
    for (const n of entities) {
      const nx = (n.at[0] + 0.5) * TILE, ny = (n.at[1] + 0.5) * TILE;
      if (Math.abs(wx - nx) < TILE * 0.7 && wy > ny - TILE * 1.1 && wy < ny + TILE * 0.35) return n;
    }
    return null;
  }

  function talk(npc) {
    const seen = st.spoken.has(npc.id);
    const lines = (seen ? npc.after : npc.lines) || npc.lines;
    st.dialogue = { npc, lines, i: 0, shown: 0, tally: false };
    st.target = null;
    st.pendingTalk = null;
  }

  function onDown(e) {
    e.preventDefault?.();
    if (paused) return;
    const p = pos(e);
    if (st.dialogue) {
      const d = st.dialogue;
      const full = L(d.lines[d.i].text);
      if (d.tally < full.length) { d.tally = full.length; return; }
      d.i++;
      d.tally = 0;
      if (d.i >= d.lines.length) finishDialogue();
      return;
    }
    /* a thumb on a face is a request to talk, however far away they are */
    const npc = npcUnder(p.x, p.y);
    if (npc) {
      const nx = (npc.at[0] + 0.5) * TILE, ny = (npc.at[1] + 0.5) * TILE;
      const near = nearestNpc();
      if (near && near.id === npc.id) talk(npc);
      else { st.target = { x: nx, y: ny, talk: npc.id }; st.pendingTalk = npc.id; }
      return;
    }
    st.steer = { active: true, id: e.pointerId ?? null, ox: p.x, oy: p.y, dx: 0, dy: 0, moved: false, sx: p.x, sy: p.y };
    if (st.target) st.target = null;
  }

  function onMove(e) {
    if (!st.steer.active || paused) return;
    const p = pos(e);
    const dx = p.x - st.steer.ox, dy = p.y - st.steer.oy;
    if (Math.hypot(dx, dy) > STEER_DEAD) st.steer.moved = true;
    st.steer.dx = dx; st.steer.dy = dy;
    st.steer.x = p.x; st.steer.y = p.y;
  }

  function onUp(e) {
    if (!st.steer.active) return;
    const s = st.steer;
    if (!s.moved && !st.dialogue) {
      /* a plain tap on the ground: walk there */
      const p = pos(e);
      st.target = { x: p.x + st.cam.x, y: p.y + st.cam.y };
    }
    st.steer = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  }

  function onKey(e, down) {
    const k = e.key;
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", " ", "Enter"].includes(k)) return;
    e.preventDefault?.();
    if (down) {
      if ((k === " " || k === "Enter") && st.dialogue) {
        const d = st.dialogue, full = L(d.lines[d.i].text);
        if (d.tally < full.length) d.tally = full.length;
        else { d.i++; d.tally = 0; if (d.i >= d.lines.length) finishDialogue(); }
        return;
      }
      st.keys.add(k.toLowerCase());
    } else st.keys.delete(k.toLowerCase());
  }

  const bindDown = (e) => onDown(e);
  const bindMove = (e) => onMove(e);
  const bindUp = (e) => onUp(e);
  const bindKd = (e) => onKey(e, true);
  const bindKu = (e) => onKey(e, false);

  function attach() {
    canvas.addEventListener("pointerdown", bindDown);
    window.addEventListener("pointermove", bindMove);
    window.addEventListener("pointerup", bindUp);
    window.addEventListener("pointercancel", bindUp);
    window.addEventListener("keydown", bindKd);
    window.addEventListener("keyup", bindKu);
    window.addEventListener("resize", resize);
  }
  attach();

  function detach() {
    canvas.removeEventListener("pointerdown", bindDown);
    window.removeEventListener("pointermove", bindMove);
    window.removeEventListener("pointerup", bindUp);
    window.removeEventListener("pointercancel", bindUp);
    window.removeEventListener("keydown", bindKd);
    window.removeEventListener("keyup", bindKu);
    window.removeEventListener("resize", resize);
  }

  /* ------------------------------------------------------------- dialogue */
  function finishDialogue() {
    const d = st.dialogue;
    st.dialogue = null;
    if (!d || !d.npc) return;
    const npc = d.npc;
    if (!st.spoken.has(npc.id)) {
      st.spoken.add(npc.id);
      if (npc.word && !st.words.has(npc.word)) {
        st.words.add(npc.word);
        const w = WORDS.find((x) => x.id === npc.word);
        floater(L({ en: "A word kept", zh: "记住了一句话" }) + (w ? ` · ${w.ref}` : ""), "#f7dda5");
        try { opts.onWord?.(npc.word); } catch { /* optional */ }
      }
    }
  }

  function floater(text, color = "#f7dda5") {
    st.floaters.push({ text, color, life: 2.2, y: 0 });
  }

  /* ---------------------------------------------------------------- step */
  function tryMove(dx, dy) {
    const nx = st.p.x + dx;
    if (!solidAt(nx, st.p.y - 6) && !solidAt(nx, st.p.y - 2) && !solidAt(nx, st.p.y)) st.p.x = nx;
    const ny = st.p.y + dy;
    if (!solidAt(st.p.x, ny) && !solidAt(st.p.x - 8, ny) && !solidAt(st.p.x + 8, ny)) st.p.y = ny;
  }

  function update(dt) {
    st.t += dt;
    const p = st.p;

    /* ---- intent from a drag */
    let mx = 0, my = 0;
    if (st.steer.active && st.steer.moved) {
      const m = Math.hypot(st.steer.dx, st.steer.dy) || 1;
      const push = Math.min(1, m / 44);
      mx = (st.steer.dx / m) * push;
      my = (st.steer.dy / m) * push;
      st.target = null;
    }
    /* ---- intent from the keyboard */
    const k = st.keys;
    if (k.size) {
      let kx = 0, ky = 0;
      if (k.has("arrowleft") || k.has("a")) kx -= 1;
      if (k.has("arrowright") || k.has("d")) kx += 1;
      if (k.has("arrowup") || k.has("w")) ky -= 1;
      if (k.has("arrowdown") || k.has("s")) ky += 1;
      if (kx || ky) { const m = Math.hypot(kx, ky); mx = kx / m; my = ky / m; st.target = null; }
    }
    /* ---- intent from a tap */
    if (st.target) {
      const dx = st.target.x - p.x, dy = st.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { st.target = null; }
      else { mx = dx / d; my = dy / d; }
    }

    const mag = Math.hypot(mx, my);
    if (!st.dialogue && mag > 0.04) {
      const sp = SPEED * Math.min(1, mag) * dt;
      tryMove(mx * sp, my * sp);
      p.moving = true;
      p.frame = (p.frame + dt * 7.4) % 4;
      p.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? "left" : "right") : (my < 0 ? "up" : "down");
    } else {
      p.moving = false;
      p.frame += (0 - p.frame) * Math.min(1, dt * 9);
      if (Math.abs(p.frame) < 0.02) p.frame = 0;
    }

    /* ---- auto-talk when you asked for it from across the camp */
    if (st.pendingTalk) {
      const npc = entities.find((n) => n.id === st.pendingTalk);
      if (npc) {
        const nx = (npc.at[0] + 0.5) * TILE, ny = (npc.at[1] + 0.5) * TILE;
        if (Math.hypot(nx - p.x, ny - p.y) < TALK_RANGE * 0.92) talk(npc);
      } else st.pendingTalk = null;
    }

    /* ---- stones */
    for (const s of stones) {
      if (s.got) continue;
      const sx = (s.at[0] + 0.5) * TILE, sy = (s.at[1] + 0.5) * TILE;
      if (Math.hypot(sx - p.x, sy - p.y) < PICK_RANGE + TILE * 0.3) {
        s.got = true;
        st.picked.add(s.id);
        st.pickUpAt = st.t;
        floater(L({ en: `A smooth stone · ${st.picked.size}/5`, zh: `一块光滑的石子 · ${st.picked.size}/5` }));
        try { opts.onStone?.(st.picked.size); } catch { /* optional */ }
      }
    }

    /* ---- the challenge line */
    if (st.phase === "field" && !st.goliathDown) {
      const [, ty] = tileOf(p.x, p.y);
      if (ty <= ELAH.challengeRow) {
        if (st.picked.size >= 5) {
          st.phase = "crossing";
          try { opts.onReachGiant?.({ stones: st.picked.size, words: [...st.words] }); } catch { /* optional */ }
        } else {
          /* no fail state: he simply will not let you past without them */
          if (st.t - st.hintAt > 3.2) {
            st.hintAt = st.t;
            st.dialogue = {
              npc: null, i: 0, tally: 0,
              lines: [{ who: null, text: { en: "You reach the line, and your hand closes on an empty pouch. Five stones. The brook is behind you.", zh: "你走到界线前，手在袋子里摸了个空。要五块石子。溪水在你身后。" } }]
            };
            st.target = { x: p.x, y: p.y + TILE * 3 };
          }
        }
      }
    }

    /* ---- coming home */
    if (st.phase === "return") {
      const rx = (ELAH.returnTo[0] + 0.5) * TILE, ry = (ELAH.returnTo[1] + 0.5) * TILE;
      if (Math.hypot(rx - p.x, ry - p.y) < TILE * 1.2) {
        st.phase = "done";
        try { opts.onHome?.(); } catch { /* optional */ }
      }
    }

    /* ---- camera */
    if (!st.cam.init) {
      st.cam.x = p.x - view.w / 2;
      st.cam.y = p.y - view.h * 0.58;
      st.cam.init = true;
    }
    const tx = p.x - view.w / 2;
    const ty = p.y - view.h * 0.58;
    st.cam.x += (tx - st.cam.x) * Math.min(1, dt * 6.5);
    st.cam.y += (ty - st.cam.y) * Math.min(1, dt * 6.5);
    st.cam.x = MAP_W <= view.w ? (MAP_W - view.w) / 2 : Math.max(0, Math.min(MAP_W - view.w, st.cam.x));
    st.cam.y = MAP_H <= view.h ? (MAP_H - view.h) / 2 : Math.max(0, Math.min(MAP_H - view.h, st.cam.y));

    /* ---- decorations */
    for (const f of st.floaters) f.life -= dt;
    st.floaters = st.floaters.filter((f) => f.life > 0);
    if (st.dust.length < 26) {
      st.dust.push({ x: Math.random() * view.w, y: Math.random() * view.h, r: 0.6 + Math.random() * 1.6, s: 4 + Math.random() * 10, a: 0.05 + Math.random() * 0.09 });
    }
    for (const d of st.dust) {
      d.y -= d.s * dt * 0.4;
      d.x += Math.sin(st.t * 0.5 + d.y * 0.01) * dt * 5;
      if (d.y < -6) { d.y = view.h + 6; d.x = Math.random() * view.w; }
    }
    st.shake = Math.max(0, st.shake - dt * 14);
  }

  /* ---------------------------------------------------------------- paint */
  function baseTile(ty) { return ty <= 9 ? "dry" : "grass"; }

  function drawTile(tx, ty, x, y) {
    const t = grid[ty][tx];
    const n = hash(tx * 13.37 + ty * 7.91);
    let fill;
    if (t === T.CLIFF) fill = COL.cliff;
    else if (t === T.WATER) fill = COL.water;
    else if (t === T.FORD) fill = COL.ford;
    else if (t === T.PATH) fill = n > 0.5 ? COL.pathA : COL.pathB;
    else if (t === T.WHEAT) fill = COL.wheat;
    else if (t === T.FLOWER) fill = COL.flower;
    else fill = baseTile(ty) === "dry" ? (n > 0.5 ? COL.dryA : COL.dryB) : (n > 0.5 ? COL.grassA : COL.grassB);

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, TILE + 1, TILE + 1);

    /* texture: three specks per tile, hashed so they never crawl */
    if (t !== T.CLIFF && t !== T.WATER && t !== T.FORD) {
      ctx.fillStyle = "rgba(0,0,0,.10)";
      for (let i = 0; i < 3; i++) {
        const hx = hash(tx * 31 + ty * 17 + i * 5.1);
        const hy = hash(tx * 11 + ty * 29 + i * 3.7);
        ctx.fillRect(x + hx * TILE, y + hy * TILE, 2, 2);
      }
    }

    if (t === T.CLIFF) {
      ctx.fillStyle = COL.cliffLip;
      ctx.fillRect(x, y, TILE + 1, 3 + n * 3);
    }

    if (t === T.WATER || t === T.FORD) {
      const wob = Math.sin(st.t * 1.4 + tx * 0.7 + ty * 0.4) * 3;
      ctx.strokeStyle = t === T.FORD ? "rgba(190,225,235,.30)" : "rgba(150,200,215,.20)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y + 14 + wob);
      ctx.quadraticCurveTo(x + TILE / 2, y + 10 + wob, x + TILE, y + 15 + wob);
      ctx.stroke();
      if (t === T.FORD) {
        ctx.fillStyle = "rgba(230,215,180,.16)";
        ctx.beginPath(); ctx.arc(x + TILE * 0.34, y + TILE * 0.6, 5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + TILE * 0.7, y + TILE * 0.34, 3.4, 0, TAU); ctx.fill();
      }
    }

    if (t === T.FLOWER) {
      for (let i = 0; i < 3; i++) {
        const hx = hash(tx * 5 + ty * 3 + i);
        const hy = hash(tx * 9 + ty * 7 + i * 2);
        ctx.fillStyle = i === 1 ? "#e8c78a" : "#c9d6b8";
        ctx.beginPath();
        ctx.arc(x + 6 + hx * (TILE - 12), y + 6 + hy * (TILE - 12), 1.5, 0, TAU);
        ctx.fill();
      }
    }
    if (t === T.WHEAT) {
      ctx.strokeStyle = "rgba(219,196,120,.55)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const hx = hash(tx * 17 + ty * 23 + i * 3.3);
        const bx = x + 5 + hx * (TILE - 10);
        const sway = Math.sin(st.t * 1.1 + hx * 6) * 1.6;
        ctx.beginPath();
        ctx.moveTo(bx, y + TILE - 4);
        ctx.quadraticCurveTo(bx + sway, y + TILE * 0.5, bx + sway * 1.7, y + 8);
        ctx.stroke();
      }
    }
  }

  function drawTentAt(x, y) {
    const w = TILE * 1.9, h = TILE * 1.5;
    ctx.fillStyle = "rgba(4,9,12,.34)";
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.94, w * 0.52, h * 0.12, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(x, y - h, x + w, y);
    g.addColorStop(0, "#4a3a2e"); g.addColorStop(0.55, "#3a2d24"); g.addColorStop(1, "#2a201a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h);
    ctx.lineTo(x + w, y + h * 0.1);
    ctx.lineTo(x - 2, y + h * 0.1);
    ctx.closePath(); ctx.fill();
    /* the ridge and the door flap */
    ctx.strokeStyle = "rgba(247,221,165,.24)";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x + w / 2, y + h * 0.1); ctx.stroke();
    ctx.fillStyle = "rgba(8,12,15,.6)";
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h * 0.52);
    ctx.lineTo(x + w * 0.66, y + h * 0.1);
    ctx.lineTo(x + w * 0.34, y + h * 0.1);
    ctx.closePath(); ctx.fill();
    /* a rope line and a peg */
    ctx.strokeStyle = "rgba(247,221,165,.16)";
    ctx.beginPath(); ctx.moveTo(x + 2, y + h * 0.06); ctx.lineTo(x + w * 0.3, y + h * 0.02); ctx.stroke();
  }

  function drawTreeAt(x, y) {
    ctx.fillStyle = "rgba(4,9,12,.3)";
    ctx.beginPath(); ctx.ellipse(x, y + TILE * 0.42, TILE * 0.34, TILE * 0.11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3b2f22";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + TILE * 0.4); ctx.lineTo(x - 1, y - TILE * 0.1); ctx.stroke();
    const sway = Math.sin(st.t * 0.8 + x * 0.01) * 1.6;
    for (const [ox, oy, r, c] of [[0, -TILE * 0.55, TILE * 0.43, "#27402f"], [-TILE * 0.2, -TILE * 0.36, TILE * 0.32, "#1f3527"], [TILE * 0.22, -TILE * 0.4, TILE * 0.3, "#2c4633"]]) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(x + ox + sway, y + oy, r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(247,221,165,.10)";
    ctx.beginPath(); ctx.arc(x - TILE * 0.12 + sway, y - TILE * 0.66, TILE * 0.2, 0, TAU); ctx.fill();
  }

  function drawRockAt(x, y, seed) {
    const n = hash(seed);
    ctx.fillStyle = "rgba(4,9,12,.32)";
    ctx.beginPath(); ctx.ellipse(x, y + TILE * 0.34, TILE * 0.32, TILE * 0.1, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const ox = (hash(seed + i * 3) - 0.5) * TILE * 0.42;
      const oy = (hash(seed + i * 7) - 0.4) * TILE * 0.3;
      const r = TILE * (0.16 + hash(seed + i * 11) * 0.12);
      ctx.fillStyle = i % 2 ? "#4a5157" : "#3b4248";
      ctx.beginPath(); ctx.ellipse(x + ox, y + oy + TILE * 0.12, r, r * 0.82, n * 0.4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(247,221,165,.16)";
    ctx.beginPath(); ctx.ellipse(x - TILE * 0.08, y - TILE * 0.02, TILE * 0.1, TILE * 0.06, 0, 0, TAU); ctx.fill();
  }

  function drawStone(s) {
    const x = (s.at[0] + 0.5) * TILE, y = (s.at[1] + 0.5) * TILE;
    const bob = Math.sin(st.t * 2 + s.at[0]) * 1.4;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - 4, 1, x, y - 4, 18);
    g.addColorStop(0, "rgba(247,221,165,.34)");
    g.addColorStop(1, "rgba(247,221,165,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y - 4, 18, 0, TAU); ctx.fill();
    drawShadow(ctx, x, y + 4, 7, 0.3);
    ctx.fillStyle = "#c9c2ac";
    ctx.beginPath(); ctx.ellipse(x, y - 4 + bob, 6.4, 5, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,250,235,.6)";
    ctx.beginPath(); ctx.ellipse(x - 2, y - 6.4 + bob, 2.2, 1.6, 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawGoliath() {
    if (st.goliathDown) return;
    const x = (ELAH.goliath[0] + 0.5) * TILE, y = (ELAH.goliath[1] + 1.1) * TILE;
    const breathe = Math.sin(st.t * 1.1) * 1.6;
    drawShadow(ctx, x, y, 26, 0.42);
    drawActor(ctx, "giant", x, y, { dir: "down", frame: 0, h: 132, squash: 1 + breathe * 0.002 });
    /* the spear, planted */
    ctx.strokeStyle = "#8e949c";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 24, y + 4); ctx.lineTo(x + 27, y - 128); ctx.stroke();
    ctx.fillStyle = "#c9c2ac";
    ctx.beginPath();
    ctx.moveTo(x + 27, y - 148); ctx.lineTo(x + 32, y - 126); ctx.lineTo(x + 22, y - 126);
    ctx.closePath(); ctx.fill();
    /* heat shimmer of dust at his feet */
    ctx.fillStyle = "rgba(247,221,165,.05)";
    ctx.beginPath(); ctx.ellipse(x, y - 6, 40, 12, 0, 0, TAU); ctx.fill();
  }

  function drawHud() {
    /* chapter plate */
    ctx.save();
    ctx.fillStyle = "rgba(8,14,18,.62)";
    roundRect(ctx, 12, 12, view.w - 24, 46, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(247,221,165,.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f7dda5";
    ctx.font = `600 ${Math.round(15 * scale())}px ${font}`;
    ctx.textBaseline = "middle";
    ctx.fillText(L(ELAH.name), 24, 30);
    ctx.fillStyle = "rgba(232,240,240,.55)";
    ctx.font = `${Math.round(11 * scale())}px ${font}`;
    ctx.fillText(L(ELAH.sub), 24, 46);

    /* stones, as five little circles */
    const sx = view.w - 34 - 4 * 15;
    for (let i = 0; i < 5; i++) {
      const got = i < st.picked.size;
      ctx.beginPath();
      ctx.arc(sx + i * 15, 35, 4.6, 0, TAU);
      ctx.fillStyle = got ? "#d8cfb4" : "rgba(232,240,240,.16)";
      ctx.fill();
      if (got) { ctx.strokeStyle = "rgba(247,221,165,.6)"; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.fillStyle = "rgba(232,240,240,.42)";
    ctx.font = `${Math.round(9.5 * scale())}px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(L({ en: "stones", zh: "石子" }), view.w - 16, 51);
    ctx.textAlign = "left";
    ctx.restore();

    /* objective, under the plate */
    const obj = objective();
    if (obj) {
      ctx.save();
      ctx.font = `${Math.round(11.5 * scale())}px ${font}`;
      const w = ctx.measureText(obj).width + 26;
      ctx.fillStyle = "rgba(8,14,18,.5)";
      roundRect(ctx, 12, 64, Math.min(view.w - 24, w), 26, 13);
      ctx.fill();
      ctx.fillStyle = "rgba(247,221,165,.78)";
      ctx.textBaseline = "middle";
      ctx.fillText(obj, 24, 77);
      ctx.restore();
    }
  }

  function objective() {
    if (st.phase === "return") return L({ en: "Walk back down to the camp", zh: "沿原路走回营地" });
    if (st.picked.size < 5 && st.words.size >= 4) return L({ en: "The stones are at the brook", zh: "石子在下游的溪边" });
    if (st.picked.size >= 5 && st.words.size < 4) return L({ en: "Someone in the camp still has a word for you", zh: "营里还有人要跟你说一句话" });
    if (st.picked.size >= 5 && st.words.size >= 4) return L({ en: "Up the road, then", zh: "那就往路口上去吧" });
    return L({ en: "Walk up the road and find the others", zh: "沿路往上走，找其他人说说话" });
  }

  function scale() {
    /* Canvas text follows the app's reading-size setting, like the action scenes. */
    try {
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale"));
      return Number.isFinite(v) && v > 0.5 ? v : 1.1;
    } catch { return 1.1; }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawPrompt() {
    if (st.dialogue) return;
    const n = nearestNpc();
    if (!n) return;
    const x = (n.at[0] + 0.5) * TILE - st.cam.x;
    const y = (n.at[1] + 0.5) * TILE - st.cam.y - TILE * 2.1 + Math.sin(st.t * 3) * 2;
    ctx.save();
    ctx.fillStyle = "rgba(8,14,18,.72)";
    const label = L({ en: "talk", zh: "说话" });
    ctx.font = `600 ${Math.round(11 * scale())}px ${font}`;
    const w = ctx.measureText(label).width + 26;
    roundRect(ctx, x - w / 2, y - 12, w, 22, 11);
    ctx.fill();
    ctx.strokeStyle = "rgba(247,221,165,.44)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f7dda5";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y - 1);
    ctx.textAlign = "left";
    ctx.restore();
  }

  function wrapText(text, maxW) {
    /* Chinese has no spaces: wrap by character. English wraps by word. */
    const out = [];
    if (isZh()) {
      let line = "";
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
        else line += ch;
      }
      if (line) out.push(line);
      return out;
    }
    let line = "";
    for (const word of text.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function drawDialogue() {
    const d = st.dialogue;
    if (!d) return;
    const line = d.lines[d.i];
    const text = L(line.text);
    const full = text.slice(0, Math.floor(d.tally));
    const boxH = view.h * 0.32;
    const y0 = view.h - boxH - 14;

    ctx.save();
    /* scrim so the words always win against the grass */
    const scrim = ctx.createLinearGradient(0, y0 - 40, 0, view.h);
    scrim.addColorStop(0, "rgba(6,11,15,0)");
    scrim.addColorStop(0.4, "rgba(6,11,15,.72)");
    scrim.addColorStop(1, "rgba(6,11,15,.92)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, y0 - 40, view.w, view.h - y0 + 40);

    ctx.fillStyle = "rgba(14,22,28,.92)";
    roundRect(ctx, 12, y0, view.w - 24, boxH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(247,221,165,.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    let ty = y0 + 26;
    if (line.who) {
      ctx.fillStyle = "#f7dda5";
      ctx.font = `700 ${Math.round(12.5 * scale())}px ${font}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(L(line.who), 28, ty);
      ty += 20;
    }
    ctx.fillStyle = "rgba(240,244,244,.94)";
    const fs = Math.round(13.5 * scale());
    ctx.font = `${fs}px ${font}`;
    const lines = wrapText(full, view.w - 56);
    const lh = Math.round(fs * 1.62);
    for (const l of lines) {
      if (ty > y0 + boxH - 18) break;
      ctx.fillText(l, 28, ty + fs);
      ty += lh;
    }

    /* the tap hint, blinking, never a countdown */
    if (Math.sin(st.t * 3.2) > -0.3) {
      ctx.fillStyle = "rgba(247,221,165,.7)";
      ctx.font = `${Math.round(11 * scale())}px ${font}`;
      ctx.textAlign = "right";
      ctx.fillText(d.i + 1 < d.lines.length ? L({ en: "tap ▸", zh: "点一下 ▸" }) : L({ en: "tap to close ▸", zh: "点一下收起 ▸" }), view.w - 26, y0 + boxH - 14);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  function drawSteer() {
    const s = st.steer;
    if (!s.active || !s.moved) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "rgba(247,221,165,.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, 26, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(247,221,165,.34)";
    ctx.beginPath(); ctx.arc(s.ox + Math.max(-22, Math.min(22, s.dx)), s.oy + Math.max(-22, Math.min(22, s.dy)), 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function render() {
    if (noCanvas) return;
    const sx = (Math.random() - 0.5) * st.shake;
    const sy = (Math.random() - 0.5) * st.shake;
    ctx.save();
    ctx.translate(sx, sy);

    ctx.fillStyle = "#0a1014";
    ctx.fillRect(0, 0, view.w, view.h);

    const x0 = Math.max(0, Math.floor(st.cam.x / TILE));
    const y0 = Math.max(0, Math.floor(st.cam.y / TILE));
    const x1 = Math.min(W - 1, Math.ceil((st.cam.x + view.w) / TILE));
    const y1 = Math.min(H - 1, Math.ceil((st.cam.y + view.h) / TILE));

    ctx.save();
    ctx.translate(-Math.round(st.cam.x), -Math.round(st.cam.y));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) drawTile(tx, ty, tx * TILE, ty * TILE);
    }
    /* props that stand on top of a tile */
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = grid[ty][tx];
        const px = tx * TILE, py = ty * TILE;
        if (t === T.TENT) {
          const left = tx > 0 && grid[ty][tx - 1] === T.TENT;
          const up = ty > 0 && grid[ty - 1][tx] === T.TENT;
          if (!left && !up) drawTentAt(px - TILE * 0.4, py + TILE * 1.9);
        } else if (t === T.TREE) drawTreeAt(px + TILE / 2, py + TILE / 2);
        else if (t === T.ROCK) drawRockAt(px + TILE / 2, py + TILE / 2, tx * 7 + ty * 13);
      }
    }

    /* everything with feet, sorted back to front */
    const cast = [];
    for (const n of entities) {
      cast.push({ y: (n.at[1] + 0.5) * TILE, draw: () => {
        const x = (n.at[0] + 0.5) * TILE, yy = (n.at[1] + 0.62) * TILE;
        const idle = Math.sin(st.t * 1.3 + n.at[0]) * 0.4;
        drawShadow(ctx, x, yy, 13, 0.3);
        drawActor(ctx, n.actor, x, yy, { dir: "down", frame: idle, h: 50 });
        /* name plate, only when close enough to matter */
        const d = Math.hypot(x - st.p.x, yy - st.p.y);
        if (d < TILE * 3.2) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (TILE * 3.2 - d) / (TILE * 1.2));
          ctx.fillStyle = "rgba(8,14,18,.6)";
          ctx.font = `${Math.round(10.5 * scale())}px ${font}`;
          const label = L(n.name);
          const w = ctx.measureText(label).width + 14;
          roundRect(ctx, x - w / 2, yy - 68, w, 18, 9);
          ctx.fill();
          ctx.fillStyle = "rgba(232,240,240,.85)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, x, yy - 59);
          ctx.textAlign = "left";
          ctx.restore();
        }
      } });
    }
    for (const s of stones) if (!s.got) cast.push({ y: (s.at[1] + 0.5) * TILE, draw: () => drawStone(s) });
    cast.push({ y: st.p.y, draw: () => {
      drawShadow(ctx, st.p.x, st.p.y + 2, 14, 0.36);
      drawActor(ctx, "pilgrim", st.p.x, st.p.y + 2, { dir: st.p.dir, frame: st.p.frame, h: 52, glow: true });
    } });
    if (!st.goliathDown) cast.push({ y: (ELAH.goliath[1] + 1.1) * TILE, draw: drawGoliath });
    cast.sort((a, b) => a.y - b.y);
    for (const c of cast) c.draw();

    ctx.restore();

    /* warmth and vignette: the same light the rest of the game is lit by */
    const warm = ctx.createLinearGradient(0, 0, 0, view.h);
    warm.addColorStop(0, "rgba(247,196,106,.10)");
    warm.addColorStop(0.45, "rgba(247,196,106,.02)");
    warm.addColorStop(1, "rgba(10,20,26,.28)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.fillStyle = "rgba(240,220,180,.05)";
    for (const d of st.dust) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); }

    const vig = ctx.createRadialGradient(view.w / 2, view.h * 0.45, view.h * 0.32, view.w / 2, view.h * 0.45, view.h * 0.86);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,.52)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, view.w, view.h);

    drawHud();
    drawPrompt();
    drawDialogue();
    drawSteer();

    /* floaters */
    let fy = 0;
    for (const f of st.floaters) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.font = `600 ${Math.round(12.5 * scale())}px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, view.w / 2, view.h * 0.34 - (1 - f.life) * 14 - fy);
      ctx.textAlign = "left";
      ctx.restore();
      fy += 20;
    }
    ctx.restore();
  }

  /* ----------------------------------------------------------------- loop */
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    /* Paused means paused: the fight draws on this same canvas below, so the
       field must stop painting and must stop listening for taps. */
    if (!paused) { update(dt); render(); }
    raf = requestAnimationFrame(frame);
  }

  resize();
  render();
  raf = requestAnimationFrame(frame);

  return {
    stop() { alive = false; if (raf) cancelAnimationFrame(raf); detach(); },
    pause() { paused = true; detach(); },
    resume() { paused = false; attach(); resize(); },
    /* the screen above hands the body over and takes it back */
    setPhase(phase) { st.phase = phase; },
    takeStone() {
      const next = stones.find((s) => !s.got);
      if (next) { next.got = true; st.picked.add(next.id); }
    },
    standDownGiant() {
      st.goliathDown = true;
      st.phase = "return";
      st.shake = 8;
      floater(L({ en: "The valley is quiet", zh: "山谷静下来了" }), "#f7dda5");
    },
    state: st
  };
}
