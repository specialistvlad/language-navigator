// Generated from languages/schema/topic.schema.json by npm run types. Edit the schema, then regenerate.

export type TopicId = string;
export type Explain = "en";
export type Status = "draft" | "approved";
/**
 * Text: a string, one mark, or a list of parts.
 */
export type Text = string | Mark | Part[];
export type Mark =
  | TargetMark
  | AuxMark
  | SubjMark
  | VerbMark
  | EndingMark
  | StressMark
  | TermMark
  | LetterMark
  | SignalMark
  | SoundMark
  | L1Mark
  | OptionalMark
  | AlternativesMark
  | ExamplesMark
  | MappingMark
  | TakesMark
  | ExchangeMark
  | GlossMark
  | IpaMark
  | LinkMark
  | DateMark
  | WeekdayMark
  | TimeMark
  | NumeralMark
  | OrdinalMark
  | IntonationMark
  | GapMark
  | VariantMark
  | SlotMark
  | PatternMark;
/**
 * A variety of the language being learned, as a BCP 47 tag; en-GB when absent.
 */
export type Variety = "en-GB" | "en-US";
export type Part = string | Mark;
export type Block = ProseBlock | ListBlock | ParadigmBlock | UsageBlock | ComparisonBlock | InventoryBlock | ErrorsBlock;
/**
 * A level from languages/levels.yaml. Every leaf carries one; sections, cheatsheets and topics take their range from their leaves.
 */
export type Level = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
/**
 * Explanation languages an element serves; all when absent.
 *
 * @minItems 1
 */
export type Readers = Explain[];
/**
 * A list item: a rule, a note or an example, with its level.
 */
export type Item = Item1 & {
  type: "rule" | "note" | "example";
  level: Level;
  readers?: Readers;
  variety?: Variety;
  text?: Localized;
  ex?: Text;
  tr?: Localized;
};
export type Item1 =
  | {
      text: unknown;
    }
  | {
      ex: unknown;
    };
/**
 * A table column: its key, and its label, or the slot of a pattern sentence it holds; features name what it holds.
 */
export type Column = Column1 & {
  key: string;
  label?: Cell;
  slot?: "aux" | "subj" | "verb" | "rest";
  features?: Features;
  readers?: Readers;
};
export type Column1 =
  | {
      label: unknown;
    }
  | {
      slot: unknown;
    };
export type Cell = Text | Localized | Example;
/**
 * The grammar features of a row, a column or a section: one bundle, or several that each apply.
 */
export type Features = FeatureBundle | FeatureBundle[];
/**
 * @minItems 1
 */
export type Content = Block[];

/**
 * One topic of one language being learned, explained in every explanation language.
 */
export interface Langs123Topic {
  id: TopicId;
  lang: Explain;
  kind: "grammar" | "foundations" | "reference";
  tags: string[];
  concepts: string[];
  related: TopicId[];
  status: {
    en: Status;
  };
  title: Localized;
  summary: Summary;
  /**
   * Section 00: the whole topic in one table, shown in both the Cheatsheet and the Extended view.
   */
  cheatsheet: {
    content: Content;
  };
  /**
   * @minItems 1
   */
  sections: Section[];
}
/**
 * Explanation text, one value per explanation language; npm run check requires each enabled one.
 */
export interface Localized {
  en?: Text;
}
/**
 * The form the topic teaches; in an error, the corrected part.
 */
export interface TargetMark {
  target: Text;
}
/**
 * A helper verb.
 */
export interface AuxMark {
  aux: Text;
}
/**
 * The subject of a pattern sentence.
 */
export interface SubjMark {
  subj: Text;
}
/**
 * The main verb of a pattern sentence.
 */
export interface VerbMark {
  verb: Text;
}
/**
 * An ending added to a stem.
 */
export interface EndingMark {
  ending: Text;
}
/**
 * The stressed syllable.
 */
export interface StressMark {
  stress: Text;
}
/**
 * A word or part of a word of the language being learned, discussed in an explanation.
 */
export interface TermMark {
  term: Text;
}
/**
 * The letters a rule is about: the spelling of a sound, a silent letter, a capital, a spelling change.
 */
export interface LetterMark {
  letter: Text;
}
/**
 * A signal word inside an example.
 */
export interface SignalMark {
  signal: Text;
}
/**
 * A pronunciation respelling.
 */
export interface SoundMark {
  sound: Text;
}
/**
 * A phrase in the reader's first language.
 */
export interface L1Mark {
  l1: Text;
}
/**
 * An optional part.
 */
export interface OptionalMark {
  optional: Text;
}
/**
 * Forms or examples that each work; the renderer joins them with a slash.
 */
export interface AlternativesMark {
  /**
   * @minItems 2
   */
  alternatives: Text[];
}
/**
 * Examples side by side.
 */
export interface ExamplesMark {
  /**
   * @minItems 2
   */
  examples: Text[];
}
/**
 * A form and what it becomes, in order. follows: the list continues the form under discussion.
 */
export interface MappingMark {
  /**
   * @minItems 1
   */
  mapping: Text[];
  follows?: true;
}
/**
 * A case and the form it calls for. follows: the list continues the form under discussion.
 */
export interface TakesMark {
  /**
   * @minItems 1
   */
  takes: Text[];
  follows?: true;
}
/**
 * A question and its answer.
 */
export interface ExchangeMark {
  /**
   * @minItems 2
   */
  exchange: Text[];
}
/**
 * A meaning in the reader's language: localized inside text of the language being learned.
 */
export interface GlossMark {
  gloss: Text | Localized;
}
/**
 * An IPA transcription, without its slashes.
 */
export interface IpaMark {
  ipa: string;
}
/**
 * Another topic, by ID.
 */
export interface LinkMark {
  link: Text;
  to: TopicId;
}
/**
 * A date with its ISO 8601 value: 2026-07-03, --07-03, --07 or 2026.
 */
export interface DateMark {
  date: Text;
  value: string;
}
/**
 * A day of the week with its ISO 8601 number, Monday 1.
 */
export interface WeekdayMark {
  weekday: Text;
  value: number;
}
/**
 * A clock time with its 24-hour value.
 */
export interface TimeMark {
  time: Text;
  value: string;
}
/**
 * A number in words with its value in digits.
 */
export interface NumeralMark {
  numeral: Text;
  value: number | string;
}
/**
 * An ordinal with its value.
 */
export interface OrdinalMark {
  ordinal: Text;
  value: number;
}
/**
 * The voice rises or falls.
 */
export interface IntonationMark {
  intonation: "rise" | "fall";
}
/**
 * An open slot or the gap in a split form.
 */
export interface GapMark {
  gap: true;
}
/**
 * The form in another variety of the language.
 */
export interface VariantMark {
  variant: Text;
  variety: Variety;
}
/**
 * A slot of a pattern: a code from the slot list, or a description of what fills it.
 */
export interface SlotMark {
  slot:
    | (
        | "V"
        | "V-s"
        | "V-ing"
        | "V-ed"
        | "-ing"
        | "subject"
        | "verb"
        | "base verb"
        | "noun"
        | "plural noun"
        | "singular noun"
        | "uncountable noun"
        | "adjective"
        | "adverb"
        | "comparative"
        | "superlative"
        | "wh-word"
        | "person"
        | "clause"
        | "past participle"
        | "infinitive"
        | "present"
        | "past"
        | "past simple"
        | "number"
        | "unit"
        | "hyphen"
        | "result"
        | "agent"
        | "helper"
        | "consonant"
        | "vowel"
        | "the time"
        | "day"
        | "date"
        | "month"
        | "year"
      )
    | Localized;
}
/**
 * The slots of a sentence pattern, in order; follows: the pattern comes after the form under discussion.
 */
export interface PatternMark {
  /**
   * @minItems 1
   */
  pattern: Text[];
  follows?: true;
}
/**
 * The lead and the rule of the summary, and the rule's examples.
 */
export interface Summary {
  lead: Localized;
  rule: Localized;
  ex?: Text;
}
/**
 * A paragraph.
 */
export interface ProseBlock {
  type: "prose";
  level: Level;
  readers?: Readers;
  text: Localized;
  ex?: Text;
  tr?: Localized;
}
/**
 * A list of rules, notes and examples.
 */
export interface ListBlock {
  type: "list";
  /**
   * @minItems 1
   */
  items: Item[];
  readers?: Readers;
}
/**
 * Forms or sentences in cells labelled by features: its rows or its columns carry them.
 */
export interface ParadigmBlock {
  type: "paradigm";
  /**
   * @minItems 1
   * @maxItems 10
   */
  columns: Column[];
  /**
   * @minItems 1
   */
  rows: Row[];
  readers?: Readers;
}
/**
 * An example with its translations into explanation languages.
 */
export interface Example {
  ex: Text;
  tr: Localized;
}
/**
 * Grammar features after the UniMorph schema; a feature takes one value or several.
 */
export interface FeatureBundle {
  person?: (1 | 2 | 3) | (1 | 2 | 3)[];
  number?: ("sg" | "pl") | ("sg" | "pl")[];
  gender?: ("masc" | "fem" | "neut") | ("masc" | "fem" | "neut")[];
  case?: ("nom" | "acc" | "gen") | ("nom" | "acc" | "gen")[];
  tense?: ("prs" | "pst" | "fut") | ("prs" | "pst" | "fut")[];
  aspect?: ("prog" | "prf" | "hab") | ("prog" | "prf" | "hab")[];
  mood?: ("ind" | "imp" | "sbjv" | "cond") | ("ind" | "imp" | "sbjv" | "cond")[];
  polarity?: ("pos" | "neg") | ("pos" | "neg")[];
  interrogativity?: ("decl" | "int") | ("decl" | "int")[];
  politeness?: ("infm" | "form") | ("infm" | "form")[];
  degree?: ("pos" | "cmpr" | "sprl") | ("pos" | "cmpr" | "sprl")[];
  definiteness?: ("def" | "indf") | ("def" | "indf")[];
  deixis?: ("prox" | "dist") | ("prox" | "dist")[];
  voice?: ("act" | "pass") | ("act" | "pass")[];
  verbform?: ("inf" | "ptcp" | "ger") | ("inf" | "ptcp" | "ger")[];
  contraction?: ("full" | "short") | ("full" | "short")[];
  countability?: ("count" | "mass") | ("count" | "mass")[];
}
/**
 * Cells by column key, with the row's level, features, value, variety and readers.
 */
export interface Row {
  level: Level;
  readers?: Readers;
  features?: Features;
  value?: string | number;
  variety?: Variety;
  tr?: Localized;
  [k: string]: Cell | Level | Readers | Features | string | number | Variety | Localized | undefined;
}
/**
 * Uses, rules, patterns or words, each with its explanation and examples.
 */
export interface UsageBlock {
  type: "usage";
  /**
   * @minItems 1
   * @maxItems 10
   */
  columns: Column[];
  /**
   * @minItems 1
   */
  rows: Row[];
  readers?: Readers;
}
/**
 * Items side by side under named columns.
 */
export interface ComparisonBlock {
  type: "comparison";
  /**
   * @minItems 1
   * @maxItems 10
   */
  columns: Column[];
  /**
   * @minItems 1
   */
  rows: Row[];
  readers?: Readers;
}
/**
 * The members of a closed set, each row one member with its value.
 */
export interface InventoryBlock {
  type: "inventory";
  set: "letters" | "sounds" | "numbers" | "ordinals" | "days" | "months" | "years" | "dates" | "times";
  /**
   * @minItems 1
   * @maxItems 10
   */
  columns: Column[];
  /**
   * @minItems 1
   */
  rows: Row[];
  readers?: Readers;
}
/**
 * Typical errors: wrong, right and the rule.
 */
export interface ErrorsBlock {
  type: "errors";
  /**
   * @minItems 1
   */
  rows: ErrorRow[];
  readers?: Readers;
}
export interface ErrorRow {
  wrong: Text;
  right: Text;
  rule?: Localized;
  level: Level;
  readers?: Readers;
  speakers?: Readers;
}
export interface Section {
  title: Localized;
  role: "overview" | "form" | "spelling" | "pronunciation" | "use" | "signals" | "own" | "compare" | "errors";
  features?: Features;
  content: Content;
  readers?: Readers;
}
