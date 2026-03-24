import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'DY Auto Parts',
          short_name: 'DY Ops',
          description: 'Sistema operacional PWA para gestão de estoque, separação e conferência da DY Auto Parts.',
          theme_color: '#EF4444',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'imagens/icon-192-black.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'imagens/icon-512-black.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'imagens/maskable_icon_x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'imagens/maskable_icon_x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
