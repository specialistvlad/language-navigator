// Generated from languages/schema/curriculum.schema.json by npm run types. Edit the schema, then regenerate.

/**
 * Every planned topic of every language being learned, in study order.
 */
export interface LanguageNavigatorCurriculum {
  /**
   * @minItems 1
   */
  languages: {
    code: "en";
    /**
     * false keeps the language from readers; its data stays and is still checked
     */
    enabled: boolean;
    /**
     * URL segment of the language being learned
     */
    slug: string;
    name: Localized;
    /**
     * @minItems 1
     */
    sections: {
      dir: string;
      title: Localized;
      /**
       * @minItems 1
       */
      topics: {
        slug: string;
        /**
         * Planned range of a topic without a topic file; a written topic takes its range from its data.
         */
        levels?: string;
        title?: Localized;
      }[];
    }[];
  }[];
}
export interface Localized {
  en: string;
}
