// What every page builder shares: build options, curriculum data, links and the page list.
import { type CurriculumLanguage, ENABLED_EXPLAIN, type Explain, explainName, type TopicRef } from "../../scripts/lib.ts";
import type { Choice, Ui } from "./layout.ts";
import type { Stage } from "./path.ts";
import type { LinkFn } from "./html.ts";

export interface BuildOptions {
  outDir: string;
  dev: boolean;
  siteUrl: string;
  // Umami analytics: the website to report to and the script that reports.
  umami?: { websiteId: string; src: string };
}

export interface Page {
  path: string;
  html: string;
  sitemap: boolean;
}

export interface Context {
  o: BuildOptions;
  refs: TopicRef[];
  link: LinkFn;
  // Languages being learned that readers see.
  languages: CurriculumLanguage[];
  add: (path: string, html: string, sitemap?: boolean) => void;
}

// One track: a language being learned, explained in one explanation language.
export interface Track {
  ctx: Context;
  lang: CurriculumLanguage;
  explain: Explain;
  t: Ui;
  title: string;
  langRefs: TopicRef[];
  written: TopicRef[];
  // The study path: per level, the steps to study.
  path: Stage[];
}

export const EXPLAINS = ENABLED_EXPLAIN;

// The home page and the missing page speak the first enabled explanation language.
export function homeLanguage(): Explain {
  const [home] = EXPLAINS;
  if (home === undefined) throw new Error("site.yaml enables no explanation language");
  return home;
}

// The choice whose link leads to this page is on.
export function readChoices(explain: Explain, pathFor: (e: Explain) => string): Choice[] {
  const here = pathFor(explain);
  return EXPLAINS.map((e) => ({ label: explainName(e), href: pathFor(e), on: pathFor(e) === here }));
}
export const alternates = (pathFor: (e: Explain) => string): { lang: Explain; path: string }[] =>
  EXPLAINS.map((e) => ({ lang: e, path: pathFor(e) }));
