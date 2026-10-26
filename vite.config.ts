import path from "path";
import { fileURLToPath } from "url";
import { configDefaults, defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@scenes": path.resolve(__dirname, "./src/scenes"),
      "@entities": path.resolve(__dirname, "./src/entities"),
      "@managers": path.resolve(__dirname, "./src/managers"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@assets": path.resolve(__dirname, "./assets"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
    // other sessions' git worktrees live under .claude/
    exclude: [...configDefaults.exclude, ".claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
