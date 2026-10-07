// Table layout: merged cells down merge columns, and a header with a second row when columns
// carry a group: neighbouring columns of one group share a title above their own. A gap column
// separates two groups; a gap row separates the blocks of a merged first column.
import { lv } from "../../scripts/lib.ts";

export const classAttr = (names: string[]): string => (names.length > 0 ? ` class="${names.join(" ")}"` : "");

// Rows that open a new block of a merged first column: merges stop there and a gap row comes first.
export function blockStarts(grid: string[][], levels: (string | undefined)[], mergeFirst: boolean): Set<number> {
  const starts = new Set<number>();
  if (!mergeFirst) return starts;
  for (let r = 1; r < grid.length; r++) {
    if (grid[r]?.[0] !== grid[r - 1]?.[0] || levels[r] !== levels[r - 1]) starts.add(r);
  }
  return starts;
}

// Row spans for merge columns: a cell joins the one above when both read the same, the rows share a
// level and no block starts between them, so the level filter hides whole merged cells. A span of
// 0 marks a joined cell.
export function spans(grid: string[][], levels: (string | undefined)[], merge: boolean[], starts: Set<number>): number[][] {
  const out = grid.map((cells) => cells.map(() => 1));
  merge.forEach((on, c) => {
    if (!on) return;
    let top = 0;
    for (let r = 1; r < grid.length; r++) {
      const topRow = out[top];
      if (topRow !== undefined && !starts.has(r) && grid[r]?.[c] === grid[top]?.[c] && levels[r] === levels[top]) {
        topRow[c] = (topRow[c] ?? 1) + 1;
        (out[r] ?? [])[c] = 0;
      } else top = r;
    }
  });
  return out;
}

// True after a column whose group differs from the next column's group.
export const gapsAfter = (groups: (string | undefined)[]): boolean[] =>
  groups.map((g, n) => g !== undefined && groups[n + 1] !== undefined && groups[n + 1] !== g);

// A gap row takes the higher level of the blocks around it, so it hides along with either.
export const gapLevel = (above: string | undefined, below: string | undefined): string | undefined =>
  lv(above ?? null) >= lv(below ?? null) ? above : below;

export const GAP_CELL = '<td class="gap"></td>';

export interface HeadCell {
  title: string;
  group: string | undefined;
  center: boolean;
}

const th = (content: string, names: string[], cols: number, rows: number): string =>
  `<th${classAttr(names)}${cols > 1 ? ` colspan="${cols}"` : ""}${rows > 1 ? ` rowspan="${rows}"` : ""}>${content}</th>`;
const own = (c: HeadCell): string[] => (c.center ? ["center"] : []);

// One header row, or two when a column has a group: an ungrouped title spans both rows.
export function headHtml(cells: HeadCell[]): string {
  if (cells.every((c) => c.group === undefined)) {
    return `<thead><tr>${cells.map((c) => th(c.title, own(c), 1, 1)).join("")}</tr></thead>`;
  }
  const top: string[] = [];
  const bottom: string[] = [];
  let n = 0;
  while (n < cells.length) {
    const first = cells[n];
    if (first === undefined) break;
    if (first.group === undefined) {
      top.push(th(first.title, own(first), 1, 2));
      n++;
      continue;
    }
    const members = [];
    for (let c = cells[n]; c?.group === first.group; c = cells[n]) {
      members.push(c);
      n++;
    }
    top.push(th(first.group, ["group", "center"], members.length, 1));
    if (cells[n]?.group !== undefined) top.push(th("", ["gap"], 1, 2));
    members.forEach((c, k) => bottom.push(th(c.title, [...own(c), ...(k === 0 ? ["group-start"] : [])], 1, 1)));
  }
  return `<thead><tr>${top.join("")}</tr><tr>${bottom.join("")}</tr></thead>`;
}
