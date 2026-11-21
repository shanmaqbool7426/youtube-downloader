import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const port = Number(process.env.WEB_PORT ?? 5173);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
  },
  server: {
    port,
    host: process.env.WEB_HOST ?? "127.0.0.1",
    strictPort: true,
    proxy: { "/api": process.env.API_TARGET || "http://127.0.0.1:5000" },
  },
});
