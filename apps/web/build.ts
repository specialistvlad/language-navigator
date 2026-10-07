// Static site build: every page of every track rendered to HTML, plus sitemap and robots.txt.
// Run: npm run build   (SITE_URL sets the public URL for canonical links, the sitemap and, by its path, the base of every link)
import { cp, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  type CurriculumLanguage,
  type CurriculumSection,
  ENABLED_EXPLAIN,
  explainName,
  filled,
  localize,
  type Explain,
  LEVEL_INFO,
  LEVELS,
  levelName,
  levelRange,
  listOf,
  lv,
  say,
  SITE,
  loadCurriculum,
  loadTopics,
  ROOT,
  topicTitle,
  type TopicRef,
} from "../../scripts/lib.ts";
import { essentialsMarkdown, type LinkFn, reminderMarkdown, renderGuide } from "../../scripts/markdown.ts";
import { type Choice, controls, page, ui } from "./layout.ts";
import { createRenderer, escapeHtml, levelBadge, splitDoc } from "./render.ts";
import { homeUrl, levelSheet, progressiveSheet, sectionSheet, sheetsUrl, sheetUrl, topicSheet, topicUrl, trackUrl } from "./urls.ts";

export interface BuildOptions {
  outDir: string;
  dev: boolean;
  siteUrl: string;
}

const APP = import.meta.dir;
const EXPLAINS = ENABLED_EXPLAIN;
const md = createRenderer();

// Opens the file in GitHub's editor (a fork for anyone without write access).
const editUrl = (path: string): string => `${SITE.repository}/edit/main/${path}`;
// GitHub mark (Octicons mark-github, MIT).
const GITHUB_ICON =
  '<svg class="icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';

// Printer (Feather printer, MIT).
const PRINT_ICON =
  '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';

// Cheatsheet body: each ## section heading spans the page and its ### topic blocks flow into lanes;
// a section with a single topic flows that topic's #### level blocks instead.
function sheetHtml(markdown: string): string {
  const [head = "", ...sections] = markdown.split(/\n(?=## )/);
  const body = sections.map((section) => {
    let [top = "", ...cards] = section.split(/\n(?=### )/);
    const only = cards[0];
    if (cards.length === 1 && only !== undefined) {
      const [topic = "", ...blocks] = only.split(/\n(?=#### )/);
      top = `${top}\n${topic}`;
      cards = blocks;
    }
    return `${md.render(top)}<div class="lanes">${cards.map((card) => `<section>${md.render(card)}</section>`).join("")}</div>`;
  });
  return md.render(head) + body.join("");
}

// Anchor id from a heading: lowercase ASCII words joined by hyphens.
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Level chips: one soft chip per level, joined into a group.
const chips = (levels: readonly string[]): string =>
  `<span class="chips">${levels.map((l) => `<span class="chip c-${l}">${l}</span>`).join("")}</span>`;

// Level colours from languages/levels.yaml in both themes, with each level's badge and chip.
function levelsCss(): string {
  const vars = (theme: "light" | "dark"): string => LEVEL_INFO.map((l) => `--lvl-${l.code}: ${l.color[theme]};`).join(" ");
  const rules = LEVEL_INFO.map(
    ({ code }) =>
      `.lvl-${code} { background: var(--lvl-${code}); }\n.c-${code} { background: color-mix(in srgb, var(--lvl-${code}) 16%, transparent); color: var(--lvl-${code}); }`,
  );
  return (
    [
      `:root { ${vars("light")} }`,
      `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars("dark")} } }`,
      `:root[data-theme="dark"] { ${vars("dark")} }`,
      ...rules,
    ].join("\n") + "\n"
  );
}

// First and last level of a range such as "A0-A1".
const firstLevel = (range: string): string => range.split("-")[0] ?? range;
const lastLevel = (range: string): string => range.split("-").at(-1) ?? range;

// Level range covered by a section's topics, e.g. "A0-A1".
function sectionRange(section: CurriculumSection): string {
  const froms = section.topics.map((t) => firstLevel(t.levels));
  const tos = section.topics.map((t) => lastLevel(t.levels));
  const from = froms.sort((a, b) => lv(a) - lv(b))[0] ?? "";
  const to = tos.sort((a, b) => lv(b) - lv(a))[0] ?? "";
  return from === to ? from : `${from}-${to}`;
}
const rangeBadge = (levels: string): string => {
  const [from = levels, to] = levels.split("-");
  return levelBadge(from, to);
};
// Topic entries in lists show one badge: the level where the topic starts.
const startBadge = (levels: string): string => levelBadge(firstLevel(levels));
// The first sentence of a summary stands alone: cards and the meta description show only it.
const lead = (text: string): string => /^.*?[.!?](?=\s+[A-ZÁÉÍÓÚÑ¿¡]|$)/.exec(text)?.[0] ?? text;

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
  const langOf = (ref: TopicRef): CurriculumLanguage => {
    const lang = langs.get(ref.lang);
    if (lang === undefined) throw new Error(`${ref.id}: language "${ref.lang}" is not in curriculum.yaml`);
    return lang;
  };
  // Readers see enabled languages only; links into a disabled one stay plain text.
  const link: LinkFn = (target, explain) => (target?.topic && langOf(target).enabled ? topicUrl(explain, langOf(target), target) : null);
  const shownLanguages = curriculum.languages.filter((l) => l.enabled);
  const pages: { path: string; html: string; sitemap: boolean }[] = [];
  const add = (path: string, html: string, sitemap = true): void => {
    pages.push({ path, html, sitemap });
  };

  // ---------- Shared pieces ----------

  const readChoices = (explain: Explain, pathFor: (e: Explain) => string): Choice[] =>
    EXPLAINS.map((e) => ({ label: explainName(e), href: pathFor(e), on: e === explain }));
  const alternates = (pathFor: (e: Explain) => string): { lang: Explain; path: string }[] =>
    EXPLAINS.map((e) => ({ lang: e, path: pathFor(e) }));

  // Sidebar head: back to the home page, where the language is chosen.
  const navHome = (explain: Explain): string => `<a class="nav-home" href="${homeUrl()}">${escapeHtml(ui(explain).chooseLanguage)}</a>`;

  function trackNav(explain: Explain, lang: CurriculumLanguage, current?: TopicRef): string {
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

  // ---------- Home ----------

  // The home page speaks the first explanation language and names every language in it.
  const [home] = EXPLAINS;
  if (home === undefined) throw new Error("site.yaml enables no explanation language");
  const homeValues = {
    site: SITE.name,
    languages: listOf(
      shownLanguages.map((l) => localize(l.name, home)),
      home,
    ),
    from: LEVELS[0] ?? "",
    to: LEVELS.at(-1) ?? "",
    explain: listOf(
      SITE.explain.filter((e) => e.enabled).map((e) => say("explainedIn", home, { name: localize(e.name, home) })),
      home,
    ),
  };
  const cards = shownLanguages
    .map((lang) => {
      const total = refs.filter((r) => r.lang === lang.code).length;
      const written = refs.filter((r) => r.lang === lang.code && r.topic !== null).length;
      const links = EXPLAINS.map(
        (e) =>
          `<a class="track-link" href="${trackUrl(e, lang)}" hreflang="${e}"><strong>${escapeHtml(ui(e).track(localize(lang.name, e)))}</strong><span>${escapeHtml(ui(e).explained)}</span></a>`,
      ).join("");
      return `<section class="card"><h2>${EXPLAINS.map((e) => escapeHtml(localize(lang.name, e))).join(" · ")}</h2><p class="muted">${ui(home).written(written, total)}</p>${links}</section>`;
    })
    .join("");
  add(
    homeUrl(),
    page({
      kind: "home",
      lang: home,
      title: say("homeTitle", home, homeValues),
      description: say("homeDescription", home, homeValues),
      path: homeUrl(),
      main: `<article class="doc home"><h1>${escapeHtml(SITE.name)}</h1><blockquote><p>${escapeHtml(say("tagline", home, homeValues))}</p></blockquote><div class="cards">${cards}</div></article>`,
      dev: o.dev,
      siteUrl: o.siteUrl,
    }),
  );

  for (const lang of shownLanguages) {
    const langRefs = refs.filter((r) => r.lang === lang.code);
    const written = langRefs.filter((r) => r.topic);

    for (const explain of EXPLAINS) {
      const t = ui(explain);
      const trackTitle = t.track(localize(lang.name, explain));

      // ---------- Track home ----------

      const sectionsHtml = lang.sections
        .map((section) => {
          const sectionRefs = langRefs.filter((r) => r.section === section);
          const items = sectionRefs
            .map((ref) => {
              const from = firstLevel(ref.entry.levels);
              const row = `<span class="name">${escapeHtml(topicTitle(ref, explain))}</span>${startBadge(ref.entry.levels)}`;
              return ref.topic
                ? `<li data-level="${from}"><a href="${topicUrl(explain, lang, ref)}">${row}</a></li>`
                : `<li data-level="${from}" class="todo"><span class="row">${row}</span></li>`;
            })
            .join("");
          const count = String(sectionRefs.length);
          const head = `<header><span class="num">${section.dir.slice(0, 2)}</span><h2>${escapeHtml(localize(section.title, explain))}</h2><span class="count">${count}</span></header>`;
          return `<section class="index-card" data-level="${firstLevel(sectionRange(section))}">${head}<ol class="index-list">${items}</ol></section>`;
        })
        .join("");
      const indexHead =
        `<header class="index-head"><p class="eyebrow">${escapeHtml(localize(lang.name, explain))} · ${escapeHtml(t.explained)}</p>` +
        `<h1>${escapeHtml(t.index)}</h1><p class="lead">${escapeHtml(t.trackIntro)}</p></header>`;
      add(
        trackUrl(explain, lang),
        page({
          kind: "track",
          lang: explain,
          title: `${trackTitle} — ${SITE.name}`,
          description: `${trackTitle}, ${t.explained}: ${t.written(written.length, langRefs.length)}.`,
          path: trackUrl(explain, lang),
          alternates: alternates((e) => trackUrl(e, lang)),
          controls: controls({
            explain,
            read: readChoices(explain, (e) => trackUrl(e, lang)),
            level: true,
          }),
          nav: trackNav(explain, lang),
          main: `<article class="doc index">${indexHead}<div class="index-grid lanes">${sectionsHtml}</div></article>`,
          dev: o.dev,
          siteUrl: o.siteUrl,
        }),
      );

      // ---------- Topic pages ----------

      for (const [index, ref] of written.entries()) {
        const topic = ref.topic;
        if (topic === null) continue;
        const doc = splitDoc(renderGuide(ref, explain, refs, link));
        const ids = new Set<string>();
        const parts = doc.sections.filter((s) => s.kind === "body");
        const idOf = new Map(
          parts.map((s) => {
            let id = slugify(s.title);
            if (id === "") id = "section";
            while (ids.has(id)) id += "-";
            ids.add(id);
            return [s, id];
          }),
        );
        const sections = doc.sections
          .map((s) => {
            const cls = s.kind === "body" ? "part" : `block ${s.kind}`;
            const level = filled(s.from) ? ` data-level="${s.from}"` : "";
            const anchor = idOf.get(s);
            const id = anchor === undefined ? "" : ` id="${anchor}"`;
            return `<section class="${cls}"${id}${level}>${md.render(`## ${s.heading}\n${s.lines.join("\n")}`)}</section>`;
          })
          .join("\n");

        // Rail: the guide sections with their levels, the Essentials view, and the next topic.
        const tocItems = parts.map((s) => {
          const levels = filled(s.from) ? chips(levelRange(`${s.from}-${s.to ?? s.from}`)) : "";
          return `<li${filled(s.from) ? ` data-level="${s.from}"` : ""}><a href="#${idOf.get(s) ?? ""}" data-view="guide"><span class="name">${escapeHtml(s.title)}</span>${levels}</a></li>`;
        });
        tocItems.push(
          `<li><button type="button" data-view="essentials"><span class="name">${escapeHtml(t.keyPoints)}</span>${chips(topic.levels)}</button></li>`,
        );
        const next = written.slice(index + 1).find((r) => r.lang === ref.lang);
        const nextTopic = next?.topic;
        const upNext =
          next && nextTopic
            ? `<h4>${escapeHtml(t.upNext)}</h4><a class="next" href="${topicUrl(explain, lang, next)}"><strong>${escapeHtml(topicTitle(next, explain))}</strong>` +
              `<span class="summary">${escapeHtml(lead(nextTopic.summary[explain] ?? ""))}</span>${chips(nextTopic.levels)}</a>`
            : "";
        const rail = `<h4>${escapeHtml(t.onThisPage)}</h4><ol class="toc">${tocItems.join("")}</ol>${upNext}`;
        const actions = [
          `<a class="tool edit" href="${editUrl(ref.path)}" rel="noopener" title="${escapeHtml(t.editTitle)}">${escapeHtml(t.editOn)}${GITHUB_ICON}<span class="sr-only">GitHub</span></a>`,
          `<button class="tool" id="print" type="button" title="${escapeHtml(t.print)}" aria-label="${escapeHtml(t.print)}">${PRINT_ICON}</button>`,
        ].join("");
        const title = topic.title[explain] ?? ref.entry.slug;
        const head = `<header class="doc-head"><h1>${escapeHtml(title)}${rangeBadge(ref.entry.levels)}</h1><div class="actions">${actions}</div></header>`;
        const intro = md.render(
          doc.head
            .split("\n")
            .filter((line) => !line.startsWith("# "))
            .join("\n"),
        );
        add(
          topicUrl(explain, lang, ref),
          page({
            kind: "topic",
            lang: explain,
            title: `${title} — ${trackTitle}`,
            description: lead(topic.summary[explain] ?? ""),
            path: topicUrl(explain, lang, ref),
            alternates: alternates((e) => topicUrl(e, lang, ref)),
            controls: controls({
              explain,
              read: readChoices(explain, (e) => topicUrl(e, lang, ref)),
              level: true,
              view: true,
            }),
            nav: trackNav(explain, lang, ref),
            rail,
            main: `<article class="doc${topic.levels.length === 1 ? " one-level" : ""}">${head}${intro}<div class="sections lanes">${sections}</div></article>`,
            dev: o.dev,
            siteUrl: o.siteUrl,
          }),
        );
      }

      // ---------- Cheatsheets ----------

      interface Pick {
        kind: "essentials" | "reminder";
        level: string;
      }
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
              return filled(body) ? `#### ${say(p.kind, explain)} [${p.level}]\n\n${body}` : null;
            })
            .filter(filled);
          if (parts.length === 0) continue;
          if (ref.section !== section) {
            section = ref.section;
            out += `## ${localize(section.title, explain)}\n\n`;
          }
          out += `### [${topicTitle(ref, explain)}](${topicUrl(explain, lang, ref)})\n\n${parts.join("\n\n")}\n\n`;
          blocks += parts.length;
        }
        return blocks > 0 ? out : null;
      };

      const allLevels = (): Pick[] => LEVELS.map((level) => ({ kind: "essentials" as const, level }));
      const sheets: Sheet[] = [];
      const push = (s: Omit<Sheet, "markdown">, markdown: string | null): void => {
        if (filled(markdown)) sheets.push({ ...s, markdown });
      };

      for (const level of LEVELS) {
        const s = {
          id: levelSheet(level),
          group: "levels" as const,
          label: levelName(level, explain),
          range: level,
          title: `${t.sheet} ${level}`,
        };
        push(
          s,
          compose(s.title, written, () => [{ kind: "essentials", level }]),
        );
      }
      for (const level of LEVELS.slice(1)) {
        const s = {
          id: progressiveSheet(level),
          group: "progressive" as const,
          label: `${t.upTo} ${levelName(level, explain)}`,
          range: `${LEVELS[0] ?? ""}-${level}`,
          title: `${t.sheet} ${LEVELS[0] ?? ""}–${level}`,
        };
        const below = LEVELS.filter((l) => lv(l) < lv(level));
        push(
          s,
          compose(s.title, written, () => [...below.map((l) => ({ kind: "reminder" as const, level: l })), { kind: "essentials", level }]),
        );
      }
      for (const section of lang.sections) {
        const inSection = written.filter((r) => r.section === section);
        if (inSection.length === 0) continue;
        const s = {
          id: sectionSheet({ section }),
          group: "sections" as const,
          label: localize(section.title, explain),
          range: sectionRange(section),
          title: `${t.sheet}: ${localize(section.title, explain)}`,
        };
        push(s, compose(s.title, inSection, allLevels));
      }
      for (const ref of written) {
        const name = topicTitle(ref, explain);
        const s = {
          id: topicSheet(ref),
          group: "topics" as const,
          label: name,
          range: firstLevel(ref.entry.levels),
          title: `${t.sheet}: ${name}`,
        };
        push(s, compose(s.title, [ref], allLevels));
      }

      const groups = { levels: t.levels, progressive: t.progressive, sections: t.sections, topics: t.topics } as const;
      const sheetNav = (current?: Sheet): string =>
        [
          navHome(explain),
          `<a class="nav-track" href="${trackUrl(explain, lang)}">${escapeHtml(t.index)}</a>`,
          ...(Object.keys(groups) as (keyof typeof groups)[]).flatMap((g) => {
            const list = sheets.filter((s) => s.group === g);
            if (list.length === 0) return [];
            return [
              `<h4>${escapeHtml(groups[g])}</h4>`,
              ...list.map(
                (s) =>
                  `<a href="${sheetUrl(explain, lang, s.id)}"${s === current ? ' class="on" aria-current="page"' : ""}><span class="name">${escapeHtml(s.label)}</span></a>`,
              ),
            ];
          }),
        ].join("\n");

      const sheetControls = (pathFor: (e: Explain) => string): string => controls({ explain, read: readChoices(explain, pathFor) });

      const indexHtml = (Object.keys(groups) as (keyof typeof groups)[])
        .map((g) => {
          const list = sheets.filter((s) => s.group === g);
          if (list.length === 0) return "";
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
      lang: home,
      title: `${ui(home).notFound} — ${SITE.name}`,
      description: ui(home).notFound,
      path: "/404.html",
      main: `<article class="doc"><h1>${EXPLAINS.map((e) => ui(e).notFound).join(" · ")}</h1><p>${EXPLAINS.map((e) => `<a href="/">${ui(e).backHome}</a>`).join(" · ")}</p></article>`,
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
  const rebase = (html: string): string => (base !== "" ? html.replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`) : html);

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
  await Bun.write(join(tmp, "levels.css"), levelsCss());
  await cp(join(APP, "client.js"), join(tmp, "client.js"));
  await rm(old, { recursive: true, force: true });
  await rename(o.outDir, old).catch(() => {
    // No earlier build to move aside.
  });
  await rename(tmp, o.outDir);
  await rm(old, { recursive: true, force: true });
  return pages.length;
}

if (import.meta.main) {
  const siteUrl = (process.env["SITE_URL"] ?? "http://127.0.0.1:47380").replace(/\/$/, "");
  const count = await build({ outDir: join(ROOT, "build/web"), dev: false, siteUrl });
  console.log(`built ${count} pages into build/web/ for ${siteUrl}`);
}
