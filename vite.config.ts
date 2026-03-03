import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      process: "process/browser",
    },
  },
  define: {
    "process.env": "{}",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core — changes rarely
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
            return "vendor-react";
          }

          // Supabase client — large, stable
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // UI primitives — Radix + icons + CVA
          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("class-variance-authority")) {
            return "vendor-ui";
          }

          // Charts — only needed on Analytics/Reports pages
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }

          // Cal.com — only needed on Meetings pages
          if (id.includes("@calcom")) {
            return "vendor-calcom";
          }

          // Rich text editor — only needed on blog/support-docs pages
          if (id.includes("react-quill") || id.includes("quill")) {
            return "vendor-editor";
          }
        },
      },
    },
  },
});
