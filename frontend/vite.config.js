import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies /api requests to your Express backend during development,
// so the frontend can call fetch("/api/...") without CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
