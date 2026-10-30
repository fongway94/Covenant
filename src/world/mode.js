/* World mode: the new way in.

   A separate screen with its own entry on the map, so story mode is untouched
   and one tap away. The valley hands you to a fight, the fight hands you back
   — the field is paused underneath it the whole time, not rebuilt, so you come
   back to the exact stone you were standing on. */

import { bus } from "../core/bus.js";
import { isZh } from "../core/i18n.js";
import { sfx } from "../core/audio.js";
import { saveGame, addXp, grantRelic } from "../core/state.js";
import { startField } from "./field.js";
import { startBattle } from "./battle.js";

const L = (en, zh) => (isZh() ? zh : en);

let run = null;

export function worldHtml() {
  return `<div class="screen world-screen">
    <canvas id="world-canvas" class="world-canvas" aria-label="${L("The Valley of Elah", "以拉谷")}"></canvas>
    <button class="world-exit" data-action="go" data-view="map" aria-label="${L("Leave the valley", "离开山谷")}">✕</button>
  </div>`;
}

/** A card that stops the world for one beat. Resolves on tap. */
function card(screen, { eyebrow, title, body, button, onTap }) {
  const el = document.createElement("div");
  el.className = "world-card-scrim";
  el.innerHTML = `<div class="world-card">
    ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}
    <h2>${title}</h2>
    <p>${body}</p>
    <button class="btn btn-primary">${button}</button>
  </div>`;
  screen.appendChild(el);
  const close = () => { el.remove(); try { onTap?.(); } catch { /* optional */ } };
  el.addEventListener("click", (e) => { e.stopPropagation(); close(); });
  return el;
}

export function mountWorld(ui) {
  const screen = document.querySelector(".world-screen");
  const canvas = document.getElementById("world-canvas");
  if (!screen || !canvas) return;

  /* A re-render (a language switch, a resize of the layout) replaces the DOM
     under a running mode. Start clean rather than leaving two loops on one
     canvas fighting for the frame. */
  if (run) { try { stopRun(); } catch { /* noop */ } }

  const state = ui.state || {};
  const stones = { got: 0 };

  const field = startField(canvas, {
    onStone: (n) => { stones.got = n; },
    onWord: () => { try { sfx("complete"); } catch { /* optional */ } },
    onReachGiant: ({ words }) => {
      field.pause();
      card(screen, {
        eyebrow: L("1 Samuel 17", "撒母耳记上 17"),
        title: L("He is still shouting.", "他还在喊。"),
        body: L(
          "You hear your own heartbeat, and then it stops being yours. You look down: the hands holding the sling are not your hands.",
          "你听见自己的心跳。然后那不像是你的心跳了。你低头，看见一双不属于自己的手，正握着一根甩石的绳子。"
        ),
        button: L("Step in", "走进去"),
        onTap: () => startFight(words)
      });
    },
    onHome: () => {
      field.pause();
      const reward = L(
        "The walk back is shorter than the walk up. The camp is still there, and so are the four people who gave you something to say.",
        "下山的路比上山短。营地还在，给你话的那四个人也还在。"
      );
      card(screen, {
        eyebrow: L("Chapter I · complete", "第一章 · 完成"),
        title: L("You come back down", "你下山了"),
        body: reward,
        button: L("Back to camp", "回到营地"),
        onTap: () => {
          try {
            addXp(state, 120);
            grantRelic(state, "stones");
            saveGame(state);
            bus.toast?.(L("Five smooth stones, kept", "五块光滑的石子，收下了"));
          } catch { /* the state is optional in smoke tests */ }
          stopRun();
          bus.go?.("camp");
        }
      });
    }
  });

  function startFight(words) {
    const battle = startBattle(canvas, {
      words,
      onDone: () => {
        battle.stop();
        card(screen, {
          eyebrow: L("You are yourself again", "你又是你自己了"),
          title: L("The valley is quiet", "山谷安静下来了"),
          body: L(
            "The rough of the cord is still in your hand, and it was never your hand. Nobody down here will ever know what it felt like to stand in his sandals for one afternoon.",
            "绳子的粗糙还留在你手里，可那从来不是你的手。山下没有人会知道，在他那双鞋里站过一个下午，是什么感觉。"
          ),
          button: L("Walk back down", "走下山去"),
          onTap: () => {
            field.standDownGiant();
            field.resume();
          }
        });
      }
    });
    run.battle = battle;
  }

  run = { field, battle: null, canvas, screen };

  function stopRun() {
    try { run?.field?.stop(); } catch { /* noop */ }
    try { run?.battle?.stop(); } catch { /* noop */ }
    run = null;
  }
  run.stop = stopRun;
}

export function cleanupWorld() {
  if (!run) return;
  try { run.field?.stop(); } catch { /* noop */ }
  try { run.battle?.stop(); } catch { /* noop */ }
  document.querySelectorAll(".world-card-scrim").forEach((n) => n.remove());
  run = null;
}
