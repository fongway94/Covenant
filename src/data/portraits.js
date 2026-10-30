/* Speaker portraits. Seven painterly archetypes cover every cast member in all
   ten chapters, so dialogue shows a face instead of a letter in a circle.

   RED-LETTER RULE (v0.6): Jesus is now depicted directly, but He is NEVER
   given invented dialogue. Every line attributed to "jesus" is a verbatim
   KJV / 中文和合本 quotation. `npm run check:redletter` enforces this in both
   languages. The Father's voice from the burning bush stays non-figurative
   ("radiance"), and its lines are likewise Scripture-only.

   Whether to depict Christ at all is still a decision for your pastors /
   theological advisors; set JESUS_FACE to "radiance" below to switch back. */

const BASE = "assets/art/portrait-";
const JESUS_FACE = "jesus";

const HERO = new Set([
  "david", "soldier", "peter", "disciple", "younger", "shepherd", "sailor",
  "servant", "crowd", "reaper", "hatach", "zacchaeus", "jonah", "saul"
]);
const WOMAN = new Set(["esther", "ruth", "naomi"]);
const ELDER = new Set([
  "daniel", "satrap", "darius", "lawyer", "samaritan", "innkeeper", "father",
  "elder", "mordecai", "king", "moses", "boaz", "captain"
]);
const RADIANCE = new Set(["voice"]);

/** Portrait path for a cast key. */
export function portraitFor(who) {
  if (!who) return null;
  if (who === "elias") return `${BASE}companion.jpg`;
  if (who === "jesus") return `${BASE}${JESUS_FACE}.jpg`;
  if (RADIANCE.has(who)) return `${BASE}radiance.jpg`;
  if (WOMAN.has(who)) return `${BASE}woman.jpg`;
  if (who === "goliath") return `${BASE}giant.jpg`;
  if (ELDER.has(who)) return `${BASE}elder.jpg`;
  if (HERO.has(who)) return `${BASE}hero.jpg`;
  return `${BASE}companion.jpg`;
}

/** The defining face of a chapter, used when the narrator is speaking. */
const CHAPTER_FACE = {
  elah: "hero", lions: "elder", jericho: JESUS_FACE, storm: JESUS_FACE,
  prodigal: JESUS_FACE, esther: "woman", bush: "radiance", ruth: "woman",
  jonah: "hero", zacchaeus: JESUS_FACE
};
export function chapterPortrait(chapterId) {
  return `${BASE}${CHAPTER_FACE[chapterId] || "companion"}.jpg`;
}

export const PORTRAIT_FILES = [
  "companion", "hero", "giant", "woman", "elder", "radiance", "jesus"
].map((n) => `${BASE}${n}.jpg`);
