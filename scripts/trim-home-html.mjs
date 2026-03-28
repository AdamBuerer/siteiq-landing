/**
 * After `vite build`, strips full-site sections so the CEO / production "home-only"
 * deploy ends at <!-- HOME_ONLY_END --> (hero + twin + stats). Footer stays intact.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distIndex = path.join(root, 'dist', 'index.html');

/** Must not contain </main> or -- inside the comment (HTML rules + avoids parser bugs). */
const MARKER = '<!-- SITEIQ_HOME_ONLY_END -->';

const html = fs.readFileSync(distIndex, 'utf8');
const markerIdx = html.indexOf(MARKER);
if (markerIdx === -1) {
  console.error('trim-home-html: marker not found in dist/index.html — add <!-- SITEIQ_HOME_ONLY_END --> before INFRASTRUCTURE in source index.html');
  process.exit(1);
}

const closeMainIdx = html.indexOf('</main>', markerIdx);
if (closeMainIdx === -1) {
  console.error('trim-home-html: no </main> after marker');
  process.exit(1);
}

const trimmed = html.slice(0, markerIdx) + html.slice(closeMainIdx);
fs.writeFileSync(distIndex, trimmed, 'utf8');
console.log('trim-home-html: wrote home-only', distIndex);
