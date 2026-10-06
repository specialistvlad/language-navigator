// Shared data access: curriculum, concepts and topics.
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");
export const CONTENT = join(ROOT, "languages");
export const LEVELS = ["A0", "A1", "A2", "B1"] as const;
export const EXPLAIN = { en: "English", es: "Español" } as const;
export type Explain = keyof typeof EXPLAIN;
export type Level = (typeof LEVELS)[number];

// ---------- Data model (mirrors languages/schema/*.schema.json) ----------

export type Localized = Partial<Record<Explain, string>>;
export type Text = string | Localized;
export interface Example {
  ex: string;
  tr?: Localized;
}
export type Cell = string | Localized | Example;
export interface ItemObject {
  text?: Text;
  ex?: string;
  tr?: Localized;
  level?: Level;
  for?: Explain[];
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

export const loadCurriculum = () => readYaml<Curriculum>(join(CONTENT, "curriculum.yaml"));
export const loadConcepts = () => readYaml<Concepts>(join(CONTENT, "concepts.yaml"));

export const topicPath = (lang: string, section: string, slug: string) => `languages/${lang}/${section}/${slug}/topic.yaml`;
export const sectionSlug = (dir: string) => dir.replace(/^\d\d-/, "");
export const topicId = (lang: string, dir: string, slug: string) => `${lang}.${sectionSlug(dir)}.${slug}`;

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
        const topic = (await file.exists()) ? ((await readYaml<Topic>(join(ROOT, path))) as Topic) : null;
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

export const guidePath = (lang: string, dir: string, slug: string, explain: Explain) =>
  `languages/${lang}/${dir}/${slug}/guide.${explain}.md`;
