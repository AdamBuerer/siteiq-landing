import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const origPath = path.join(root, 'siteiq-landing (1).html');
const lines = fs.readFileSync(origPath, 'utf8').split(/\r?\n/);

const navStart = lines.findIndex((l) => l.trim() === '<nav>');
const navEnd = lines.findIndex((l) => l.trim() === '</nav>');
const heroStart = lines.findIndex((l) => l.includes('<!-- HERO -->'));
const footerStart = lines.findIndex((l) => l.includes('<!-- FOOTER -->'));
const footerEnd = lines.findIndex((l, i) => i > footerStart && l.trim() === '</footer>');

if (navStart === -1 || navEnd === -1 || navEnd < navStart) {
  console.error('Could not find <nav>...</nav> in siteiq-landing (1).html');
  process.exit(1);
}
if (heroStart === -1 || footerStart === -1 || heroStart >= footerStart) {
  console.error('Could not find <!-- HERO --> ... <!-- FOOTER --> region in siteiq-landing (1).html');
  process.exit(1);
}
if (footerEnd === -1) {
  console.error('Could not find </footer> after <!-- FOOTER --> in siteiq-landing (1).html');
  process.exit(1);
}

const nav = lines
  .slice(navStart, navEnd + 1)
  .join('\n')
  .replace('<nav>', '<nav aria-label="Primary">')
  .replace(
    /(<li class="nav-item has-menu">\s*)<a href="#" class="nav-link-btn">/g,
    '$1<a href="#" class="nav-link-btn" aria-expanded="false" aria-haspopup="true">',
  );

const betweenNavAndHero = lines.slice(navEnd + 1, heroStart).join('\n').trim();

const mainContent = lines.slice(heroStart, footerStart).join('\n');
let footer = lines.slice(footerStart, footerEnd + 1).join('\n');

const oldForm = `      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <input type="text" class="lead-strip-input" placeholder="Your name" autocomplete="name"/>
          <input type="email" class="lead-strip-input" placeholder="Work email" autocomplete="email"/>
        </div>
        <input type="text" class="lead-strip-input" placeholder="Your facility type and size (optional)" autocomplete="off"/>
        <button style="padding:13px 24px;border-radius:9px;border:none;background:#fff;color:var(--purple);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:-.01em;transition:all .18s">Get started &rarr;</button>
      </div>`;

const newForm = `      <form id="lead-form" style="display:flex;flex-direction:column;gap:10px" method="post" action="#">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="sr-only" for="lead-name">Name</label>
          <input id="lead-name" name="name" type="text" class="lead-strip-input" placeholder="Your name" autocomplete="name" required/>
          <label class="sr-only" for="lead-email">Work email</label>
          <input id="lead-email" name="email" type="email" class="lead-strip-input" placeholder="Work email" autocomplete="email" required/>
        </div>
        <label class="sr-only" for="lead-note">Facility type and size (optional)</label>
        <input id="lead-note" name="note" type="text" class="lead-strip-input" placeholder="Your facility type and size (optional)" autocomplete="off"/>
        <button type="submit" style="padding:13px 24px;border-radius:9px;border:none;background:#fff;color:var(--purple);font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:-.01em;transition:all .18s">Get started &rarr;</button>
        <p id="lead-status" class="lead-form-status" role="status" aria-live="polite"></p>
      </form>`;

if (!footer.includes('lead-strip-input')) {
  console.error('Expected lead form markup not found');
  process.exit(1);
}
footer = footer.replace(oldForm, newForm);

const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SiteIQ | AI Facility Management Platform — Intelligent Buildings</title>
<meta name="description" content="SiteIQ is the AI operating system for intelligent buildings. Reduce energy costs 15–45%, automate cleaning operations, predict equipment failures weeks in advance, and manage your entire robot fleet — from one platform. Trusted by hospitals, universities, and airports."/>
<link rel="canonical" href="%SITE_URL%/"/>
<meta property="og:title" content="Every Building, Intelligent. — SiteIQ"/>
<meta property="og:description" content="Turn your facility into a living, intelligent system. SiteIQ unifies robots, sensors, energy, and teams in one AI platform built for hospitals, universities, airports, and campuses."/>
<meta property="og:image" content="%OG_IMAGE%"/>
<meta property="og:url" content="%SITE_URL%/"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="Every Building, Intelligent. — SiteIQ"/>
<meta name="twitter:description" content="Turn your facility into a living, intelligent system. SiteIQ unifies robots, sensors, energy, and teams in one AI platform built for hospitals, universities, airports, and campuses."/>
<meta name="twitter:image" content="%OG_IMAGE%"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/favicon.svg"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap" rel="stylesheet"/>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"SiteIQ","url":"%SITE_URL%/","logo":"%SITE_URL%/favicon.svg"},{"@type":"WebSite","name":"SiteIQ","url":"%SITE_URL%/","description":"AI facility management platform for intelligent buildings."}]}</script>
<script type="module" src="/src/main.js"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
`;

const body = `${nav}
${betweenNavAndHero ? `\n${betweenNavAndHero}\n` : '\n'}

<main id="main">
${mainContent}
</main>

${footer}
</body>
</html>
`;

const out = path.join(root, 'index.html');
fs.writeFileSync(out, head + body, 'utf8');
console.log('Wrote', out);
