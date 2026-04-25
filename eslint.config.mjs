import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

// G24 defence-in-depth — UI files must NOT render `error.message` /
// `err.message` / `e.message` directly. The server boundary (e.g.
// `withInvitationActionBoundary`) translates throws to ES neutral copy
// before they cross into the React tree, but a stray `setError(err.message)`
// in a future component would re-leak raw Drizzle/pg SQL + PII the moment
// the boundary is bypassed (network errors, runtime panics). Forcing the
// `getDisplayMessage(err, fallback)` helper centralises the access in
// `lib/errors/`, which this rule whitelists.
//
// Selectors target the three contexts that actually paint to the DOM:
// 1. JSX text/attribute interpolation `{error.message}`
// 2. `toast.error(err.message)` / `toast.warn(err.message)` etc.
// 3. `setError(err.message)` (React state setter convention)
const NO_BARE_ERROR_MESSAGE_SELECTORS = [
  {
    selector:
      "JSXExpressionContainer > MemberExpression[object.name=/^(error|err|e)$/][property.name='message']",
    message:
      "G24: do not render error.message directly in JSX. Use getDisplayMessage(err, fallback) from @/lib/errors/invitation-errors so server-side sanitisation is preserved.",
  },
  {
    selector:
      "CallExpression[callee.object.name='toast'] > MemberExpression[object.name=/^(error|err|e)$/][property.name='message']",
    message:
      "G24: do not pass error.message directly to toast. Use getDisplayMessage(err, fallback) from @/lib/errors/invitation-errors.",
  },
  {
    selector:
      "CallExpression[callee.name=/^set[A-Z]/] > MemberExpression[object.name=/^(error|err|e)$/][property.name='message']",
    message:
      "G24: do not pass error.message directly to a setState updater. Use getDisplayMessage(err, fallback) from @/lib/errors/invitation-errors.",
  },
];

const eslintConfig = defineConfig([
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // G24 — UI surfaces must not touch error.message directly. Scope: app/,
  // components/, and feature presentation folders. Server actions and
  // infrastructure are intentionally excluded so they can still log raw
  // errors via console.error(error.message) for diagnostics.
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "features/*/presentation/**/*.{ts,tsx}",
    ],
    ignores: [
      // Server-side action wrappers in presentation layer still need raw
      // access for the catch-and-translate pattern. Identified by file
      // suffix; the helper they delegate to lives in lib/errors/.
      "features/*/presentation/*-actions.ts",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...NO_BARE_ERROR_MESSAGE_SELECTORS],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
