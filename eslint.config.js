// Lint: typescript-eslint's strict and stylistic type-checked rules for every script and the browser client.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["build/", "node_modules/", "scripts/generated/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      eqeqeq: "error",
      curly: ["error", "multi-line"],
      "no-param-reassign": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      // Small files keep the structure readable: split a module before it passes 200 lines.
      "max-lines": ["error", { max: 200 }],
    },
  },
  { files: ["apps/web/client.ts", "apps/web/client-*.ts"], languageOptions: { globals: globals.browser } },
);
