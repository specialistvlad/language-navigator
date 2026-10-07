// Topic content (topic.yaml) → HTML: blocks with level badges, error tables, scrollable table
// wrappers, and the inline marks of the data: **bold**, *italic*, [label](id:topic) and line breaks.
import { isLocalized, shows, tableShape } from "../../scripts/content.ts";
import {
  type Block,
  type ErrorsBlock,
  type Explain,
  explainName,
  filled,
  INTERFACE,
  type Item,
  type Localized,
  type Row,
  say,
  type TableBlock,
  type Text,
  type TopicRef,
} from "../../scripts/lib.ts";

// Turns a topic ID into a page URL; null marks a topic without a page yet.
export type LinkFn = (target: TopicRef | undefined, explain: Explain, from: TopicRef) => string | null;

// One topic rendered in one explanation language.
export interface Ctx {
  ref: TopicRef;
  explain: Explain;
  refs: TopicRef[];
  link: LinkFn;
}

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

export function levelBadge(from: string, to?: string | null): string {
  const label = filled(to) && to !== from ? `${from}–${to}` : from;
  return `<span class="badge lvl lvl-${from}">${label}</span>`;
}

// Inline marks: [label](id:topic) links, **bold**, *italic*, and a line break for each "\n".
export function inline(value: string, ctx: Ctx): string {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(id:([^)]+)\)/g, (_match, label: string, id: string) => {
      const href = ctx.link(
        ctx.refs.find((r) => r.id === id),
        ctx.explain,
        ctx.ref,
      );
      return href === null ? `<span class="missing">${label}</span>` : `<a href="${href}">${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

const text = (value: Text | undefined, ctx: Ctx): string => (typeof value === "string" ? value : (value?.[ctx.explain] ?? ""));
const levelAttr = (level: string | undefined): string => (filled(level) ? ` data-level="${level}"` : "");
const badge = (level: string | undefined): string => (filled(level) ? levelBadge(level) : "");

// A translation into the reader's language, when it differs from the language being learned.
function translation(tr: Localized | undefined, ctx: Ctx): string {
  const value = ctx.explain === ctx.ref.lang ? undefined : tr?.[ctx.explain];
  return filled(value) ? ` — <em>${inline(value, ctx)}</em>` : "";
}

interface Rendered {
  html: string;
  level?: string | undefined;
}

// A bullet or paragraph: explanation, example and its translation; null when it serves other readers.
function item(it: Item, ctx: Ctx): Rendered | null {
  if (typeof it === "string") return { html: inline(it, ctx) };
  if (isLocalized(it)) {
    const own = it[ctx.explain];
    return filled(own) ? { html: inline(own, ctx) } : null;
  }
  if (!shows(it, ctx.explain)) return null;
  const base = [text(it.text, ctx), it.ex].filter(filled).join(" ");
  return { html: inline(base, ctx) + translation(it.tr, ctx), level: it.level };
}

// A bullet list; null when no item serves this reader.
export function list(items: Item[], ctx: Ctx): string | null {
  const shown = items.map((i) => item(i, ctx)).filter((i): i is Rendered => i !== null);
  if (shown.length === 0) return null;
  return `<ul>${shown.map((i) => `<li${levelAttr(i.level)}>${badge(i.level)}${i.html}</li>`).join("")}</ul>`;
}

// A cell value: text, localized text or an example; a row's own keys (for) render nothing.
function cell(value: Row[string], ctx: Ctx): string {
  if (value === undefined || Array.isArray(value)) return "";
  if (typeof value === "string") return inline(value, ctx);
  if (isLocalized(value)) return inline(value[ctx.explain] ?? "", ctx);
  return inline(value.ex, ctx) + translation(value.tr, ctx);
}

const wrap = (inner: string): string => `<div class="table-wrap">${inner}</div>`;
// A row's level shows as a badge at the start of its first cell.
const row = (level: string | undefined, cells: string[]): string =>
  `<tr${levelAttr(level)}>${cells.map((c, n) => `<td>${n === 0 ? badge(level) : ""}${c}</td>`).join("")}</tr>`;
const head = (cells: string[]): string => `<thead><tr>${cells.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;

function tableHtml(block: TableBlock, ctx: Ctx): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const titles = shape.columns.map((c) => inline(text(c.label, ctx), ctx));
  if (shape.translation) titles.push(escapeHtml(explainName(ctx.explain)));
  const rows = shape.rows.map((r) => {
    const cells = shape.columns.map((c) => cell(r[c.key], ctx));
    if (shape.translation) cells.push(inline(r.tr?.[ctx.explain] ?? "", ctx));
    return row(r.level, cells);
  });
  return wrap(`<table>${head(titles)}<tbody>${rows.join("")}</tbody></table>`);
}

function errorsHtml(block: ErrorsBlock, ctx: Ctx): string {
  const rows = block.rows.filter((r) => shows(r, ctx.explain));
  const withRule = rows.some((r) => r.rule !== undefined && r.rule !== "");
  const titles = ["✗", "✓", ...(withRule ? [say("ruleColumn", ctx.explain)] : [])].map(escapeHtml);
  const body = rows.map((r) =>
    row(r.level, [inline(r.wrong, ctx), inline(r.right, ctx), ...(withRule ? [inline(text(r.rule, ctx), ctx)] : [])]),
  );
  const audience =
    block.audience === true && ctx.explain !== ctx.ref.lang ? INTERFACE.errorsAudience[ctx.explain]?.[ctx.ref.lang] : undefined;
  const intro = filled(audience) ? `<p>${inline(audience, ctx)}</p>` : "";
  return intro + wrap(`<table class="errors">${head(titles)}<tbody>${body.join("")}</tbody></table>`);
}

function blockHtml(b: Block, ctx: Ctx): string | null {
  if (!shows(b, ctx.explain)) return null;
  switch (b.type) {
    case "text": {
      const base = [text(b.text, ctx), b.ex].filter(filled).join(" ");
      return filled(base) ? `<p>${inline(base, ctx)}${translation(b.tr, ctx)}</p>` : null;
    }
    case "bullets":
      return list(b.items, ctx);
    case "table":
      return tableHtml(b, ctx);
    case "errors":
      return errorsHtml(b, ctx);
  }
}

export const blocksHtml = (blocks: Block[], ctx: Ctx): string =>
  blocks
    .map((b) => blockHtml(b, ctx))
    .filter(filled)
    .join("\n");
