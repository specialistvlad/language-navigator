// Small HTML and text pieces the pages share: level badges and attributes, anchors, edit links.
import { type Explain, type Level, SITE, type TopicRef } from "../../scripts/lib.ts";
import { join, type Range, refRange } from "../../scripts/levels.ts";

// Opens the file in GitHub's editor (a fork for anyone without write access).
export const editUrl = (path: string): string => `${SITE.repository}/edit/main/${path}`;

// Anchor id from a heading: lowercase ASCII words joined by hyphens.
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const single = (level: Level): Range => ({ from: level, to: level });

// A level badge: one level reads (A1); a range joins two halves, (A1][B1), the lowest on the left and
// the highest on the right, each in its own level's colour (levels.css). A hidden dash makes the text
// read A1–B1. client.ts builds the same halves when it trims the highest level to the level filter.
const half = (level: Level): string => `<span class="half lvl-${level}">${level}</span>`;
export const badgeHalves = (r: Range): string =>
  r.from === r.to ? half(r.from) : `${half(r.from)}<span class="sr-only">–</span>${half(r.to)}`;
export const badge = (r: Range | null): string =>
  r === null ? "" : `<span class="badge lvl" data-from="${r.from}" data-to="${r.to}">${badgeHalves(r)}</span>`;

// A badge in a list (the menu, the rail, the track index, Up next) has halves of one width and room
// for two, so the badges of a list line up in columns: the lowest levels in one, the highest in the
// next; one level takes the first column and leaves the second empty (layout.css).
export const listBadge = (r: Range | null): string =>
  r === null ? "" : `<span class="badge lvl pair" data-from="${r.from}" data-to="${r.to}">${badgeHalves(r)}</span>`;

// What the level filter reads: an element hides while the filter sits below its lowest level.
export const levelAttrs = (r: Range | null): string => (r === null ? "" : ` data-level="${r.from}" data-to="${r.to}"`);

// The range of some curriculum topics in an explanation language.
export const refsRange = (refs: TopicRef[], explain: Explain): Range | null => join(refs.map((r) => refRange(r, explain)));
