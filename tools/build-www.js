#!/usr/bin/env node
/* Copies the web app into www/ for Capacitor. No bundler required. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "www");
const FILES = ["index.html", "manifest.webmanifest", "sw.js"];
const DIRS = ["src", "assets"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
for (const d of DIRS) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });

function count(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) =>
    n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
}
console.log(`Built www/ — ${count(OUT)} files ready for Capacitor.`);
