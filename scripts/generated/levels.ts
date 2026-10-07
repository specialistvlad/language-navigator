// Generated from languages/schema/levels.schema.json by npm run types. Edit the schema, then regenerate.

export type Level = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Color = string;

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
    color: {
      light: Color;
      dark: Color;
    };
  }[];
}
/**
 * Text in every explanation language.
 */
export interface Localized {
  en: string;
  es: string;
}
