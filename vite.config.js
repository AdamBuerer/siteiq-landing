import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (env.VITE_SITE_URL || 'https://www.siteiq.com').replace(/\/$/, '');
  const ogImage = env.VITE_OG_IMAGE || `${site}/og-image.svg`;

  return {
    server: {
      port: 5174,
      strictPort: true,
      // Listen on IPv4 + IPv6 so http://localhost:5174/ works when localhost → 127.0.0.1
      host: true,
    },
    build: {
      target: 'es2020',
      cssMinify: true,
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
