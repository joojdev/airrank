import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "apps/web/public/**",
      "apps/web/src/paper/bundle.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
