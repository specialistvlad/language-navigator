// A topic's guide as HTML pieces: its cheatsheet as section 00, then its sections.
import { type Level, localize, say } from "../../scripts/lib.ts";
import { contentRange, type Range, sectionRange, upTo } from "../../scripts/levels.ts";
import { blocksHtml, type Ctx } from "./render.ts";

export type SectionKind = "cheatsheet" | "body";

// A guide section ready to wrap in a <section>, with the range of its leaves.
export interface GuideSection {
  title: string;
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

// The cheatsheet and the sections that have content for this reader.
export function guideSections(ctx: Ctx): GuideSection[] {
  const topic = ctx.ref.topic;
  if (!topic) return [];
  const out: GuideSection[] = [];
  const sheet = contentRange(topic.cheatsheet.content, ctx.explain);
  if (sheet) out.push({ title: say("sheet", ctx.explain), range: sheet, kind: "cheatsheet", html: cheatsheetHtml(ctx) ?? "" });
  for (const section of topic.sections) {
    const range = sectionRange(section, ctx.explain);
    if (range === null) continue;
    out.push({ title: localize(section.title, ctx.explain), range, kind: "body", html: blocksHtml(section.content, ctx, range.from) });
  }
  return out;
}
