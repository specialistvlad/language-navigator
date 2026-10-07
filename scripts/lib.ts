// Shared data access: configuration, curriculum, concepts and topics.
import { join } from "node:path";
import interfaceFile from "../languages/interface.yaml";
import levelsFile from "../languages/levels.yaml";
import siteFile from "../languages/site.yaml";
import type { LanguageNavigatorConcepts as ConceptsFile } from "./generated/concepts.ts";
import type { LanguageNavigatorCurriculum as CurriculumFile } from "./generated/curriculum.ts";
import type { InterfaceWording as InterfaceFile } from "./generated/interface.ts";
import type { LevelScale as LevelsFile } from "./generated/levels.ts";
import type { SiteIdentityAndExplanationLanguages as SiteFile } from "./generated/site.ts";
import type { Explain, Item, Level, Localized, LanguageNavigatorTopic as TopicFile } from "./generated/topic.ts";

export const ROOT = join(import.meta.dir, "..");
export const CONTENT = join(ROOT, "languages");

// ---------- Configuration (languages/site.yaml, levels.yaml, interface.yaml) ----------

// Types come from the JSON Schemas (scripts/generated/, npm run types).
export type { Explain, Level } from "./generated/topic.ts";
export type Site = SiteFile;
export type LevelInfo = LevelsFile["levels"][number];
export type Interface = InterfaceFile;

// The text of a localized value in an explanation language; npm run check guarantees it exists.
export function localize(value: Localized, explain: Explain): string {
  const text = value[explain];
  if (text === undefined) throw new Error(`No "${explain}" text in ${JSON.stringify(value)}`);
  return text;
}

// The YAML files are validated against their schemas by npm run check.
export const SITE = siteFile as Site;
export const LEVEL_INFO = (levelsFile as { levels: LevelInfo[] }).levels;
export const LEVELS: readonly Level[] = LEVEL_INFO.map((l) => l.code);
export const isLevel = (value: string): value is Level => (LEVELS as readonly string[]).includes(value);
// Explanation language codes in site.yaml order.
export const EXPLAIN_CODES: Explain[] = SITE.explain.map((e) => e.code);
// Explanation languages, each under its own name: { en: "English", es: "Español" }.
// A missing own name falls back to the code here; npm run check reports it.
export const EXPLAIN: Partial<Record<Explain, string>> = Object.fromEntries(SITE.explain.map((e) => [e.code, e.name[e.code]]));

export const explainName = (explain: Explain): string => localize(EXPLAIN, explain);
// A non-empty string: the test text values pass before they are shown.
export const filled = (value: string | null | undefined): value is string => value !== undefined && value !== null && value !== "";

// Explanation languages readers see (enabled in site.yaml).
export const ENABLED_EXPLAIN: Explain[] = SITE.explain.filter((e) => e.enabled).map((e) => e.code);

export const lv = (level: string | null): number => (level !== null && isLevel(level) ? LEVELS.indexOf(level) : -1);
// Every level in a range such as "A0-A2".
export const levelRange = (range: string): Level[] => {
  const [from = "", to = from] = range.split("-");
  return LEVELS.filter((l) => lv(l) >= lv(from) && lv(l) <= lv(to));
};
export const levelName = (level: Level, explain: Explain): string => LEVEL_INFO.find((l) => l.code === level)?.name[explain] ?? level;

export const INTERFACE = interfaceFile as Interface;

// Interface wording in an explanation language: {key} placeholders take values, {key:lower} lowercased.
export function say(key: string, explain: Explain, values: Record<string, string | number> = {}): string {
  const template = INTERFACE.text[key]?.[explain];
  if (template === undefined) throw new Error(`interface.yaml has no "${key}" in "${explain}"`);
  return template.replace(/\{(\w+)(:lower)?\}/g, (_match, name: string, lower: string | undefined) => {
    const value = String(values[name] ?? `{${name}}`);
    return lower === undefined ? value : value.toLowerCase();
  });
}

// "A and B", "A, B and C" in an explanation language.
export const listOf = (items: string[], explain: Explain): string => new Intl.ListFormat(explain, { type: "conjunction" }).format(items);

// ---------- Data model (generated from languages/schema/*.schema.json) ----------

export type {
  Block,
  BulletsBlock,
  Cell,
  Column,
  ErrorRow,
  ErrorsBlock,
  Example,
  Item,
  Localized,
  Part,
  Reminder,
  Row,
  Section,
  TableBlock,
  Text,
  TextBlock,
} from "./generated/topic.ts";
export type Topic = TopicFile;
export type Essentials = TopicFile["essentials"][number];
// An item written as an object: text or an example, with optional translation, level and languages.
export type ItemObject = Exclude<Item, string | Localized>;

export type Curriculum = CurriculumFile;
export type CurriculumLanguage = Curriculum["languages"][number];
export type CurriculumSection = CurriculumLanguage["sections"][number];
export type CurriculumTopic = CurriculumSection["topics"][number];
export type Concepts = ConceptsFile;

// ---------- Loading ----------

export async function readYaml<T>(path: string): Promise<T> {
  return Bun.YAML.parse(await Bun.file(path).text()) as T;
}

export const loadCurriculum = (): Promise<Curriculum> => readYaml<Curriculum>(join(CONTENT, "curriculum.yaml"));
export const loadConcepts = (): Promise<Concepts> => readYaml<Concepts>(join(CONTENT, "concepts.yaml"));

export const topicPath = (lang: string, section: string, slug: string): string => `languages/${lang}/${section}/${slug}/topic.yaml`;
export const sectionSlug = (dir: string): string => dir.replace(/^\d\d-/, "");
export const topicId = (lang: string, dir: string, slug: string): string => `${lang}.${sectionSlug(dir)}.${slug}`;

export interface TopicRef {
  id: string;
  lang: Explain;
  section: CurriculumSection;
  entry: CurriculumTopic;
  order: number;
  path: string;
  topic: Topic | null;
}

// Every curriculum entry, in study order, with its topic data when the topic file exists.
export async function loadTopics(curriculum?: Curriculum): Promise<TopicRef[]> {
  const cur = curriculum ?? (await loadCurriculum());
  const refs: TopicRef[] = [];
  for (const lang of cur.languages) {
    for (const section of lang.sections) {
      for (const [i, entry] of section.topics.entries()) {
        const path = topicPath(lang.code, section.dir, entry.slug);
        const file = Bun.file(join(ROOT, path));
        const topic = (await file.exists()) ? await readYaml<Topic>(join(ROOT, path)) : null;
        refs.push({ id: topicId(lang.code, section.dir, entry.slug), lang: lang.code, section, entry, order: i + 1, path, topic });
      }
    }
  }
  return refs;
}

// Title of any curriculum topic in an explanation language: topic file, then curriculum, then slug.
export function topicTitle(ref: TopicRef, explain: Explain): string {
  const fromSlug = ref.entry.slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return ref.topic?.title[explain] ?? ref.entry.title?.[explain] ?? fromSlug;
}
