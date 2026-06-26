import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev proxies /api to the local server (port 8080). In production the server
// serves this build from the same origin, so /api resolves directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
  build: {
    outDir: "dist",
  },
});
