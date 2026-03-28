# siteiq-landing
SiteIQ - AI Facility Management Platform landing page

## Branches and deploys

- **`main`** — Default branch. Full page (hero through footer). Use for ongoing work on the whole site; this is what you ship in full later (e.g. April).
- **`landing`** — Production homepage for now. Same source as `main`, but Vercel runs **`npm run build:home`** on this branch only (hero + twin + stats + footer; no WIP sections below).

Workflow: develop on **`main`**, then merge into **`landing`** when the live homepage should update:

```bash
git checkout landing
git merge main
git push origin landing
```

In the Vercel project, set **Production Branch** to **`landing`**. Previews from **`main`** (or other branches) still get the **full** build via `scripts/vercel-build.mjs` (anything other than `landing` / `home` uses `npm run build`).
