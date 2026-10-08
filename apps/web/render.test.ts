// Topic content as HTML: every block renders its leaves with their levels, laid out from what the data
// says each piece holds.
import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import type { Block, TopicRef } from "../../scripts/lib.ts";
import type { Ctx } from "./html.ts";
import { blocksHtml } from "./render.ts";

// A topic in a language other than its readers', so translations show.
const ctx = (lang = "en"): Ctx => ({
  ref: { id: "en.sample.topic", lang } as TopicRef,
  explain: "en",
  refs: [],
  link: () => null,
});

const doc = (blocks: Block[], lang = "en"): Document => parseHTML(`<main>${blocksHtml(blocks, ctx(lang), "A1")}</main>`).document;

describe("every block renders its leaves with their levels", () => {
  test("a paragraph: its text, its example and, for readers of another language, its translation", () => {
    const d = doc([{ type: "prose", level: "A1", text: { en: "Text:" }, ex: [{ target: "Go" }, "."], tr: { en: "Vete." } }], "es");
    expect(d.querySelector("p")?.textContent).toBe("Text: Go. — Vete.");
    expect(d.querySelector("p em")?.getAttribute("data-mark")).toBe("translation");
  });
  test("a list: rules, notes and examples, a note about another variety named first", () => {
    const d = doc([
      {
        type: "list",
        items: [
          { type: "rule", level: "A1", text: { en: "A rule:" }, ex: "Example." },
          { type: "note", level: "A2", variety: "en-US", text: { en: "the past simple is common." } },
          { type: "example", level: "A1", ex: "Only an example." },
          { type: "note", level: "A1", text: { en: "Hidden." }, readers: [] },
        ],
      },
    ]);
    const items = [...d.querySelectorAll("li")];
    expect(items.map((li) => li.getAttribute("data-type"))).toEqual(["rule", "note", "example"]);
    expect(items[1]?.textContent).toBe("A2US: the past simple is common.");
    expect(items[1]?.getAttribute("data-variety")).toBe("en-US");
    expect(items.map((li) => li.getAttribute("data-level"))).toEqual(["A1", "A2", "A1"]);
  });
  test("a list whose items serve other readers renders nothing", () => {
    expect(blocksHtml([{ type: "list", items: [{ type: "rule", level: "A1", text: { en: "x" }, readers: [] }] }], ctx(), "A1")).toBe("");
  });
  test.each(["usage", "comparison"] as const)("a %s table: its columns as they are, a dash in an empty cell", (type) => {
    const d = doc([
      {
        type,
        columns: [
          { key: "a", label: { en: "A" } },
          { key: "b", label: "b" },
        ],
        rows: [{ level: "A1", a: { en: "x" } }],
      },
    ]);
    expect(d.querySelector("table")?.getAttribute("data-type")).toBe(type);
    expect([...d.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["A", "b"]);
    expect([...d.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["x", "—"]);
  });
  test("an inventory: each member carries its value", () => {
    const d = doc([
      { type: "inventory", set: "letters", columns: [{ key: "l", label: "Letter" }], rows: [{ level: "A1", value: "a", l: "A a" }] },
    ]);
    expect(d.querySelector("tbody tr")?.getAttribute("data-value")).toBe("a");
  });
  test("a cell example with its translation, and a row translation, for readers of another language", () => {
    const d = doc(
      [
        {
          type: "comparison",
          columns: [{ key: "a", label: "a" }],
          rows: [
            { level: "A1", a: { ex: "Go.", tr: { en: "Vete." } }, tr: { en: "Row." } },
            { level: "A1", a: "Stay." },
          ],
        },
      ],
      "es",
    );
    expect([...d.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["a", "English"]);
    expect([...d.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent))).toEqual([
      ["Go. — Vete.", "Row."],
      ["Stay.", ""],
    ]);
  });
  test("a slot paradigm: sentences laid out by slot, grouped by sentence, merged and centred but for the subject", () => {
    const sentence = { interrogativity: "int", polarity: "pos" } as const;
    const d = doc([
      {
        type: "paradigm",
        columns: [
          { key: "tense", label: { en: "Tense" } },
          { key: "qh", slot: "aux", features: sentence },
          { key: "qs", slot: "subj", features: sentence },
          { key: "ss", slot: "subj", features: { interrogativity: "decl", polarity: "pos" } },
          { key: "nh", slot: "verb", features: { interrogativity: "decl", polarity: "neg" } },
          { key: "nv", slot: "rest", features: { interrogativity: "decl", polarity: "neg" } },
        ],
        rows: [
          {
            level: "A1",
            features: { tense: "prs" },
            tense: { en: "Present" },
            qh: { aux: "Do" },
            qs: "I",
            ss: "I",
            nh: "don't",
            nv: "go.",
          },
          {
            level: "A1",
            features: { tense: "prs" },
            tense: { en: "Present" },
            qh: { aux: "Do" },
            qs: "you",
            ss: "You",
            nh: "don't",
            nv: "go.",
          },
          { level: "A1", features: { tense: "pst" }, tense: { en: "Past" }, qh: { aux: "Did" }, qs: "I", ss: "I", nh: "didn't" },
        ],
      },
    ]);
    const table = d.querySelector("table");
    expect(table?.getAttribute("class")).toBe("compact");
    expect([...d.querySelectorAll("thead tr:first-child th")].map((th) => th.textContent)).toEqual([
      "Tense",
      "Question",
      "",
      "Statement",
      "",
      "Negative",
    ]);
    expect([...d.querySelectorAll("thead tr:last-child th")].map((th) => th.textContent)).toEqual([
      "Helper",
      "Subject",
      "Subject",
      "Verb",
      "Rest",
    ]);
    expect(d.querySelector("td.key")?.getAttribute("rowspan")).toBe("2");
    expect(d.querySelectorAll("tr.gap-row")).toHaveLength(1);
    expect([...d.querySelectorAll("tbody tr:last-child td")].map((td) => td.textContent)).toContain("");
  });
  test("an errors table: wrong, right and the rule, the rule column only when a row has one", () => {
    const withRule = doc([
      { type: "errors", rows: [{ level: "A1", wrong: "He go.", right: ["He ", { target: "goes" }, "."], rule: { en: "-s" } }] },
    ]);
    expect([...withRule.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["✗", "✓", "Rule"]);
    const without = doc([{ type: "errors", rows: [{ level: "A1", wrong: "a", right: "b" }] }]);
    expect([...without.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["✗", "✓"]);
  });
  test("a block above its section shows its badge; a block that renders nothing drops out", () => {
    const d = doc([{ type: "prose", level: "B1", text: { en: "Later." } }]);
    expect(d.querySelector(".blk-level")).not.toBeNull();
    expect(blocksHtml([{ type: "prose", level: "A1", text: { en: "" } }], ctx(), "A1")).toBe("");
  });
});
