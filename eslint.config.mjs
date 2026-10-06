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
    "work/**",
    "dist/**",
    "public/leaflet.js",
  ]),
  // Existing main predates these stricter rules. Keep its findings visible
  // as warnings; new Job 3 modules retain all default errors.
  {
    files: ["app/api/explore/route.ts", "app/api/records/route.ts", "app/ride-app.tsx", "components/lakbay/map-canvas.tsx", "components/lakbay/navigator.tsx", "components/lakbay/personalize.tsx", "components/lakbay/profile.tsx", "components/lakbay/ride-history.tsx", "lib/explore.ts", "lib/launch-sound.ts", "lib/navigation.ts", "lib/offline-records.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
