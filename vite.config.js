import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'notification-icon-192x192.png', 'notification-badge-96x96.png'],
      manifest: {
        name: 'CM Manager',
        short_name: 'CMManager',
        description: 'Herramienta de gestión para Community Managers',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // We will inject a custom service worker to handle push events later
        // but for now we'll let it auto-generate the standard one. Wait, if we want push, 
        // we might need to inject a custom SW, or add to the generated one. 
        // Let's use strategies: 'injectManifest' so we can have full control over sw.js
      },
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: null,
      },
    })
  ],
  server: {
    host: true,
    port: 5173,
  },
});
