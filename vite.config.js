import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (env.VITE_SITE_URL || 'https://www.siteiq.com').replace(/\/$/, '');
  const ogImage = env.VITE_OG_IMAGE || `${site}/og-image.svg`;

  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
          },
        },
      },
    },
    plugins: [
      {
        name: 'html-site-url',
        transformIndexHtml(html) {
          return html
            .replace(/%SITE_URL%/g, site)
            .replace(/%OG_IMAGE%/g, ogImage);
        },
      },
    ],
  };
});
