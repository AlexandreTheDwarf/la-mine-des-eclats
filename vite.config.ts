import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [react(), VitePWA({
    registerType: "prompt",
    // All URLs stay relative so the same build works at / and /repo-name/.
    scope: "./",
    manifest: {
      id: "./",
      name: "La Mine des Éclats",
      short_name: "La Mine",
      lang: "fr",
      description: "Une mine, une pioche, un équipage et les profondeurs à explorer.",
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#061217",
      theme_color: "#061217",
      icons: [
        { src: "icons/mine-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/mine-512.png", sizes: "512x512", type: "image/png" },
        { src: "icons/mine-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
      // The six existing zone illustrations are around 3 MB each. Explicitly
      // include them, otherwise an unvisited zone would be blank when offline.
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      navigateFallback: "index.html",
      cleanupOutdatedCaches: true,
    },
  })],
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
