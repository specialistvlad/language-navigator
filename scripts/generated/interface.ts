// Generated from languages/schema/interface.schema.json by npm run types. Edit the schema, then regenerate.

export interface InterfaceWording {
  /**
   * Wording by key, one string per explanation language.
   */
  text: {
    [k: string]: Localized;
  };
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
}
