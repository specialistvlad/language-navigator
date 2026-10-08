// A small topic for tests: every block type, and text in every place a topic holds it.
import type { Topic } from "./lib.ts";
import type { Report } from "./validate/report.ts";

export const SAMPLE: Topic = {
  id: "en.sample.topic",
  lang: "en",
  kind: "grammar",
  tags: [],
  concepts: [],
  related: [],
  status: { en: "draft" },
  title: { en: "Sample" },
  summary: { lead: { en: "Lead." }, rule: { en: "Rule:" }, ex: "Ex." },
  cheatsheet: {
    content: [{ type: "usage", columns: [{ key: "use", label: { en: "Use" } }], rows: [{ level: "A1", use: { en: "use" } }] }],
  },
  sections: [
    {
      title: { en: "One" },
      role: "own",
      content: [
        { type: "prose", level: "A1", text: { en: "Prose." }, ex: "Prose ex.", tr: { en: "Prose tr." } },
        { type: "list", items: [{ type: "rule", level: "A1", text: { en: "Item." }, ex: "Item ex.", tr: { en: "Item tr." } }] },
        {
          type: "comparison",
          columns: [
            { key: "a", label: "a" },
            { key: "b", label: { en: "b" } },
          ],
          rows: [{ level: "A2", a: { ex: "Cell ex.", tr: { en: "Cell tr." } }, b: { en: "cell" }, tr: { en: "Row tr." } }],
        },
        { type: "errors", rows: [{ level: "A1", wrong: "Wrong.", right: "Right.", rule: { en: "Rule." } }] },
      ],
    },
  ],
};

// The problems a check finds in the sample topic after a change.
export function problemsAfter(change: (t: Topic) => void, check: (topic: Topic, where: string, report: Report) => void): string[] {
  const topic = structuredClone(SAMPLE);
  change(topic);
  const out: string[] = [];
  check(topic, "sample", (_where, message) => out.push(message));
  return out;
}

// The blocks of the sample's one section.
export const sampleBlocks = (t: Topic): Topic["sections"][number]["content"] => t.sections[0]?.content ?? [];
