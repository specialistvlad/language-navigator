// What every page builder shares: build options, curriculum data, links and the page list.
import { type CurriculumLanguage, ENABLED_EXPLAIN, type Explain, explainName, type TopicRef } from "../../scripts/lib.ts";
import type { LinkFn } from "../../scripts/markdown.ts";
import type { Choice, Ui } from "./layout.ts";
import { createRenderer } from "./render.ts";

export interface BuildOptions {
  outDir: string;
  dev: boolean;
  siteUrl: string;
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
}

export const EXPLAINS = ENABLED_EXPLAIN;
export const md = createRenderer();

// The home page and the missing page speak the first enabled explanation language.
export function homeLanguage(): Explain {
  const [home] = EXPLAINS;
  if (home === undefined) throw new Error("site.yaml enables no explanation language");
  return home;
}

export const readChoices = (explain: Explain, pathFor: (e: Explain) => string): Choice[] =>
  EXPLAINS.map((e) => ({ label: explainName(e), href: pathFor(e), on: e === explain }));
export const alternates = (pathFor: (e: Explain) => string): { lang: Explain; path: string }[] =>
  EXPLAINS.map((e) => ({ lang: e, path: pathFor(e) }));
