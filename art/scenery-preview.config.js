import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  build: {
    outDir: "../dist/scenery-review",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("scenery-preview.html", import.meta.url)),
    },
  },
});
