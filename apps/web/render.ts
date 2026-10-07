// Topic content (topic.yaml) → HTML: blocks with level badges, error tables, scrollable table
// wrappers, and the inline marks of the data: **bold**, *italic*, [label](id:topic) and line breaks.
import { isLocalized, shows, tableShape } from "../../scripts/content.ts";
import { blockStarts, classAttr, GAP_CELL, gapLevel, gapsAfter, headHtml, spans } from "./table.ts";
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
// A row's level shows as a badge at the start of its first cell. A span of 0 leaves the cell to
// the merged cell above it; a span above 1 covers the rows below. A center column centres its
// cells both ways; an end cell reaches the table's bottom edge.
interface Layout {
  span?: number[] | undefined;
  center?: boolean[];
  gaps?: boolean[];
  end?: boolean[] | undefined;
}
const td = (n: number, span: number, names: string[], content: string): string =>
  span === 0 ? "" : `<td${classAttr([...(n === 0 ? ["key"] : []), ...names])}${span > 1 ? ` rowspan="${span}"` : ""}>${content}</td>`;
const row = (level: string | undefined, cells: string[], layout: Layout = {}): string =>
  `<tr${levelAttr(level)}>${cells
    .map((c, n) => {
      const names = [...(layout.center?.[n] === true ? ["center"] : []), ...(layout.end?.[n] === true ? ["end"] : [])];
      return td(n, layout.span?.[n] ?? 1, names, (n === 0 ? badge(level) : "") + c) + (layout.gaps?.[n] === true ? GAP_CELL : "");
    })
    .join("")}</tr>`;

function tableHtml(block: TableBlock, ctx: Ctx): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const titles = shape.columns.map((c) => inline(text(c.label, ctx), ctx));
  if (shape.translation) titles.push(escapeHtml(explainName(ctx.explain)));
  const grid = shape.rows.map((r) => {
    const cells = shape.columns.map((c) => cell(r[c.key], ctx));
    if (shape.translation) cells.push(inline(r.tr?.[ctx.explain] ?? "", ctx));
    return cells;
  });
  const levels = shape.rows.map((r) => r.level);
  const starts = blockStarts(grid, levels, shape.columns[0]?.merge === true);
  const span = spans(grid, levels, [...shape.columns.map((c) => c.merge === true), false], starts);
  const center = shape.columns.map((c) => c.center === true);
  const groups = shape.columns.map((c) => (c.group === undefined ? undefined : inline(text(c.group, ctx), ctx)));
  const gaps = gapsAfter(groups);
  const width = grid[0]?.length ?? 0;
  const spacer = (n: number): string =>
    `<tr class="gap-row"${levelAttr(gapLevel(levels[n - 1], levels[n]))}><td colspan="${width + gaps.filter(Boolean).length}"></td></tr>`;
  const end = (n: number): boolean[] | undefined => span[n]?.map((s) => n + s === grid.length);
  const rows = grid.map(
    (cells, n) => (starts.has(n) ? spacer(n) : "") + row(levels[n], cells, { span: span[n], center, gaps, end: end(n) }),
  );
  const header = headHtml(titles.map((title, n) => ({ title, group: groups[n], center: center[n] === true })));
  const compact = shape.columns.some((c) => c.merge === true) ? ' class="compact"' : "";
  return wrap(`<table${compact}>${header}<tbody>${rows.join("")}</tbody></table>`);
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
  return (
    intro +
    wrap(
      `<table class="errors">${headHtml(titles.map((title) => ({ title, group: undefined, center: false })))}<tbody>${body.join("")}</tbody></table>`,
    )
  );
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
