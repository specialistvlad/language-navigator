// Shared data access: configuration, curriculum, concepts and topics.
import { join } from "node:path";
import interfaceFile from "../languages/interface.yaml";
import levelsFile from "../languages/levels.yaml";
import siteFile from "../languages/site.yaml";

export const ROOT = join(import.meta.dir, "..");
export const CONTENT = join(ROOT, "languages");

// ---------- Configuration (languages/site.yaml, levels.yaml, interface.yaml) ----------

export type Explain = string;
export type Level = string;
export interface Site {
  name: string;
  url: string;
  repository: string;
  explain: { code: Explain; enabled: boolean; name: Record<Explain, string> }[];
}
export interface LevelInfo {
  code: Level;
  name: Record<Explain, string>;
  description: Record<Explain, string>;
  color: { light: string; dark: string };
}

// The text of a localized value in an explanation language; npm run check guarantees it exists.
export function localize(value: Partial<Record<Explain, string>>, explain: Explain): string {
  const text = value[explain];
  if (text === undefined) throw new Error(`No "${explain}" text in ${JSON.stringify(value)}`);
  return text;
}

// The YAML files are validated against their schemas by npm run check.
export const SITE = siteFile as Site;
export const LEVEL_INFO = (levelsFile as { levels: LevelInfo[] }).levels;
export const LEVELS: readonly Level[] = LEVEL_INFO.map((l) => l.code);
// Explanation languages, each under its own name: { en: "English", es: "Español" }.
export const EXPLAIN: Record<Explain, string> = Object.fromEntries(SITE.explain.map((e) => [e.code, localize(e.name, e.code)]));

export const explainName = (explain: Explain): string => localize(EXPLAIN, explain);
// A non-empty string: the test text values pass before they are shown.
export const filled = (value: string | null | undefined): value is string => value !== undefined && value !== null && value !== "";

// Explanation languages readers see (enabled in site.yaml).
export const ENABLED_EXPLAIN: Explain[] = SITE.explain.filter((e) => e.enabled).map((e) => e.code);

export const lv = (level: string | null): number => LEVELS.indexOf(level ?? "");
// Every level in a range such as "A0-A2".
export const levelRange = (range: string): Level[] => {
  const [from = "", to = from] = range.split("-");
  return LEVELS.filter((l) => lv(l) >= lv(from) && lv(l) <= lv(to));
};
export const levelName = (level: Level, explain: Explain): string => LEVEL_INFO.find((l) => l.code === level)?.name[explain] ?? level;

export interface Interface {
  text: Record<string, Record<Explain, string>>;
  errorsAudience: Record<Explain, Record<Explain, string>>;
}
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

// ---------- Data model (mirrors languages/schema/*.schema.json) ----------

export type Localized = Partial<Record<Explain, string>>;
export type Text = string | Localized;
export interface Example {
  ex: string;
  tr?: Localized;
}
export type Cell = string | Localized | Example;
export interface ItemObject {
  text?: Text | undefined;
  ex?: string | undefined;
  tr?: Localized | undefined;
  level?: Level | undefined;
  for?: Explain[] | undefined;
}
export type Item = string | Localized | ItemObject;

export interface TextBlock extends ItemObject {
  type: "text";
}
export interface BulletsBlock {
  type: "bullets";
  items: Item[];
  for?: Explain[];
}
export interface Column {
  key: string;
  label: Text;
  for?: Explain[];
}
export type Row = { level?: Level; tr?: Localized; for?: Explain[] } & Record<string, unknown>;
export interface TableBlock {
  type: "table";
  columns: Column[];
  rows: Row[];
  for?: Explain[];
}
export interface ErrorRow {
  wrong: string;
  right: string;
  rule?: Text;
  for?: Explain[];
}
export interface ErrorsBlock {
  type: "errors";
  audience?: boolean;
  rows: ErrorRow[];
  for?: Explain[];
}
export type Block = TextBlock | BulletsBlock | TableBlock | ErrorsBlock;

export interface Section {
  title: Localized;
  level: string;
  content: Block[];
  for?: Explain[];
}
export interface Part {
  title: Localized;
  content: Block[];
}
export interface Essentials {
  level: Level;
  parts?: Part[];
  content?: Block[];
}
export interface Reminder {
  level: Level;
  items: Item[];
}

export interface Topic {
  id: string;
  lang: Explain;
  kind: string;
  levels: Level[];
  tags: string[];
  concepts: string[];
  related: string[];
  status: Record<Explain, "draft" | "approved">;
  title: Localized;
  summary: Localized;
  sections: Section[];
  essentials: Essentials[];
  reminders?: Reminder[];
}

export interface CurriculumTopic {
  slug: string;
  levels: string;
  title?: Record<Explain, string>;
}
export interface CurriculumSection {
  dir: string;
  title: Record<Explain, string>;
  topics: CurriculumTopic[];
}
export interface CurriculumLanguage {
  code: Explain;
  enabled: boolean;
  slug: string;
  name: Record<Explain, string>;
  sections: CurriculumSection[];
}
export interface Curriculum {
  languages: CurriculumLanguage[];
}

export type Concepts = Record<string, { title: Record<Explain, string>; description: Record<Explain, string> }>;

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

export const guidePath = (lang: string, dir: string, slug: string, explain: Explain): string =>
  `languages/${lang}/${dir}/${slug}/guide.${explain}.md`;
