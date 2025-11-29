import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@scenes": path.resolve(__dirname, "./src/scenes"),
      "@entities": path.resolve(__dirname, "./src/entities"),
      "@managers": path.resolve(__dirname, "./src/managers"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@ecs": path.resolve(__dirname, "./src/ecs"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@ui": path.resolve(__dirname, "./src/ui"),
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
