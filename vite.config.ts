import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Never precache/intercept API calls — this app is almost entirely
      // live data (fetch results, download progress);
      // caching any of that would mean serving stale or wrong data offline
      // instead of just failing honestly. With no `runtimeCaching` entry
      // for /api/*, the service worker never touches those requests at
      // all — they go straight to the network exactly as if it weren't
      // there. Only the static app shell (JS/CSS/fonts/icons) is precached,
      // which is what actually makes the app open instantly and feel native
      // on a phone instead of showing a blank white screen while it
      // refetches its own JS bundle on a slow connection.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/health/],
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
      },
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "BlazFetch",
        short_name: "BlazFetch",
        description: "Paste any social media link and save its videos, audio or photos.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // `vite preview` (used to serve the production build) reads its own proxy
  // config, separate from `server.proxy` above which only applies to `vite
  // dev` — without this, the built frontend can't reach the API at all.
  // Points at the production backend's own port (8788), separate from dev's
  // 8787, so dev and a production smoke-test can run side by side.
  preview: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
