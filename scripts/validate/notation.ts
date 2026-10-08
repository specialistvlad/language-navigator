// The marks of a topic's text: no string holds the inline notation the marks replace, every mark is whole,
// every value is a real one, and every localized gloss or slot carries the languages its text serves.
import { topicTexts } from "../content.ts";
import { EXPLAIN_CODES, type Localized, type Mark, type Topic } from "../lib.ts";
import { isLocalized, LIST_MARKS, markName } from "../text.ts";
import { walkText } from "../text-walk.ts";
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
  [" + ", /[\p{L}\p{N}] \+ [\p{L}\p{N}]|^\+ \S/u, "a pattern names the slots"],
  [" · ", /\s·\s/, "examples or alternatives name the pieces"],
  [" ≠ ", /≠/, "a contrast names the pieces"],
  [" | ", /\s\|\s/, "a structure names the pieces"],
  ["a run of spaces", /\S {2,}\S/, "one space, or a structure that names the pieces"],
];
// In the language being learned, these name structure too.
export const LEARNED_NOTATION: [string, RegExp, string][] = [
  [" — ", / — /, "an exchange names the question and the answer"],
  ["…", /…/, "a gap mark names the open slot"],
  ["(", /\(/, "an optional, gloss or variant mark names the part in parentheses"],
  [" = ", / = /, "an equivalence names the forms that mean the same"],
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// An ISO 8601 date a calendar holds: 2026, 2026-07, 2026-07-03, --07, --07-03; 29 February in leap years.
export function validDate(value: string): boolean {
  const m = /^(?:(\d{4})(?:-(\d\d)(?:-(\d\d))?)?|--(\d\d)(?:-(\d\d))?)$/.exec(value);
  if (m === null) return false;
  const month = Number(m[2] ?? m[4] ?? "1");
  const day = m[3] ?? m[5];
  if (month < 1 || month > 12) return false;
  if (day === undefined) return true;
  const year = m[1] === undefined ? undefined : Number(m[1]);
  const leap = year === undefined || (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  const max = month === 2 && !leap ? 28 : (DAYS_IN_MONTH[month - 1] ?? 31);
  return Number(day) >= 1 && Number(day) <= max;
}

const isLocalizedValue = (v: unknown): v is Localized => typeof v === "object" && v !== null && !Array.isArray(v) && isLocalized(v);

export function checkMarks(topic: Topic, where: string, report: Report): void {
  for (const { text, path, plain, langs } of topicTexts(topic, EXPLAIN_CODES)) {
    walkText(
      text,
      {
        string(s, learned) {
          for (const [name, re, instead] of [...NOTATION, ...(learned ? LEARNED_NOTATION : [])]) {
            if (re.test(s)) report(where, `${path} holds ${name} in "${s}": ${instead}`);
          }
        },
        parts(parts) {
          if (parts.every((p) => typeof p === "string")) {
            report(where, `${path} is a list of plain strings: text without marks is one string`);
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
          if (name === "date" && !validDate(String((m as { value: unknown }).value))) {
            report(where, `${path} has a date with no such day: ${String((m as { value: unknown }).value)}`);
          }
        },
        missing(m, l) {
          report(where, `${path} has a ${markName(m)} with no "${l}" text`);
        },
      },
      plain,
      langs,
    );
  }
}

// Every topic a topic links to, once.
export function links(topic: Topic): string[] {
  const out = new Set<string>();
  for (const { text, plain, langs } of topicTexts(topic, EXPLAIN_CODES)) {
    walkText(
      text,
      {
        mark(m) {
          if (markName(m) === "link") out.add((m as { to: string }).to);
        },
      },
      plain,
      langs,
    );
  }
  return [...out];
}
