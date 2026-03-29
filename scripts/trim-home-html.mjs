/**
 * Legacy optional trim: after a manual `vite build --mode home`, you could strip HTML
 * between a marker and </main>. The default `build:home` no longer runs this—landing
 * keeps all sections; only the nav is simplified via VITE_HOME_ONLY.
 *
 * To use (not wired in package.json): add <!-- SITEIQ_HOME_ONLY_END --> in source
 * index.html, build, then: node scripts/trim-home-html.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distIndex = path.join(root, 'dist', 'index.html');

const MARKER = '<!-- SITEIQ_HOME_ONLY_END -->';

const html = fs.readFileSync(distIndex, 'utf8');
const markerIdx = html.indexOf(MARKER);
if (markerIdx === -1) {
  console.error(
    'trim-home-html: marker not found in dist/index.html — not trimming (full page kept)',
  );
  process.exit(0);
}

const closeMainIdx = html.indexOf('</main>', markerIdx);
if (closeMainIdx === -1) {
  console.error('trim-home-html: no </main> after marker');
  process.exit(1);
}

const trimmed = html.slice(0, markerIdx) + html.slice(closeMainIdx);
fs.writeFileSync(distIndex, trimmed, 'utf8');
console.log('trim-home-html: wrote trimmed', distIndex);
