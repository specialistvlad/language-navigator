// Walking text: every string, list of parts and mark, depth first, each with the kind of text it sits in.
import type { Explain, Mark, Part, Text } from "./lib.ts";
import { isLocalized, LIST_MARKS, markName, type MarkName } from "./text.ts";

export interface TextVisitor {
  // A string, in the language being learned (plain) or in explanation text.
  string?: (s: string, plain: boolean) => void;
  // A list of parts.
  parts?: (parts: Part[], plain: boolean) => void;
  mark?: (m: Mark, plain: boolean) => void;
  // A localized gloss or slot without text in a language its text serves.
  missing?: (m: Mark, explain: Explain) => void;
}

// Marks whose text is in the language being learned, wherever they stand: the forms, words, letters
// and values a rule is about.
const LEARNED = new Set<MarkName>([
  "target",
  "aux",
  "subj",
  "verb",
  "ending",
  "stress",
  "term",
  "letter",
  "signal",
  "sound",
  "date",
  "weekday",
  "time",
  "numeral",
  "ordinal",
  "optional",
  "variant",
]);
// Marks whose text is explanation: a phrase in the reader's language, a topic's title.
const EXPLAINING = new Set<MarkName>(["l1", "link"]);

// Walks text that serves the given explanation languages. Codes, transcriptions and values are data, not
// text; a localized gloss or slot is walked in each language, its missing languages reported.
export function walkText(t: Text, visit: TextVisitor, plain: boolean, langs: readonly Explain[]): void {
  if (typeof t === "string") {
    visit.string?.(t, plain);
    return;
  }
  if (Array.isArray(t)) {
    visit.parts?.(t, plain);
    for (const p of t) walkText(p, visit, plain, langs);
    return;
  }
  visit.mark?.(t, plain);
  const name = markName(t);
  const inner = (t as unknown as Record<string, unknown>)[name];
  if (name === "ipa" || name === "intonation" || name === "gap" || (name === "slot" && typeof inner === "string")) return;
  if (typeof inner === "object" && inner !== null && !Array.isArray(inner) && isLocalized(inner)) {
    for (const l of langs) {
      const text: Text | undefined = inner[l];
      if (text === undefined) visit.missing?.(t, l);
      else walkText(text, visit, false, [l]);
    }
    return;
  }
  const own = LEARNED.has(name) ? true : EXPLAINING.has(name) ? false : plain;
  if ((LIST_MARKS as readonly string[]).includes(name)) {
    for (const i of inner as Text[]) walkText(i, visit, own, langs);
    return;
  }
  walkText(inner as Text, visit, own, langs);
}
