import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/fabric")) {
            return "fabric";
          }

          if (
            id.includes("node_modules/opentype.js") ||
            id.includes("node_modules/polygon-clipping")
          ) {
            return "vector-geometry";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }
        }
      }
    }
  }
});
