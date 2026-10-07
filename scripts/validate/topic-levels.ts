// Levels inside a topic. A section's range runs from its base level to the highest level marked inside
// it; an item carries a level only when it is above the base, so unmarked items are at the base.
import { type Block, filled, levelRange, lv, type Topic } from "../lib.ts";
import { isLocalized } from "../markdown.ts";
import type { Report } from "./report.ts";

// The levels items carry in a list of blocks, and how many items carry none.
function marks(list: Block[]): { levels: string[]; unmarked: number } {
  const levels: string[] = [];
  let unmarked = 0;
  const see = (level: string | undefined): void => {
    if (filled(level)) levels.push(level);
    else unmarked++;
  };
  for (const block of list) {
    // A text block carries no level of its own (topic.schema.json).
    if (block.type === "text") see(undefined);
    if (block.type === "bullets") for (const it of block.items) see(typeof it === "object" && !isLocalized(it) ? it.level : undefined);
    if (block.type === "table") for (const row of block.rows) see(row.level);
    if (block.type === "errors") for (const row of block.rows) see(row.level);
  }
  return { levels, unmarked };
}

export function checkLevels(topic: Topic, where: string, report: Report): void {
  for (const section of topic.sections) {
    const title = `section "${Object.values(section.title)[0] ?? ""}" [${section.level}]`;
    const [base = "", top = base] = section.level.split("-");
    if (section.level.includes("-") && lv(top) <= lv(base)) report(where, `${title}: a range runs from a lower to a higher level`);
    const { levels, unmarked } = marks(section.content);
    for (const level of levels) {
      if (lv(level) <= lv(base)) report(where, `${title}: item marked ${level}; items at the section's base level stay unmarked`);
      else if (lv(level) > lv(top)) report(where, `${title}: item marked ${level} is above the section range`);
    }
    const highest = levels.reduce((h, l) => (lv(l) > lv(h) ? l : h), base);
    if (lv(highest) < lv(top)) report(where, `${title}: the range ends at ${top}, the highest marked item is ${highest}`);
    if (unmarked === 0 && levels.length > 0) report(where, `${title}: every item is marked, so the section starts above ${base}`);
  }
  for (const level of topic.levels) {
    if (!topic.sections.some((s) => levelRange(s.level).includes(level))) report(where, `no section covers level ${level}`);
  }
  // Essentials and reminders hold one level each, so their items carry no level.
  const essentialBlocks = topic.essentials.flatMap((e) => [...(e.content ?? []), ...(e.parts ?? []).flatMap((p) => p.content)]);
  const reminderItems = (topic.reminders ?? []).flatMap((r) => r.items);
  if (marks(essentialBlocks).levels.length > 0) report(where, "essentials items carry a level; each essentials entry is one level");
  if (reminderItems.some((it) => typeof it === "object" && !isLocalized(it) && filled(it.level))) {
    report(where, "reminder items carry a level; each reminder is one level");
  }
}
