// Shared reading of topic data: language scoping, every text of a topic, titles and table shape.
import { type Block, type Column, type Explain, filled, type Localized, type Row, type Text, type Topic, type TopicRef } from "./lib.ts";
import { isLocalized, plainText, reading } from "./text.ts";

// An element renders in every explanation language, or only in those its readers list.
export const shows = (el: { readers?: Explain[] | undefined }, explain: Explain): boolean => !el.readers || el.readers.includes(explain);

// Every text of a topic in an explanation language, with where it sits and whether it is in the
// language being learned (plain): titles, the summary, every block, cell, label and item.
export interface TopicText {
  text: Text;
  path: string;
  plain: boolean;
}

export function* topicTexts(topic: Topic, explain: Explain): Generator<TopicText> {
  function* loc(value: Localized | undefined, path: string): Generator<TopicText> {
    const t = value?.[explain];
    if (t !== undefined) yield { text: t, path, plain: false };
  }
  function* plain(value: Text | undefined, path: string): Generator<TopicText> {
    if (value !== undefined) yield { text: value, path, plain: true };
  }
  function* cell(value: unknown, path: string): Generator<TopicText> {
    if (value === undefined) return;
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "ex" in value && "tr" in value) {
      const ex = value as { ex: Text; tr: Localized };
      yield* plain(ex.ex, path);
      yield* loc(ex.tr, `${path}.tr`);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value) && isLocalized(value)) yield* loc(value, path);
    else yield* plain(value as Text, path);
  }
  function* blocks(list: Block[], path: string): Generator<TopicText> {
    for (const [i, b] of list.entries()) {
      const p = `${path}[${i}]`;
      switch (b.type) {
        case "prose":
          yield* loc(b.text, `${p}.text`);
          yield* plain(b.ex, `${p}.ex`);
          yield* loc(b.tr, `${p}.tr`);
          break;
        case "list":
          for (const [k, it] of b.items.entries()) {
            yield* loc(it.text, `${p}.items[${k}].text`);
            yield* plain(it.ex, `${p}.items[${k}].ex`);
            yield* loc(it.tr, `${p}.items[${k}].tr`);
          }
          break;
        case "errors":
          for (const [k, r] of b.rows.entries()) {
            yield* plain(r.wrong, `${p}.rows[${k}].wrong`);
            yield* plain(r.right, `${p}.rows[${k}].right`);
            yield* loc(r.rule, `${p}.rows[${k}].rule`);
          }
          break;
        case "paradigm":
        case "usage":
        case "comparison":
        case "inventory":
          for (const c of b.columns) yield* cell(c.label, `${p}.columns.${c.key}`);
          for (const [k, r] of b.rows.entries()) {
            for (const c of b.columns) yield* cell(r[c.key], `${p}.rows[${k}].${c.key}`);
            yield* loc(r.tr, `${p}.rows[${k}].tr`);
          }
      }
    }
  }
  yield* loc(topic.title, "title");
  yield* loc(topic.summary.lead, "summary.lead");
  yield* loc(topic.summary.rule, "summary.rule");
  yield* plain(topic.summary.ex, "summary.ex");
  yield* blocks(topic.cheatsheet.content, "cheatsheet.content");
  for (const [i, s] of topic.sections.entries()) {
    yield* loc(s.title, `sections[${i}].title`);
    yield* blocks(s.content, `sections[${i}].content`);
  }
}

// Title of any curriculum topic in an explanation language: topic file, then curriculum, then slug.
export function topicTitle(ref: TopicRef, explain: Explain): string {
  const own: Text | undefined = ref.topic?.title[explain];
  if (own !== undefined) return plainText(own, reading(explain, false));
  return ref.entry.title?.[explain] ?? ref.entry.slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// ---------- Tables ----------

export type TableBlock = Extract<Block, { columns: Column[] }>;
export const isTable = (b: Block): b is TableBlock => "columns" in b;

export interface TableShape {
  columns: Column[];
  rows: Row[];
  translation: boolean;
  width: number;
  // A slot paradigm lays sentences out word by word: its columns hold slots.
  slots: boolean;
}

export function tableShape(block: TableBlock, explain: Explain, lang: string): TableShape {
  const columns = block.columns.filter((c) => shows(c, explain));
  const rows = block.rows.filter((r) => shows(r, explain));
  const translation = explain !== lang && rows.some((r) => r.tr !== undefined && filled(plainTr(r.tr, explain)));
  const slots = columns.some((c) => c.slot !== undefined);
  return { columns, rows, translation, width: columns.length + (translation ? 1 : 0), slots };
}

const plainTr = (tr: Localized, explain: Explain): string => {
  const t: Text | undefined = tr[explain];
  return t === undefined ? "" : plainText(t, reading(explain, false));
};
