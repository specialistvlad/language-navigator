// Topic content (topic.yaml) → HTML: blocks with level badges, lists, and tables laid out from what their
// columns hold (CONVENTIONS.md §12).
import { shows, type TableBlock, tableShape } from "../../scripts/content.ts";
import { isLocalized, reading } from "../../scripts/text.ts";
import { type Ctx, escapeHtml, explained, learned, translation } from "./html.ts";
import { blockRange } from "../../scripts/levels.ts";
import { badge, levelAttrs, single } from "./parts.ts";
import { blockStarts, classAttr, GAP_CELL, gapLevel, gapsAfter, headHtml, spans } from "./table.ts";
import {
  type Block,
  type Cell,
  type Column,
  type ErrorsBlock,
  type Example,
  type Explain,
  explainName,
  type FeatureBundle,
  filled,
  type Item,
  type Level,
  type Localized,
  lv,
  say,
  type Text,
} from "../../scripts/lib.ts";

// A leaf carries its level for the filter; its badge shows when it sits above its block's lowest level.
const leafAttr = (level: Level): string => levelAttrs(single(level));
const mark = (level: Level, from: Level): string => (lv(level) > lv(from) ? badge(single(level)) : "");

// Explanation text, then its example in the language being learned.
const textAndExample = (text: Localized | undefined, ex: Text | undefined, ctx: Ctx): string =>
  [explained(text, ctx), learned(ex, ctx)].filter(filled).join(" ");

// ---------- Lists ----------

interface Rendered {
  html: string;
  level: Level;
  attrs: string;
}

// A list item: a rule, a note or an example; a note about another variety names it first.
function item(it: Item, ctx: Ctx): Rendered | null {
  if (!shows(it, ctx.explain)) return null;
  const base = textAndExample(it.text, it.ex, ctx);
  if (!filled(base)) return null;
  const variety =
    it.variety === undefined ? "" : `<span data-mark="variety">${escapeHtml(reading(ctx.explain, false).variety(it.variety))}:</span> `;
  const attrs = ` data-type="${it.type}"${it.variety === undefined ? "" : ` data-variety="${it.variety}"`}`;
  return { html: variety + base + translation(it.tr, ctx), level: it.level, attrs };
}

function list(items: Item[], ctx: Ctx, from: Level): string | null {
  const shown = items.map((i) => item(i, ctx)).filter((i): i is Rendered => i !== null);
  if (shown.length === 0) return null;
  return `<ul>${shown.map((i) => `<li${leafAttr(i.level)}${i.attrs}>${mark(i.level, from)}${i.html}</li>`).join("")}</ul>`;
}

// ---------- Tables ----------

const isExample = (value: Cell): value is Example => typeof value === "object" && !Array.isArray(value) && "ex" in value && "tr" in value;

// A cell: explanation text, text in the language being learned, or an example with its translation.
function cell(value: Cell | undefined, ctx: Ctx): string {
  if (value === undefined) return "";
  if (isExample(value)) return learned(value.ex, ctx) + translation(value.tr, ctx);
  if (typeof value === "object" && !Array.isArray(value) && isLocalized(value)) return explained(value, ctx);
  return learned(value, ctx);
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
const row = (level: Level, from: Level, cells: string[], layout: Layout = {}, attrs = ""): string =>
  `<tr${leafAttr(level)}${attrs}>${cells
    .map((c, n) => {
      const names = [...(layout.center?.[n] === true ? ["center"] : []), ...(layout.end?.[n] === true ? ["end"] : [])];
      return td(n, layout.span?.[n] ?? 1, names, (n === 0 ? mark(level, from) : "") + c) + (layout.gaps?.[n] === true ? GAP_CELL : "");
    })
    .join("")}</tr>`;

const SLOT_LABEL = { aux: "slotAux", subj: "slotSubj", verb: "slotVerb", rest: "slotRest" } as const;

// The sentence a slot column belongs to, named by its features: Question, Statement, Negative.
function sentenceName(c: Column, explain: Explain): string | undefined {
  const f = c.features as FeatureBundle | undefined;
  if (c.slot === undefined || f === undefined) return undefined;
  if (f.interrogativity === "int") return say("groupQuestion", explain);
  return say(f.polarity === "neg" ? "groupNegative" : "groupStatement", explain);
}

function columnTitle(c: Column, ctx: Ctx): string {
  if (c.slot !== undefined) return escapeHtml(say(SLOT_LABEL[c.slot], ctx.explain));
  return cell(c.label, ctx);
}

// A table: a slot paradigm lays sentences out word by word, its slot columns grouped by sentence,
// merged down where neighbours read the same but for the subject, and centred; any other table shows
// its columns as they are, and a dash where a row leaves a cell empty.
function tableHtml(block: TableBlock, ctx: Ctx, from: Level): string {
  const shape = tableShape(block, ctx.explain, ctx.ref.lang);
  const titles = shape.columns.map((c) => columnTitle(c, ctx));
  if (shape.translation) titles.push(escapeHtml(explainName(ctx.explain)));
  const empty = shape.slots ? "" : "—";
  const grid = shape.rows.map((r) => {
    const cells = shape.columns.map((c) => (r[c.key] === undefined ? empty : cell(r[c.key] as Cell, ctx)));
    if (shape.translation) cells.push(r.tr === undefined ? "" : explained(r.tr, ctx));
    return cells;
  });
  const levels = shape.rows.map((r) => r.level);
  const r = (n: number): Level => levels[n] ?? from;
  const merged = shape.columns.map((c) => shape.slots && c.slot !== "subj");
  const starts = blockStarts(grid, levels, merged[0] === true);
  const span = spans(grid, levels, [...merged, false], starts);
  const center = shape.columns.map(() => shape.slots);
  const groups = shape.columns.map((c) => {
    const name = sentenceName(c, ctx.explain);
    return name === undefined ? undefined : escapeHtml(name);
  });
  const gaps = gapsAfter(groups);
  const width = grid[0]?.length ?? 0;
  const spacer = (n: number): string =>
    `<tr class="gap-row"${leafAttr(gapLevel(r(n - 1), r(n)))}><td colspan="${width + gaps.filter(Boolean).length}"></td></tr>`;
  const end = (n: number): boolean[] | undefined => span[n]?.map((s) => n + s === grid.length);
  const value = (n: number): string => {
    const v = shape.rows[n]?.value;
    return v === undefined ? "" : ` data-value="${escapeHtml(String(v))}"`;
  };
  const rows = grid.map(
    (cells, n) => (starts.has(n) ? spacer(n) : "") + row(r(n), from, cells, { span: span[n], center, gaps, end: end(n) }, value(n)),
  );
  const header = headHtml(titles.map((title, n) => ({ title, group: groups[n], center: center[n] === true })));
  const compact = shape.slots ? ' class="compact"' : "";
  return wrap(`<table${compact} data-type="${block.type}">${header}<tbody>${rows.join("")}</tbody></table>`);
}

function errorsHtml(block: ErrorsBlock, ctx: Ctx, from: Level): string {
  const rows = block.rows.filter((r) => shows(r, ctx.explain));
  const withRule = rows.some((r) => r.rule !== undefined);
  const titles = ["✗", "✓", ...(withRule ? [say("ruleColumn", ctx.explain)] : [])].map(escapeHtml);
  const body = rows.map((r) =>
    row(r.level, from, [learned(r.wrong, ctx), learned(r.right, ctx), ...(withRule ? [explained(r.rule, ctx)] : [])]),
  );
  return wrap(
    `<table class="errors">${headHtml(titles.map((title) => ({ title, group: undefined, center: false })))}<tbody>${body.join("")}</tbody></table>`,
  );
}

// ---------- Blocks ----------

function contentHtml(b: Block, ctx: Ctx, from: Level): string | null {
  switch (b.type) {
    case "prose": {
      const base = textAndExample(b.text, b.ex, ctx);
      return filled(base) ? `<p>${base}${translation(b.tr, ctx)}</p>` : null;
    }
    case "list":
      return list(b.items, ctx, from);
    case "paradigm":
    case "usage":
    case "comparison":
    case "inventory":
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
