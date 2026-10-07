// Problems found by validation, and how schema errors become problems.
import type { ValidateFunction } from "ajv";

export interface Problem {
  where: string;
  message: string;
}

export type Report = (where: string, message: string) => void;

export function schemaErrors(validate: ValidateFunction, data: unknown, where: string, report: Report): boolean {
  if (validate(data)) return true;
  for (const e of validate.errors ?? []) report(where, `${e.instancePath === "" ? "/" : e.instancePath} ${e.message ?? ""}`);
  return false;
}
