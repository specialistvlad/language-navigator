// Generated from languages/schema/levels.schema.json by npm run types. Edit the schema, then regenerate.

export type Level = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface LevelScale {
  /**
   * Levels, lowest first.
   *
   * @minItems 1
   */
  levels: {
    code: Level;
    name: Localized;
    description: Localized;
    /**
     * The level's hue on the OKLCH colour wheel, in degrees; the theme sets lightness and chroma.
     */
    hue: number;
  }[];
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
  es: string;
}
