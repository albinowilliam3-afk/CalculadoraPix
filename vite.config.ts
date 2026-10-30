import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
      ],
      manifest: {
        id: '/',
        name: 'PesoPix — Calculadora Pix, Pesos & Cartão',
        short_name: 'PesoPix',
        description:
          'Calculadora inteligente de Reais para Pesos: compare na hora Cartão USD (Dólar Oficial) contra ARQ e carteiras Pix.',
        theme_color: '#F5F7FB',
        background_color: '#F5F7FB',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        categories: ['finance', 'travel', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Simular Compra na Maquininha',
            short_name: 'Maquininha',
            description: 'Testar valor em Reais na hora de pagar',
            url: '/#simulador',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Ranking Pix vs Cartão',
            short_name: 'Ranking Pix',
            description: 'Comparar carteiras Pix com Dólar Oficial',
            url: '/#ranking',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(images\.compara\.ar|api\.argentinadatos\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'provider-logos-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/comparapix': {
        target: 'https://api.comparapix.ar',
        changeOrigin: true,
        rewrite: () => '/quotes',
        headers: {
          Origin: 'https://comparapix.ar',
          Referer: 'https://comparapix.ar/',
        },
      },
      '/api/comparadolar': {
        target: 'https://api.comparadolar.ar',
        changeOrigin: true,
        rewrite: () => '/usd',
      },
      '/api/usdbrl': {
        target: 'https://economia.awesomeapi.com.br',
        changeOrigin: true,
        rewrite: () => '/json/last/USD-BRL',
      },
    },
  },
});
