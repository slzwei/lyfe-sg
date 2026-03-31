import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": `${import.meta.dirname}/src/__mocks__/server-only.ts`,
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "src/app/staff/actions/**/*.ts",
        "src/app/staff/candidates/actions.ts",
        "src/app/candidate/actions.ts",
        "src/app/candidate/onboarding/actions.ts",
        "src/lib/supabase/proxy.ts",
        "src/lib/rate-limit.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
