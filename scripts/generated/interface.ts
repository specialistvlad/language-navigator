// Generated from languages/schema/interface.schema.json by npm run types. Edit the schema, then regenerate.

export interface InterfaceWording {
  /**
   * Wording by key, one string per explanation language.
   */
  text: {
    [k: string]: Localized;
  };
  /**
   * Line above a Typical errors table: by explanation language, then by language being learned.
   */
  errorsAudience: {
    en?: SomeLanguages;
    es?: SomeLanguages;
  };
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
  es: string;
}
/**
 * Text in some explanation languages.
 */
export interface SomeLanguages {
  en?: string;
  es?: string;
}
