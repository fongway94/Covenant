#!/usr/bin/env node
/* Zero-dependency static server for local development and the live preview. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if (urlPath === "/") urlPath = "/index.html";
  const full = path.join(ROOT, urlPath);
  if (!full.startsWith(ROOT + path.sep) && full !== path.join(ROOT, "index.html")) {
    res.writeHead(403).end("Forbidden"); return;
  }
  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(full).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/"
    });
    fs.createReadStream(full).pipe(res);
  });
}).listen(PORT, HOST, () => {
  console.log(`Covenant running at http://${HOST}:${PORT}  (root: ${ROOT})`);
});
