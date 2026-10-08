// One vocabulary: the names CONVENTIONS.md §12 lists are exactly the names the topic schema allows,
// the marks the renderer knows, and, for every mark shown in bold or italics, a rule in the stylesheet.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CONTENT } from "../../scripts/lib.ts";
import { LIST_MARKS, MARKS } from "../../scripts/text.ts";
import { EMPHASIS, STRONG } from "./html.ts";

const conventions = await Bun.file(join(CONTENT, "CONVENTIONS.md")).text();
const section12 = conventions.slice(conventions.indexOf("## 12. Semantic data"));
// The parts of a JSON Schema definition the names live in.
interface Def {
  properties?: Record<string, Def>;
  oneOf?: Def[];
  $ref?: string;
  required?: string[];
  enum?: (string | number)[];
  const?: string;
}
const schema = (await Bun.file(join(CONTENT, "schema", "topic.schema.json")).json()) as { definitions: Record<string, Def> };
const def = (name: string): Def => schema.definitions[name] ?? {};
const prop = (d: Def, name: string): Def => d.properties?.[name] ?? {};
// The definitions a oneOf of references names.
const refs = (d: Def): Def[] => (d.oneOf ?? []).map((r) => def((r.$ref ?? "").replace("#/definitions/", "")));
const css = await Bun.file(join(import.meta.dir, "styles", "document.css")).text();

// The backticked names in the first column of the table under a bold heading of §12.
function names(heading: string, column = 0): string[] {
  const start = section12.indexOf(`**${heading}**`);
  if (start < 0) throw new Error(`§12 has no "${heading}"`);
  const rows = section12.slice(start).split("\n").slice(2);
  const table = rows.slice(rows.findIndex((r) => r.startsWith("|")));
  const body = table
    .slice(
      0,
      table.findIndex((r) => !r.startsWith("|")),
    )
    .slice(2);
  return body.flatMap((r) => [...(r.split("|")[column + 1] ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? ""));
}
const sorted = (list: Iterable<string | number>): string[] => [...list].map(String).sort();

describe("CONVENTIONS.md §12, the topic schema and the renderer name the same things", () => {
  test("features and their values", () => {
    const documented: Record<string, string[]> = Object.fromEntries(
      section12
        .slice(section12.indexOf("**Features**"))
        .split("\n")
        .filter((l) => l.startsWith("| `"))
        .slice(0, Object.keys(def("featureBundle").properties ?? {}).length)
        .map((l): [string, string[]] => {
          const [, name, values] = l.split("|");
          return [(name ?? "").trim().replace(/`/g, ""), sorted([...(values ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? ""))];
        }),
    );
    const allowed = Object.fromEntries(
      Object.entries(def("featureBundle").properties ?? {}).map(([k, v]) => [k, sorted(v.oneOf?.[0]?.enum ?? [])]),
    );
    expect(documented).toEqual(allowed);
  });
  test("blocks", () => {
    const allowed = refs(def("block")).map((d) => prop(d, "type").const ?? "");
    expect(sorted(names("Blocks"))).toEqual(sorted(allowed));
  });
  test("inventory sets", () => {
    const start = section12.indexOf("| Set | Value |");
    const rows = section12.slice(start).split("\n").slice(2);
    const sets = rows
      .slice(
        0,
        rows.findIndex((r) => !r.startsWith("|")),
      )
      .map((r) => /`([^`]+)`/.exec(r)?.[1] ?? "");
    expect(sorted(sets)).toEqual(sorted(prop(def("inventoryBlock"), "set").enum ?? []));
  });
  test("structures and inline marks: the schema's marks and the renderer's", () => {
    const structures = names("Structures");
    const marks = names("Inline marks");
    const allowed = refs(def("mark")).map((d) => d.required?.[0] ?? "");
    expect(sorted(structures)).toEqual(sorted(LIST_MARKS));
    expect(sorted([...structures, ...marks])).toEqual(sorted(allowed));
    expect(sorted(allowed)).toEqual(sorted(MARKS));
  });
  test("the slot list", () => {
    const line = section12.slice(section12.indexOf("The slot list:"));
    const slots = [...line.slice(0, line.indexOf(".\n")).matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? "");
    expect(sorted(slots)).toEqual(sorted(prop(def("slotMark"), "slot").oneOf?.[0]?.enum ?? []));
  });
  test("section roles", () => {
    const row = section12.split("\n").find((l) => l.startsWith("| section `role`")) ?? "";
    const roles = [...(row.split("|")[2] ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? "");
    expect(sorted(roles)).toEqual(sorted(prop(def("section"), "role").enum ?? []));
  });
  test("attributes are fields of the schema", () => {
    const fields = new Set(Object.values(schema.definitions).flatMap((d) => Object.keys(d.properties ?? {})));
    for (const attribute of names("Attributes")) expect(fields.has(attribute)).toBe(true);
  });
});

describe("the stylesheet", () => {
  test("styles every mark shown in bold or italics, and only marks the renderer writes", () => {
    for (const mark of [...STRONG, ...EMPHASIS, "translation"]) expect(css).toContain(`[data-mark="${mark}"]`);
    const styled = [...css.matchAll(/\[data-mark="([a-z0-9]+)"\]/g)].map((m) => m[1] ?? "");
    for (const mark of styled) expect([...MARKS, "translation"]).toContain(mark);
  });
});
