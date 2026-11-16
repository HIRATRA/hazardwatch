import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{js,mjs,ts,tsx}"];

export default tseslint.config(
  {
    ignores: ["**/node_modules/", "**/.next/", "**/dist/", "**/coverage/", "**/next-env.d.ts"],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  ...nextVitals.map((config) => ({ ...config, files: webFiles })),
  {
    files: webFiles,
    settings: { next: { rootDir: "apps/web" } },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  eslintConfigPrettier,
);
