import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { writeFileSync } from 'node:fs';

/** Dev-only endpoint: scripts/og-image.html posts the rendered PNG here. */
const saveOg = (): Plugin => ({
  name: 'save-og-image',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__og', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        writeFileSync('public/og-image.jpg', Buffer.concat(chunks));
        res.end('ok');
      });
    });
  },
});

export default defineConfig({
  plugins: [svelte(), saveOg()],
  build: { target: 'es2022' },
});
