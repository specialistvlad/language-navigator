// Generated from languages/schema/site.schema.json by npm run types. Edit the schema, then regenerate.

export type Explain = "en";

export interface SiteIdentityAndExplanationLanguages {
  name: string;
  /**
   * Public URL, without a trailing slash.
   */
  url: string;
  repository: string;
  /**
   * Explanation languages, in display order.
   *
   * @minItems 1
   */
  explain: {
    code: Explain;
    /**
     * false keeps the language from readers; its data stays and is still checked.
     */
    enabled: boolean;
    name: Localized;
  }[];
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
}
