// Level ranges. Every leaf of a topic carries its level: a table row, an errors row, a bullet, a text
// block. Blocks, sections, cheatsheets and topics take the range of the leaves under them, and a
// curriculum section the range of its topics; nothing above a leaf stores a level.
import { shows } from "./content.ts";
import { type Block, type Explain, isLevel, type Level, LEVELS, lv, type Section, type Topic, type TopicRef } from "./lib.ts";

export interface Range {
  from: Level;
  to: Level;
}

// The range of some levels; null when there are none.
export function span(levels: Iterable<Level>): Range | null {
  let range: Range | null = null;
  for (const l of levels) {
    if (range === null) range = { from: l, to: l };
    else range = { from: lv(l) < lv(range.from) ? l : range.from, to: lv(l) > lv(range.to) ? l : range.to };
  }
  return range;
}

// The range covering several ranges; null when none has levels.
export const join = (ranges: (Range | null)[]): Range | null => span(ranges.flatMap((r) => (r === null ? [] : [r.from, r.to])));

// "A1" or "A1-B1": the form ranges take in curriculum.yaml.
export function parseRange(text: string | undefined): Range | null {
  const [from = "", to = from] = (text ?? "").split("-");
  return isLevel(from) && isLevel(to) && lv(from) <= lv(to) ? { from, to } : null;
}

export const contains = (range: Range, level: string): boolean => lv(level) >= lv(range.from) && lv(level) <= lv(range.to);
export const inside = (inner: Range, outer: Range): boolean => contains(outer, inner.from) && contains(outer, inner.to);

// The leaves of a block that render in an explanation language, or in any when none is given: a
// paragraph, a list item, a table row, an errors row.
const visible = (el: { readers?: Explain[] | undefined }, explain?: Explain): boolean => explain === undefined || shows(el, explain);
export function leaves(block: Block, explain?: Explain): { level: Level }[] {
  if (!visible(block, explain)) return [];
  switch (block.type) {
    case "prose":
      return [block];
    case "list":
      return block.items.filter((it) => visible(it, explain));
    case "paradigm":
    case "usage":
    case "comparison":
    case "inventory":
    case "errors":
      return (block.rows as { level: Level; readers?: Explain[] }[]).filter((r) => visible(r, explain));
    default:
      return unknownBlock(block);
  }
}

const unknownBlock = (block: never): never => {
  throw new Error(`Unknown block ${JSON.stringify(block)}`);
};

export const blockRange = (block: Block, explain?: Explain): Range | null => span(leaves(block, explain).map((l) => l.level));
export const contentRange = (content: Block[], explain?: Explain): Range | null => join(content.map((b) => blockRange(b, explain)));
export const sectionRange = (section: Section, explain?: Explain): Range | null =>
  visible(section, explain) ? contentRange(section.content, explain) : null;

// A topic covers its cheatsheet and its sections.
export const topicRange = (topic: Topic, explain?: Explain): Range | null =>
  join([contentRange(topic.cheatsheet.content, explain), ...topic.sections.map((s) => sectionRange(s, explain))]);

// The levels a topic holds, lowest first: the levels of the leaves of its cheatsheet and sections.
export function topicLevels(topic: Topic, explain?: Explain): Level[] {
  const blocks = [...topic.cheatsheet.content, ...topic.sections.filter((s) => visible(s, explain)).flatMap((s) => s.content)];
  const held = new Set(blocks.flatMap((b) => leaves(b, explain).map((l) => l.level)));
  return LEVELS.filter((l) => held.has(l));
}

// A curriculum topic: its data when written, its planned range otherwise.
export const refRange = (ref: TopicRef, explain?: Explain): Range | null =>
  ref.topic ? topicRange(ref.topic, explain) : parseRange(ref.entry.levels);

// The leaves of some blocks up to a level; a block left without leaves drops out.
export function upTo(content: Block[], level: Level): Block[] {
  const fits = (it: { level: Level }): boolean => lv(it.level) <= lv(level);
  return content.flatMap((b): Block[] => {
    switch (b.type) {
      case "prose":
        return fits(b) ? [b] : [];
      case "list": {
        const items = b.items.filter(fits);
        return items.length > 0 ? [{ ...b, items }] : [];
      }
      case "paradigm":
      case "usage":
      case "comparison":
      case "inventory": {
        const rows = b.rows.filter(fits);
        return rows.length > 0 ? [{ ...b, rows }] : [];
      }
      case "errors": {
        const rows = b.rows.filter(fits);
        return rows.length > 0 ? [{ ...b, rows }] : [];
      }
      default:
        return unknownBlock(b);
    }
  });
}
