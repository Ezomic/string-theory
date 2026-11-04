import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // 5183, not the default 5173, to avoid colliding with other local dev servers.
    port: process.env.PORT ? Number(process.env.PORT) : 5183,
    // Always strict: the Herd proxy (string-theory.test) targets this exact
    // port, so silently drifting to another one if it's busy would break it.
    strictPort: true,
    // Vite blocks unrecognized Host headers by default (DNS-rebinding protection);
    // the Herd nginx proxy forwards the original Host, so allow it explicitly.
    allowedHosts: ['string-theory.test'],
    // The portal backend (npm run dev:server). Nginx does the same split in production.
    proxy: {
      '/api': 'http://127.0.0.1:5184',
      '/auth': 'http://127.0.0.1:5184',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sign-in is a full-page navigation to the backend; without this the service
      // worker would answer it with the cached app shell.
      workbox: { navigateFallbackDenylist: [/^\/api\//, /^\/auth\//] },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'String Theory',
        short_name: 'String Theory',
        description:
          'Learn music theory, guitar, and bass — read it, see it, hear it, play it.',
        theme_color: '#0b0c12',
        background_color: '#0b0c12',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
