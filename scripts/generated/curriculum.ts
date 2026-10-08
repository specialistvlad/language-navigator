// Generated from languages/schema/curriculum.schema.json by npm run types. Edit the schema, then regenerate.

/**
 * Every planned topic of every language being learned: sections by category, and the study path by level.
 */
export interface Langs123Curriculum {
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
     * Topics by category; the menu's Categories order.
     *
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
    /**
     * The study path: per level, lowest first, the topics to study at that level, in order. A topic comes back at each level where it grows.
     */
    path: {
      /**
       * @minItems 1
       *
       * Items: Topic ID: {lang}.{section}.{topic}
       */
      [k: string]: string[];
    };
  }[];
}
export interface Localized {
  en: string;
}
