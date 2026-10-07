// Shared reading of topic data: localized values, language scoping and table shape.
import { type Column, EXPLAIN, type Explain, filled, type Localized, type Row, type TableBlock } from "./lib.ts";

export const isLocalized = (value: object): value is Localized => Object.keys(value).every((k) => k in EXPLAIN);
// An element renders in every explanation language, or only in those its `for` lists.
export const shows = (el: { for?: Explain[] | undefined }, explain: Explain): boolean => !el.for || el.for.includes(explain);

export interface TableShape {
  columns: Column[];
  rows: Row[];
  translation: boolean;
  width: number;
}

export function tableShape(block: TableBlock, explain: Explain, lang: Explain): TableShape {
  const columns = block.columns.filter((c) => shows(c, explain));
  const rows = block.rows.filter((r) => shows(r, explain));
  const translation = explain !== lang && rows.some((r) => filled(r.tr?.[explain]));
  return { columns, rows, translation, width: columns.length + (translation ? 1 : 0) };
}
