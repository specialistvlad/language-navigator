// Cheatsheet content: which sheets a track has and the HTML each one holds.
import { type CurriculumSection, filled, LEVELS, levelName, localize, topicTitle, type TopicRef } from "../../../scripts/lib.ts";
import type { Track } from "../context.ts";
import { cheatsheetHtml } from "../guide.ts";
import { firstLevel, sectionRange } from "../parts.ts";
import { escapeHtml } from "../render.ts";
import { levelSheet, progressiveSheet, sectionSheet, topicSheet, topicUrl } from "../urls.ts";

export interface Sheet {
  id: string;
  title: string;
  group: "levels" | "progressive" | "sections" | "topics";
  label: string;
  range: string;
  html: string;
}

interface Card {
  ref: TopicRef;
  html: string;
}

// The cheatsheets of the given topics, whole or up to a level. Each curriculum section heading
// spans the page and its topics flow into lanes; a section with a single topic gives it the width.
function compose(track: Track, title: string, topics: TopicRef[], level?: string): string | null {
  const { ctx, lang, explain } = track;
  const groups: { section: CurriculumSection; cards: Card[] }[] = [];
  for (const ref of topics) {
    const html = cheatsheetHtml({ ref, explain, refs: ctx.refs, link: ctx.link }, level);
    if (!filled(html)) continue;
    const last = groups.at(-1);
    if (last?.section === ref.section) last.cards.push({ ref, html });
    else groups.push({ section: ref.section, cards: [{ ref, html }] });
  }
  if (groups.length === 0) return null;
  const topicHead = (ref: TopicRef): string =>
    `<h3><a href="${topicUrl(explain, lang, ref)}">${escapeHtml(topicTitle(ref, explain))}</a></h3>`;
  const body = groups.map(({ section, cards }) => {
    const h2 = `<h2>${escapeHtml(localize(section.title, explain))}</h2>`;
    const [only] = cards;
    if (cards.length === 1 && only) return h2 + topicHead(only.ref) + only.html;
    return h2 + `<div class="lanes">${cards.map((c) => `<section>${topicHead(c.ref)}${c.html}</section>`).join("")}</div>`;
  });
  return `<h1>${escapeHtml(title)}</h1>${body.join("")}`;
}

// Every sheet of a track: per level (the topics of that level), progressive (every topic up to a
// level), per section and per topic. Level and progressive sheets leave out rows above their level.
export function sheetsOf(track: Track): Sheet[] {
  const { lang, explain, t, written } = track;
  const sheets: Sheet[] = [];
  const push = (s: Omit<Sheet, "html">, html: string | null): void => {
    if (filled(html)) sheets.push({ ...s, html });
  };

  for (const level of LEVELS) {
    const s = {
      id: levelSheet(level),
      group: "levels" as const,
      label: levelName(level, explain),
      range: level,
      title: `${t.sheet} ${level}`,
    };
    const ofLevel = written.filter((r) => r.topic?.levels.includes(level) === true);
    push(s, compose(track, s.title, ofLevel, level));
  }
  for (const level of LEVELS.slice(1)) {
    const s = {
      id: progressiveSheet(level),
      group: "progressive" as const,
      label: `${t.upTo} ${levelName(level, explain)}`,
      range: `${LEVELS[0] ?? ""}-${level}`,
      title: `${t.sheet} ${LEVELS[0] ?? ""}–${level}`,
    };
    push(s, compose(track, s.title, written, level));
  }
  for (const section of lang.sections) {
    const inSection = written.filter((r) => r.section === section);
    if (inSection.length === 0) continue;
    const s = {
      id: sectionSheet({ section }),
      group: "sections" as const,
      label: localize(section.title, explain),
      range: sectionRange(section),
      title: `${t.sheet}: ${localize(section.title, explain)}`,
    };
    push(s, compose(track, s.title, inSection));
  }
  for (const ref of written) {
    const name = topicTitle(ref, explain);
    const s = {
      id: topicSheet(ref),
      group: "topics" as const,
      label: name,
      range: firstLevel(ref.entry.levels),
      title: `${t.sheet}: ${name}`,
    };
    push(s, compose(track, s.title, [ref]));
  }
  return sheets;
}
