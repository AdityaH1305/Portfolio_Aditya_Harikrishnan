import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /* Verification builds. `distDir` in next.config.ts sends `next build`
       here when BUILD_DIR is set, so a build never corrupts the `.next` a
       running dev server is serving. Only `.next` is ignored by default, so
       without this the lint step starts reporting thousands of errors inside
       Turbopack's own emitted chunks. */
    ".next-*/**",
  ]),
]);

export default eslintConfig;
