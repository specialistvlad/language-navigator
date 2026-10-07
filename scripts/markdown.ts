// Renders topic content (topic.yaml blocks) as Markdown for one explanation language.
import { dirname, relative } from "node:path";
import { isLocalized, shows, tableShape } from "./content.ts";
import {
  type Block,
  type ErrorsBlock,
  type Explain,
  type Item,
  type Localized,
  type Row,
  type TableBlock,
  type Text,
  type TopicRef,
  explainName,
  filled,
  guidePath,
  INTERFACE,
  say,
} from "./lib.ts";

// Turns a topic ID into a link target; null marks a topic without a page yet.
export type LinkFn = (target: TopicRef | undefined, explain: Explain, from: TopicRef) => string | null;

export interface Ctx {
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

const resolveLinks = (value: string, ctx: Ctx): string =>
  value.replace(/\]\(id:([^)]+)\)/g, (_match, id: string) => `](${linkTarget(id, ctx)})`);

function withTranslation(base: string, tr: Localized | undefined, ctx: Ctx): string {
  const translation = needsTranslation(ctx) ? tr?.[ctx.explain] : undefined;
  return filled(translation) ? `${base} — *${translation}*` : base;
}

export function renderItem(item: Item, ctx: Ctx): string | null {
  if (typeof item === "string") return resolveLinks(item, ctx);
  if (isLocalized(item)) {
    const own = item[ctx.explain];
    return filled(own) ? resolveLinks(own, ctx) : null;
  }
  if (!shows(item, ctx.explain)) return null;
  const level = filled(item.level) ? `[${item.level}] ` : "";
  return level + renderText(item.text, item.ex, item.tr, ctx);
}

// Text and an example side by side, with the example's translation when the reader needs it.
function renderText(value: Text | undefined, ex: string | undefined, tr: Localized | undefined, ctx: Ctx): string {
  const base = [text(value, ctx), ex].filter(filled).join(" ");
  return resolveLinks(withTranslation(base, tr, ctx), ctx);
}

function renderCell(cell: Row[string], ctx: Ctx): string {
  if (cell === undefined || Array.isArray(cell)) return "";
  if (typeof cell === "string") return cell;
  if (!isLocalized(cell)) return withTranslation(cell.ex, cell.tr, ctx);
  return cell[ctx.explain] ?? "";
}

function renderTable(block: TableBlock, ctx: Ctx): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const header = shape.columns.map((c) => text(c.label, ctx));
  if (shape.translation) header.push(explainName(ctx.explain));
  const lines = [`| ${header.map(cellEscape).join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  for (const row of shape.rows) {
    const cells = shape.columns.map((c) => renderCell(row[c.key], ctx));
    if (shape.translation) cells.push(row.tr?.[ctx.explain] ?? "");
    // A row's level opens its first cell as a tag, like a bullet's: [A2] …
    if (filled(row.level)) cells[0] = `[${row.level}] ${cells[0] ?? ""}`;
    // A line break inside a cell becomes <br>: one cell can list a form for every person.
    lines.push(`| ${cells.map((c) => cellEscape(resolveLinks(c, ctx)).replace(/\n/g, "<br>")).join(" | ")} |`);
  }
  return lines.join("\n");
}

function renderErrors(block: ErrorsBlock, ctx: Ctx): string {
  const rows = block.rows.filter((r) => shows(r, ctx.explain));
  const withRule = rows.some((r) => r.rule !== undefined && r.rule !== "");
  const header = ["✗", "✓", ...(withRule ? [say("ruleColumn", ctx.explain)] : [])];
  const lines = [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`];
  for (const row of rows) {
    const wrong = filled(row.level) ? `[${row.level}] ${row.wrong}` : row.wrong;
    const cells = [wrong, row.right, ...(withRule ? [text(row.rule, ctx)] : [])];
    lines.push(`| ${cells.map(cellEscape).join(" | ")} |`);
  }
  const audience = block.audience === true && needsTranslation(ctx) ? INTERFACE.errorsAudience[ctx.explain]?.[ctx.ref.lang] : undefined;
  return (filled(audience) ? `${audience}\n\n` : "") + lines.join("\n");
}

function renderBlock(block: Block, ctx: Ctx): string | null {
  if (!shows(block, ctx.explain)) return null;
  switch (block.type) {
    case "text":
      return renderText(block.text, block.ex, block.tr, ctx);
    case "bullets": {
      const items = block.items.map((i) => renderItem(i, ctx)).filter(filled);
      return items.length > 0 ? items.map((i) => `- ${i}`).join("\n") : null;
    }
    case "table":
      return renderTable(block, ctx);
    case "errors":
      return renderErrors(block, ctx);
  }
}

export const renderContent = (blocks: Block[], ctx: Ctx): string =>
  blocks
    .map((b) => renderBlock(b, ctx))
    .filter(filled)
    .join("\n\n");
