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
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
