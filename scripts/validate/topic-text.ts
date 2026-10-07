// Every localized text in a topic carries each explanation language that renders it.
import { type Block, EXPLAIN_CODES, type Explain, filled, type Item, type Topic } from "../lib.ts";
import { isLocalized, tableShape } from "../content.ts";
import type { Report } from "./report.ts";

// The explanation languages an element renders in: all, or the ones its `for` lists.
const scope = (el: { for?: Explain[] | undefined }, langs: Explain[]): Explain[] => {
  const only = el.for;
  return only ? langs.filter((l) => only.includes(l)) : langs;
};

export function checkLanguages(topic: Topic, where: string, report: Report): void {
  const need = (value: unknown, path: string, langs: Explain[]): void => {
    if (value === null || typeof value !== "object" || !isLocalized(value)) return;
    for (const l of langs) if (!filled(value[l])) report(where, `${path} has no "${l}" text`);
  };
  const item = (it: Item, path: string, langs: Explain[]): void => {
    need(it.text, `${path}.text`, scope(it, langs));
  };
  const blocks = (list: Block[], path: string, langs: Explain[]): void => {
    list.forEach((block, i) => {
      const p = `${path}[${i}]`;
      const inner = scope(block, langs);
      if (block.type === "text") need(block.text, `${p}.text`, inner);
      if (block.type === "bullets") {
        block.items.forEach((it, k) => {
          item(it, `${p}.items[${k}]`, inner);
        });
      }
      if (block.type === "table") {
        block.columns.forEach((c) => {
          need(c.label, `${p}.columns.${c.key}`, scope(c, inner));
          need(c.group, `${p}.columns.${c.key}.group`, scope(c, inner));
        });
        block.rows.forEach((row, k) => {
          const rowLangs = scope(row, inner);
          for (const c of block.columns) need(row[c.key], `${p}.rows[${k}].${c.key}`, scope(c, rowLangs));
        });
        for (const l of inner) {
          const shape = tableShape(block, l, topic.lang);
          // A slot table (merge columns) lays a sentence out word by word, so it may run to 10.
          const max = block.columns.some((c) => c.merge === true) ? 10 : 4;
          if (shape.width > max) report(where, `${p} renders ${shape.width} columns in "${l}" (max ${max})`);
        }
      }
      if (block.type === "errors") {
        block.rows.forEach((row, k) => {
          need(row.rule, `${p}.rows[${k}].rule`, scope(row, inner));
        });
      }
    });
  };

  const all = EXPLAIN_CODES;
  need(topic.title, "title", all);
  need(topic.summary, "summary", all);
  topic.sections.forEach((s, i) => {
    const langs = scope(s, all);
    need(s.title, `sections[${i}].title`, langs);
    blocks(s.content, `sections[${i}].content`, langs);
  });
  blocks(topic.cheatsheet.content, "cheatsheet.content", all);
}
