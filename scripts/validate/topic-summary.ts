// The summary: a lead that stands alone, then the rule to get right with its examples, about the language itself.
import { plainText, reading } from "../text.ts";
import { EXPLAIN_CODES, filled, LEVELS, type Text, type Topic } from "../lib.ts";
import type { Report } from "./report.ts";

const LEAD_CHARS = 160;
const WORDS = 50;
// The rail lists the sections and the badges show the levels; these phrases restate them or only announce.
const PAGE = /\b(the|this) (page|topic)\b/i;
const OPENER = /(^|[.!?]\s+)(you need|use it|a learner needs)\b/i;
const LEVEL = new RegExp(`\\b(${LEVELS.join("|")})\\b`);

export function checkSummary(topic: Topic, where: string, report: Report): void {
  const { summary } = topic;
  for (const l of EXPLAIN_CODES) {
    const leadText: Text | undefined = summary.lead[l];
    const ruleText: Text | undefined = summary.rule[l];
    if (leadText === undefined || ruleText === undefined) continue;
    const lead = plainText(leadText, reading(l, false));
    const rule = plainText(ruleText, reading(l, false));
    const examples = summary.ex === undefined ? "" : plainText(summary.ex, { ...reading(l, true), sentences: true });
    const all = [lead, rule, examples].filter(filled).join(" ");
    if (lead.length > LEAD_CHARS) report(where, `summary.lead.${l} has ${lead.length} characters (max ${LEAD_CHARS})`);
    if (!/^\p{Lu}/u.test(lead)) report(where, `summary.lead.${l} starts with a lowercase letter`);
    if (!/[.!?]$/.test(lead) || /[.!?]\s+\p{Lu}/u.test(lead)) report(where, `summary.lead.${l} is one sentence`);
    if (!/^\p{Lu}/u.test(rule)) report(where, `summary.rule.${l} starts with a lowercase letter`);
    const words = all.split(/\s+/).length;
    if (words > WORDS) report(where, `summary.${l} has ${words} words (max ${WORDS})`);
    const page = PAGE.exec(all);
    if (page) report(where, `summary.${l} describes the page ("${page[0]}"); the rail lists the sections`);
    const opener = OPENER.exec(all);
    if (opener) report(where, `summary.${l} opens a sentence with "${opener[2] ?? ""}"; state the rule itself`);
    const level = LEVEL.exec(all);
    if (level) report(where, `summary.${l} names level ${level[0]}; the badges show the levels`);
  }
}
