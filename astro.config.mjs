// @ts-check
import { defineConfig } from 'astro/config';
import relativeLinks from 'astro-relative-links';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  build: {
    format: 'file',
  },
  server: {
    host: true,
    open: '/',
  },
  devToolbar: {
    enabled: false,
  },
  compressHTML: false,
  integrations: [relativeLinks()],
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@lib': '/src/lib',
        '@scss': '/src/scss',
        '@Js': '/src/js',
        '@Images': '/src/images',
      },
    },
    plugins: [tailwindcss()],
  },
  site: "https://miolog-games.online",
  base: '/',
});