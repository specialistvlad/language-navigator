// Static site build: every page of every track rendered to HTML, plus sitemap and robots.txt.
// Run: npm run build   (SITE_URL sets the public URL for canonical links and the sitemap; the site is served from the domain root)
import { join } from "node:path";
import { type CurriculumLanguage, filled, loadCurriculum, loadTopics, localize, ROOT, type TopicRef } from "../../scripts/lib.ts";
import { type BuildOptions, type Context, EXPLAINS, type Page } from "./context.ts";
import { studyPath } from "./path.ts";
import { ui } from "./layout.ts";
import { writeSite } from "./output.ts";
import { creditsPage } from "./pages/credits.ts";
import { homePage, notFoundPage } from "./pages/home.ts";
import { sheetPages } from "./pages/sheets.ts";
import { topicPages } from "./pages/topic.ts";
import type { LinkFn } from "./html.ts";
import { trackIndex } from "./pages/track.ts";
import { topicUrl } from "./urls.ts";

export type { BuildOptions } from "./context.ts";

export async function build(o: BuildOptions): Promise<number> {
  const curriculum = await loadCurriculum();
  const refs = await loadTopics(curriculum);
  const langs = new Map<string, CurriculumLanguage>(curriculum.languages.map((l) => [l.code, l]));
  const langOf = (ref: TopicRef): CurriculumLanguage => {
    const lang = langs.get(ref.lang);
    if (lang === undefined) throw new Error(`${ref.id}: language "${ref.lang}" is not in curriculum.yaml`);
    return lang;
  };
  // Readers see enabled languages only; links into a disabled one stay plain text.
  const link: LinkFn = (target, explain) => (target?.topic && langOf(target).enabled ? topicUrl(explain, langOf(target), target) : null);
  const pages: Page[] = [];
  const ctx: Context = {
    o,
    refs,
    link,
    languages: curriculum.languages.filter((l) => l.enabled),
    add: (path, html, sitemap = true) => {
      pages.push({ path, html, sitemap });
    },
  };

  homePage(ctx);
  creditsPage(ctx);
  for (const lang of ctx.languages) {
    const langRefs = refs.filter((r) => r.lang === lang.code);
    const written = langRefs.filter((r) => r.topic);
    for (const explain of EXPLAINS) {
      const t = ui(explain);
      const path = studyPath(lang, explain, langRefs);
      const track = { ctx, lang, explain, t, title: t.track(localize(lang.name, explain)), langRefs, written, path };
      trackIndex(track);
      topicPages(track);
      sheetPages(track);
    }
  }
  notFoundPage(ctx);

  await writeSite(pages, o);
  return pages.length;
}

if (import.meta.main) {
  const siteUrl = (process.env["SITE_URL"] ?? "http://127.0.0.1:47380").replace(/\/$/, "");
  // UMAMI_WEBSITE_ID turns analytics on; UMAMI_SCRIPT_URL points at a self-hosted or proxied script.
  const websiteId = process.env["UMAMI_WEBSITE_ID"];
  const src = process.env["UMAMI_SCRIPT_URL"];
  const umami = filled(websiteId) ? { websiteId, src: filled(src) ? src : "https://cloud.umami.is/script.js" } : undefined;
  const count = await build({ outDir: join(ROOT, "build/web"), dev: false, siteUrl, ...(umami && { umami }) });
  console.log(`built ${count} pages into build/web/ for ${siteUrl}${umami ? `, with Umami website ${umami.websiteId}` : ""}`);
}
