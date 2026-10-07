// Topic content (topic.yaml) → HTML: blocks with level badges, error tables, scrollable table
// wrappers, and the inline marks of the data: **bold**, *italic*, [label](id:topic) and line breaks.
import { isLocalized, shows, tableShape } from "../../scripts/content.ts";
import { blockRange } from "../../scripts/levels.ts";
import { badge, levelAttrs, single } from "./parts.ts";
import { blockStarts, classAttr, GAP_CELL, gapLevel, gapsAfter, headHtml, spans } from "./table.ts";
import {
  type Block,
  type ErrorsBlock,
  type Explain,
  explainName,
  filled,
  type Item,
  type Level,
  lv,
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
// A leaf carries its level for the filter; its badge shows when it sits above its block's lowest level.
const leafAttr = (level: Level): string => levelAttrs(single(level));
const mark = (level: Level, from: Level): string => (lv(level) > lv(from) ? badge(single(level)) : "");

// A translation into the reader's language, when it differs from the language being learned.
function translation(tr: Localized | undefined, ctx: Ctx): string {
  const value = ctx.explain === ctx.ref.lang ? undefined : tr?.[ctx.explain];
  return filled(value) ? ` — <em>${inline(value, ctx)}</em>` : "";
}

interface Rendered {
  html: string;
  level: Level;
}

// A bullet: explanation, example and its translation; null when it serves other readers.
function item(it: Item, ctx: Ctx): Rendered | null {
  if (!shows(it, ctx.explain)) return null;
  const base = [text(it.text, ctx), it.ex].filter(filled).join(" ");
  return filled(base) ? { html: inline(base, ctx) + translation(it.tr, ctx), level: it.level } : null;
}

// A bullet list; null when no item serves this reader.
function list(items: Item[], ctx: Ctx, from: Level): string | null {
  const shown = items.map((i) => item(i, ctx)).filter((i): i is Rendered => i !== null);
  if (shown.length === 0) return null;
  return `<ul>${shown.map((i) => `<li${leafAttr(i.level)}>${mark(i.level, from)}${i.html}</li>`).join("")}</ul>`;
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
const row = (level: Level, from: Level, cells: string[], layout: Layout = {}): string =>
  `<tr${leafAttr(level)}>${cells
    .map((c, n) => {
      const names = [...(layout.center?.[n] === true ? ["center"] : []), ...(layout.end?.[n] === true ? ["end"] : [])];
      return td(n, layout.span?.[n] ?? 1, names, (n === 0 ? mark(level, from) : "") + c) + (layout.gaps?.[n] === true ? GAP_CELL : "");
    })
    .join("")}</tr>`;

function tableHtml(block: TableBlock, ctx: Ctx, from: Level): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const titles = shape.columns.map((c) => inline(text(c.label, ctx), ctx));
  if (shape.translation) titles.push(escapeHtml(explainName(ctx.explain)));
  const grid = shape.rows.map((r) => {
    const cells = shape.columns.map((c) => cell(r[c.key], ctx));
    if (shape.translation) cells.push(inline(r.tr?.[ctx.explain] ?? "", ctx));
    return cells;
  });
  const levels = shape.rows.map((r) => r.level);
  const r = (n: number): Level => levels[n] ?? from;
  const starts = blockStarts(grid, levels, shape.columns[0]?.merge === true);
  const span = spans(grid, levels, [...shape.columns.map((c) => c.merge === true), false], starts);
  const center = shape.columns.map((c) => c.center === true);
  const groups = shape.columns.map((c) => (c.group === undefined ? undefined : inline(text(c.group, ctx), ctx)));
  const gaps = gapsAfter(groups);
  const width = grid[0]?.length ?? 0;
  const spacer = (n: number): string =>
    `<tr class="gap-row"${leafAttr(gapLevel(r(n - 1), r(n)))}><td colspan="${width + gaps.filter(Boolean).length}"></td></tr>`;
  const end = (n: number): boolean[] | undefined => span[n]?.map((s) => n + s === grid.length);
  const rows = grid.map(
    (cells, n) => (starts.has(n) ? spacer(n) : "") + row(r(n), from, cells, { span: span[n], center, gaps, end: end(n) }),
  );
  const header = headHtml(titles.map((title, n) => ({ title, group: groups[n], center: center[n] === true })));
  const compact = shape.columns.some((c) => c.merge === true) ? ' class="compact"' : "";
  return wrap(`<table${compact}>${header}<tbody>${rows.join("")}</tbody></table>`);
}

function errorsHtml(block: ErrorsBlock, ctx: Ctx, from: Level): string {
  const rows = block.rows.filter((r) => shows(r, ctx.explain));
  const withRule = rows.some((r) => r.rule !== undefined && r.rule !== "");
  const titles = ["✗", "✓", ...(withRule ? [say("ruleColumn", ctx.explain)] : [])].map(escapeHtml);
  const body = rows.map((r) =>
    row(r.level, from, [inline(r.wrong, ctx), inline(r.right, ctx), ...(withRule ? [inline(text(r.rule, ctx), ctx)] : [])]),
  );
  return wrap(
    `<table class="errors">${headHtml(titles.map((title) => ({ title, group: undefined, center: false })))}<tbody>${body.join("")}</tbody></table>`,
  );
}

function contentHtml(b: Block, ctx: Ctx, from: Level): string | null {
  switch (b.type) {
    case "text": {
      const base = [text(b.text, ctx), b.ex].filter(filled).join(" ");
      return filled(base) ? `<p>${inline(base, ctx)}${translation(b.tr, ctx)}</p>` : null;
    }
    case "bullets":
      return list(b.items, ctx, from);
    case "table":
      return tableHtml(b, ctx, from);
    case "errors":
      return errorsHtml(b, ctx, from);
  }
}

// A block in a wrapper that carries its range, so the filter hides it together with its last leaf.
// Its badge shows when it starts above the section or cheatsheet around it.
function blockHtml(b: Block, ctx: Ctx, parent: Level): string | null {
  const range = blockRange(b, ctx.explain);
  const html = range === null ? null : contentHtml(b, ctx, range.from);
  if (range === null || html === null) return null;
  const head = lv(range.from) > lv(parent) ? `<div class="blk-level">${badge(range)}</div>` : "";
  return `<div class="blk"${levelAttrs(range)}>${head}${html}</div>`;
}

// The blocks of a section or cheatsheet whose lowest level is parent.
export const blocksHtml = (blocks: Block[], ctx: Ctx, parent: Level): string =>
  blocks
    .map((b) => blockHtml(b, ctx, parent))
    .filter(filled)
    .join("\n");
