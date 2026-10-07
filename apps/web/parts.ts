// Small HTML and text pieces the pages share: level badges and chips, anchors, edit links.
import { type CurriculumSection, lv, SITE } from "../../scripts/lib.ts";
import { levelBadge } from "./render.ts";

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

// Level chips: one soft chip per level, joined into a group.
export const chips = (levels: readonly string[]): string =>
  `<span class="chips">${levels.map((l) => `<span class="chip c-${l}">${l}</span>`).join("")}</span>`;

// First and last level of a range such as "A0-A1".
export const firstLevel = (range: string): string => range.split("-")[0] ?? range;
export const lastLevel = (range: string): string => range.split("-").at(-1) ?? range;

// Level range covered by a section's topics, e.g. "A0-A1".
export function sectionRange(section: CurriculumSection): string {
  const froms = section.topics.map((t) => firstLevel(t.levels));
  const tos = section.topics.map((t) => lastLevel(t.levels));
  const from = froms.sort((a, b) => lv(a) - lv(b))[0] ?? "";
  const to = tos.sort((a, b) => lv(b) - lv(a))[0] ?? "";
  return from === to ? from : `${from}-${to}`;
}
export const rangeBadge = (levels: string): string => {
  const [from = levels, to] = levels.split("-");
  return levelBadge(from, to);
};
// Topic entries in lists show one badge: the level where the topic starts.
export const startBadge = (levels: string): string => levelBadge(firstLevel(levels));
