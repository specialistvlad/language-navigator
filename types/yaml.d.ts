// YAML files import as parsed data (Bun); each loader in scripts/lib.ts states the shape it expects.
declare module "*.yaml" {
  const data: unknown;
  export default data;
}
