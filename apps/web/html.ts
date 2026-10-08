// Text as HTML: escaping, and the marks of the data as elements that name what each piece is
// (CONVENTIONS.md §12): bold for a form or a word a rule is about, italics for a sound or a meaning.
import { type Explain, type Localized, type Mark, type Text, type TopicRef } from "../../scripts/lib.ts";
import { foldText, type MarkName, reading, textIn, type TextOutput } from "../../scripts/text.ts";

// Turns a topic ID into a page URL; null marks a topic without a page yet.
export type LinkFn = (target: TopicRef | undefined, explain: Explain, from: TopicRef) => string | null;

// One topic rendered in one explanation language.
export interface Ctx {
  ref: TopicRef;
  explain: Explain;
  refs: TopicRef[];
  link: LinkFn;
}

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

// Marks shown in bold, as the form or word a rule is about; marks shown in italics, as a sound or a meaning.
export const STRONG = new Set<MarkName>(["target", "aux", "subj", "verb", "ending", "stress", "term", "letter", "signal"]);
export const EMPHASIS = new Set<MarkName>(["sound", "l1", "gloss"]);

function htmlOutput(ctx: Ctx): TextOutput<string> {
  return {
    text: escapeHtml,
    join: (parts) => parts.join(""),
    mark(name: MarkName, inner: string, m: Mark): string {
      const attrs = ` data-mark="${name}"`;
      if (STRONG.has(name)) return `<strong${attrs}>${inner}</strong>`;
      if (EMPHASIS.has(name)) return `<em${attrs}>${inner}</em>`;
      if (name === "link") {
        const to = (m as { to: string }).to;
        const href = ctx.link(
          ctx.refs.find((r) => r.id === to),
          ctx.explain,
          ctx.ref,
        );
        return href === null ? `<span class="missing"${attrs}>${inner}</span>` : `<a href="${href}"${attrs}>${inner}</a>`;
      }
      const value = (m as { value?: string | number }).value;
      const variety = (m as { variety?: string }).variety;
      const extra =
        (value === undefined ? "" : ` data-value="${escapeHtml(String(value))}"`) +
        (variety === undefined ? "" : ` data-variety="${variety}"`);
      return `<span${attrs}${extra}>${inner}</span>`;
    },
  };
}

// Text in the language being learned (plain) or explaining it; examples in a summary read as sentences.
export function inline(value: Text, ctx: Ctx, plain: boolean, sentences = false): string {
  return foldText(value, htmlOutput(ctx), { ...reading(ctx.explain, plain), sentences });
}

// Explanation text in the reader's language.
export const explained = (value: Localized | undefined, ctx: Ctx): string =>
  value === undefined ? "" : inline(textIn(value, ctx.explain), ctx, false);
// Text in the language being learned.
export const learned = (value: Text | undefined, ctx: Ctx): string => (value === undefined ? "" : inline(value, ctx, true));

// A translation into the reader's language, when it differs from the language being learned.
export function translation(tr: Localized | undefined, ctx: Ctx): string {
  const value = ctx.explain === ctx.ref.lang || tr === undefined ? undefined : tr[ctx.explain];
  return value === undefined ? "" : ` — <em data-mark="translation">${inline(value, ctx, false)}</em>`;
}
