// Cheatsheet content: which sheets a track has and the Markdown each one holds.
import { type CurriculumSection, filled, LEVELS, levelName, localize, lv, say, topicTitle, type TopicRef } from "../../../scripts/lib.ts";
import { essentialsMarkdown, reminderMarkdown } from "../../../scripts/guide.ts";
import { md, type Track } from "../context.ts";
import { firstLevel, sectionRange } from "../parts.ts";
import { levelSheet, progressiveSheet, sectionSheet, topicSheet, topicUrl } from "../urls.ts";

export interface Sheet {
  id: string;
  title: string;
  group: "levels" | "progressive" | "sections" | "topics";
  label: string;
  range: string;
  markdown: string;
}

interface Pick {
  kind: "essentials" | "reminder";
  level: string;
}

// The essentials and reminders the picked levels give for each topic, under section and topic headings.
function compose(track: Track, title: string, topics: TopicRef[], pick: (ref: TopicRef) => Pick[]): string | null {
  const { ctx, lang, explain } = track;
  let out = `# ${title}\n\n`;
  let section: CurriculumSection | null = null;
  let blocks = 0;
  for (const ref of topics) {
    const parts = pick(ref)
      .map((p) => {
        const body =
          p.kind === "essentials"
            ? essentialsMarkdown(ref, explain, ctx.refs, p.level, 5, ctx.link)
            : reminderMarkdown(ref, explain, ctx.refs, p.level, ctx.link);
        return filled(body) ? `#### ${say(p.kind, explain)} [${p.level}]\n\n${body}` : null;
      })
      .filter(filled);
    if (parts.length === 0) continue;
    if (ref.section !== section) {
      section = ref.section;
      out += `## ${localize(section.title, explain)}\n\n`;
    }
    out += `### [${topicTitle(ref, explain)}](${topicUrl(explain, lang, ref)})\n\n${parts.join("\n\n")}\n\n`;
    blocks += parts.length;
  }
  return blocks > 0 ? out : null;
}

// Every sheet of a track: one per level, progressive ones, one per section, one per topic.
export function sheetsOf(track: Track): Sheet[] {
  const { lang, explain, t, written } = track;
  const allLevels = (): Pick[] => LEVELS.map((level) => ({ kind: "essentials" as const, level }));
  const sheets: Sheet[] = [];
  const push = (s: Omit<Sheet, "markdown">, markdown: string | null): void => {
    if (filled(markdown)) sheets.push({ ...s, markdown });
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

// Cheatsheet body: each ## section heading spans the page and its ### topic blocks flow into lanes;
// a section with a single topic flows that topic's #### level blocks instead.
export function sheetHtml(markdown: string): string {
  const [head = "", ...sections] = markdown.split(/\n(?=## )/);
  const body = sections.map((section) => {
    let [top = "", ...cards] = section.split(/\n(?=### )/);
    const only = cards[0];
    if (cards.length === 1 && only !== undefined) {
      const [topic = "", ...blocks] = only.split(/\n(?=#### )/);
      top = `${top}\n${topic}`;
      cards = blocks;
    }
    return `${md.render(top)}<div class="lanes">${cards.map((card) => `<section>${md.render(card)}</section>`).join("")}</div>`;
  });
  return md.render(head) + body.join("");
}
