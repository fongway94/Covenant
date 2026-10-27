/* Tiny DOM/string helpers. Kept dependency-free on purpose. */

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const PATHS = {
  map:      '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/>',
  book:     '<path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22V4.5z"/><path d="M4 17.5A2.5 2.5 0 016.5 15H20"/>',
  person:   '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1.04 1.56V21h-4v-.08A1.7 1.7 0 008.96 19.3a1.7 1.7 0 00-1.87.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.56-1.04H3v-4h.08A1.7 1.7 0 004.6 8.9a1.7 1.7 0 00-.34-1.87l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 008.96 4.6 1.7 1.7 0 0010 3.08V3h4v.08A1.7 1.7 0 0015.04 4.6a1.7 1.7 0 001.87-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 8.9v.1a1.7 1.7 0 001.56 1.04H21v4h-.04A1.7 1.7 0 0019.4 15z"/>',
  scroll:   '<path d="M7 3h11a2 2 0 012 2v13a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  lock:     '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  check:    '<path d="M4 12l5 5L20 6"/>',
  sound:    '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9a4 4 0 010 6M19.5 6.5a8 8 0 010 11"/>',
  mute:     '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  music:    '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  musicoff: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>',
  back:     '<path d="M15 5l-7 7 7 7"/>',
  forward:  '<path d="M9 5l7 7-7 7"/>',
  down:     '<path d="M6 9l6 6 6-6"/>',
  close:    '<path d="M6 6l12 12M18 6L6 18"/>',
  star:     '<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>',
  heart:    '<path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0112 8a4.6 4.6 0 018 2.6C20 16.1 12 21 12 21z"/>',
  pray:     '<path d="M9 11V6a2 2 0 013-1.7A2 2 0 0115 6v5"/><path d="M9 10H7a2 2 0 00-2 2v3a6 6 0 006 6h2a6 6 0 006-6v-3a2 2 0 00-2-2h-2"/><path d="M9 13h6"/>',
  help:     '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 2.2-2.5 4M12 17h.01"/>',
  refresh:  '<path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>',
  play:     '<path d="M7 4l12 8-12 8V4z"/>',
  spark:    '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
  cross:    '<path d="M12 3v18M7 9h10"/>',
  compass:  '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>'
};

export function icon(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.star}</svg>`;
}

export const initial = (name) => (String(name || "P").trim()[0] || "P").toUpperCase();
