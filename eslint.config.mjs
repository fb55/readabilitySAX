import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import feedicFlatConfig from "@feedic/eslint-config";
import { commonTypeScriptRules } from "@feedic/eslint-config/typescript";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig([
    includeIgnoreFile(gitignorePath),
    {
        linterOptions: {
            reportUnusedDisableDirectives: "error",
        },
    },
    {
        ignores: ["eslint.config.{js,cjs,mjs}", "browsers/**"],
    },
    ...feedicFlatConfig,
    {
        files: ["**/*.ts"],
        extends: [...tseslint.configs.recommended],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
                sourceType: "script",
            },
            globals: globals.node,
        },
        rules: {
            ...commonTypeScriptRules,
        },
    },
    {
        files: ["tests/**/*.ts", "browsers/**/*.ts"],
        rules: {
            "n/no-unsupported-features/es-builtins": 0,
            "n/no-unsupported-features/node-builtins": 0,
            "unicorn/prefer-top-level-await": 0,
        },
    },
]);
