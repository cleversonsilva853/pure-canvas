import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
      includeAssets: ["favicon.ico", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "InforControl - Controle Financeiro",
        short_name: "InforControl",
        description: "Sistema completo de controle financeiro pessoal",
        theme_color: "#3B82F6",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ['/push-sw.js'],
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'charts';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf';
          if (id.includes('node_modules/xlsx')) return 'excel';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) return 'vendor';
        }
      }
    }
  }
}));
