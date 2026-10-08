// npm run check catches text that is not written in the §12 vocabulary: the inline notation the marks
// replace, a mark left incomplete, and a localized value without a language.
import { describe, expect, test } from "bun:test";
import type { ErrorsBlock, ListBlock, Localized, ProseBlock, Text, Topic } from "../lib.ts";
import { problemsAfter, sampleBlocks } from "../sample-topic.ts";
import { LEARNED_NOTATION, NOTATION } from "./notation.ts";
import { checkText } from "./topic-text.ts";

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
    " · ": "1,500 · 2.5",
    " ≠ ": "th ≠ t",
    " | ": "19 | 99",
    "a run of spaces": "-tion  -sion",
    " = ": "Ana's tired = Ana is tired.",
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
  test("+ at the start reads as a pattern, and the signs + − ? after a comma read as signs", () => {
    expect(problems(explaining("+ es")).join("\n")).toContain("holds  + ");
    expect(problems(explaining("singular countable, + and ?"))).toEqual([]);
    expect(problems(explaining("plural, + − ?"))).toEqual([]);
  });
  test("↘ as well as ↗", () => {
    expect(problems(explaining("Really? ↘")).join("\n")).toContain("holds ↗ or ↘");
  });
  test("inside a form an explanation discusses, the notation of the language being learned", () => {
    expect(problems(explaining(["Use ", { term: "Could you…?" }, "."])).join("\n")).toContain("holds …");
    expect(problems(explaining(["Use ", { term: ["Could you", { gap: true }, "?"] }, "."]))).toEqual([]);
  });
  test("inside marks, structures, glosses and slots", () => {
    expect(problems(learned({ target: ["a **b**", "c"] })).join("\n")).toContain("holds **");
    expect(problems(learned({ alternatives: ["a / b", "c"] })).join("\n")).toContain("holds  / ");
    expect(problems(learned(["x ", { gloss: { en: "a → b" } }])).join("\n")).toContain("holds →");
    expect(problems(learned({ pattern: ["x", { slot: { en: "a / b" } }] })).join("\n")).toContain("holds  / ");
  });
});

describe("marks are whole", () => {
  test("a list of parts holds a mark", () => {
    expect(problems(learned(["a ", "b"])).join("\n")).toContain("a list of plain strings");
  });
  test("a date is one the calendar holds", () => {
    expect(problems(learned({ date: "30 February", value: "--02-30" })).join("\n")).toContain("a date with no such day: --02-30");
    expect(problems(learned({ date: "29 February 2023", value: "2023-02-29" })).join("\n")).toContain("no such day");
    expect(problems(learned({ date: "29 February 2024", value: "2024-02-29" }))).toEqual([]);
    expect(problems(learned({ date: "July", value: "--07" }))).toEqual([]);
    expect(problems(learned({ date: "2026", value: "2026" }))).toEqual([]);
    expect(problems(learned({ date: "?", value: "--13" })).join("\n")).toContain("no such day");
    expect(problems(learned({ date: "?", value: "July" })).join("\n")).toContain("no such day");
  });
  test("a list of one piece follows the form under discussion", () => {
    expect(problems(learned({ mapping: ["a"] })).join("\n")).toContain("a mapping of one piece");
    expect(problems(learned({ mapping: ["a"], follows: true }))).toEqual([]);
  });
  test("a localized gloss or slot carries each explanation language its text serves", () => {
    expect(problems(learned(["x ", { gloss: {} }])).join("\n")).toContain('has a gloss with no "en" text');
    expect(problems(learned({ pattern: ["x", { slot: {} }] })).join("\n")).toContain('has a slot with no "en" text');
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
