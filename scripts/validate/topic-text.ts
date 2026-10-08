// The text of a topic: every localized value carries each explanation language that renders it, every
// table holds what its type names (CONVENTIONS.md §12), and every mark is whole (notation.ts).
import { isTable, scope, serves, type TableBlock, tableShape } from "../content.ts";
import { isLocalized } from "../text.ts";
import { type Block, type Cell, EXPLAIN_CODES, type Explain, type FeatureBundle, type Item, type Localized, type Topic } from "../lib.ts";
import { checkMarks, validDate } from "./notation.ts";
import type { Report } from "./report.ts";

// The value each kind of inventory gives its members.
const VALUES: Record<string, (v: unknown) => boolean> = {
  letters: (v) => typeof v === "string" && /^[a-z]$/.test(v),
  sounds: (v) => typeof v === "string" && v.length > 0,
  numbers: (v) => typeof v === "number",
  ordinals: (v) => typeof v === "number" && Number.isInteger(v) && v >= 1,
  days: (v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7,
  months: (v) => typeof v === "string" && /^--(0[1-9]|1[0-2])$/.test(v),
  years: (v) => typeof v === "string" && /^\d{4}$/.test(v),
  dates: (v) => typeof v === "string" && /^--\d\d-\d\d$/.test(v) && validDate(v),
  times: (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
};

const ROW_KEYS = new Set(["level", "features", "value", "variety", "readers", "tr"]);

// The sentences a slot column can belong to, by interrogativity and polarity: the renderer names each.
const SENTENCES = new Set(["int pos", "decl pos", "decl neg"]);
const sentenceOf = (f: FeatureBundle | FeatureBundle[] | undefined): string =>
  f === undefined || Array.isArray(f) ? "" : `${String(f.interrogativity)} ${String(f.polarity)}`;

// Every localized value carries each explanation language that renders it; every table holds what its
// type names.
export function checkText(topic: Topic, where: string, report: Report): void {
  const need = (value: Localized | undefined, path: string, langs: Explain[]): void => {
    if (value === undefined) return;
    for (const l of langs) {
      const own: unknown = value[l];
      if (own === undefined) report(where, `${path} has no "${l}" text`);
    }
  };
  const cell = (value: Cell | undefined, path: string, langs: Explain[]): void => {
    if (value === undefined) return;
    if (typeof value === "object" && !Array.isArray(value) && "ex" in value && "tr" in value) need(value.tr, `${path}.tr`, langs);
    else if (isLocalizedValue(value)) need(value, path, langs);
  };
  const item = (it: Item, path: string, langs: Explain[]): void => {
    const own = scope(it, langs);
    need(it.text, `${path}.text`, own);
    need(it.tr, `${path}.tr`, own);
  };
  const table = (block: TableBlock, path: string, langs: Explain[]): void => {
    const keys = block.columns.map((c) => c.key);
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) report(where, `${path} has two columns with key "${k}"`);
      seen.add(k);
    }
    block.columns.forEach((c) => {
      cell(c.label, `${path}.columns.${c.key}`, scope(c, langs));
      if (c.slot !== undefined && block.type !== "paradigm") {
        report(where, `${path}.columns.${c.key} holds a slot: only a paradigm has slot columns`);
      }
      if (c.slot !== undefined && !SENTENCES.has(sentenceOf(c.features))) {
        report(
          where,
          `${path}.columns.${c.key} holds a slot: its features name one sentence, a question (int, pos), a statement (decl, pos) or a negative (decl, neg)`,
        );
      }
    });
    block.rows.forEach((row, k) => {
      const rowLangs = scope(row, langs);
      for (const key of Object.keys(row)) {
        if (!ROW_KEYS.has(key) && !keys.includes(key)) report(where, `${path}.rows[${k}] has "${key}", which no column holds`);
      }
      for (const c of block.columns) cell(row[c.key] as Cell | undefined, `${path}.rows[${k}].${c.key}`, scope(c, rowLangs));
      need(row.tr, `${path}.rows[${k}].tr`, rowLangs);
      if (block.type === "paradigm" && row.tr !== undefined) {
        report(where, `${path}.rows[${k}] translates a paradigm row: the examples carry the translations`);
      }
    });
    if (
      block.type === "paradigm" &&
      !block.rows.every((r) => r.features !== undefined) &&
      !block.columns.some((c) => c.features !== undefined)
    ) {
      report(where, `${path} is a paradigm: its rows or its columns carry features`);
    }
    if (block.type === "inventory") {
      const valid = VALUES[block.set];
      block.rows.forEach((r, k) => {
        if (valid?.(r.value) !== true) report(where, `${path}.rows[${k}] has no ${block.set} value: ${JSON.stringify(r.value)}`);
      });
    }
    for (const l of langs) {
      const shape = tableShape(block, l, topic.lang);
      // A slot paradigm lays a sentence out word by word, so it may run to 10.
      const max = shape.slots ? 10 : 4;
      if (shape.width > max) report(where, `${path} renders ${shape.width} columns in "${l}" (max ${max})`);
    }
  };
  const blocks = (list: Block[], path: string, langs: Explain[]): void => {
    list.forEach((block, i) => {
      const p = `${path}[${i}]`;
      const inner = scope(block, langs);
      if (block.type === "prose") {
        need(block.text, `${p}.text`, inner);
        need(block.tr, `${p}.tr`, inner);
      }
      if (block.type === "list") {
        block.items.forEach((it, k) => {
          item(it, `${p}.items[${k}]`, inner);
        });
      }
      if (isTable(block)) table(block, p, inner);
      if (block.type === "errors") {
        block.rows.forEach((row, k) => {
          need(
            row.rule,
            `${p}.rows[${k}].rule`,
            inner.filter((l) => serves(row, l)),
          );
        });
      }
    });
  };

  const all = [...EXPLAIN_CODES];
  need(topic.title, "title", all);
  need(topic.summary.lead, "summary.lead", all);
  need(topic.summary.rule, "summary.rule", all);
  topic.sections.forEach((s, i) => {
    const langs = scope(s, all);
    need(s.title, `sections[${i}].title`, langs);
    blocks(s.content, `sections[${i}].content`, langs);
  });
  blocks(topic.cheatsheet.content, "cheatsheet.content", all);
  checkMarks(topic, where, report);
}

const isLocalizedValue = (v: unknown): v is Localized => typeof v === "object" && v !== null && !Array.isArray(v) && isLocalized(v);
