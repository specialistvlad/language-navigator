// A topic's guide as HTML pieces: its cheatsheet as section 00, then its sections.
import { shows } from "../../scripts/content.ts";
import { type Block, filled, localize, lv, say, type Topic } from "../../scripts/lib.ts";
import { blocksHtml, type Ctx } from "./render.ts";

export type SectionKind = "cheatsheet" | "body";

// A guide section ready to wrap in a <section>.
export interface GuideSection {
  title: string;
  from: string;
  to: string;
  kind: SectionKind;
  html: string;
}

// A cheatsheet's blocks with the rows and items above a level left out; an item without its own
// level sits at the cheatsheet's base.
function upTo(blocks: Block[], level: string): Block[] {
  const fits = (it: unknown): boolean =>
    typeof it !== "object" || it === null || !("level" in it) || !filled(it.level as string) || lv(it.level as string) <= lv(level);
  return blocks.map((b) => {
    if (b.type === "table") return { ...b, rows: b.rows.filter(fits) };
    if (b.type === "errors") return { ...b, rows: b.rows.filter(fits) };
    if (b.type === "bullets") return { ...b, items: b.items.filter(fits) };
    return b;
  });
}

// A topic's cheatsheet, whole or up to a level; null when the cheatsheet starts above that level.
export function cheatsheetHtml(ctx: Ctx, level?: string): string | null {
  const sheet: Topic["cheatsheet"] | undefined = ctx.ref.topic?.cheatsheet;
  if (!sheet) return null;
  if (level === undefined) return blocksHtml(sheet.content, ctx);
  const base = sheet.level.split("-")[0] ?? sheet.level;
  return lv(base) > lv(level) ? null : blocksHtml(upTo(sheet.content, level), ctx);
}

export function guideSections(ctx: Ctx): GuideSection[] {
  const topic = ctx.ref.topic;
  if (!topic) return [];
  const [from = topic.cheatsheet.level, to = from] = topic.cheatsheet.level.split("-");
  const out: GuideSection[] = [{ title: say("sheet", ctx.explain), from, to, kind: "cheatsheet", html: cheatsheetHtml(ctx) ?? "" }];
  for (const section of topic.sections) {
    if (!shows(section, ctx.explain)) continue;
    const [sFrom = section.level, sTo = sFrom] = section.level.split("-");
    out.push({ title: localize(section.title, ctx.explain), from: sFrom, to: sTo, kind: "body", html: blocksHtml(section.content, ctx) });
  }
  return out;
}
