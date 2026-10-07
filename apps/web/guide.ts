// A topic's guide as HTML pieces: its sections, then the essentials and reminder of each level.
import { shows } from "../../scripts/content.ts";
import { filled, LEVELS, localize, say } from "../../scripts/lib.ts";
import { blocksHtml, type Ctx, inline, list } from "./render.ts";

export type SectionKind = "essentials" | "reminder" | "body";

// A guide section, essentials entry or reminder, ready to wrap in a <section>.
export interface GuideSection {
  title: string;
  from: string;
  to: string;
  kind: SectionKind;
  html: string;
}

// Essentials of one level; part titles get headings of the given depth.
export function essentialsHtml(ctx: Ctx, level: string, depth: number): string | null {
  const essentials = ctx.ref.topic?.essentials.find((e) => e.level === level);
  if (!essentials) return null;
  const h = `h${String(depth)}`;
  if (essentials.parts) {
    return essentials.parts
      .map((part) => `<${h}>${inline(localize(part.title, ctx.explain), ctx)}</${h}>${blocksHtml(part.content, ctx)}`)
      .join("\n");
  }
  return essentials.content ? blocksHtml(essentials.content, ctx) : null;
}

// Reminder of one level as a bullet list.
export function reminderHtml(ctx: Ctx, level: string): string | null {
  const reminder = ctx.ref.topic?.reminders?.find((r) => r.level === level);
  return reminder ? list(reminder.items, ctx) : null;
}

export function guideSections(ctx: Ctx): GuideSection[] {
  const topic = ctx.ref.topic;
  if (!topic) return [];
  const out: GuideSection[] = [];
  for (const section of topic.sections) {
    if (!shows(section, ctx.explain)) continue;
    const [from = section.level, to = from] = section.level.split("-");
    out.push({ title: localize(section.title, ctx.explain), from, to, kind: "body", html: blocksHtml(section.content, ctx) });
  }
  for (const level of LEVELS) {
    const essentials = essentialsHtml(ctx, level, 3);
    if (filled(essentials)) {
      out.push({ title: say("essentials", ctx.explain), from: level, to: level, kind: "essentials", html: essentials });
    }
    const reminder = reminderHtml(ctx, level);
    if (filled(reminder)) out.push({ title: say("reminder", ctx.explain), from: level, to: level, kind: "reminder", html: reminder });
  }
  return out;
}
