// npm run check catches text that is not written in the §12 vocabulary: the inline notation the marks
// replace, a mark left incomplete, and a localized value without a language.
import { describe, expect, test } from "bun:test";
import type { ErrorsBlock, ListBlock, Localized, ProseBlock, Text, Topic } from "../lib.ts";
import { problemsAfter, sampleBlocks } from "../sample-topic.ts";
import { checkText, LEARNED_NOTATION, NOTATION } from "./topic-text.ts";

const problems = (change: (t: Topic) => void): string[] => problemsAfter(change, checkText);
const prose = (t: Topic): ProseBlock => sampleBlocks(t)[0] as ProseBlock;
const list = (t: Topic): ListBlock => sampleBlocks(t)[1] as ListBlock;
const errors = (t: Topic): ErrorsBlock => sampleBlocks(t)[3] as ErrorsBlock;
// Text where explanation text goes, and where text in the language being learned goes.
const explaining =
  (value: Text) =>
  (t: Topic): void => {
    prose(t).text = { en: value };
  };
const learned =
  (value: unknown) =>
  (t: Topic): void => {
    prose(t).ex = value as Text;
  };
const none = {} as Localized;

describe("the sample topic", () => {
  test("passes", () => {
    expect(problems(() => undefined)).toEqual([]);
  });
});

describe("the inline notation the marks replace", () => {
  const samples: Record<string, string> = {
    "**": "a **bold** word",
    "*…*": "an *italic* word",
    "a link": "see [To be](id:en.verbs.to-be)",
    "IPA between slashes": "work /wɜːk/",
    "→": "work → works",
    "US:": "US: on the weekend",
    "↗ or ↘": "Really? ↗",
    "a line break": "one\ntwo",
    " / ": "am / is",
    " + ": "be + V-ing",
    " — ": "Are you? — Yes.",
    "…": "Could you…?",
    "(": "He said (that) he was tired.",
  };
  const sample = (name: string): string => samples[name] ?? "";
  test("has a sample for each rule", () => {
    expect(Object.keys(samples).sort()).toEqual([...NOTATION, ...LEARNED_NOTATION].map(([name]) => name).sort());
  });
  test.each(NOTATION.map(([name]) => [name] as const))("%s in any text", (name) => {
    expect(problems(explaining(sample(name))).join("\n")).toContain(`holds ${name}`);
    expect(problems(learned(sample(name))).join("\n")).toContain(`holds ${name}`);
  });
  test.each(LEARNED_NOTATION.map(([name]) => [name] as const))("%s in the language being learned", (name) => {
    expect(problems(learned(sample(name))).join("\n")).toContain(`holds ${name}`);
    expect(problems(explaining(sample(name)))).toEqual([]);
  });
  test("inside marks, structures, glosses and slots", () => {
    expect(problems(learned({ target: ["a **b**", "c"] })).join("\n")).toContain("holds **");
    expect(problems(learned({ alternatives: ["a / b", "c"] })).join("\n")).toContain("holds  / ");
    expect(problems(learned(["x ", { gloss: { en: "a → b" } }])).join("\n")).toContain("holds →");
    expect(problems(learned({ pattern: ["x", { slot: { en: "a / b" } }] })).join("\n")).toContain("holds  / ");
  });
});

describe("marks are whole", () => {
  test("a list of one piece follows the form under discussion", () => {
    expect(problems(learned({ mapping: ["a"] })).join("\n")).toContain("a mapping of one piece");
    expect(problems(learned({ mapping: ["a"], follows: true }))).toEqual([]);
  });
  test("a gloss in the language being learned is localized", () => {
    expect(problems(learned(["x ", { gloss: "meaning" }])).join("\n")).toContain("a gloss is localized");
    expect(problems(explaining(["x ", { gloss: "meaning" }]))).toEqual([]);
  });
});

describe("every localized value carries each explanation language", () => {
  test("the title, a list item and an error rule", () => {
    expect(
      problems((t) => {
        t.title = none;
      }),
    ).toEqual(['title has no "en" text']);
    expect(
      problems((t) => {
        list(t).items[0] = { type: "rule", level: "A1", text: none };
      }),
    ).toEqual(['sections[0].content[1].items[0].text has no "en" text']);
    expect(
      problems((t) => {
        const [row] = errors(t).rows;
        if (row) row.rule = none;
      }).join("\n"),
    ).toContain('rows[0].rule has no "en" text');
  });
  test("an element for other readers needs only theirs", () => {
    expect(
      problems((t) => {
        list(t).items[0] = { type: "note", level: "A1", text: none, readers: [] };
      }),
    ).toEqual([]);
  });
});
