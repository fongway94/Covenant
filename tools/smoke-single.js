#!/usr/bin/env node
/* Verifies the one-file offline build boots and plays. Run: npm run smoke:single */
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "Covenant-offline.html");
if (!fs.existsSync(file)) { console.error("Run `npm run build:single` first."); process.exit(1); }
const html = fs.readFileSync(file, "utf8");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push(String(e)));
vc.on("error", (...a) => errors.push(a.join(" ")));
const dom = new JSDOM(html, { url: "https://example.com/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc });
const d = dom.window.document;
const check = (cond, msg) => { if (!cond) throw new Error("ASSERT: " + msg); };

try {
  check(d.querySelector(".title-screen"), "title screen missing");
  check(d.querySelector("style"), "inline CSS missing");
  check(html.includes("data:image/jpeg;base64,"), "artwork not inlined");
  check(html.includes("data:font/woff2;base64,"), "symbol fonts not inlined");
  check(!/src="[^"]*assets\//.test(html), "external asset reference remains");

  d.querySelector('[data-action="new-game"]').click();
  check(d.querySelector("#pilgrim-name"), "create screen missing");
  d.querySelector("#pilgrim-name").value = "Offline Test";
  d.querySelector('[data-action="start-game"]').click();
  check(d.querySelector(".map-node"), "map missing");
  d.querySelector('.map-node[data-id="elah"]').click();
  d.querySelector('[data-action="enter-chapter"]').click();
  check(d.querySelector(".dialogue"), "story dialogue missing");
  for (let i = 0; i < 40 && !d.querySelector('[data-action="choose"]'); i++) d.querySelector("#dialogue").click();
  check(d.querySelector('[data-action="choose"]'), "choices never appeared");

  if (errors.length) throw new Error("JS errors:\n" + errors.join("\n"));
  console.log("✓ Single-file build works offline: title → create → map → chapter → choices.");
} catch (e) {
  console.error("✗ " + (e.stack || e));
  if (errors.length) console.error(errors.join("\n"));
  process.exit(1);
} finally { dom.window.close(); }
