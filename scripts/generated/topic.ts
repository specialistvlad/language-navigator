// Generated from languages/schema/topic.schema.json by npm run types. Edit the schema, then regenerate.

export type Explain = "en" | "es";
export type Level = "A0" | "A1" | "A2" | "B1";
export type TopicId = string;
export type Status = "draft" | "approved";
export type LevelRange = string;
export type Block = TextBlock | BulletsBlock | TableBlock | ErrorsBlock;
export type TextBlock = TextBlock1 & {
  type: "text";
  text?: Text;
  ex?: string;
  tr?: Localized;
  for?: For;
};
export type TextBlock1 =
  | {
      text: unknown;
    }
  | {
      ex: unknown;
    };
/**
 * A plain string (identical in every explanation language) or localized text.
 */
export type Text = string | Localized;
/**
 * Explanation languages that render this element; all when absent.
 *
 * @minItems 1
 */
export type For = Explain[];
export type Item =
  | string
  | Localized
  | ((
      | {
          text: unknown;
        }
      | {
          ex: unknown;
        }
    ) & {
      text?: Text;
      ex?: string;
      tr?: Localized;
      level?: Level;
      for?: For;
    });
export type Cell = string | Localized | Example;
/**
 * @minItems 1
 */
export type Content = Block[];
export type Essentials = {
  level: Level;
  /**
   * @minItems 1
   */
  parts?: Part[];
  content?: Content;
} & Essentials1;
export type Essentials1 =
  | {
      parts: unknown;
    }
  | {
      content: unknown;
    };

/**
 * One topic of one language being learned, explained in every explanation language.
 */
export interface LanguageNavigatorTopic {
  id: string;
  lang: Explain;
  kind: "grammar" | "foundations" | "reference";
  /**
   * @minItems 1
   */
  levels: Level[];
  tags: string[];
  concepts: string[];
  related: TopicId[];
  status: {
    en: Status;
    es: Status;
  };
  title: Localized;
  summary: Localized;
  /**
   * @minItems 1
   */
  sections: Section[];
  /**
   * @minItems 1
   */
  essentials: Essentials[];
  reminders?: Reminder[];
}
/**
 * Explanation text, one string per explanation language.
 */
export interface Localized {
  en?: string;
  es?: string;
}
export interface Section {
  title: Localized;
  level: LevelRange;
  content: Content;
  for?: For;
}
export interface BulletsBlock {
  type: "bullets";
  /**
   * @minItems 1
   */
  items: Item[];
  for?: For;
}
export interface TableBlock {
  type: "table";
  /**
   * @minItems 1
   * @maxItems 10
   */
  columns: Column[];
  /**
   * @minItems 1
   */
  rows: Row[];
  for?: For;
}
export interface Column {
  key: string;
  label: Text;
  /**
   * A cell joins the cell above it when both read the same and their rows share a level.
   */
  merge?: boolean;
  /**
   * A plain string (identical in every explanation language) or localized text.
   */
  group?: string | Localized;
  /**
   * The column's cells and title are centred horizontally and vertically.
   */
  center?: boolean;
  for?: For;
}
/**
 * Cells by column key, plus optional level, translation and explanation-language filter.
 */
export interface Row {
  level?: Level;
  tr?: Localized;
  for?: For;
  [k: string]: Cell | Level | Localized | For | undefined;
}
/**
 * An example in the language being learned, with translations into explanation languages.
 */
export interface Example {
  ex: string;
  tr?: Localized;
}
export interface ErrorsBlock {
  type: "errors";
  /**
   * Print the audience line when the explanation language differs from the language being learned.
   */
  audience?: boolean;
  /**
   * @minItems 1
   */
  rows: ErrorRow[];
  for?: For;
}
export interface ErrorRow {
  wrong: string;
  right: string;
  rule?: Text;
  level?: Level;
  for?: For;
}
export interface Part {
  title: Localized;
  content: Content;
}
export interface Reminder {
  level: Level;
  /**
   * @minItems 1
   */
  items: Item[];
}
