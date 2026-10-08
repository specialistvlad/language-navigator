// Text and its marks: every mark reads as its text with the separators and wrappers the renderer
// writes, and a walk meets every string and every mark in the kind of text it sits in.
import { describe, expect, test } from "bun:test";
import type { Mark, Text } from "./lib.ts";
import { foldText, isLocalized, markName, MARKS, plainText, reading, textIn, type TextOutput, varietyName, walkText } from "./text.ts";

const learned = reading("en", true);
const explaining = reading("en", false);
const read = (t: Text, plain = true): string => plainText(t, plain ? learned : explaining);

describe("localized text", () => {
  test("a localized value names explanation languages only", () => {
    expect(isLocalized({ en: "x" })).toBe(true);
    expect(isLocalized({})).toBe(false);
    expect(isLocalized({ target: "x" })).toBe(false);
  });
  test("textIn gives the text of a language, and fails without it", () => {
    expect(textIn({ en: "x" }, "en")).toBe("x");
    expect(() => textIn({}, "en")).toThrow('No "en" text');
  });
  test("a variety has its name", () => {
    expect(varietyName("en-US", "en")).toBe("US");
    expect(varietyName("en-GB", "en")).toBe("British");
  });
});

describe("every mark reads as its text", () => {
  const cases: [Mark, string, string?][] = [
    [{ target: "go" }, "go"],
    [{ aux: "Does" }, "Does"],
    [{ subj: "she" }, "she"],
    [{ verb: "work" }, "work"],
    [{ ending: "s" }, "s"],
    [{ stress: "ˈtea" }, "ˈtea"],
    [{ term: "yet" }, "yet"],
    [{ letter: "b" }, "b"],
    [{ signal: "yesterday" }, "yesterday"],
    [{ sound: "use-ta" }, "use-ta"],
    [{ l1: "ya" }, "ya"],
    [{ date: "July", value: "--07" }, "July"],
    [{ weekday: "Monday", value: 1 }, "Monday"],
    [{ time: "7:05", value: "07:05" }, "7:05"],
    [{ numeral: "seven", value: 7 }, "seven"],
    [{ ordinal: "third", value: 3 }, "third"],
    [{ link: "To be", to: "en.verbs.to-be" }, "To be"],
    [{ ipa: "wɜːks" }, "/wɜːks/"],
    [{ intonation: "rise" }, "↗"],
    [{ intonation: "fall" }, "↘"],
    [{ gap: true }, "…"],
    [{ optional: "that" }, "(that)"],
    [{ slot: "V-ing" }, "V-ing"],
    [{ slot: { en: "clock time" } }, "clock time"],
    [{ gloss: { en: "= your job" } }, "(= your job)", "= your job"],
    [{ gloss: "at the same time" }, "(at the same time)", "at the same time"],
    [{ variant: "on the weekend", variety: "en-US" }, "(US: on the weekend)", "US: on the weekend"],
    [{ alternatives: ["am", "is", "are"] }, "am / is / are"],
    [{ examples: ["I go.", "You go."] }, "I go. / You go."],
    [{ mapping: ["work", "works"] }, "work → works"],
    [{ mapping: ["past simple"], follows: true }, "→ past simple"],
    [{ takes: ["clock times", "at"] }, "clock times → at"],
    [{ exchange: ["Are you tired?", "Yes, I am."] }, "Are you tired? — Yes, I am."],
    [{ pattern: ["be", { slot: "V-ing" }] }, "be + V-ing"],
    [{ pattern: [{ ending: "es" }], follows: true }, "+ es"],
  ];
  test.each(cases.map(([m, plain, explained]) => [m, plain, explained ?? plain] as const))("%j", (m, plain, explained) => {
    expect(read(m)).toBe(plain);
    expect(read(m, false)).toBe(explained);
  });
  test("every mark name has a case", () => {
    const named = new Set(cases.map(([m]) => markName(m)));
    expect([...MARKS].filter((n) => !named.has(n))).toEqual([]);
  });
  test("a mark names one thing; anything else is not a mark", () => {
    expect(markName({ date: "July", value: "--07" })).toBe("date");
    expect(() => markName({ bold: "x" } as unknown as Mark)).toThrow("Not a mark");
    expect(() => markName({ value: 1 } as unknown as Mark)).toThrow("Not a mark");
  });
});

describe("separators", () => {
  test("parts join, and marks nest", () => {
    expect(read(["I'", { target: "m" }, " here."])).toBe("I'm here.");
    expect(read({ target: { ipa: "θɜːˈtiːn" } })).toBe("/θɜːˈtiːn/");
  });
  test("pieces that show a slash of their own join with a middle dot", () => {
    expect(read({ examples: [{ mapping: ["go", { alternatives: ["gone", "been"] }] }, { mapping: ["be", "been"] }] })).toBe(
      "go → gone / been · be → been",
    );
    expect(read({ alternatives: ["5 May", "5/5"] })).toBe("5 May · 5/5");
    expect(
      read({
        examples: [
          ["cups ", { ipa: "kʌps" }],
          ["books ", { ipa: "bʊks" }],
        ],
      }),
    ).toBe("cups /kʌps/ · books /bʊks/");
  });
  test("examples in a summary follow each other as sentences, and only at their own level", () => {
    const summary = { ...learned, sentences: true };
    expect(plainText({ examples: ["Are you a student?", "It is cold."] }, summary)).toBe("Are you a student? It is cold.");
    expect(plainText({ examples: [{ alternatives: ["a", "b"] }, "c"] }, summary)).toBe("a / b c");
  });
});

describe("output", () => {
  test("an output receives each mark with its name", () => {
    const tags: TextOutput<string> = { text: (s) => s, join: (p) => p.join(""), mark: (n, inner) => `<${n}>${inner}</${n}>` };
    expect(foldText(["a ", { target: ["b ", { ending: "s" }] }], tags, learned)).toBe("a <target>b <ending>s</ending></target>");
  });
});

describe("walking text", () => {
  const walk = (t: Text, plain = true): [string, boolean][] => {
    const seen: [string, boolean][] = [];
    walkText(
      t,
      {
        string: (s, p) => seen.push([s, p]),
        mark: (m, p) => seen.push([`<${markName(m)}>`, p]),
      },
      plain,
      "en",
    );
    return seen;
  };
  test("strings and marks, depth first, in their kind of text", () => {
    expect(walk(["a", { target: "b" }])).toEqual([
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
  test("codes, transcriptions and values are data, not text", () => {
    expect(walk({ slot: "V-ing" })).toEqual([["<slot>", true]]);
    expect(walk({ ipa: "kʌp" })).toEqual([["<ipa>", true]]);
    expect(walk({ intonation: "rise" })).toEqual([["<intonation>", true]]);
    expect(walk({ gap: true })).toEqual([["<gap>", true]]);
    expect(walk({ weekday: "Monday", value: 1 })).toEqual([
      ["<weekday>", true],
      ["Monday", true],
    ]);
  });
  test("every piece of a list", () => {
    expect(walk({ mapping: ["a", { target: "b" }] }).map(([s]) => s)).toEqual(["<mapping>", "a", "<target>", "b"]);
  });
});
