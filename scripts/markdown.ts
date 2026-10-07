// Renders a topic (topic.yaml) into a Markdown guide for one explanation language.
import { dirname, relative } from "node:path";
import {
  type Block,
  type Cell,
  type ErrorsBlock,
  type Explain,
  type Item,
  type ItemObject,
  type Localized,
  type TableBlock,
  type Text,
  type TopicRef,
  EXPLAIN,
  guidePath,
  INTERFACE,
  LEVELS,
  say,
} from "./lib.ts";

// Turns a topic ID into a link target; null marks a topic without a page yet.
export type LinkFn = (target: TopicRef | undefined, explain: Explain, from: TopicRef) => string | null;

interface Ctx {
  ref: TopicRef;
  explain: Explain;
  refs: TopicRef[];
  link: LinkFn;
}

// Default links: relative paths between Markdown guide files.
export const markdownLinks: LinkFn = (target, explain, from) => {
  if (!target) return null;
  const a = guidePath(from.lang, from.section.dir, from.entry.slug, explain);
  const b = guidePath(target.lang, target.section.dir, target.entry.slug, explain);
  return relative(dirname(a), b);
};

export const isLocalized = (value: object): value is Localized => Object.keys(value).every((k) => k in EXPLAIN);
const shows = (el: { for?: Explain[] }, explain: Explain) => !el.for || el.for.includes(explain);
const needsTranslation = (ctx: Ctx) => ctx.explain !== ctx.ref.lang;
const text = (value: Text | undefined, ctx: Ctx) => (typeof value === "string" ? value : (value?.[ctx.explain] ?? ""));
const cellEscape = (value: string) => value.replace(/\|/g, "\\|");

// "#missing" marks a link whose target has no page yet; renderers show it as plain text.
function linkTarget(id: string, ctx: Ctx): string {
  return (
    ctx.link(
      ctx.refs.find((r) => r.id === id),
      ctx.explain,
      ctx.ref,
    ) ?? "#missing"
  );
}

const resolveLinks = (value: string, ctx: Ctx) => value.replace(/\]\(id:([^)]+)\)/g, (_, id) => `](${linkTarget(id, ctx)})`);

function withTranslation(base: string, tr: Localized | undefined, ctx: Ctx): string {
  const translation = needsTranslation(ctx) ? tr?.[ctx.explain] : undefined;
  return translation ? `${base} — *${translation}*` : base;
}

function renderItem(item: Item, ctx: Ctx): string | null {
  if (typeof item === "string") return resolveLinks(item, ctx);
  if (isLocalized(item)) return item[ctx.explain] ? resolveLinks(item[ctx.explain]!, ctx) : null;
  const obj = item as ItemObject;
  if (!shows(obj, ctx.explain)) return null;
  const base = [text(obj.text, ctx), obj.ex].filter(Boolean).join(" ");
  const level = obj.level ? `[${obj.level}] ` : "";
  return level + resolveLinks(withTranslation(base, obj.tr, ctx), ctx);
}

function renderCell(cell: unknown, ctx: Ctx): string {
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "string") return cell;
  const value = cell as Exclude<Cell, string>;
  if ("ex" in value) return withTranslation(value.ex, value.tr, ctx);
  return value[ctx.explain] ?? "";
}

export function tableShape(block: TableBlock, explain: Explain, lang: Explain) {
  const columns = block.columns.filter((c) => shows(c, explain));
  const rows = block.rows.filter((r) => shows(r, explain));
  const translation = explain !== lang && rows.some((r) => r.tr?.[explain]);
  const level = rows.some((r) => r.level);
  return { columns, rows, translation, level, width: columns.length + (translation ? 1 : 0) + (level ? 1 : 0) };
}

function renderTable(block: TableBlock, ctx: Ctx): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const header = shape.columns.map((c) => text(c.label, ctx));
  if (shape.translation) header.push(EXPLAIN[ctx.explain]);
  if (shape.level) header.push(say("levelColumn", ctx.explain));
  const lines = [`| ${header.map(cellEscape).join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  for (const row of shape.rows) {
    const cells = shape.columns.map((c) => renderCell(row[c.key], ctx));
    if (shape.translation) cells.push(row.tr?.[ctx.explain] ?? "");
    if (shape.level) cells.push(row.level ?? "");
    // A line break inside a cell becomes <br>: one cell can list a form for every person.
    lines.push(`| ${cells.map((c) => cellEscape(resolveLinks(c, ctx)).replace(/\n/g, "<br>")).join(" | ")} |`);
  }
  return lines.join("\n");
}

function renderErrors(block: ErrorsBlock, ctx: Ctx): string {
  const rows = block.rows.filter((r) => shows(r, ctx.explain));
  const withRule = rows.some((r) => r.rule);
  const header = ["✗", "✓", ...(withRule ? [say("ruleColumn", ctx.explain)] : [])];
  const lines = [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  for (const row of rows) {
    const cells = [row.wrong, row.right, ...(withRule ? [text(row.rule, ctx)] : [])];
    lines.push(`| ${cells.map(cellEscape).join(" | ")} |`);
  }
  const audience = block.audience && needsTranslation(ctx) ? INTERFACE.errorsAudience[ctx.explain]?.[ctx.ref.lang] : undefined;
  return (audience ? `${audience}\n\n` : "") + lines.join("\n");
}

function renderBlock(block: Block, ctx: Ctx): string | null {
  if (!shows(block, ctx.explain)) return null;
  switch (block.type) {
    case "text":
      return renderItem({ text: block.text, ex: block.ex, tr: block.tr }, ctx);
    case "bullets": {
      const items = block.items.map((i) => renderItem(i, ctx)).filter((i): i is string => !!i);
      return items.length ? items.map((i) => `- ${i}`).join("\n") : null;
    }
    case "table":
      return renderTable(block, ctx);
    case "errors":
      return renderErrors(block, ctx);
  }
}

const renderContent = (blocks: Block[], ctx: Ctx) =>
  blocks
    .map((b) => renderBlock(b, ctx))
    .filter((b): b is string => !!b)
    .join("\n\n");

// Essentials of one level as Markdown; parts get headings of the given depth.
export function essentialsMarkdown(
  ref: TopicRef,
  explain: Explain,
  refs: TopicRef[],
  level: string,
  depth = 3,
  link: LinkFn = markdownLinks,
): string | null {
  const essentials = ref.topic?.essentials.find((e) => e.level === level);
  if (!essentials) return null;
  const ctx: Ctx = { ref, explain, refs, link };
  const hashes = "#".repeat(depth);
  if (essentials.parts) {
    return essentials.parts.map((part) => `${hashes} ${part.title[explain]}\n\n${renderContent(part.content, ctx)}`).join("\n\n");
  }
  return essentials.content ? renderContent(essentials.content, ctx) : null;
}

// Reminder of one level as a Markdown bullet list.
export function reminderMarkdown(
  ref: TopicRef,
  explain: Explain,
  refs: TopicRef[],
  level: string,
  link: LinkFn = markdownLinks,
): string | null {
  const reminder = ref.topic?.reminders?.find((r) => r.level === level);
  if (!reminder) return null;
  const ctx: Ctx = { ref, explain, refs, link };
  const items = reminder.items.map((i) => renderItem(i, ctx)).filter((i): i is string => !!i);
  return items.length ? items.map((i) => `- ${i}`).join("\n") : null;
}

export function renderGuide(ref: TopicRef, explain: Explain, refs: TopicRef[], link: LinkFn = markdownLinks): string {
  const topic = ref.topic;
  if (!topic) throw new Error(`No topic data for ${ref.id}`);
  const ctx: Ctx = { ref, explain, refs, link };
  const title = topic.title[explain] ?? "";
  const out: string[] = [];

  out.push(
    [
      "---",
      `id: ${topic.id}`,
      `lang: ${topic.lang}`,
      `explain: ${explain}`,
      "type: guide",
      `kind: ${topic.kind}`,
      `title: ${JSON.stringify(title)}`,
      `levels: [${topic.levels.join(", ")}]`,
      `section: ${ref.section.dir}`,
      `order: ${ref.order}`,
      `tags: [${topic.tags.join(", ")}]`,
      `concepts: [${topic.concepts.join(", ")}]`,
      `related: [${topic.related.join(", ")}]`,
      `status: ${topic.status[explain]}`,
      `source: ${ref.path}`,
      "---",
    ].join("\n"),
  );
  out.push(`# ${title}`, `> ${topic.summary[explain] ?? ""}`);

  for (const section of topic.sections) {
    if (!shows(section, explain)) continue;
    out.push(`## ${section.title[explain]} [${section.level}]`, renderContent(section.content, ctx));
  }

  for (const level of LEVELS) {
    const essentials = essentialsMarkdown(ref, explain, refs, level, 3, link);
    if (essentials) out.push(`## ${say("essentials", explain)} [${level}]`, essentials);
    const reminder = reminderMarkdown(ref, explain, refs, level, link);
    if (reminder) out.push(`## ${say("reminder", explain)} [${level}]`, reminder);
  }

  return out.filter((block) => block !== "").join("\n\n") + "\n";
}
