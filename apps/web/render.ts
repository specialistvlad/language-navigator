// Markdown → HTML for guides: level badges, level attributes on rows and bullets,
// error tables, scrollable table wrappers and links to unwritten topics.
import MarkdownIt from "markdown-it";
import { INTERFACE, LEVELS } from "../../scripts/lib.ts";

const CODE = `(${LEVELS.join("|")})`;
const TAG = new RegExp(`\\s*\\[${CODE}(?:-${CODE})?\\]\\s*$`);
const BULLET_TAG = new RegExp(`^\\[${CODE}\\]\\s*`);
// Headings and column titles the generator writes, in every explanation language (interface.yaml).
const wording = (key: string) => Object.values(INTERFACE.text[key]);
const ESSENTIALS = wording("essentials");
const REMINDER = wording("reminder");
const LEVEL_COLUMN = wording("levelColumn");

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

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function levelBadge(from: string, to?: string | null): string {
  const label = to && to !== from ? `${from}–${to}` : from;
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
      const m = heading.match(TAG);
      const kind: SectionKind = ESSENTIALS.includes(title) ? "essentials" : REMINDER.includes(title) ? "reminder" : "body";
      current = { heading, title, from: m ? m[1] : null, to: m ? (m[2] ?? m[1]) : null, kind, lines: [] };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else head.push(line);
  }
  const summary = head.find((line) => line.startsWith("> "))?.slice(2).trim() ?? "";
  return { head: head.join("\n"), summary, sections };
}

export function createRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false });

  md.core.ruler.push("navigator", (state) => {
    const tokens = state.tokens;
    const html = (content: string) => {
      const token = new state.Token("html_inline", "", 0);
      token.content = content;
      return token;
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Headings: trailing [A1] / [A1-A2] → badge.
      if (token.type === "heading_open") {
        const inline = tokens[i + 1];
        const last = inline.children?.at(-1);
        const m = last?.type === "text" ? last.content.match(TAG) : null;
        if (m && last) {
          last.content = last.content.replace(TAG, "");
          inline.children!.push(html(levelBadge(m[1], m[2])));
        }
      }

      // Tables: ✗ tables get the errors class; a level column tags each row.
      if (token.type === "table_open") {
        const heads: string[] = [];
        let j = i;
        while (tokens[j].type !== "thead_close") {
          if (tokens[j].type === "inline") heads.push(tokens[j].content.trim());
          j++;
        }
        if (heads[0] === "✗") token.attrJoin("class", "errors");
        const col = heads.findIndex((h) => LEVEL_COLUMN.includes(h));
        if (col >= 0) {
          let row: (typeof tokens)[number] | null = null;
          let cell = -1;
          for (let k = j; tokens[k].type !== "table_close"; k++) {
            const t = tokens[k];
            if (t.type === "tr_open") {
              row = t;
              cell = -1;
            } else if (t.type === "td_open") cell++;
            else if (t.type === "inline" && row && cell === col) {
              const value = t.content.trim();
              if (LEVELS.includes(value)) {
                row.attrSet("data-level", value);
                t.children = [html(levelBadge(value))];
              }
            }
          }
        }
      }

      // Bullets starting with [B1] get a data-level attribute and a badge.
      if (token.type === "list_item_open") {
        const inline = tokens[i + 1]?.type === "inline" ? tokens[i + 1] : tokens[i + 2]?.type === "inline" ? tokens[i + 2] : null;
        const first = inline?.children?.[0];
        const m = first?.type === "text" ? first.content.match(BULLET_TAG) : null;
        if (m && inline && first) {
          token.attrSet("data-level", m[1]);
          first.content = first.content.slice(m[0].length);
          inline.children!.unshift(html(levelBadge(m[1])));
        }
      }

      // <br> inside a table cell (escaped text, since raw HTML is off) becomes a line break.
      if (token.type === "inline" && token.children?.some((c) => c.type === "text" && c.content.includes("<br>"))) {
        token.children = token.children.flatMap((c) =>
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
      if (token.type === "inline" && token.children) {
        const children = token.children;
        for (let k = 0; k < children.length; k++) {
          const child = children[k];
          if (child.type !== "link_open" || child.attrGet("href") !== "#missing") continue;
          const close = children.findIndex((c, n) => n > k && c.type === "link_close");
          children[k] = html('<span class="missing">');
          if (close > 0) children[close] = html("</span>");
        }
      }
    }
  });

  md.renderer.rules.table_open = (tokens, idx, options, _env, self) => '<div class="table-wrap">' + self.renderToken(tokens, idx, options);
  md.renderer.rules.table_close = (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options) + "</div>";
  return md;
}
