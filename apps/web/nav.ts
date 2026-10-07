// The sidebar menu: back to the home page, the track index, and every topic of the track. Sections
// and topics show their level range; the level filter hides those that start above it.
import { type CurriculumLanguage, type Explain, localize, topicTitle, type TopicRef } from "../../scripts/lib.ts";
import { refRange } from "../../scripts/levels.ts";
import { ui } from "./layout.ts";
import { badge, levelAttrs, refsRange } from "./parts.ts";
import { escapeHtml } from "./render.ts";
import { homeUrl, topicUrl, trackUrl } from "./urls.ts";

// Sidebar head: back to the home page, where the language is chosen.
export const navHome = (explain: Explain): string =>
  `<a class="nav-home" href="${homeUrl()}">${escapeHtml(ui(explain).chooseLanguage)}</a>`;

export function trackNav(refs: TopicRef[], explain: Explain, lang: CurriculumLanguage, current?: TopicRef): string {
  const t = ui(explain);
  const out = [navHome(explain), `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`];
  for (const section of lang.sections) {
    const inSection = refs.filter((r) => r.lang === lang.code && r.section === section);
    const range = refsRange(inSection, explain);
    out.push(`<h4${levelAttrs(range)}><span class="name">${escapeHtml(localize(section.title, explain))}</span>${badge(range)}</h4>`);
    for (const ref of inSection) {
      const own = refRange(ref, explain);
      const name = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>${badge(own)}`;
      if (ref.topic) {
        const on = current === ref ? ' class="on" aria-current="page"' : "";
        out.push(`<a href="${topicUrl(explain, lang, ref)}"${levelAttrs(own)}${on}>${name}</a>`);
      } else {
        out.push(`<div class="todo"${levelAttrs(own)}>${name}</div>`);
      }
    }
  }
  return out.join("\n");
}
