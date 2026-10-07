// Levels inside a topic. Every leaf carries its level (topic.schema.json requires it); a section,
// the cheatsheet and the topic take their ranges from their leaves, and the curriculum entry of a
// written topic leaves its levels to the data.
import { type Topic, type TopicRef } from "../lib.ts";
import { contentRange, inside, join, sectionRange } from "../levels.ts";
import type { Report } from "./report.ts";

const show = (r: { from: string; to: string }): string => (r.from === r.to ? r.from : `${r.from}-${r.to}`);

export function checkLevels(ref: TopicRef, topic: Topic, where: string, report: Report): void {
  if (ref.entry.levels !== undefined) {
    report("curriculum.yaml", `${ref.id}: a written topic takes its levels from its data; remove "levels"`);
  }
  // Every fact of the cheatsheet appears in the sections, so its range sits inside theirs.
  const sheet = contentRange(topic.cheatsheet.content);
  const sections = join(topic.sections.map((s) => sectionRange(s)));
  if (sheet && sections && !inside(sheet, sections)) {
    report(where, `cheatsheet [${show(sheet)}] reaches outside the sections [${show(sections)}]`);
  }
}
