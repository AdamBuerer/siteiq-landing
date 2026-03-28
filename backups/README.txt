SiteIQ landing — backup notes
Updated: 2026-03-27

What was saved
1) Git annotated tag: backup-2026-03-27-pre-home-only (earlier snapshot; optional remote backup)
2) Git branch: backup/pre-home-only-2026-03-27 (same idea)
3) This folder: siteiq-dist-2026-03-27.zip — full-site production build (npm run build) after home-only tooling was added. Not the trimmed CEO build.

Home-only vs full site (source: index.html)
- After the stats block there is a marker: <!-- SITEIQ_HOME_ONLY_END -->
- npm run build — full site (everything below the marker stays in dist/)
- npm run build:home — same as build, then scripts/trim-home-html.mjs removes from the marker through </main>, keeping the footer. Use this for CEO / client-facing deploy until April.

Vercel: set Production build command to npm run build:home for the trimmed homepage, or npm run build for the full site.

Restore the built site from the zip
  unzip siteiq-dist-2026-03-27.zip -d /path/to/serve

Restore the exact source tree from git
  git checkout backup-2026-03-27-pre-home-only
  # or: git checkout backup/pre-home-only-2026-03-27

Push the tag/branch to origin (optional, for remote backup)
  git push origin backup-2026-03-27-pre-home-only
  git push origin backup/pre-home-only-2026-03-27
