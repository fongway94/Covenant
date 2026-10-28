/* ============================================================================
   Story moment engine — five tiny tactile interactions, DOM-based so they work
   in jsdom, old WebViews and offline single-file builds with zero dependencies.

   startMoment(host, spec, onDone) -> { stop(), skip() }
   onDone({ success, skipped, score })
   ============================================================================ */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

const KINDS = ["hold", "tap", "trace", "balance", "rhythm"];

function el(tag, cls, html = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function point(e, host) {
  const r = host.getBoundingClientRect();
  const p = e.touches?.[0] || e.changedTouches?.[0] || e;
  const w = r.width || 320, h = r.height || 220;
  return { x: clamp(p.clientX - r.left, 0, w), y: clamp(p.clientY - r.top, 0, h), w, h };
}

export function startMoment(host, spec, onDone) {
  if (!host || !KINDS.includes(spec.kind)) { onDone?.({ success: false, skipped: true, score: 0 }); return { stop() {}, skip() {} }; }

  let alive = true, finished = false, raf = null, interval = null, last = 0;
  const S = {
    kind: spec.kind, t: 0, progress: 0, down: false, target: 0.5,
    charge: 0, hits: 0, hit: 0, nodeT: 0, node: null,
    marker: 0, dir: 1, speed: 0.82, band: 0.5, bandW: 0.17,
    pos: 0.5, vel: 0, good: 0, path: [], lastAction: -10,
    limit: spec.kind === "trace" ? 19 : spec.kind === "tap" ? 16 : 15
  };
  host.innerHTML = "";
  host.classList.add("moment-stage", "kind-" + spec.kind);

  const meter = () => document.getElementById("moment-meter");
  const feedback = () => document.getElementById("moment-feedback");
  const say = (s) => { const f = feedback(); if (f) f.textContent = s; };
  const setProgress = (p) => { S.progress = clamp(p, 0, 1); const m = meter(); if (m) m.style.width = `${Math.round(S.progress * 100)}%`; };

  /* ------------------------------------------------------------- markup */
  let nodeEl = null, tokenEl = null, barEl = null, bandEl = null, ringEl = null, pathEl = null;

  if (spec.kind === "hold") {
    ringEl = el("div", "moment-ring");
    ringEl.innerHTML = `<div class="moment-ring-inner">✟</div>`;
    host.appendChild(ringEl);
  } else if (spec.kind === "tap") {
    host.appendChild(el("div", "moment-tap-hint", "✦"));
  } else if (spec.kind === "trace") {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      pts.push([0.5 + Math.sin(u * 5.2 + 0.4) * 0.30, 0.90 - u * 0.76]);
    }
    S.path = pts;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 1 1");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "moment-svg");
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(" ");
    pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("class", "moment-path");
    svg.appendChild(pathEl);
    host.appendChild(svg);
    tokenEl = el("div", "moment-token", "✦");
    host.appendChild(tokenEl);
  } else {
    barEl = el("div", "moment-bar");
    bandEl = el("div", "moment-band");
    barEl.appendChild(bandEl);
    const cursor = el("div", "moment-cursor");
    barEl.appendChild(cursor);
    S.cursorEl = cursor;
    host.appendChild(barEl);
    if (spec.kind === "balance") host.appendChild(el("div", "moment-hint", "◇"));
  }

  /* ------------------------------------------------------------- effects */
  function spark(x, y) {
    for (let i = 0; i < 8; i++) {
      const s = el("i", "moment-spark");
      const a = rand(0, TAU), d = rand(8, 38);
      s.style.left = `${x}px`; s.style.top = `${y}px`;
      s.style.setProperty("--dx", `${Math.cos(a) * d}px`);
      s.style.setProperty("--dy", `${Math.sin(a) * d}px`);
      host.appendChild(s);
      setTimeout(() => s.remove(), 520);
    }
  }

  function spawnNode() {
    if (nodeEl) nodeEl.remove();
    nodeEl = el("button", "moment-node", "✧");
    nodeEl.type = "button";
    nodeEl.style.left = `${rand(12, 84)}%`;
    nodeEl.style.top = `${rand(14, 78)}%`;
    nodeEl.addEventListener("pointerdown", onNode);
    nodeEl.addEventListener("click", onNode);
    host.appendChild(nodeEl);
    S.nodeT = 0;
  }
  function onNode(e) {
    e.stopPropagation(); e.preventDefault?.();
    if (!alive || finished || !nodeEl || nodeEl.dataset.hit) return;
    nodeEl.dataset.hit = "1";
    const p = point(e, host);
    spark(p.x, p.y);
    S.hit++;
    setProgress(S.hit / 5);
    say(`${S.hit} / 5`);
    if (S.hit >= 5) return finish(true);
    spawnNode();
  }

  /* ------------------------------------------------------------- input */
  function down(e) {
    if (!alive || finished) return;
    e.preventDefault?.();
    const p = point(e, host);
    S.down = true; S.target = p.x / p.w;
    if (S.kind === "rhythm") {
      if (S.t - S.lastAction < 0.12) return;
      S.lastAction = S.t;
      if (Math.abs(S.marker - S.band) < S.bandW / 2) {
        S.hits++; setProgress(S.hits / 4);
        spark(p.x, p.y);
        say(`${S.hits} / 4`);
        if (S.hits >= 4) return finish(true);
        S.band = rand(0.16, 0.84); S.speed = Math.min(1.5, S.speed + 0.09);
      } else {
        host.classList.remove("miss"); void host.offsetWidth; host.classList.add("miss");
        say("—");
      }
    }
  }
  function move(e) {
    if (!alive || finished) return;
    e.preventDefault?.();
    const p = point(e, host);
    if (S.kind === "balance") S.target = p.x / p.w;
    if (S.kind === "trace" && S.down) traceTo(p);
    if (tokenEl && (S.kind === "trace" || S.kind === "balance")) {
      tokenEl.style.left = `${p.x}px`; tokenEl.style.top = `${p.y}px`;
    }
  }
  function up(e) { S.down = false; }

  function traceTo(p) {
    let best = -1, bestD = 1e9;
    for (let i = 0; i < S.path.length; i++) {
      const q = S.path[i];
      const dx = (q[0] - p.x / p.w) * p.w, dy = (q[1] - p.y / p.h) * p.h;
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best > S.progress * 60 && bestD < 46) {
      const np = best / 60;
      if (np > S.progress) {
        setProgress(np);
        if (tokenEl) { tokenEl.style.left = `${S.path[best][0] * p.w}px`; tokenEl.style.top = `${S.path[best][1] * p.h}px`; }
        if (np >= 0.97) finish(true);
      }
    }
  }

  const downs = ["pointerdown", "mousedown", "touchstart"];
  const moves = ["pointermove", "mousemove", "touchmove"];
  const ups = ["pointerup", "pointercancel", "mouseup", "touchend", "mouseleave"];
  const listeners = [];
  const add = (type, fn) => { host.addEventListener(type, fn, { passive: false }); listeners.push([type, fn]); };
  downs.forEach((t) => add(t, down));
  moves.forEach((t) => add(t, move));
  ups.forEach((t) => add(t, up));

  if (spec.kind === "tap") spawnNode();

  /* ------------------------------------------------------------- loop */
  function draw() {
    if (ringEl) {
      ringEl.style.setProperty("--p", `${Math.round(S.charge * 100)}%`);
      ringEl.classList.toggle("charged", S.charge > 0.75);
    }
    if (S.cursorEl) S.cursorEl.style.left = `${(S.kind === "balance" ? S.pos : S.marker) * 100}%`;
    if (bandEl) {
      bandEl.style.left = `${(S.band - S.bandW / 2) * 100}%`;
      bandEl.style.width = `${S.bandW * 100}%`;
      bandEl.style.display = S.kind === "rhythm" ? "block" : "none";
      if (S.kind === "balance") { bandEl.style.display = "block"; bandEl.style.left = "37%"; bandEl.style.width = "26%"; }
    }
    if (pathEl) pathEl.style.setProperty("--p", `${Math.round(S.progress * 100)}%`);
  }

  function step(dt) {
    S.t += dt;
    if (S.kind === "hold") {
      S.charge = clamp(S.charge + dt * (S.down ? 0.68 : -0.34), 0, 1.02);
      setProgress(S.charge);
      if (S.charge >= 1) return finish(true);
    } else if (S.kind === "tap") {
      S.nodeT += dt;
      if (S.nodeT > 2.0) spawnNode();
    } else if (S.kind === "trace") {
      if (!S.progress) setProgress(0.01);
    } else if (S.kind === "balance") {
      S.vel = (S.vel + (Math.sin(S.t * 1.9) * 0.85 + Math.cos(S.t * 0.83) * 0.45) * dt) * 0.975;
      if (S.down) S.pos += (S.target - S.pos) * Math.min(1, dt * 5);
      else S.pos += S.vel * dt;
      S.pos = clamp(S.pos, 0.04, 0.96);
      if (Math.abs(S.pos - 0.5) < 0.13) S.good += dt;
      setProgress(S.good / 3.6);
      if (S.good >= 3.6) return finish(true);
    } else if (S.kind === "rhythm") {
      S.marker += S.dir * S.speed * dt;
      if (S.marker > 1) { S.marker = 1; S.dir = -1; }
      if (S.marker < 0) { S.marker = 0; S.dir = 1; }
    }
    if (S.t > S.limit) return finish(false);
  }

  function frame(ts) {
    if (!alive || finished) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    step(dt);
    draw();
    if (alive && !finished && raf !== null) raf = requestAnimationFrame(frame);
  }

  function finish(success, skipped = false) {
    if (finished) return;
    finished = true; alive = false;
    cleanup();
    onDone?.({ success: !!success, skipped, score: Math.round(S.progress * 100) });
  }
  function cleanup() {
    if (raf !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    if (interval !== null) clearInterval(interval);
    listeners.forEach(([t, fn]) => host.removeEventListener(t, fn));
  }

  if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
    raf = requestAnimationFrame(frame);
  } else if (typeof setInterval === "function") {
    last = Date.now();
    interval = setInterval(() => {
      const now = Date.now(), dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!finished) { step(dt); draw(); }
    }, 16);
  } else {
    // No timers (jsdom without pretendToBeVisual): stay skippable.
  }

  return {
    stop() { if (!finished) { finished = true; alive = false; cleanup(); } },
    skip() { finish(false, true); }
  };
}
