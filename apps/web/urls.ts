// Clean, stable, named URLs (languages/CONVENTIONS.md §10). Every URL ends with "/".
import { type Explain, LEVELS, sectionSlug, type TopicRef } from "../../scripts/lib.ts";

interface LangSlug {
  slug: string;
}

export const homeUrl = () => "/";
export const trackUrl = (explain: Explain, lang: LangSlug) => `/${explain}/${lang.slug}/`;
export const topicUrl = (explain: Explain, lang: LangSlug, ref: TopicRef) =>
  `${trackUrl(explain, lang)}${sectionSlug(ref.section.dir)}/${ref.entry.slug}/`;
export const sheetsUrl = (explain: Explain, lang: LangSlug) => `${trackUrl(explain, lang)}cheatsheets/`;
export const sheetUrl = (explain: Explain, lang: LangSlug, sheet: string) => `${sheetsUrl(explain, lang)}${sheet}/`;

// Sheet identifiers inside a track.
export const levelSheet = (level: string) => level.toLowerCase();
export const progressiveSheet = (level: string) => `${LEVELS[0]}-${level}`.toLowerCase();
export const sectionSheet = (ref: Pick<TopicRef, "section">) => sectionSlug(ref.section.dir);
export const topicSheet = (ref: TopicRef) => `${sectionSlug(ref.section.dir)}/${ref.entry.slug}`;
