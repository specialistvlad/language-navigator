// Markdown → HTML for guides: level badges, level attributes on rows and bullets,
// error tables, scrollable table wrappers and links to unwritten topics.
import MarkdownIt from "markdown-it";
import { EXPLAIN_CODES, filled, INTERFACE, LEVELS } from "../../scripts/lib.ts";

const CODE = `(${LEVELS.join("|")})`;
const TAG = new RegExp(`\\s*\\[${CODE}(?:-${CODE})?\\]\\s*$`);
const BULLET_TAG = new RegExp(`^\\[${CODE}\\]\\s*`);
// Headings and column titles the generator writes, in every explanation language (interface.yaml).
const wording = (key: string): string[] => {
  const text = INTERFACE.text[key];
  return text ? EXPLAIN_CODES.map((e) => text[e]) : [];
};
const ESSENTIALS = wording("essentials");
const REMINDER = wording("reminder");

export type SectionKind = "essentials" | "reminder" | "body";

export interface DocSection {
  heading: string;
  title: string;
  from: string | null;
  to: string | null;
  kind: SectionKind;
  lines: string[];
}

export interface Doc {
  head: string;
  summary: string;
  sections: DocSection[];
}

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

export function levelBadge(from: string, to?: string | null): string {
  const label = filled(to) && to !== from ? `${from}–${to}` : from;
  return `<span class="badge lvl lvl-${from}">${label}</span>`;
}

export function splitDoc(text: string): Doc {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const head: string[] = [];
  const sections: DocSection[] = [];
  let current: DocSection | null = null;
  for (const line of body.split("\n")) {
    if (line.startsWith("## ")) {
      const heading = line.slice(3);
      const title = heading.replace(TAG, "");
      const m = TAG.exec(heading);
      const kind: SectionKind = ESSENTIALS.includes(title) ? "essentials" : REMINDER.includes(title) ? "reminder" : "body";
      const from = m?.[1] ?? null;
      current = { heading, title, from, to: m?.[2] ?? from, kind, lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else head.push(line);
  }
  const summary =
    head
      .find((line) => line.startsWith("> "))
      ?.slice(2)
      .trim() ?? "";
  return { head: head.join("\n"), summary, sections };
}

export function createRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false });

  md.core.ruler.push("navigator", (state) => {
    const tokens = state.tokens;
    const html = (content: string): (typeof tokens)[number] => {
      const token = new state.Token("html_inline", "", 0);
      token.content = content;
      return token;
    };

    for (const [i, token] of tokens.entries()) {
      // Headings: trailing [A1] / [A1-A2] → badge.
      if (token.type === "heading_open") {
        const inline = tokens[i + 1];
        const last = inline?.children?.at(-1);
        const m = last?.type === "text" ? TAG.exec(last.content) : null;
        const from = m?.[1];
        if (last && from !== undefined) {
          last.content = last.content.replace(TAG, "");
          inline?.children?.push(html(levelBadge(from, m?.[2])));
        }
      }

      // Tables: ✗ tables get the errors class; a level column tags each row.
      if (token.type === "table_open") {
        const heads: string[] = [];
        let j = i;
        for (; j < tokens.length; j++) {
          const t = tokens[j];
          if (!t || t.type === "thead_close") break;
          if (t.type === "inline") heads.push(t.content.trim());
        }
        if (heads[0] === "✗") token.attrJoin("class", "errors");
        // A row whose first cell opens with [A2] gets a data-level attribute and a badge.
        let row: (typeof tokens)[number] | null = null;
        let cell = -1;
        for (let k = j; k < tokens.length; k++) {
          const t = tokens[k];
          if (!t || t.type === "table_close") break;
          if (t.type === "tr_open") {
            row = t;
            cell = -1;
          } else if (t.type === "td_open") cell++;
          else if (t.type === "inline" && row !== null && cell === 0) {
            const first = t.children?.[0];
            const m = first?.type === "text" ? BULLET_TAG.exec(first.content) : null;
            const level = m?.[1];
            if (m && first && level !== undefined) {
              row.attrSet("data-level", level);
              first.content = first.content.slice(m[0].length);
              t.children?.unshift(html(levelBadge(level)));
            }
          }
        }
      }

      // Bullets starting with [B1] get a data-level attribute and a badge.
      if (token.type === "list_item_open") {
        const inline = [tokens[i + 1], tokens[i + 2]].find((t) => t?.type === "inline");
        const first = inline?.children?.[0];
        const m = first?.type === "text" ? BULLET_TAG.exec(first.content) : null;
        const level = m?.[1];
        if (m && first && level !== undefined) {
          token.attrSet("data-level", level);
          first.content = first.content.slice(m[0].length);
          inline.children?.unshift(html(levelBadge(level)));
        }
      }

      // <br> inside a table cell (escaped text, since raw HTML is off) becomes a line break.
      const breaks = token.children;
      if (token.type === "inline" && breaks?.some((c) => c.type === "text" && c.content.includes("<br>")) === true) {
        token.children = breaks.flatMap((c) =>
          c.type === "text" && c.content.includes("<br>")
            ? c.content.split("<br>").flatMap((part, n) => {
                const t = new state.Token("text", "", 0);
                t.content = part;
                return n === 0 ? [t] : [html("<br>"), t];
              })
            : [c],
        );
      }

      // Links to topics without a page yet ("#missing") become plain marked text.
      const children = token.children;
      if (token.type === "inline" && children) {
        for (const [k, child] of children.entries()) {
          if (child.type !== "link_open" || child.attrGet("href") !== "#missing") continue;
          const close = children.findIndex((c, n) => n > k && c.type === "link_close");
          children[k] = html('<span class="missing">');
          if (close > 0) children[close] = html("</span>");
        }
      }
    }
  });

  md.renderer.rules["table_open"] = (tokens, idx, options, _env, self) =>
    '<div class="table-wrap">' + self.renderToken(tokens, idx, options);
  md.renderer.rules["table_close"] = (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options) + "</div>";
  return md;
}
