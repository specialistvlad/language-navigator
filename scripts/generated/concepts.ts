// Generated from languages/schema/concepts.schema.json by npm run types. Edit the schema, then regenerate.

/**
 * Language-neutral keys that pair topics across languages.
 */
export interface LanguageNavigatorConcepts {
  [k: string]: {
    title: Localized;
    description: Localized;
  };
}
export interface Localized {
  en: string;
}
