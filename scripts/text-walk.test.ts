// Walking text meets every string, list of parts and mark in the kind of text it sits in, and every
// language a localized gloss or slot owes.
import { describe, expect, test } from "bun:test";
import type { Explain, Mark, Text } from "./lib.ts";
import { markName } from "./text.ts";
import { walkText } from "./text-walk.ts";

const walk = (t: Text, plain = true, langs: Explain[] = ["en"]): [string, boolean][] => {
  const seen: [string, boolean][] = [];
  walkText(
    t,
    {
      string: (s, p) => seen.push([s, p]),
      mark: (m, p) => seen.push([`<${markName(m)}>`, p]),
      parts: (parts, p) => seen.push([`[${String(parts.length)}]`, p]),
      missing: (m: Mark, l) => seen.push([`no ${l} in <${markName(m)}>`, false]),
    },
    plain,
    langs,
  );
  return seen;
};

describe("walking text", () => {
  test("strings, lists of parts and marks, depth first, in their kind of text", () => {
    expect(walk(["a", { target: "b" }])).toEqual([
      ["[2]", true],
      ["a", true],
      ["<target>", true],
      ["b", true],
    ]);
    expect(walk({ gloss: { en: "meaning" } })).toEqual([
      ["<gloss>", true],
      ["meaning", false],
    ]);
    expect(walk({ slot: { en: "clock time" } })).toEqual([
      ["<slot>", true],
      ["clock time", false],
    ]);
    expect(walk({ gloss: "meaning" }, false)).toEqual([
      ["<gloss>", false],
      ["meaning", false],
    ]);
  });
  test("the text of a form, a word or a value is in the language being learned wherever it stands", () => {
    expect(walk({ term: "Could you" }, false)).toEqual([
      ["<term>", false],
      ["Could you", true],
    ]);
    expect(walk({ date: "July", value: "--07" }, false)).toEqual([
      ["<date>", false],
      ["July", true],
    ]);
  });
  test("a link's title and a phrase in the reader's language are explanation text", () => {
    expect(walk({ link: "To be", to: "en.verbs.to-be" })).toEqual([
      ["<link>", true],
      ["To be", false],
    ]);
    expect(walk({ l1: "ya" })).toEqual([
      ["<l1>", true],
      ["ya", false],
    ]);
  });
  test("codes, transcriptions and values are data, not text", () => {
    expect(walk({ slot: "V-ing" })).toEqual([["<slot>", true]]);
    expect(walk({ ipa: "kʌp" })).toEqual([["<ipa>", true]]);
    expect(walk({ intonation: "rise" })).toEqual([["<intonation>", true]]);
    expect(walk({ gap: true })).toEqual([["<gap>", true]]);
  });
  test("every piece of a list", () => {
    expect(walk({ mapping: ["a", { target: "b" }] }).map(([s]) => s)).toEqual(["<mapping>", "a", "<target>", "b"]);
  });
});

describe("the languages a localized gloss or slot owes", () => {
  const uk = "uk" as Explain;
  test("each language the text serves, one at a time; a missing one is reported", () => {
    expect(walk({ gloss: { en: "meaning" } }, true, ["en", uk])).toEqual([
      ["<gloss>", true],
      ["meaning", false],
      ["no uk in <gloss>", false],
    ]);
  });
  test("text that serves no other language owes none", () => {
    expect(walk({ slot: { en: "clock time" } }, true, ["en"])).toEqual([
      ["<slot>", true],
      ["clock time", false],
    ]);
    expect(walk({ gloss: { en: "meaning" } }, true, [])).toEqual([["<gloss>", true]]);
  });
});
