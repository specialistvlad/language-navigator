// Generated from languages/schema/site.schema.json by npm run types. Edit the schema, then regenerate.

export type Explain = "en";

export interface SiteIdentityLicencesAndExplanationLanguages {
  name: string;
  /**
   * Public URL, without a trailing slash.
   */
  url: string;
  repository: string;
  /**
   * How every reuse of the content names its authors.
   */
  credit: string;
  /**
   * The content licence covers languages/; the code licence covers everything else.
   */
  licences: {
    content: Licence;
    code: Licence;
  };
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
export interface Licence {
  name: string;
  url: string;
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
}
