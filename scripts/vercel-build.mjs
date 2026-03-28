/**
 * Vercel runs this instead of `npm run build` when "vercel-build" is the build script.
 * - Branch `landing` (or `home`): home-only output for current production.
 * - Any other branch / local: full site (matches main development).
 */
import { spawnSync } from 'node:child_process';

const ref = process.env.VERCEL_GIT_COMMIT_REF || '';
const homeBranches = new Set(['landing', 'home']);
const useHome = homeBranches.has(ref);
const script = useHome ? 'build:home' : 'build';

console.log(
  `vercel-build: VERCEL_GIT_COMMIT_REF=${ref || '(unset)'} → npm run ${script}`,
);

const result = spawnSync('npm', ['run', script], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

process.exit(result.status ?? 1);
