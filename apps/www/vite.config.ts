import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // Inject data-source attribute for AI agent source location
          "./scripts/babel-plugin-jsx-source-location.cjs",
        ],
      },
    }),
    tailwindcss(),
  ],
  resolve: { alias: { "@": path.resolve(process.cwd(), "./src") } },
  base: "./",
  build: { outDir: "dist", emptyOutDir: true },
});
