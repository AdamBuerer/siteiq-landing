# siteiq-landing
SiteIQ - AI Facility Management Platform landing page

## Branches and deploys

- **`main`** — Default branch. Full source tree in the repo (including WIP sections below the home slice in `index.html`). This is what you ship in full later (e.g. April).
- **`landing`** — Same commits as **`main`**, automatically. A GitHub Action (`.github/workflows/sync-main-landing.yml`) runs on every push to **either** branch and updates the other branch to the **same commit**, so you never have to merge manually for them to match.

**Stakeholder URL (home page only):** In Vercel, set **Production Branch** to **`landing`**. Production runs **`npm run build:home`**, so the live URL shows hero + twin + stats + footer (trimmed), not WIP below.

**After you push** to `main` or `landing`, wait a few seconds for the sync workflow, then Vercel will deploy from `landing` with the same code you just pushed.

**Preview deployments** (e.g. PRs from `main`): `scripts/vercel-build.mjs` runs the **full** `npm run build` on branches other than `landing` / `home`, so previews can show the whole page while production stays home-only. If you want previews to also match the trimmed home page, change `vercel-build` or use a Preview branch that matches `landing`.
