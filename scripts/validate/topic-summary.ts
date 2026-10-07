// The summary: a lead that stands alone, then the rule to get right, about the language itself.
import { lead } from "../content.ts";
import { EXPLAIN_CODES, filled, LEVELS, type Topic } from "../lib.ts";
import type { Report } from "./report.ts";

const LEAD_CHARS = 160;
const WORDS = 50;
// The rail lists the sections and the badges show the levels; these phrases restate them or only announce.
const PAGE = /\b(the|this) (page|topic)\b|\b(la|esta) página\b|\beste tema\b/i;
const OPENER = /(^|[.!?]\s+)(you need|use it|a learner needs|necesitas|sirve para|se usa para)\b/i;
const LEVEL = new RegExp(`\\b(${LEVELS.join("|")})\\b`);

// The text a reader sees: link labels without their targets, no emphasis marks.
const plain = (text: string): string => text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "");

export function checkSummary(topic: Topic, where: string, report: Report): void {
  for (const l of EXPLAIN_CODES) {
    const text = topic.summary[l];
    if (!filled(text)) continue;
    const path = `summary.${l}`;
    const all = plain(text);
    const first = plain(lead(text));
    if (first.length > LEAD_CHARS) report(where, `${path} first sentence has ${first.length} characters (max ${LEAD_CHARS})`);
    if (!/^[\p{Lu}¿¡]/u.test(first)) report(where, `${path} starts with a lowercase letter`);
    const words = all.split(/\s+/).length;
    if (words > WORDS) report(where, `${path} has ${words} words (max ${WORDS})`);
    const page = PAGE.exec(all);
    if (page) report(where, `${path} describes the page ("${page[0]}"); the rail lists the sections`);
    const opener = OPENER.exec(all);
    if (opener) report(where, `${path} opens a sentence with "${opener[2] ?? ""}"; state the rule itself`);
    const level = LEVEL.exec(all);
    if (level) report(where, `${path} names level ${level[0]}; the badges show the levels`);
  }
}
