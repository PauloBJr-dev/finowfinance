import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

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
  plugins: [react(), mode === "development" && componentTagger(), versionPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
