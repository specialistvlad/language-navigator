// The text of a topic: every localized value carries each explanation language that renders it, every
// string holds text without the inline notation the marks replace, and every table holds what its type
// names (CONVENTIONS.md §12).
import { isTable, type TableBlock, tableShape, topicTexts } from "../content.ts";
import { isLocalized, LIST_MARKS, markName, walkText } from "../text.ts";
import { type Block, type Cell, EXPLAIN_CODES, type Explain, type Item, type Localized, type Mark, type Topic } from "../lib.ts";
import type { Report } from "./report.ts";

// The inline notation the marks replace: none of it appears in a string.
export const NOTATION: [string, RegExp, string][] = [
  ["**", /\*\*/, "a mark names the bold part: target, aux, term…"],
  ["*…*", /\*[^*\s][^*]*\*/, "a mark names the italic part: term, sound, gloss…"],
  ["a link", /\]\(id:/, "a link mark names the topic"],
  ["IPA between slashes", /(?<![\p{L}\p{N}])\/[^\s/0-9][^/]*\/(?![\p{L}\p{N}])/u, "an ipa mark holds the transcription"],
  ["→", /→/, "a mapping or takes names the pair"],
  ["US:", /\bUS:/, "a variant or the variety attribute names it"],
  ["↗ or ↘", /[↗↘]/, "an intonation mark names it"],
  ["a line break", /\n/, "the renderer breaks lines"],
  [" / ", / \/ /, "alternatives or examples name the pieces"],
  [" + ", /(^|\s)\+ /, "a pattern names the slots"],
];
// In the language being learned, these name structure too.
export const LEARNED_NOTATION: [string, RegExp, string][] = [
  [" — ", / — /, "an exchange names the question and the answer"],
  ["…", /…/, "a gap mark names the open slot"],
  ["(", /\(/, "an optional, gloss or variant mark names the part in parentheses"],
];

// The value each kind of inventory gives its members.
const VALUES: Record<string, (v: unknown) => boolean> = {
  letters: (v) => typeof v === "string" && /^[a-z]$/.test(v),
  sounds: (v) => typeof v === "string" && v.length > 0,
  numbers: (v) => typeof v === "number",
  ordinals: (v) => typeof v === "number" && Number.isInteger(v) && v >= 1,
  days: (v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7,
  months: (v) => typeof v === "string" && /^--(0[1-9]|1[0-2])$/.test(v),
  years: (v) => typeof v === "string" && /^\d{4}$/.test(v),
  dates: (v) => typeof v === "string" && /^--(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v),
  times: (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
};

const ROW_KEYS = new Set(["level", "features", "value", "variety", "readers", "tr"]);

// The explanation languages an element renders in: all, or the ones its readers list.
const scope = (el: { readers?: Explain[] | undefined }, langs: Explain[]): Explain[] => {
  const only = el.readers;
  return only ? langs.filter((l) => only.includes(l)) : langs;
};

// Notation and whole marks, in every text of a topic.
export function checkMarks(topic: Topic, where: string, report: Report): void {
  for (const l of EXPLAIN_CODES) {
    for (const { text, path, plain } of topicTexts(topic, l)) {
      walkText(
        text,
        {
          string(s, learned) {
            for (const [name, re, instead] of [...NOTATION, ...(learned ? LEARNED_NOTATION : [])]) {
              if (re.test(s)) report(where, `${path} holds ${name} in "${s}": ${instead}`);
            }
          },
          mark(m: Mark, learned) {
            const name = markName(m);
            const list = (m as unknown as Record<string, unknown[]>)[name];
            if ((LIST_MARKS as readonly string[]).includes(name) && list?.length === 1 && (m as { follows?: true }).follows !== true) {
              report(where, `${path} has a ${name} of one piece: it needs another, or follows: true`);
            }
            if (name === "gloss" && learned && !isLocalizedValue((m as { gloss: unknown }).gloss)) {
              report(where, `${path} has a gloss in the language being learned: a gloss is localized, { en: … }`);
            }
          },
        },
        plain,
        l,
      );
    }
  }
}

// Every topic a topic links to.
export function links(topic: Topic): string[] {
  const out: string[] = [];
  for (const l of EXPLAIN_CODES) {
    for (const { text, plain } of topicTexts(topic, l)) {
      walkText(
        text,
        {
          mark(m) {
            if (markName(m) === "link") out.push((m as { to: string }).to);
          },
        },
        plain,
        l,
      );
    }
  }
  return out;
}

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
      if (c.slot !== undefined && c.features === undefined) {
        report(where, `${path}.columns.${c.key} holds a slot: its features name its sentence`);
      }
    });
    block.rows.forEach((row, k) => {
      const rowLangs = scope(row, langs);
      for (const key of Object.keys(row)) {
        if (!ROW_KEYS.has(key) && !keys.includes(key)) report(where, `${path}.rows[${k}] has "${key}", which no column holds`);
      }
      for (const c of block.columns) cell(row[c.key] as Cell | undefined, `${path}.rows[${k}].${c.key}`, scope(c, rowLangs));
      need(row.tr, `${path}.rows[${k}].tr`, rowLangs);
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
          need(row.rule, `${p}.rows[${k}].rule`, scope(row, inner));
        });
      }
    });
  };

  const all = EXPLAIN_CODES;
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
