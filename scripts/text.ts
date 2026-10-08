// Text and its marks (CONVENTIONS.md §12): what each mark is, how text folds into output with its
// separators, and how to walk it.
import { EXPLAIN, type Explain, type Localized, type Mark, say, type Text, type Variety } from "./lib.ts";

export const isLocalized = (value: object): value is Localized =>
  Object.keys(value).length > 0 && Object.keys(value).every((k) => k in EXPLAIN);

// The text of a localized value in an explanation language; npm run check guarantees it exists.
export function textIn(value: Localized, explain: Explain): Text {
  const text: Text | undefined = value[explain];
  if (text === undefined) throw new Error(`No "${explain}" text in ${JSON.stringify(value)}`);
  return text;
}

// ---------- Marks ----------

// Marks that hold text: the renderer shows the text and names what it is.
export const SPAN_MARKS = ["target", "aux", "subj", "verb", "ending", "stress", "term", "letter", "signal", "sound", "l1"] as const;
// Marks that hold text with a value the same in every language.
export const VALUE_MARKS = ["date", "weekday", "time", "numeral", "ordinal"] as const;
// Structures: pieces of text the renderer joins.
export const LIST_MARKS = ["alternatives", "examples", "mapping", "takes", "exchange", "pattern"] as const;
// The other marks.
export const OTHER_MARKS = ["gloss", "ipa", "link", "intonation", "gap", "variant", "slot", "optional"] as const;
export const MARKS = [...SPAN_MARKS, ...VALUE_MARKS, ...LIST_MARKS, ...OTHER_MARKS] as const;
export type MarkName = (typeof MARKS)[number];

// The keys of a mark that are not its name: its value, target, variety or position.
const ATTRIBUTES = new Set(["value", "to", "variety", "follows"]);

export function markName(m: Mark): MarkName {
  const name = Object.keys(m).find((k) => !ATTRIBUTES.has(k));
  if (name === undefined || !(MARKS as readonly string[]).includes(name)) throw new Error(`Not a mark: ${JSON.stringify(m)}`);
  return name as MarkName;
}

// What a list of pieces is joined with. Alternatives and examples whose pieces show a slash of their
// own, IPA included, are joined with a middle dot, so no joining slash stands next to theirs; a list
// that follows the form under discussion opens with its joiner.
const JOINERS: Record<(typeof LIST_MARKS)[number], string> = {
  alternatives: " / ",
  examples: " / ",
  mapping: " → ",
  takes: " → ",
  exchange: " — ",
  pattern: " + ",
};

// ---------- Folding text ----------

// How text becomes output: the HTML renderer and plain text share the separators and wrappers.
export interface TextOutput<T> {
  text(s: string): T;
  join(parts: T[]): T;
  mark(name: MarkName, inner: T, m: Mark): T;
}

export interface FoldContext {
  explain: Explain;
  // Text in the language being learned, or explanation text.
  plain: boolean;
  // How a variety is named: "US".
  variety: (v: Variety) => string;
  // Examples in a summary follow each other as sentences.
  sentences?: boolean;
}

export function foldText<T>(t: Text, out: TextOutput<T>, c: FoldContext): T {
  if (typeof t === "string") return out.text(t);
  if (Array.isArray(t)) return out.join(t.map((p) => foldText(p, out, c)));
  return foldMark(t, out, c);
}

function foldMark<T>(m: Mark, out: TextOutput<T>, c: FoldContext): T {
  const name = markName(m);
  const fold = (t: Text, over: Partial<FoldContext> = {}): T => foldText(t, out, { ...c, ...over });
  const wrap = (inner: T): T => out.mark(name, inner, m);
  const inParens = (inner: T): T => out.join([out.text("("), inner, out.text(")")]);
  switch (name) {
    case "ipa":
      return wrap(out.text(`/${(m as { ipa: string }).ipa}/`));
    case "intonation":
      return wrap(out.text((m as { intonation: string }).intonation === "rise" ? "↗" : "↘"));
    case "gap":
      return wrap(out.text("…"));
    case "slot": {
      const slot = (m as { slot: string | Localized }).slot;
      return wrap(typeof slot === "string" ? out.text(slot) : fold(textIn(slot, c.explain), { plain: false }));
    }
    case "gloss": {
      const g = (m as { gloss: Text | Localized }).gloss;
      const inner = isLocalizedValue(g) ? fold(textIn(g, c.explain), { plain: false }) : fold(g);
      return wrap(c.plain ? inParens(inner) : inner);
    }
    case "optional":
      return wrap(inParens(fold((m as { optional: Text }).optional)));
    case "variant": {
      const v = m as { variant: Text; variety: Variety };
      const inner = out.join([out.text(`${c.variety(v.variety)}: `), fold(v.variant)]);
      return wrap(c.plain ? inParens(inner) : inner);
    }
    case "alternatives":
    case "examples":
    case "mapping":
    case "takes":
    case "exchange":
    case "pattern": {
      const items = (m as unknown as Record<string, Text[]>)[name] ?? [];
      const sep =
        c.sentences === true && name === "examples"
          ? " "
          : (name === "alternatives" || name === "examples") && items.some((i) => showsSlash(i, c))
            ? " · "
            : JOINERS[name];
      const parts: T[] = [];
      if ((m as { follows?: true }).follows === true) parts.push(out.text(sep.trimStart()));
      items.forEach((item, n) => {
        if (n > 0) parts.push(out.text(sep));
        parts.push(fold(item, { sentences: false }));
      });
      return wrap(out.join(parts));
    }
    case "target":
    case "aux":
    case "subj":
    case "verb":
    case "ending":
    case "stress":
    case "term":
    case "letter":
    case "signal":
    case "sound":
    case "l1":
    case "date":
    case "weekday":
    case "time":
    case "numeral":
    case "ordinal":
    case "link":
      return wrap(fold((m as unknown as Record<string, Text>)[name] ?? ""));
  }
}

// A piece that shows a slash of its own: alternatives (go → gone / been), a date (5/5) or IPA (/θɪŋk/).
const showsSlash = (t: Text, c: FoldContext): boolean => plainText(t, c).includes("/");

const isLocalizedValue = (v: Text | Localized): v is Localized => typeof v === "object" && !Array.isArray(v) && isLocalized(v);

const PLAIN: TextOutput<string> = { text: (s) => s, join: (p) => p.join(""), mark: (_n, inner) => inner };

// The text a reader sees, without markup.
export const plainText = (t: Text, c: FoldContext): string => foldText(t, PLAIN, c);

// Every string and every mark in some text, depth first, each with the kind of text it sits in:
// the language being learned (plain) or explanation text. Values, targets and slot codes are data, not text.
export interface TextVisitor {
  string?: (s: string, plain: boolean) => void;
  mark?: (m: Mark, plain: boolean) => void;
}

export function walkText(t: Text, visit: TextVisitor, plain: boolean, explain: Explain): void {
  if (typeof t === "string") {
    visit.string?.(t, plain);
    return;
  }
  if (Array.isArray(t)) {
    for (const p of t) walkText(p, visit, plain, explain);
    return;
  }
  visit.mark?.(t, plain);
  const name = markName(t);
  const inner = (t as unknown as Record<string, unknown>)[name];
  if (name === "ipa" || name === "intonation" || name === "gap") return;
  if (name === "slot" || name === "gloss") {
    if (typeof inner === "string" && name === "slot") return;
    if (typeof inner === "object" && inner !== null && !Array.isArray(inner) && isLocalized(inner)) {
      walkText(textIn(inner, explain), visit, false, explain);
      return;
    }
  }
  if ((LIST_MARKS as readonly string[]).includes(name)) {
    for (const i of inner as Text[]) walkText(i, visit, plain, explain);
    return;
  }
  walkText(inner as Text, visit, plain, explain);
}

// A variety's name in an explanation language: "US".
export const varietyName = (v: Variety, explain: Explain): string => say(v === "en-US" ? "varietyUs" : "varietyGb", explain);

// How text reads in an explanation language: in the language being learned (plain) or explaining it.
export const reading = (explain: Explain, plain: boolean): FoldContext => ({ explain, plain, variety: (v) => varietyName(v, explain) });
