// Cheatsheet content: which sheets a track has and the HTML each one holds.
import { type CurriculumSection, filled, LEVELS, levelName, localize, lv, say, topicTitle, type TopicRef } from "../../../scripts/lib.ts";
import type { Track } from "../context.ts";
import { essentialsHtml, reminderHtml } from "../guide.ts";
import { firstLevel, sectionRange } from "../parts.ts";
import { escapeHtml, levelBadge } from "../render.ts";
import { levelSheet, progressiveSheet, sectionSheet, topicSheet, topicUrl } from "../urls.ts";

export interface Sheet {
  id: string;
  title: string;
  group: "levels" | "progressive" | "sections" | "topics";
  label: string;
  range: string;
  html: string;
}

interface Pick {
  kind: "essentials" | "reminder";
  level: string;
}

interface Card {
  ref: TopicRef;
  blocks: string[];
}

// The essentials and reminders the picked levels give for each topic. Each section heading spans
// the page and its topics flow into lanes; a section with a single topic flows that topic's level
// blocks instead.
function compose(track: Track, title: string, topics: TopicRef[], pick: (ref: TopicRef) => Pick[]): string | null {
  const { ctx, lang, explain } = track;
  const groups: { section: CurriculumSection; cards: Card[] }[] = [];
  for (const ref of topics) {
    const rctx = { ref, explain, refs: ctx.refs, link: ctx.link };
    const blocks = pick(ref)
      .map((p) => {
        const body = p.kind === "essentials" ? essentialsHtml(rctx, p.level, 5) : reminderHtml(rctx, p.level);
        return filled(body) ? `<h4>${escapeHtml(say(p.kind, explain))}${levelBadge(p.level)}</h4>${body}` : null;
      })
      .filter(filled);
    if (blocks.length === 0) continue;
    const last = groups.at(-1);
    if (last?.section === ref.section) last.cards.push({ ref, blocks });
    else groups.push({ section: ref.section, cards: [{ ref, blocks }] });
  }
  if (groups.length === 0) return null;
  const topicHead = (ref: TopicRef): string =>
    `<h3><a href="${topicUrl(explain, lang, ref)}">${escapeHtml(topicTitle(ref, explain))}</a></h3>`;
  const lanes = (items: string[]): string => `<div class="lanes">${items.map((i) => `<section>${i}</section>`).join("")}</div>`;
  const body = groups.map(({ section, cards }) => {
    const h2 = `<h2>${escapeHtml(localize(section.title, explain))}</h2>`;
    const [only] = cards;
    if (cards.length === 1 && only) return h2 + topicHead(only.ref) + lanes(only.blocks);
    return h2 + lanes(cards.map((c) => topicHead(c.ref) + c.blocks.join("")));
  });
  return `<h1>${escapeHtml(title)}</h1>${body.join("")}`;
}

// Every sheet of a track: one per level, progressive ones, one per section, one per topic.
export function sheetsOf(track: Track): Sheet[] {
  const { lang, explain, t, written } = track;
  const allLevels = (): Pick[] => LEVELS.map((level) => ({ kind: "essentials" as const, level }));
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
    push(
      s,
      compose(track, s.title, written, () => [{ kind: "essentials", level }]),
    );
  }
  for (const level of LEVELS.slice(1)) {
    const s = {
      id: progressiveSheet(level),
      group: "progressive" as const,
      label: `${t.upTo} ${levelName(level, explain)}`,
      range: `${LEVELS[0] ?? ""}-${level}`,
      title: `${t.sheet} ${LEVELS[0] ?? ""}–${level}`,
    };
    const below = LEVELS.filter((l) => lv(l) < lv(level));
    push(
      s,
      compose(track, s.title, written, () => [
        ...below.map((l) => ({ kind: "reminder" as const, level: l })),
        { kind: "essentials", level },
      ]),
    );
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
    push(s, compose(track, s.title, inSection, allLevels));
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
    push(s, compose(track, s.title, [ref], allLevels));
  }
  return sheets;
}
