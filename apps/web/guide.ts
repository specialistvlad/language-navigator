// A topic's guide as HTML pieces: its cheatsheet as section 00, then its sections.
import { plainText, reading, textIn } from "../../scripts/text.ts";
import { type Block, type Explain, type Level, say, type Text, type Topic } from "../../scripts/lib.ts";
import { contentRange, type Range, sectionRange, upTo } from "../../scripts/levels.ts";
import { type Ctx, escapeHtml, inline } from "./html.ts";
import { blocksHtml } from "./render.ts";

export type SectionKind = "cheatsheet" | "body";

// A guide section ready to wrap in a <section>, with the range of its leaves: its title as plain
// text for anchors and the rail, and as HTML for its heading.
export interface GuideSection {
  title: string;
  heading: string;
  range: Range;
  kind: SectionKind;
  html: string;
}

// A topic's cheatsheet, whole or up to a level; null when nothing in it is at or below that level.
export function cheatsheetHtml(ctx: Ctx, level?: Level): string | null {
  const sheet = ctx.ref.topic?.cheatsheet;
  if (!sheet) return null;
  const content = level === undefined ? sheet.content : upTo(sheet.content, level);
  const range = contentRange(content, ctx.explain);
  return range === null ? null : blocksHtml(content, ctx, range.from);
}

// A guide part before rendering: its title, the range of its leaves and its blocks.
export interface GuidePart {
  title: string;
  heading: Text | null;
  range: Range;
  kind: SectionKind;
  content: Block[];
}

// The cheatsheet and the sections that have content for this reader, in page order.
export function guideParts(topic: Topic, explain: Explain): GuidePart[] {
  const out: GuidePart[] = [];
  const sheet = contentRange(topic.cheatsheet.content, explain);
  if (sheet) out.push({ title: say("sheet", explain), heading: null, range: sheet, kind: "cheatsheet", content: topic.cheatsheet.content });
  for (const section of topic.sections) {
    const range = sectionRange(section, explain);
    const heading = textIn(section.title, explain);
    if (range !== null) {
      out.push({ title: plainText(heading, reading(explain, false)), heading, range, kind: "body", content: section.content });
    }
  }
  return out;
}

// The guide parts rendered for a reader.
export function guideSections(ctx: Ctx): GuideSection[] {
  const topic = ctx.ref.topic;
  if (!topic) return [];
  return guideParts(topic, ctx.explain).map((p) => ({
    title: p.title,
    heading: p.heading === null ? escapeHtml(p.title) : inline(p.heading, ctx, false),
    range: p.range,
    kind: p.kind,
    html: blocksHtml(p.content, ctx, p.range.from),
  }));
}
