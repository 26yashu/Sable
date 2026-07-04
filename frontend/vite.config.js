import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  build: {
    // Disable sourcemaps in production to reduce artifact size
    sourcemap: mode !== "production",

    rollupOptions: {
      output: {
        // Split heavy screens into separate lazy-loaded chunks.
        // Vendor (react/react-dom) lands in its own long-cached chunk.
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor";
          }
          // Each screen is already lazy-loaded in App.jsx; Rollup will
          // split them automatically via dynamic import. This entry
          // handles any remaining large lib modules.
          if (id.includes("/src/lib/")) {
            return "lib";
          }
        },
      },
    },

    // Warn when any chunk exceeds 400 kB (gzipped equivalent is ~3×)
    chunkSizeWarningLimit: 400,
  },

  // Make the Vite dev server proxy /api calls to the local backend,
  // so you never have to hard-code ports in the browser during dev.
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
}));
