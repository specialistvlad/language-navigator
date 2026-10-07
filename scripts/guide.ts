// Assembles a topic's Markdown guide for one explanation language, and its essentials and reminders.
import { type Explain, filled, LEVELS, localize, say, type TopicRef } from "./lib.ts";
import { shows } from "./content.ts";
import { type Ctx, type LinkFn, markdownLinks, renderContent, renderItem } from "./markdown.ts";

// Essentials of one level as Markdown; parts get headings of the given depth.
export function essentialsMarkdown(
  ref: TopicRef,
  explain: Explain,
  refs: TopicRef[],
  level: string,
  depth = 3,
  link: LinkFn = markdownLinks,
): string | null {
  const essentials = ref.topic?.essentials.find((e) => e.level === level);
  if (!essentials) return null;
  const ctx: Ctx = { ref, explain, refs, link };
  const hashes = "#".repeat(depth);
  if (essentials.parts) {
    return essentials.parts.map((part) => `${hashes} ${localize(part.title, explain)}\n\n${renderContent(part.content, ctx)}`).join("\n\n");
  }
  return essentials.content ? renderContent(essentials.content, ctx) : null;
}

// Reminder of one level as a Markdown bullet list.
export function reminderMarkdown(
  ref: TopicRef,
  explain: Explain,
  refs: TopicRef[],
  level: string,
  link: LinkFn = markdownLinks,
): string | null {
  const reminder = ref.topic?.reminders?.find((r) => r.level === level);
  if (!reminder) return null;
  const ctx: Ctx = { ref, explain, refs, link };
  const items = reminder.items.map((i) => renderItem(i, ctx)).filter(filled);
  return items.length > 0 ? items.map((i) => `- ${i}`).join("\n") : null;
}

export function renderGuide(ref: TopicRef, explain: Explain, refs: TopicRef[], link: LinkFn = markdownLinks): string {
  const topic = ref.topic;
  if (!topic) throw new Error(`No topic data for ${ref.id}`);
  const ctx: Ctx = { ref, explain, refs, link };
  const title = topic.title[explain] ?? "";
  const out: string[] = [];

  out.push(
    [
      "---",
      `id: ${topic.id}`,
      `lang: ${topic.lang}`,
      `explain: ${explain}`,
      "type: guide",
      `kind: ${topic.kind}`,
      `title: ${JSON.stringify(title)}`,
      `levels: [${topic.levels.join(", ")}]`,
      `section: ${ref.section.dir}`,
      `order: ${ref.order}`,
      `tags: [${topic.tags.join(", ")}]`,
      `concepts: [${topic.concepts.join(", ")}]`,
      `related: [${topic.related.join(", ")}]`,
      `status: ${topic.status[explain]}`,
      `source: ${ref.path}`,
      "---",
    ].join("\n"),
  );
  out.push(`# ${title}`, `> ${topic.summary[explain] ?? ""}`);

  for (const section of topic.sections) {
    if (!shows(section, explain)) continue;
    out.push(`## ${localize(section.title, explain)} [${section.level}]`, renderContent(section.content, ctx));
  }

  for (const level of LEVELS) {
    const essentials = essentialsMarkdown(ref, explain, refs, level, 3, link);
    if (filled(essentials)) out.push(`## ${say("essentials", explain)} [${level}]`, essentials);
    const reminder = reminderMarkdown(ref, explain, refs, level, link);
    if (filled(reminder)) out.push(`## ${say("reminder", explain)} [${level}]`, reminder);
  }

  return out.filter((block) => block !== "").join("\n\n") + "\n";
}
