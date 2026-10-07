// Static site build: every page of every track rendered to HTML, plus sitemap and robots.txt.
// Run: npm run build   (SITE_URL sets the public URL for canonical links, the sitemap and, by its path, the base of every link)
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  type CurriculumLanguage,
  type CurriculumSection,
  EXPLAIN,
  type Explain,
  LEVELS,
  loadCurriculum,
  loadTopics,
  ROOT,
  topicTitle,
  type TopicRef,
} from "../../scripts/lib.ts";
import { essentialsMarkdown, LEVEL_HEADINGS, type LinkFn, reminderMarkdown, renderGuide } from "../../scripts/markdown.ts";
import { type Choice, controls, page, UI } from "./layout.ts";
import { createRenderer, escapeHtml, levelBadge, lv, splitDoc } from "./render.ts";
import {
  homeUrl,
  levelSheet,
  progressiveSheet,
  sectionSheet,
  sheetsUrl,
  sheetUrl,
  topicSheet,
  topicUrl,
  trackUrl,
} from "./urls.ts";

export interface BuildOptions {
  outDir: string;
  dev: boolean;
  siteUrl: string;
}

const APP = import.meta.dir;
const EXPLAINS = Object.keys(EXPLAIN) as Explain[];
const md = createRenderer();

const REPO = ((await Bun.file(join(ROOT, "package.json")).json()).repository?.url ?? "").replace(/\.git$/, "");
const githubUrl = (path: string) => `${REPO}/blob/main/${path}`;
// GitHub mark (Octicons mark-github, MIT).
const GITHUB_ICON =
  '<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// Printer (Feather printer, MIT).
const PRINT_ICON =
  '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';

// Cheatsheet body: each ## section heading spans the page and its ### topic blocks flow into lanes;
// a section with a single topic flows that topic's #### level blocks instead.
function sheetHtml(markdown: string): string {
  const [head, ...sections] = markdown.split(/\n(?=## )/);
  const body = sections.map((section) => {
    let [lead, ...cards] = section.split(/\n(?=### )/);
    if (cards.length === 1) {
      const [topic, ...blocks] = cards[0].split(/\n(?=#### )/);
      lead = `${lead}\n${topic}`;
      cards = blocks;
    }
    return `${md.render(lead)}<div class="lanes">${cards.map((card) => `<section>${md.render(card)}</section>`).join("")}</div>`;
  });
  return md.render(head) + body.join("");
}

// Level range covered by a section's topics, e.g. "A0-A1".
function sectionRange(section: CurriculumSection): string {
  const froms = section.topics.map((t) => t.levels.split("-")[0]);
  const tos = section.topics.map((t) => t.levels.split("-").at(-1)!);
  const from = froms.sort((a, b) => lv(a) - lv(b))[0];
  const to = tos.sort((a, b) => lv(b) - lv(a))[0];
  return from === to ? from : `${from}-${to}`;
}
const rangeBadge = (levels: string) => {
  const [from, to] = levels.split("-");
  return levelBadge(from, to);
};
// Topic entries in lists show one badge: the level where the topic starts.
const startBadge = (levels: string) => levelBadge(levels.split("-")[0]);

interface Sheet {
  id: string;
  title: string;
  group: "levels" | "progressive" | "sections" | "topics";
  label: string;
  range: string;
  markdown: string;
}

export async function build(o: BuildOptions): Promise<number> {
  const curriculum = await loadCurriculum();
  const refs = await loadTopics(curriculum);
  const langs = new Map(curriculum.languages.map((l) => [l.code, l]));
  const langOf = (ref: TopicRef) => langs.get(ref.lang)!;
  const link: LinkFn = (target, explain) => (target?.topic ? topicUrl(explain, langOf(target), target) : null);
  const pages: { path: string; html: string; sitemap: boolean }[] = [];
  const add = (path: string, html: string, sitemap = true) => pages.push({ path, html, sitemap });

  // ---------- Shared pieces ----------

  const learnChoices = (explain: Explain, current: string): Choice[] =>
    curriculum.languages.map((l) => ({ label: l.name[explain], href: trackUrl(explain, l), on: l.code === current }));
  const readChoices = (explain: Explain, pathFor: (e: Explain) => string): Choice[] =>
    EXPLAINS.map((e) => ({ label: EXPLAIN[e], href: pathFor(e), on: e === explain }));
  const alternates = (pathFor: (e: Explain) => string) => EXPLAINS.map((e) => ({ lang: e, path: pathFor(e) }));

  function trackNav(explain: Explain, lang: CurriculumLanguage, current?: TopicRef): string {
    const t = UI[explain];
    const out = [`<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`];
    for (const section of lang.sections) {
      out.push(`<h4 data-level="${sectionRange(section).split("-")[0]}">${escapeHtml(section.title[explain])}</h4>`);
      for (const ref of refs.filter((r) => r.lang === lang.code && r.section === section)) {
        const from = ref.entry.levels.split("-")[0];
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

  // ---------- Home ----------

  const cards = curriculum.languages
    .map((lang) => {
      const total = refs.filter((r) => r.lang === lang.code).length;
      const written = refs.filter((r) => r.lang === lang.code && r.topic).length;
      const links = EXPLAINS.map(
        (e) =>
          `<a class="track-link" href="${trackUrl(e, lang)}" hreflang="${e}"><strong>${escapeHtml(UI[e].track(lang.name[e]))}</strong><span>${escapeHtml(UI[e].explained)}</span></a>`,
      ).join("");
      return `<section class="card"><h2>${escapeHtml(lang.name.en)} · ${escapeHtml(lang.name.es)}</h2><p class="muted">${UI.en.written(written, total)}</p>${links}</section>`;
    })
    .join("");
  add(
    homeUrl(),
    page({
      kind: "home",
      lang: "en",
      title: "Language Navigator — English and Spanish, A0 to B1",
      description: "Reference guides and cheatsheets for learners of English and Spanish from A0 to B1, explained in English and in Spanish.",
      path: homeUrl(),
      main: `<article class="doc home"><h1>Language Navigator</h1><blockquote><p>English and Spanish, A0–B1, explained in English and in Spanish.</p></blockquote><div class="cards">${cards}</div></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
  );

  for (const lang of curriculum.languages) {
    const langRefs = refs.filter((r) => r.lang === lang.code);
    const written = langRefs.filter((r) => r.topic);

    for (const explain of EXPLAINS) {
      const t = UI[explain];
      const trackTitle = t.track(lang.name[explain]);
      const sheetsChoice = (on: boolean): Choice => ({ label: t.sheets, href: sheetsUrl(explain, lang), on });

      // ---------- Track home ----------

      const sectionsHtml = lang.sections
        .map((section) => {
          const sectionRefs = langRefs.filter((r) => r.section === section);
          const items = sectionRefs
            .map((ref) => {
              const from = ref.entry.levels.split("-")[0];
              const row = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>${startBadge(ref.entry.levels)}`;
              return ref.topic
                ? `<li data-level="${from}"><a href="${topicUrl(explain, lang, ref)}">${row}</a></li>`
                : `<li data-level="${from}" class="todo"><span class="row">${row}</span></li>`;
            })
            .join("");
          const count = `${sectionRefs.filter((r) => r.topic).length}/${sectionRefs.length}`;
          const head = `<header><span class="num">${section.dir.slice(0, 2)}</span><h2>${escapeHtml(section.title[explain])}</h2><span class="count">${count}</span></header>`;
          return `<section class="index-card" data-level="${sectionRange(section).split("-")[0]}">${head}<ol class="index-list">${items}</ol></section>`;
        })
        .join("");
      const indexHead =
        `<header class="index-head"><p class="eyebrow">${escapeHtml(lang.name[explain])} · ${escapeHtml(t.explained)}</p>` +
        `<h1>${escapeHtml(t.index)}</h1><p class="lead">${escapeHtml(t.trackIntro)}</p></header>`;
      add(
        trackUrl(explain, lang),
        page({
          kind: "track",
          lang: explain,
          title: `${trackTitle} — Language Navigator`,
          description: `${trackTitle}, ${t.explained}: ${t.written(written.length, langRefs.length)}.`,
          path: trackUrl(explain, lang),
          alternates: alternates((e) => trackUrl(e, lang)),
          controls: controls({
            explain,
            learn: learnChoices(explain, lang.code),
            read: readChoices(explain, (e) => trackUrl(e, lang)),
            level: true,
            sheets: sheetsChoice(false),
          }),
          nav: trackNav(explain, lang),
          main: `<article class="doc index">${indexHead}<div class="index-grid lanes">${sectionsHtml}</div></article>`,
          dev: o.dev,
          siteUrl: o.siteUrl,
        }),
      );

      // ---------- Topic pages ----------

      for (const ref of written) {
        const topic = ref.topic!;
        const doc = splitDoc(renderGuide(ref, explain, refs, link));
        const sections = doc.sections
          .map((s) => {
            const cls = s.kind === "essentials" || s.kind === "reminder" ? `block ${s.kind}` : s.kind === "links" ? "links" : "part";
            const level = s.from ? ` data-level="${s.from}"` : "";
            return `<section class="${cls}"${level}>${md.render(`## ${s.heading}\n${s.lines.join("\n")}`)}</section>`;
          })
          .join("\n");
        const actions = [
          `<a class="tool" href="${githubUrl(ref.path)}" rel="noopener" title="${escapeHtml(t.github)}" aria-label="${escapeHtml(t.github)}">${GITHUB_ICON}</a>`,
          `<button class="tool" id="print" type="button" title="${escapeHtml(t.print)}" aria-label="${escapeHtml(t.print)}">${PRINT_ICON}</button>`,
        ].join("");
        const title = topic.title[explain] ?? ref.entry.slug;
        const head = `<header class="doc-head"><h1>${escapeHtml(title)}${rangeBadge(ref.entry.levels)}</h1><div class="actions">${actions}</div></header>`;
        const intro = md.render(doc.head.split("\n").filter((line) => !line.startsWith("# ")).join("\n"));
        add(
          topicUrl(explain, lang, ref),
          page({
            kind: "topic",
            lang: explain,
            title: `${title} — ${trackTitle}`,
            description: topic.summary[explain] ?? "",
            path: topicUrl(explain, lang, ref),
            alternates: alternates((e) => topicUrl(e, lang, ref)),
            controls: controls({
              explain,
              learn: learnChoices(explain, lang.code),
              read: readChoices(explain, (e) => topicUrl(e, lang, ref)),
              level: true,
              view: true,
              sheets: sheetsChoice(false),
            }),
            nav: trackNav(explain, lang, ref),
            main: `<article class="doc${topic.levels.length === 1 ? " one-level" : ""}">${head}${intro}<div class="sections lanes">${sections}</div></article>`,
            dev: o.dev,
            siteUrl: o.siteUrl,
          }),
        );
      }

      // ---------- Cheatsheets ----------

      type Pick = { kind: "essentials" | "reminder"; level: string };
      const compose = (title: string, topics: TopicRef[], pick: (ref: TopicRef) => Pick[]): string | null => {
        let out = `# ${title}\n\n`;
        let section: CurriculumSection | null = null;
        let blocks = 0;
        for (const ref of topics) {
          const parts = pick(ref)
            .map((p) => {
              const body =
                p.kind === "essentials"
                  ? essentialsMarkdown(ref, explain, refs, p.level, 5, link)
                  : reminderMarkdown(ref, explain, refs, p.level, link);
              return body ? `#### ${LEVEL_HEADINGS[p.kind][explain]} [${p.level}]\n\n${body}` : null;
            })
            .filter((p): p is string => !!p);
          if (!parts.length) continue;
          if (ref.section !== section) {
            section = ref.section;
            out += `## ${section.title[explain]}\n\n`;
          }
          out += `### [${topicTitle(ref, explain)}](${topicUrl(explain, lang, ref)})\n\n${parts.join("\n\n")}\n\n`;
          blocks += parts.length;
        }
        return blocks ? out : null;
      };

      const allLevels = (): Pick[] => LEVELS.map((level) => ({ kind: "essentials" as const, level }));
      const sheets: Sheet[] = [];
      const push = (s: Omit<Sheet, "markdown">, markdown: string | null) => markdown && sheets.push({ ...s, markdown });

      for (const level of LEVELS) {
        const s = { id: levelSheet(level), group: "levels" as const, label: t.levelNames[level], range: level, title: `${t.sheet} ${level}` };
        push(s, compose(s.title, written, () => [{ kind: "essentials", level }]));
      }
      for (const level of LEVELS.slice(1)) {
        const s = { id: progressiveSheet(level), group: "progressive" as const, label: `${t.upTo} ${t.levelNames[level]}`, range: `A0-${level}`, title: `${t.sheet} A0–${level}` };
        const below = LEVELS.filter((l) => lv(l) < lv(level));
        push(
          s,
          compose(s.title, written, () => [...below.map((l) => ({ kind: "reminder" as const, level: l })), { kind: "essentials", level }]),
        );
      }
      for (const section of lang.sections) {
        const inSection = written.filter((r) => r.section === section);
        if (!inSection.length) continue;
        const s = { id: sectionSheet({ section }), group: "sections" as const, label: section.title[explain], range: sectionRange(section), title: `${t.sheet}: ${section.title[explain]}` };
        push(s, compose(s.title, inSection, allLevels));
      }
      for (const ref of written) {
        const name = topicTitle(ref, explain);
        const s = { id: topicSheet(ref), group: "topics" as const, label: name, range: ref.entry.levels.split("-")[0], title: `${t.sheet}: ${name}` };
        push(s, compose(s.title, [ref], allLevels));
      }

      const groups = { levels: t.levels, progressive: t.progressive, sections: t.sections, topics: t.topics } as const;
      const sheetNav = (current?: Sheet) =>
        [
          `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`,
          ...(Object.keys(groups) as (keyof typeof groups)[]).flatMap((g) => {
            const list = sheets.filter((s) => s.group === g);
            if (!list.length) return [];
            return [
              `<h4>${escapeHtml(groups[g])}</h4>`,
              ...list.map(
                (s) =>
                  `<a href="${sheetUrl(explain, lang, s.id)}"${s === current ? ' class="on" aria-current="page"' : ""}><span class="name">${escapeHtml(s.label)}</span></a>`,
              ),
            ];
          }),
        ].join("\n");

      const sheetControls = (pathFor: (e: Explain) => string) =>
        controls({ explain, learn: learnChoices(explain, lang.code), read: readChoices(explain, pathFor), sheets: sheetsChoice(true) });

      const indexHtml = (Object.keys(groups) as (keyof typeof groups)[])
        .map((g) => {
          const list = sheets.filter((s) => s.group === g);
          if (!list.length) return "";
          return `<section class="part"><h2>${escapeHtml(groups[g])}</h2><ul class="topic-list">${list
            .map((s) => `<li><a href="${sheetUrl(explain, lang, s.id)}">${escapeHtml(s.label)}</a> ${rangeBadge(s.range)}</li>`)
            .join("")}</ul></section>`;
        })
        .join("");
      add(
        sheetsUrl(explain, lang),
        page({
          kind: "sheets",
          lang: explain,
          title: `${t.sheets} — ${trackTitle}`,
          description: `${t.sheets}: ${trackTitle}, ${t.explained}.`,
          path: sheetsUrl(explain, lang),
          alternates: alternates((e) => sheetsUrl(e, lang)),
          controls: sheetControls((e) => sheetsUrl(e, lang)),
          nav: sheetNav(),
          main: `<article class="doc"><h1>${escapeHtml(t.sheets)}</h1><blockquote><p>${escapeHtml(t.sheetsIntro)}</p></blockquote><div class="sheet-index lanes">${indexHtml}</div></article>`,
          dev: o.dev,
          siteUrl: o.siteUrl,
        }),
      );

      for (const s of sheets) {
        add(
          sheetUrl(explain, lang, s.id),
          page({
            kind: "sheet",
            lang: explain,
            title: `${s.title} — ${trackTitle}`,
            description: `${s.title}: ${trackTitle}, ${t.explained}.`,
            path: sheetUrl(explain, lang, s.id),
            alternates: alternates((e) => sheetUrl(e, lang, s.id)),
            controls: sheetControls((e) => sheetUrl(e, lang, s.id)),
            nav: sheetNav(s),
            main: `<article class="doc sheet">${sheetHtml(s.markdown)}</article>`,
            dev: o.dev,
            siteUrl: o.siteUrl,
          }),
        );
      }
    }
  }

  // ---------- 404, sitemap, robots ----------

  add(
    "/404.html",
    page({
      kind: "404",
      lang: "en",
      title: "Page not found — Language Navigator",
      description: UI.en.notFound,
      path: "/404.html",
      main: `<article class="doc"><h1>${UI.en.notFound} · ${UI.es.notFound}</h1><p><a href="/">${UI.en.backHome}</a> · <a href="/">${UI.es.backHome}</a></p></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
    false,
  );

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .filter((p) => p.sitemap)
  .map((p) => `  <url><loc>${o.siteUrl}${p.path}</loc></url>`)
  .join("\n")}
</urlset>
`;
  const robots = `User-agent: *\nAllow: /\nSitemap: ${o.siteUrl}/sitemap.xml\n`;

  // A site served below the domain root (a GitHub Pages project site) prefixes every root-relative link.
  const base = new URL(o.siteUrl).pathname.replace(/\/$/, "");
  const rebase = (html: string) => (base ? html.replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`) : html);

  // Write into a fresh folder, then swap it in place.
  const tmp = `${o.outDir}.tmp`;
  const old = `${o.outDir}.old`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const p of pages) {
    const file = p.path.endsWith("/") ? join(tmp, p.path, "index.html") : join(tmp, p.path);
    await Bun.write(file, rebase(p.html));
  }
  await Bun.write(join(tmp, "sitemap.xml"), sitemap);
  await Bun.write(join(tmp, "robots.txt"), robots);
  await cp(join(APP, "style.css"), join(tmp, "style.css"));
  await cp(join(APP, "client.js"), join(tmp, "client.js"));
  await rm(old, { recursive: true, force: true });
  await rename(o.outDir, old).catch(() => {});
  await rename(tmp, o.outDir);
  await rm(old, { recursive: true, force: true });
  return pages.length;
}

if (import.meta.main) {
  const siteUrl = (process.env.SITE_URL ?? "http://127.0.0.1:47380").replace(/\/$/, "");
  const count = await build({ outDir: join(ROOT, "build/web"), dev: false, siteUrl });
  console.log(`built ${count} pages into build/web/ for ${siteUrl}`);
}
