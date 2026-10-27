/* Speaker portraits. Six painterly archetypes cover every cast member in all
   ten chapters, so dialogue shows a face instead of a letter in a circle.

   Jesus and the divine voice deliberately use a non-figurative radiance image:
   whether to depict Christ directly is a decision left to the ministry team. */

const BASE = "assets/art/portrait-";

const HERO = new Set([
  "david", "soldier", "peter", "disciple", "younger", "shepherd", "sailor",
  "servant", "crowd", "reaper", "hatach", "zacchaeus", "jonah", "saul"
]);
const WOMAN = new Set(["esther", "ruth", "naomi"]);
const ELDER = new Set([
  "daniel", "satrap", "darius", "lawyer", "samaritan", "innkeeper", "father",
  "elder", "mordecai", "king", "moses", "boaz", "captain"
]);
const RADIANCE = new Set(["jesus", "voice"]);

/** Portrait path for a cast key. */
export function portraitFor(who) {
  if (!who) return null;
  if (who === "elias") return `${BASE}companion.jpg`;
  if (RADIANCE.has(who)) return `${BASE}radiance.jpg`;
  if (WOMAN.has(who)) return `${BASE}woman.jpg`;
  if (who === "goliath") return `${BASE}giant.jpg`;
  if (ELDER.has(who)) return `${BASE}elder.jpg`;
  if (HERO.has(who)) return `${BASE}hero.jpg`;
  return `${BASE}companion.jpg`;
}

/** The defining face of a chapter, used when the narrator is speaking. */
const CHAPTER_FACE = {
  elah: "hero", lions: "elder", jericho: "hero", storm: "radiance",
  prodigal: "elder", esther: "woman", bush: "elder", ruth: "woman",
  jonah: "hero", zacchaeus: "hero"
};
export function chapterPortrait(chapterId) {
  return `${BASE}${CHAPTER_FACE[chapterId] || "companion"}.jpg`;
}

export const PORTRAIT_FILES = [
  "companion", "hero", "giant", "woman", "elder", "radiance"
].map((n) => `${BASE}${n}.jpg`);
