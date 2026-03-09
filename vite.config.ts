import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

function versionPlugin(): Plugin {
  return {
    name: "version-json",
    writeBundle(options) {
      const outDir = options.dir || "dist";
      const version = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      fs.writeFileSync(
        path.resolve(outDir, "version.json"),
        JSON.stringify({ version }),
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Finow - Gestão Financeira",
        short_name: "Finow",
        description: "Seu mentor financeiro pessoal. Organize suas finanças com calma e clareza.",
        start_url: "/",
        display: "standalone",
        background_color: "#F7F8F6",
        theme_color: "#1F7A63",
        orientation: "portrait-primary",
        scope: "/",
        lang: "pt-BR",
        categories: ["finance", "productivity"],
        icons: [
          { src: "/images/finow-icon-48.png", sizes: "48x48", type: "image/png" },
          { src: "/images/finow-icon-96.png", sizes: "96x96", type: "image/png" },
          { src: "/images/finow-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/images/finow-icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
    versionPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
