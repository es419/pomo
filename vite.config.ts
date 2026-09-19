import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pomo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Pomo',
        short_name: 'Pomo',
        description: 'Focus timer and study analytics',
        theme_color: '#07111f',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/pomo/',
        scope: '/pomo/',
        icons: [
          { src: '/pomo/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pomo/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
