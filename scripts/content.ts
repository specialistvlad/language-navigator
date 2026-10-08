// Shared reading of topic data: language scoping, every text of a topic, titles and table shape.
import { type Block, type Column, type Explain, filled, type Localized, type Row, type Text, type Topic, type TopicRef } from "./lib.ts";
import { isLocalized, plainText, reading } from "./text.ts";

// An element renders in every explanation language, or only in those its readers list.
export const shows = (el: { readers?: Explain[] | undefined }, explain: Explain): boolean => !el.readers || el.readers.includes(explain);

// The explanation languages an element serves, within those around it: all, or the ones its readers list.
export const scope = (el: { readers?: Explain[] | undefined }, langs: readonly Explain[]): Explain[] => {
  const only = el.readers;
  return only ? langs.filter((l) => only.includes(l)) : [...langs];
};

// An error row serves the readers it names, and the speakers of the explanation languages it names.
export const serves = (row: { readers?: Explain[] | undefined; speakers?: Explain[] | undefined }, explain: Explain): boolean =>
  shows(row, explain) && (!row.speakers || row.speakers.includes(explain));

// Every text of a topic, once, with where it sits, whether it is in the language being learned (plain),
// and the explanation languages it serves: titles, the summary, every block, cell, label and item. A
// localized value gives its text in each language it serves, one at a time.
export interface TopicText {
  text: Text;
  path: string;
  plain: boolean;
  langs: Explain[];
}

export function* topicTexts(topic: Topic, all: readonly Explain[]): Generator<TopicText> {
  function* loc(value: Localized | undefined, path: string, langs: Explain[]): Generator<TopicText> {
    for (const l of langs) {
      const t: Text | undefined = value?.[l];
      if (t !== undefined) yield { text: t, path, plain: false, langs: [l] };
    }
  }
  function* plain(value: Text | undefined, path: string, langs: Explain[]): Generator<TopicText> {
    if (value !== undefined) yield { text: value, path, plain: true, langs };
  }
  function* cell(value: unknown, path: string, langs: Explain[]): Generator<TopicText> {
    if (value === undefined) return;
    if (typeof value === "object" && value !== null && !Array.isArray(value) && "ex" in value && "tr" in value) {
      const ex = value as { ex: Text; tr: Localized };
      yield* plain(ex.ex, path, langs);
      yield* loc(ex.tr, `${path}.tr`, langs);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value) && isLocalized(value)) yield* loc(value, path, langs);
    else yield* plain(value as Text, path, langs);
  }
  function* blocks(list: Block[], path: string, around: Explain[]): Generator<TopicText> {
    for (const [i, b] of list.entries()) {
      const p = `${path}[${i}]`;
      const langs = scope(b, around);
      switch (b.type) {
        case "prose":
          yield* loc(b.text, `${p}.text`, langs);
          yield* plain(b.ex, `${p}.ex`, langs);
          yield* loc(b.tr, `${p}.tr`, langs);
          break;
        case "list":
          for (const [k, it] of b.items.entries()) {
            const own = scope(it, langs);
            yield* loc(it.text, `${p}.items[${k}].text`, own);
            yield* plain(it.ex, `${p}.items[${k}].ex`, own);
            yield* loc(it.tr, `${p}.items[${k}].tr`, own);
          }
          break;
        case "errors":
          for (const [k, r] of b.rows.entries()) {
            const own = langs.filter((l) => serves(r, l));
            yield* plain(r.wrong, `${p}.rows[${k}].wrong`, own);
            yield* plain(r.right, `${p}.rows[${k}].right`, own);
            yield* loc(r.rule, `${p}.rows[${k}].rule`, own);
          }
          break;
        case "paradigm":
        case "usage":
        case "comparison":
        case "inventory":
          for (const c of b.columns) yield* cell(c.label, `${p}.columns.${c.key}`, scope(c, langs));
          for (const [k, r] of b.rows.entries()) {
            const own = scope(r, langs);
            for (const c of b.columns) yield* cell(r[c.key], `${p}.rows[${k}].${c.key}`, scope(c, own));
            yield* loc(r.tr, `${p}.rows[${k}].tr`, own);
          }
      }
    }
  }
  const langs = [...all];
  yield* loc(topic.title, "title", langs);
  yield* loc(topic.summary.lead, "summary.lead", langs);
  yield* loc(topic.summary.rule, "summary.rule", langs);
  yield* plain(topic.summary.ex, "summary.ex", langs);
  yield* blocks(topic.cheatsheet.content, "cheatsheet.content", langs);
  for (const [i, s] of topic.sections.entries()) {
    const own = scope(s, langs);
    yield* loc(s.title, `sections[${i}].title`, own);
    yield* blocks(s.content, `sections[${i}].content`, own);
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
