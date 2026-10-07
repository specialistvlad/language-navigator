// Configuration: each file against its schema, and every data schema lists exactly the configured
// levels and explanation languages.
import type { ValidateFunction } from "ajv";
import { join } from "node:path";
import { CONTENT, EXPLAIN_CODES, INTERFACE, LEVEL_INFO, LEVELS, SITE } from "../lib.ts";
import { type Report, schemaErrors } from "./report.ts";

// The parts of a data schema that must list the configured levels and explanation languages.
interface SchemaFile {
  definitions?: {
    level?: { enum: string[] };
    explain?: { enum: string[] };
    localized?: { properties?: Record<string, unknown> };
  };
}

export const SCHEMA_NAMES = ["site", "levels", "interface", "curriculum", "concepts", "topic"] as const;

export async function checkConfig(schema: (name: string) => Promise<ValidateFunction>, report: Report): Promise<void> {
  schemaErrors(await schema("site"), SITE, "site.yaml", report);
  schemaErrors(await schema("levels"), { levels: LEVEL_INFO }, "levels.yaml", report);
  schemaErrors(await schema("interface"), INTERFACE, "interface.yaml", report);
  if (!SITE.explain.some((e) => e.enabled)) report("site.yaml", "no explanation language is enabled");

  const codes = EXPLAIN_CODES.join("|");
  const levelCodes = LEVELS.join("|");
  for (const name of SCHEMA_NAMES) {
    const where = `schema/${name}.schema.json`;
    const text = await Bun.file(join(CONTENT, "schema", `${name}.schema.json`)).text();
    const json = JSON.parse(text) as SchemaFile;
    for (const [, list] of text.matchAll(/\(((?:[A-Z][0-9]\|)+[A-Z][0-9])\)/g)) {
      if (list !== levelCodes) report(where, `level pattern (${list}) differs from levels.yaml (${levelCodes})`);
    }
    for (const [, list] of text.matchAll(/\(((?:[a-z]{2}\|)+[a-z]{2})\)\\\\\./g)) {
      if (list !== codes) report(where, `language pattern (${list}) differs from site.yaml (${codes})`);
    }
    const defs = json.definitions ?? {};
    if (defs.level && defs.level.enum.join("|") !== levelCodes) report(where, "level enum differs from levels.yaml");
    if (defs.explain && defs.explain.enum.join("|") !== codes) report(where, "explain enum differs from site.yaml");
    if (defs.localized?.properties && Object.keys(defs.localized.properties).join("|") !== codes) {
      report(where, "localized languages differ from site.yaml");
    }
  }
}
