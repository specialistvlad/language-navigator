// Generated from languages/schema/concepts.schema.json by npm run types. Edit the schema, then regenerate.

/**
 * Language-neutral keys that pair topics across languages.
 */
export interface Langs123Concepts {
  [k: string]: {
    title: Localized;
    description: Localized;
  };
}
export interface Localized {
  en: string;
}
