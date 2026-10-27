/* Static game reference data: stats, callings, collectibles, seals, promises. */

export const STAT_MAX = 12;

export const STATS = {
  courage:     { name: "Courage",     glyph: "⚔", color: "#e7b75b" },
  wisdom:      { name: "Wisdom",      glyph: "✦", color: "#7fb6d9" },
  compassion:  { name: "Compassion",  glyph: "♥", color: "#e08b78" },
  faith:       { name: "Faith",       glyph: "✟", color: "#4fb8a8" }
};
export const STAT_KEYS = Object.keys(STATS);

export const CALLINGS = [
  {
    id: "shepherd", name: "Shepherd", glyph: "♥",
    blurb: "You notice the one who is hurting and stay with them.",
    bonus: { compassion: 3, wisdom: 1 },
    gift: "A gentle word can open a door that force cannot."
  },
  {
    id: "scribe", name: "Scribe", glyph: "✦",
    blurb: "You love the Word, and you know where to find it.",
    bonus: { wisdom: 3, faith: 1 },
    gift: "The scroll is a lamp for the next step, not the whole road."
  },
  {
    id: "guardian", name: "Guardian", glyph: "⚔",
    blurb: "You stand your ground when everyone else steps back.",
    bonus: { courage: 3, compassion: 1 },
    gift: "Courage is not the absence of fear; it is obedience while afraid."
  },
  {
    id: "intercessor", name: "Intercessor", glyph: "✟",
    blurb: "Your first instinct is to pray, and then to act.",
    bonus: { faith: 3, courage: 1 },
    gift: "Prayer changes the person who prays before it changes the circumstance."
  }
];

/* Galatians 5:22–23 — the nine collectible virtues of the journey. */
export const FRUITS = [
  { id: "love",         name: "Love",         glyph: "❤", note: "1 Corinthians 13:4–7 — love is patient and kind." },
  { id: "joy",          name: "Joy",          glyph: "✺", note: "Luke 15:24 — there is joy in heaven over one sinner who repents." },
  { id: "peace",        name: "Peace",        glyph: "✧", note: "Mark 4:39 — Peace, be still." },
  { id: "patience",     name: "Patience",     glyph: "◷", note: "Psalm 40:1 — I waited patiently for the LORD." },
  { id: "kindness",     name: "Kindness",     glyph: "❀", note: "Ephesians 4:32 — be kind to one another, tenderhearted." },
  { id: "goodness",     name: "Goodness",     glyph: "✤", note: "Micah 6:8 — do justly, love mercy, walk humbly." },
  { id: "faithfulness", name: "Faithfulness", glyph: "✟", note: "1 Samuel 17:37 — the LORD who delivered me will deliver me." },
  { id: "gentleness",   name: "Gentleness",   glyph: "❧", note: "Proverbs 15:1 — a soft answer turns away wrath." },
  { id: "selfcontrol",  name: "Self-control", glyph: "⌘", note: "Proverbs 16:32 — one who rules their spirit is better than one who takes a city." }
];

export const RELICS = {
  stones:  { name: "Five Smooth Stones", glyph: "◍", chapter: "The Valley of Elah", desc: "Cool river stones from the brook. Small enough to fit in a shepherd’s bag; enough for one impossible morning.", ref: "1 Samuel 17:40" },
  signet:  { name: "The King’s Signet", glyph: "⬡", chapter: "The Lions’ Den", desc: "Impressed into the clay seal over the den — a reminder that human decrees are not the final word.", ref: "Daniel 6:17" },
  denarii: { name: "Two Denarii",       glyph: "◉", chapter: "The Road to Jericho", desc: "Two days’ wages left with an innkeeper for a stranger. Mercy that costs something.", ref: "Luke 10:35" },
  rope:    { name: "A Fisherman’s Rope", glyph: "⌇", chapter: "Peace, Be Still", desc: "Salt-stiff rope from a boat that should have sunk. It held.", ref: "Mark 4:39" },
  ring:    { name: "The Father’s Ring", glyph: "◎", chapter: "The Far Country", desc: "The sign of sonship placed on a hand that had been empty for a long time.", ref: "Luke 15:22" },
  scepter: { name: "The Golden Scepter", glyph: "✥", chapter: "For Such a Time", desc: "Extended toward a queen who had risked everything to stand in the doorway.", ref: "Esther 5:2" }
};

export const SEALS = [
  { id: "first_light",    name: "First Light",     glyph: "✧", desc: "Complete your first chapter.",                 check: (s) => countDone(s) >= 1 },
  { id: "house_of_prayer",name: "House of Prayer", glyph: "✟", desc: "Pray in three different chapters.",          check: (s) => (s.prayedIn || []).length >= 3 },
  { id: "steady_hand",    name: "Steady Hand",     glyph: "◎", desc: "Find your focus at the Valley of Elah.",    check: (s) => !!s.flags.slingWon },
  { id: "honest_pilgrim", name: "Honest Pilgrim",  glyph: "❧", desc: "Sit with four reflection questions.",       check: (s) => (s.reflections || []).length >= 4 },
  { id: "nine_fruits",    name: "Full Harvest",    glyph: "✺", desc: "Gather all nine fruits of the Spirit.",     check: (s) => s.fruits.length >= FRUITS.length },
  { id: "level_five",     name: "Growing in Grace",glyph: "✦", desc: "Reach level 5 on the journey.",             check: (s) => s.level >= 5 },
  { id: "pilgrim",        name: "Pilgrim",         glyph: "⚜", desc: "Walk through all six chapters.",           check: (s) => countDone(s) >= 6 }
];

export function countDone(s) {
  return Object.values(s.chapters || {}).filter((c) => c.completed).length;
}

/* Short public-domain (KJV / WEB) promises used by the once-per-chapter Pray action. */
export const PROMISES = [
  { text: "The LORD is my light and my salvation; whom shall I fear?", ref: "Psalm 27:1" },
  { text: "Be strong and of a good courage; be not afraid … for the LORD thy God is with thee.", ref: "Joshua 1:9" },
  { text: "God is our refuge and strength, a very present help in trouble.", ref: "Psalm 46:1" },
  { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", ref: "Proverbs 3:5" },
  { text: "The LORD is nigh unto all them that call upon him.", ref: "Psalm 145:18" },
  { text: "They that wait upon the LORD shall renew their strength.", ref: "Isaiah 40:31" }
];
