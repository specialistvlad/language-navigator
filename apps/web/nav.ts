// The sidebar menu: back to the home page, the track index, and every topic of the track.
import { type CurriculumLanguage, type Explain, localize, topicTitle, type TopicRef } from "../../scripts/lib.ts";
import { ui } from "./layout.ts";
import { firstLevel, sectionRange } from "./parts.ts";
import { escapeHtml } from "./render.ts";
import { homeUrl, topicUrl, trackUrl } from "./urls.ts";

// Sidebar head: back to the home page, where the language is chosen.
export const navHome = (explain: Explain): string =>
  `<a class="nav-home" href="${homeUrl()}">${escapeHtml(ui(explain).chooseLanguage)}</a>`;

export function trackNav(refs: TopicRef[], explain: Explain, lang: CurriculumLanguage, current?: TopicRef): string {
  const t = ui(explain);
  const out = [navHome(explain), `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`];
  for (const section of lang.sections) {
    out.push(`<h4 data-level="${firstLevel(sectionRange(section))}">${escapeHtml(localize(section.title, explain))}</h4>`);
    for (const ref of refs.filter((r) => r.lang === lang.code && r.section === section)) {
      const from = firstLevel(ref.entry.levels);
      const name = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>`;
      if (ref.topic) {
        const on = current === ref ? ' class="on" aria-current="page"' : "";
        out.push(`<a href="${topicUrl(explain, lang, ref)}" data-level="${from}"${on}>${name}</a>`);
      } else {
        out.push(`<div class="todo" data-level="${from}">${name}</div>`);
      }
    }
  }
  return out.join("\n");
}
