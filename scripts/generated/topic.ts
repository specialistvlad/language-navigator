// Generated from languages/schema/topic.schema.json by npm run types. Edit the schema, then regenerate.

export type Explain = "en";
export type TopicId = string;
export type Status = "draft" | "approved";
export type Block = TextBlock | BulletsBlock | TableBlock | ErrorsBlock;
export type TextBlock = TextBlock1 & {
  type: "text";
  level: Level;
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
 * A level from languages/levels.yaml. Every leaf carries one; sections, cheatsheets and topics take their range from their leaves.
 */
export type Level = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
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
/**
 * A bullet: explanation text or an example, with its level.
 */
export type Item = Item1 & {
  text?: Text;
  ex?: string;
  tr?: Localized;
  level: Level;
  for?: For;
};
export type Item1 =
  | {
      text: unknown;
    }
  | {
      ex: unknown;
    };
export type Cell = string | Localized | Example;
/**
 * @minItems 1
 */
export type Content = Block[];

/**
 * One topic of one language being learned, explained in every explanation language.
 */
export interface Langs123Topic {
  id: string;
  lang: Explain;
  kind: "grammar" | "foundations" | "reference";
  tags: string[];
  concepts: string[];
  related: TopicId[];
  status: {
    en: Status;
  };
  title: Localized;
  summary: Localized;
  /**
   * @minItems 1
   */
  sections: Section[];
  /**
   * Section 00: the whole topic in one table, shown in both the Cheatsheet and the Extended view.
   */
  cheatsheet: {
    content: Content;
  };
}
/**
 * Explanation text, one string per explanation language.
 */
export interface Localized {
  en?: string;
}
export interface Section {
  title: Localized;
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
 * Cells by column key, plus the row's level, an optional translation and explanation-language filter.
 */
export interface Row {
  level: Level;
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
   * @minItems 1
   */
  rows: ErrorRow[];
  for?: For;
}
export interface ErrorRow {
  wrong: string;
  right: string;
  rule?: Text;
  level: Level;
  for?: For;
}
