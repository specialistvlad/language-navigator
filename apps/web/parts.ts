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
export const rangeLabel = (r: Range): string => (r.from === r.to ? r.from : `${r.from}–${r.to}`);

// A level badge, lowest–highest: it takes the colour of its lowest level (levels.css), and client.ts
// trims its highest level to the level filter.
export const badge = (r: Range | null): string =>
  r === null ? "" : `<span class="badge lvl lvl-${r.from}" data-from="${r.from}" data-to="${r.to}">${rangeLabel(r)}</span>`;

// What the level filter reads: an element hides while the filter sits below its lowest level.
export const levelAttrs = (r: Range | null): string => (r === null ? "" : ` data-level="${r.from}" data-to="${r.to}"`);

// The range of some curriculum topics in an explanation language.
export const refsRange = (refs: TopicRef[], explain: Explain): Range | null => join(refs.map((r) => refRange(r, explain)));
