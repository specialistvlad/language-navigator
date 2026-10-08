// Reading topic data: which readers an element serves, every text of a topic with where it sits, titles
// and the shape of a table.
import { describe, expect, test } from "bun:test";
import { isTable, shows, tableShape, topicTexts, topicTitle } from "./content.ts";
import type { Block, Topic, TopicRef } from "./lib.ts";
import { SAMPLE } from "./sample-topic.ts";

describe("readers", () => {
  test("an element serves every explanation language, or the ones it lists", () => {
    expect(shows({}, "en")).toBe(true);
    expect(shows({ readers: ["en"] }, "en")).toBe(true);
  });
});

describe("every text of a topic", () => {
  test("each place, with its kind of text", () => {
    const texts = [...topicTexts(SAMPLE, "en")].map((t) => `${t.path} ${t.plain ? "plain" : "explained"} ${JSON.stringify(t.text)}`);
    expect(texts).toEqual([
      'title explained "Sample"',
      'summary.lead explained "Lead."',
      'summary.rule explained "Rule:"',
      'summary.ex plain "Ex."',
      'cheatsheet.content[0].columns.use explained "Use"',
      'cheatsheet.content[0].rows[0].use explained "use"',
      'sections[0].title explained "One"',
      'sections[0].content[0].text explained "Prose."',
      'sections[0].content[0].ex plain "Prose ex."',
      'sections[0].content[0].tr explained "Prose tr."',
      'sections[0].content[1].items[0].text explained "Item."',
      'sections[0].content[1].items[0].ex plain "Item ex."',
      'sections[0].content[1].items[0].tr explained "Item tr."',
      'sections[0].content[2].columns.a plain "a"',
      'sections[0].content[2].columns.b explained "b"',
      'sections[0].content[2].rows[0].a plain "Cell ex."',
      'sections[0].content[2].rows[0].a.tr explained "Cell tr."',
      'sections[0].content[2].rows[0].b explained "cell"',
      'sections[0].content[2].rows[0].tr explained "Row tr."',
      'sections[0].content[3].rows[0].wrong plain "Wrong."',
      'sections[0].content[3].rows[0].right plain "Right."',
      'sections[0].content[3].rows[0].rule explained "Rule."',
    ]);
  });
});

describe("titles", () => {
  const ref = (topic: Topic | null, title?: string): TopicRef =>
    ({ topic, entry: { slug: "past-simple", ...(title === undefined ? {} : { title: { en: title } }) } }) as unknown as TopicRef;
  test("from the topic file, then the curriculum, then the slug", () => {
    expect(topicTitle(ref({ ...SAMPLE, title: { en: ["There is ", { alternatives: ["a", "an"] }] } }), "en")).toBe("There is a / an");
    expect(topicTitle(ref(null, "Past Simple"), "en")).toBe("Past Simple");
    expect(topicTitle(ref(null), "en")).toBe("Past simple");
  });
});

describe("tables", () => {
  const table: Block = {
    type: "paradigm",
    columns: [
      { key: "tense", label: { en: "Tense" } },
      { key: "qh", slot: "aux", features: { interrogativity: "int", polarity: "pos" } },
    ],
    rows: [
      { level: "A1", features: { tense: "prs" }, tense: { en: "Present" }, qh: "Do", tr: { en: "x" } },
      { level: "A1", tense: { en: "Past" }, qh: "Did", tr: {} },
    ],
  };
  test("a table block holds columns", () => {
    expect(isTable(table)).toBe(true);
    expect(isTable({ type: "prose", level: "A1", text: { en: "x" } })).toBe(false);
  });
  test("its shape: columns, rows, a translation column where the languages differ, and slots", () => {
    if (!isTable(table)) throw new Error("fixture");
    expect(tableShape(table, "en", "en")).toMatchObject({ width: 2, translation: false, slots: true });
    expect(tableShape(table, "en", "es")).toMatchObject({ width: 3, translation: true });
  });
});
